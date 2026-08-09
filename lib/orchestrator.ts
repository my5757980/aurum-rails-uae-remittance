/**
 * Payment orchestration — owns the transfer lifecycle.
 *
 * Flow:
 *   validate quote → assert Arc → balance check → INITIATED
 *   → submit to Circle → SUBMITTED
 *   → poll Circle → SETTLING → SETTLED
 *   → simulate last-mile delivery → DELIVERED
 *
 * Every transition appends a status event; nothing is ever mutated in place
 * (FR-015). A failure always carries a reason (FR-019).
 */

import "server-only";
import { ARC_CHAIN_ID, assertArcTestnet, explorerTxUrl } from "./chain";
import { gteUsdc6 } from "./money";
import {
  db,
  appendEvent,
  currentState,
  TERMINAL_STATES,
  type Quote,
  type Transfer,
} from "./domain";
import { isExpired, totalDebit } from "./quote-engine";
import {
  getSenderWallet,
  getUsdcBalance,
  submitTransfer,
  getTransactionStatus,
} from "./wallet-service";
import { fetchQuote, fetchTransferByIdempotencyKey, saveTransfer } from "./persist";
import { bridgeToDestination, destinationExplorerUrl, needsBridge } from "./bridge";

export class TransferError extends Error {
  constructor(
    readonly code:
      | "QUOTE_NOT_FOUND"
      | "QUOTE_EXPIRED"
      | "INSUFFICIENT_FUNDS"
      | "WRONG_CHAIN"
      | "PROVIDER_ERROR",
    message: string,
    readonly httpStatus: number,
  ) {
    super(message);
    this.name = "TransferError";
  }
}

/** Circle transaction state → our state (see plan.md §2.4). */
export function mapCircleState(
  state: string,
): "SUBMITTED" | "SETTLING" | "SETTLED" | "FAILED" | "PENDING_RETRY" {
  switch (state) {
    case "INITIATED":
    case "QUEUED":
    case "CLEARED":
      return "SUBMITTED";
    case "SENT":
      return "SETTLING";
    case "CONFIRMED":
    case "COMPLETE":
      return "SETTLED";
    case "FAILED":
    case "DENIED":
    case "CANCELLED":
      return "FAILED";
    case "STUCK":
      // On Arc "low fees" means low USDC for gas — a real condition. Retry
      // state, never a resubmission (E6, NFR-023).
      return "PENDING_RETRY";
    default:
      return "SUBMITTED";
  }
}

export async function executeTransfer(
  quoteId: string,
  idempotencyKey: string,
): Promise<Transfer> {
  const correlationId = crypto.randomUUID();

  // Idempotency first — a repeat returns the original, never a second transfer.
  // Checked against the database too: on serverless the retry may land on a
  // different instance, and an in-memory-only check would happily pay twice.
  const existingId = db.idempotency.get(idempotencyKey);
  const existing = existingId
    ? db.transfers.get(existingId)
    : await fetchTransferByIdempotencyKey(idempotencyKey);
  if (existing) return existing;

  const quote = db.quotes.get(quoteId) ?? (await fetchQuote(quoteId));
  if (!quote) {
    throw new TransferError("QUOTE_NOT_FOUND", "That quote no longer exists.", 404);
  }
  if (isExpired(quote)) {
    throw new TransferError(
      "QUOTE_EXPIRED",
      "This rate has expired. Refresh to get a new one.",
      409,
    );
  }

  // Constitution I — refuse to move value off Arc Testnet.
  assertArcTestnet(ARC_CHAIN_ID);

  const sender = await getSenderWallet();
  const balance = await getUsdcBalance(sender.id);
  const required = totalDebit(quote);

  // E1 — blocked BEFORE submission, in plain language.
  if (!gteUsdc6(balance, required)) {
    throw new TransferError(
      "INSUFFICIENT_FUNDS",
      "There isn't enough in the demo wallet to send this. Top it up from the Circle faucet and try again.",
      402,
    );
  }

  const recipient = db.recipients.get(quote.recipientId);
  if (!recipient?.address) {
    throw new TransferError("PROVIDER_ERROR", "That recipient isn't set up yet.", 500);
  }

  const transfer: Transfer = {
    id: crypto.randomUUID(),
    quoteId: quote.id,
    recipientId: quote.recipientId,
    amountUsdc6: quote.sendUsdc6,
    idempotencyKey,
    createdAt: new Date().toISOString(),
  };
  db.transfers.set(transfer.id, transfer);
  db.idempotency.set(idempotencyKey, transfer.id);
  saveTransfer(transfer);

  appendEvent(transfer.id, "INITIATED", correlationId);

  try {
    const { circleTransactionId } = await submitTransfer({
      fromWalletId: sender.id,
      toAddress: recipient.address,
      amount: quote.sendUsdc6,
      idempotencyKey: transfer.id, // our id IS Circle's key
    });
    transfer.circleTransactionId = circleTransactionId;
    db.transfers.set(transfer.id, transfer);
    saveTransfer(transfer);
    appendEvent(transfer.id, "SUBMITTED", correlationId);

    // Deliberately NOT kicked off in the background — see advanceTransfer().
    // The UI's own polling drives the state machine, which is the only pattern
    // that survives a serverless host freezing the function after it responds.
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    appendEvent(transfer.id, "FAILED", correlationId, `Could not submit: ${message}`);
    throw new TransferError("PROVIDER_ERROR", "We couldn't start this payment.", 502);
  }

  return transfer;
}

