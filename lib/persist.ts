/**
 * Supabase persistence.
 *
 * DESIGN: write-through mirror, not a replacement.
 *
 * The in-memory maps in `lib/domain.ts` remain the read path, so every existing
 * code path keeps working and request latency is unaffected. Every mutation is
 * additionally written to Postgres, and the process hydrates from Postgres on
 * first use. The result is that data survives a restart without putting a
 * network round-trip on the hero path.
 *
 * If Supabase is not configured, every function here is a no-op and the app
 * degrades to in-memory only. That is deliberate: a judge without a Supabase
 * project can still run the demo.
 *
 * Money crosses this boundary as strings — Postgres `bigint` arrives as a
 * string in PostgREST JSON, and turning it into a JS number would reintroduce
 * exactly the precision bug `lib/money.ts` exists to prevent.
 */

import "server-only";
import {
  db,
  setEventHook,
  type Quote,
  type Recipient,
  type StatusEvent,
  type Transfer,
  type TransferState,
} from "./domain";
import { usdc6, aedFils, minorUnits } from "./money";
import { RATE_SCALE } from "./fx";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

export const isEnabled = Boolean(
  url && key && !url.includes("your-project-ref") && !key.startsWith("your-"),
);

async function rest(
  path: string,
  init: RequestInit & { method: string },
): Promise<Response | null> {
  if (!isEnabled) return null;
  try {
    return await fetch(`${url}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: key!,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch {
    // Persistence must never break a payment. Log-and-continue by design.
    return null;
  }
}

const upsert = (table: string, row: unknown) =>
  rest(table, { method: "POST", body: JSON.stringify(row) });

// ─────────────────────────────────────────────────────────────────────────────
// Writes
// ─────────────────────────────────────────────────────────────────────────────
//
// These return their promise rather than firing and forgetting. On a
// long-running server the difference is cosmetic; on serverless it is the whole
// ballgame — the platform freezes the function the moment it responds, killing
// any in-flight request. An un-awaited write silently vanished, which left the
// database holding a transfer with no circle_transaction_id, so the next
// instance had nothing to advance and the payment sat at INITIATED forever.
//
// Callers on the critical path await these. Callers where a lost write is
// merely untidy (a quote, a seeded recipient) may still choose not to.

export function saveRecipient(r: Recipient): Promise<Response | null> {
  return upsert("recipients", {
    id: r.id,
    name: r.name,
    corridor_code: r.corridorCode,
    contact_handle: r.contactHandle,
    claim_token: r.claimToken,
    circle_wallet_id: r.walletId ?? null,
    address: r.address ?? null,
    // Load-bearing: the orchestrator branches on this. Omitting it here meant a
    // cross-chain recipient round-tripped through Postgres and came back as Arc.
    destination_code: r.destinationCode ?? "ARC",
    destination_address: r.destinationAddress ?? null,
    chain_id: 5042002,
    created_at: r.createdAt,
  });
}

export function saveQuote(q: Quote): Promise<Response | null> {
  return upsert("quotes", {
    id: q.id,
    recipient_id: q.recipientId,
    send_aed: (q.sendAed as bigint).toString(),
    send_usdc6: (q.sendUsdc6 as bigint).toString(),
    network_fee_usdc6: (q.fees.networkUsdc6 as bigint).toString(),
    service_fee_usdc6: (q.fees.serviceUsdc6 as bigint).toString(),
    fx_spread_bps: q.fees.spreadBps,
    fx_rate_scaled: q.rate.rateScaled.toString(),
    fx_rate_scale: q.rate.rateScale.toString(),
    fx_source: q.rate.source,
    fx_retrieved_at: q.rate.retrievedAt,
    fx_is_stale: q.rate.isStale,
    landed_amount_minor: (q.landedAmount as bigint).toString(),
    landed_currency: q.landedCurrency,
    eta_seconds: q.etaSeconds,
    created_at: q.createdAt,
    expires_at: q.expiresAt,
  });
}

export function saveTransfer(t: Transfer): Promise<Response | null> {
  return upsert("transfers", {
    id: t.id,
    quote_id: t.quoteId,
    recipient_id: t.recipientId,
    amount_usdc6: (t.amountUsdc6 as bigint).toString(),
    idempotency_key: t.idempotencyKey,
    circle_transaction_id: t.circleTransactionId ?? null,
    tx_hash: t.txHash ?? null,
    explorer_url: t.explorerUrl ?? null,
    destination_tx_hash: t.destinationTxHash ?? null,
    destination_explorer_url: t.destinationExplorerUrl ?? null,
    created_at: t.createdAt,
    delivered_at: t.deliveredAt ?? null,
  });
}

export function saveStatusEvent(e: StatusEvent): Promise<Response | null> {
  return upsert("status_events", {
    id: e.id,
    transfer_id: e.transferId,
    from_state: e.fromState,
    to_state: e.toState,
    occurred_at: e.occurredAt,
    reason: e.reason ?? null,
    correlation_id: e.correlationId,
  });
}

// Register with domain so every appended status event is mirrored. Done here,
// at import time, so domain never needs to know this module exists.
if (isEnabled) setEventHook(saveStatusEvent);

// ─────────────────────────────────────────────────────────────────────────────
// Hydration — runs once, on first use
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Single-row reads — the serverless safety net
// ─────────────────────────────────────────────────────────────────────────────
//
// On a serverless host each request may land on a different instance, and the
// in-memory maps are per-instance. A quote created on one instance is simply
// absent on another, which would surface to the user as "that quote no longer
// exists" at random. These fetch a single row on a cache miss and repopulate
// memory, so the store behaves as one shared thing regardless of host.

let hydrated = false;
let hydrating: Promise<void> | null = null;

async function select<T>(path: string): Promise<T[]> {
  const res = await rest(path, { method: "GET", headers: { Prefer: "" } });
  if (!res || !res.ok) return [];
  return (await res.json()) as T[];
}

type QuoteRow = Record<string, string | number | boolean | null>;
type TxRow = Record<string, string | null>;
type EvRow = Record<string, string | null>;

function toQuote(q: QuoteRow): Quote {
  return {
    id: String(q.id),
    recipientId: String(q.recipient_id),
    sendAed: aedFils(BigInt(String(q.send_aed))),
    sendUsdc6: usdc6(BigInt(String(q.send_usdc6))),
    fees: {
      networkUsdc6: usdc6(BigInt(String(q.network_fee_usdc6))),
      serviceUsdc6: usdc6(BigInt(String(q.service_fee_usdc6))),
      totalUsdc6: usdc6(
        BigInt(String(q.network_fee_usdc6)) + BigInt(String(q.service_fee_usdc6)),
      ),
      totalAed: aedFils(0n),
      spreadBps: Number(q.fx_spread_bps ?? 0),
    },
    rate: {
      base: "AED",
      quote: String(q.landed_currency),
      rateScaled: BigInt(String(q.fx_rate_scaled)),
      rateScale: BigInt(String(q.fx_rate_scale ?? RATE_SCALE)),
      source: String(q.fx_source),
      retrievedAt: String(q.fx_retrieved_at),
      isStale: Boolean(q.fx_is_stale),
    },
    landedAmount: minorUnits(BigInt(String(q.landed_amount_minor))),
    landedCurrency: String(q.landed_currency),
    landedIsSimulated: true,
    etaSeconds: Number(q.eta_seconds),
    createdAt: String(q.created_at),
    expiresAt: String(q.expires_at),
  };
}

function toTransfer(t: TxRow): Transfer {
  return {
    id: String(t.id),
    quoteId: String(t.quote_id),
    recipientId: String(t.recipient_id),
    amountUsdc6: usdc6(BigInt(String(t.amount_usdc6))),
    idempotencyKey: String(t.idempotency_key),
    circleTransactionId: t.circle_transaction_id ?? undefined,
    txHash: t.tx_hash ?? undefined,
    explorerUrl: t.explorer_url ?? undefined,
    destinationTxHash: t.destination_tx_hash ?? undefined,
    destinationExplorerUrl: t.destination_explorer_url ?? undefined,
    createdAt: String(t.created_at),
    deliveredAt: t.delivered_at ?? undefined,
  };
}

/** Fetch one quote from Postgres and put it back in memory. */
export async function fetchQuote(id: string): Promise<Quote | null> {
  const rows = await select<QuoteRow>(`quotes?id=eq.${encodeURIComponent(id)}&select=*`);
  if (!rows.length) return null;
  const quote = toQuote(rows[0]!);
  db.quotes.set(quote.id, quote);
  return quote;
}

/** Fetch one transfer plus its status history and put both back in memory. */
export async function fetchTransfer(id: string): Promise<Transfer | null> {
  const rows = await select<TxRow>(`transfers?id=eq.${encodeURIComponent(id)}&select=*`);
  if (!rows.length) return null;
  const transfer = toTransfer(rows[0]!);
  db.transfers.set(transfer.id, transfer);
  db.idempotency.set(transfer.idempotencyKey, transfer.id);

  const events = await select<EvRow>(
    `status_events?transfer_id=eq.${encodeURIComponent(id)}&order=occurred_at.asc&select=*`,
  );
  db.events.set(
    transfer.id,
    events.map((e) => ({
      id: String(e.id),
      transferId: transfer.id,
      fromState: (e.from_state as TransferState | null) ?? null,
      toState: e.to_state as TransferState,
      occurredAt: String(e.occurred_at),
      reason: e.reason ?? undefined,
      correlationId: String(e.correlation_id),
    })),
  );
  return transfer;
}

/** Resolve a transfer by idempotency key across instances (FR-014). */
export async function fetchTransferByIdempotencyKey(
  key: string,
): Promise<Transfer | null> {
  const rows = await select<TxRow>(
    `transfers?idempotency_key=eq.${encodeURIComponent(key)}&select=*`,
  );
  if (!rows.length) return null;
  return fetchTransfer(String(rows[0]!.id));
}

export async function hydrate(): Promise<void> {
  if (!isEnabled || hydrated) return;
  if (hydrating) return hydrating;

  hydrating = (async () => {
    type RecipRow = {
      id: string; name: string; corridor_code: string; contact_handle: string;
      claim_token: string; circle_wallet_id: string | null; address: string | null;
      destination_code: string | null; destination_address: string | null;
      created_at: string;
    };
    for (const r of await select<RecipRow>("recipients?select=*")) {
      const rec: Recipient = {
        id: r.id,
        name: r.name,
        corridorCode: r.corridor_code,
        contactHandle: r.contact_handle,
        claimToken: r.claim_token,
        walletId: r.circle_wallet_id ?? undefined,
        address: r.address ?? undefined,
        destinationCode: r.destination_code ?? "ARC",
        destinationAddress: r.destination_address ?? undefined,
        createdAt: r.created_at,
      };
      db.recipients.set(rec.id, rec);
      db.claimTokens.set(rec.claimToken, rec.id);
    }

    type QuoteRow = Record<string, string | number | boolean | null>;
    for (const q of await select<QuoteRow>("quotes?select=*")) {
      const quote: Quote = {
        id: String(q.id),
        recipientId: String(q.recipient_id),
        sendAed: aedFils(BigInt(String(q.send_aed))),
        sendUsdc6: usdc6(BigInt(String(q.send_usdc6))),
        fees: {
          networkUsdc6: usdc6(BigInt(String(q.network_fee_usdc6))),
          serviceUsdc6: usdc6(BigInt(String(q.service_fee_usdc6))),
          totalUsdc6: usdc6(
            BigInt(String(q.network_fee_usdc6)) + BigInt(String(q.service_fee_usdc6)),
          ),
          totalAed: aedFils(0n),
          spreadBps: Number(q.fx_spread_bps ?? 0),
        },
        rate: {
          base: "AED",
          quote: String(q.landed_currency),
          rateScaled: BigInt(String(q.fx_rate_scaled)),
          rateScale: BigInt(String(q.fx_rate_scale ?? RATE_SCALE)),
          source: String(q.fx_source),
          retrievedAt: String(q.fx_retrieved_at),
          isStale: Boolean(q.fx_is_stale),
        },
        landedAmount: minorUnits(BigInt(String(q.landed_amount_minor))),
        landedCurrency: String(q.landed_currency),
        landedIsSimulated: true,
        etaSeconds: Number(q.eta_seconds),
        createdAt: String(q.created_at),
        expiresAt: String(q.expires_at),
      };
      db.quotes.set(quote.id, quote);
    }

    type TxRow = Record<string, string | null>;
    for (const t of await select<TxRow>("transfers?select=*&order=created_at.desc&limit=200")) {
      const tr: Transfer = {
        id: String(t.id),
        quoteId: String(t.quote_id),
        recipientId: String(t.recipient_id),
        amountUsdc6: usdc6(BigInt(String(t.amount_usdc6))),
        idempotencyKey: String(t.idempotency_key),
        circleTransactionId: t.circle_transaction_id ?? undefined,
        txHash: t.tx_hash ?? undefined,
        explorerUrl: t.explorer_url ?? undefined,
        destinationTxHash: t.destination_tx_hash ?? undefined,
        destinationExplorerUrl: t.destination_explorer_url ?? undefined,
        createdAt: String(t.created_at),
        deliveredAt: t.delivered_at ?? undefined,
      };
      db.transfers.set(tr.id, tr);
      db.idempotency.set(tr.idempotencyKey, tr.id);
    }

    type EvRow = Record<string, string | null>;
    const events = await select<EvRow>(
      "status_events?select=*&order=occurred_at.asc&limit=2000",
    );
    for (const e of events) {
      const transferId = String(e.transfer_id);
      const list = db.events.get(transferId) ?? [];
      list.push({
        id: String(e.id),
        transferId,
        fromState: (e.from_state as TransferState | null) ?? null,
        toState: e.to_state as TransferState,
        occurredAt: String(e.occurred_at),
        reason: e.reason ?? undefined,
        correlationId: String(e.correlation_id),
      });
      db.events.set(transferId, list);
    }

    hydrated = true;
  })();

  try {
    await hydrating;
  } finally {
    hydrating = null;
  }
}
