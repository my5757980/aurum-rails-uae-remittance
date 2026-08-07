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
import { db, appendEvent, type Quote, type Transfer } from "./domain";
import { isExpired, totalDebit } from "./quote-engine";
import {
  getSenderWallet,
  getUsdcBalance,
  submitTransfer,
  getTransactionStatus,
} from "./wallet-service";
import { saveTransfer } from "./persist";

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
  const existingId = db.idempotency.get(idempotencyKey);
  if (existingId) {
    const existing = db.transfers.get(existingId);
    if (existing) return existing;
  }

  const quote = db.quotes.get(quoteId);
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

    // Drive to a terminal state in the background; the UI polls our own API.
    void trackToCompletion(transfer.id, circleTransactionId, correlationId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    appendEvent(transfer.id, "FAILED", correlationId, `Could not submit: ${message}`);
    throw new TransferError("PROVIDER_ERROR", "We couldn't start this payment.", 502);
  }

  return transfer;
}

const POLL_MS = 2_000;
const POLL_TIMEOUT_MS = 120_000;

async function trackToCompletion(
  transferId: string,
  circleTransactionId: string,
  correlationId: string,
): Promise<void> {
  const started = Date.now();
  let last = "SUBMITTED";

  while (Date.now() - started < POLL_TIMEOUT_MS) {
    await new Promise((r) => setTimeout(r, POLL_MS));

    let status;
    try {
      status = await getTransactionStatus(circleTransactionId);
    } catch {
      continue; // transient; keep polling rather than failing the transfer
    }

    const mapped = mapCircleState(status.state);
    const transfer = db.transfers.get(transferId);
    if (!transfer) return;

    if (status.txHash && !transfer.txHash) {
      transfer.txHash = status.txHash;
      transfer.explorerUrl = explorerTxUrl(status.txHash);
      db.transfers.set(transferId, transfer);
      saveTransfer(transfer);
    }

    if (mapped !== last) {
      appendEvent(
        transferId,
        mapped,
        correlationId,
        mapped === "FAILED" ? `Network reported: ${status.state}` : undefined,
      );
      last = mapped;
    }

    if (mapped === "SETTLED") {
      // Last mile is simulated and labelled as such throughout (Constitution II).
      appendEvent(transferId, "DELIVERING", correlationId);
      await new Promise((r) => setTimeout(r, 800));
      transfer.deliveredAt = new Date().toISOString();
      db.transfers.set(transferId, transfer);
      saveTransfer(transfer);
      appendEvent(transferId, "DELIVERED", correlationId);
      return;
    }
    if (mapped === "FAILED") return;
  }

  // No terminal state in time: reconcile, never resubmit (E6).
  appendEvent(
    transferId,
    "NEEDS_REVIEW",
    correlationId,
    "Confirmation is taking longer than expected. We're checking the network.",
  );
}