const STALE_MS = 180_000;

/** Transfers whose bridge leg is mid-flight, so a second poll cannot restart it. */
const bridging = new Set<string>();

/**
 * Advance a transfer by one step, driven by a status read.
 *
 * WHY THIS IS PULL, NOT PUSH:
 * The first version kicked off a background `setTimeout` loop after responding.
 * That works on a long-running server and is silently broken on serverless —
 * the function freezes once the response is sent, so the loop never runs and
 * every transfer sticks at "Sending on Arc" forever. Rather than keep two
 * behaviours for two hosts, status is now advanced on demand: the UI already
 * polls `GET /api/transfers/:id` every 1.2s, and each of those calls moves the
 * state machine forward. One code path, correct on both.
 *
 * Safe to call repeatedly and concurrently: it only ever appends an event when
 * the mapped state actually changed.
 */
export async function advanceTransfer(transferId: string): Promise<void> {
  const transfer = db.transfers.get(transferId);
  if (!transfer?.circleTransactionId) return;

  const state = currentState(transferId);
  if (state && TERMINAL_STATES.has(state)) return;
  if (bridging.has(transferId)) return; // a bridge is already running

  const correlationId = crypto.randomUUID();

  let status;
  try {
    status = await getTransactionStatus(transfer.circleTransactionId);
  } catch {
    return; // transient — the next poll tries again
  }

  const mapped = mapCircleState(status.state);

  if (status.txHash && !transfer.txHash) {
    transfer.txHash = status.txHash;
    transfer.explorerUrl = explorerTxUrl(status.txHash);
    db.transfers.set(transferId, transfer);
    saveTransfer(transfer);
  }

  if (mapped !== state) {
    appendEvent(
      transferId,
      mapped,
      correlationId,
      mapped === "FAILED" ? `Network reported: ${status.state}` : undefined,
    );
  }

  if (mapped === "SETTLED") {
    await deliver(transferId, correlationId);
    return;
  }

  // Nothing terminal and nothing moving for a long time: say so honestly
  // rather than leaving a spinner running (E6 — reconcile, never resubmit).
  const age = Date.now() - new Date(transfer.createdAt).getTime();
  if (age > STALE_MS && mapped !== "FAILED") {
    appendEvent(
      transferId,
      "NEEDS_REVIEW",
      correlationId,
      "Confirmation is taking longer than expected. We're checking the network.",
    );
  }
}

/** Final leg: bridge if the recipient is on another chain, then mark delivered. */
async function deliver(transferId: string, correlationId: string): Promise<void> {
  const transfer = db.transfers.get(transferId);
  if (!transfer) return;

  appendEvent(transferId, "DELIVERING", correlationId);

  // US3 — if the recipient is paid on another chain, bridge before we call this
  // delivered. A failure here is a real failure: the money settled on Arc but
  // did not reach them, and saying "Delivered" would be a lie.
  const recipient = db.recipients.get(transfer.recipientId);

  if (recipient && needsBridge(recipient.destinationCode)) {
    bridging.add(transferId);
    try {
      const sender = await getSenderWallet();
      const result = await bridgeToDestination({
        fromAddress: sender.address,
        toAddress: recipient.destinationAddress ?? recipient.address!,
        amount: transfer.amountUsdc6,
        destinationCode: recipient.destinationCode!,
      });
      if (result.destinationTxHash) {
        transfer.destinationTxHash = result.destinationTxHash;
        transfer.destinationExplorerUrl = destinationExplorerUrl(
          recipient.destinationCode,
          result.destinationTxHash,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      appendEvent(
        transferId,
        "FAILED",
        correlationId,
        `Settled on Arc but couldn't reach their network: ${message}`,
      );
      return;
    } finally {
      bridging.delete(transferId);
    }
  }

  transfer.deliveredAt = new Date().toISOString();
  db.transfers.set(transferId, transfer);
  saveTransfer(transfer);
  appendEvent(transferId, "DELIVERED", correlationId);
}
