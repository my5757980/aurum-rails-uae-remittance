/**
 * Domain types and the in-memory store.
 *
 * WHY IN-MEMORY: the plan calls for Supabase, but persistence is not on the
 * critical path for a working hero flow, and standing up a database would have
 * blocked every UI task behind a credential we do not have. This store sits
 * behind a narrow interface so swapping in Supabase later is a contained change.
 * Constitution IX: keep the hero path demoable above all else.
 *
 * The status log is APPEND-ONLY here exactly as it would be in Postgres — a
 * transfer's status is always the latest event, never a mutable field (FR-015).
 */

import type { Usdc6, AedFils, MinorUnits } from "./money";
import type { FxRate } from "./fx";

// ─────────────────────────────────────────────────────────────────────────────
// State machine — mirrors spec §7.5 exactly
// ─────────────────────────────────────────────────────────────────────────────

export type TransferState =
  | "INITIATED"
  | "QUOTE_LOCKED"
  | "FUNDING"
  | "SUBMITTED"
  | "SETTLING"
  | "SETTLED"
  | "DELIVERING"
  | "DELIVERED"
  | "FAILED"
  | "PENDING_RETRY"
  | "NEEDS_REVIEW";

export const STATE_LABELS: Record<TransferState, string> = {
  INITIATED: "Payment started",
  QUOTE_LOCKED: "Rate locked",
  FUNDING: "Preparing your money",
  SUBMITTED: "Sending on Arc",
  SETTLING: "Confirming on Arc",
  SETTLED: "Settled on Arc",
  DELIVERING: "Delivering to recipient",
  DELIVERED: "Delivered",
  FAILED: "Couldn't complete",
  PENDING_RETRY: "Taking longer than usual",
  NEEDS_REVIEW: "We're checking on this",
};

export const TERMINAL_STATES: ReadonlySet<TransferState> = new Set([
  "DELIVERED",
  "FAILED",
]);

/** The states shown as a progress timeline on the happy path. */
export const TIMELINE_STATES: TransferState[] = [
  "INITIATED",
  "SUBMITTED",
  "SETTLED",
  "DELIVERED",
];

// ─────────────────────────────────────────────────────────────────────────────
// Entities
// ─────────────────────────────────────────────────────────────────────────────

export interface Recipient {
  id: string;
  name: string;
  corridorCode: string;
  contactHandle: string;
  claimToken: string;
  walletId?: string;
  address?: string;
  createdAt: string;
}

export interface FeeBreakdown {
  networkUsdc6: Usdc6;
  serviceUsdc6: Usdc6;
  totalUsdc6: Usdc6;
  totalAed: AedFils;
  spreadBps: number;
}

export interface Quote {
  id: string;
  recipientId: string;
  sendAed: AedFils;
  sendUsdc6: Usdc6;
  fees: FeeBreakdown;
  rate: FxRate;
  landedAmount: MinorUnits;
  landedCurrency: string;
  landedIsSimulated: true;
  etaSeconds: number;
  createdAt: string;
  expiresAt: string;
}

export interface StatusEvent {
  id: string;
  transferId: string;
  fromState: TransferState | null;
  toState: TransferState;
  occurredAt: string;
  reason?: string;
  correlationId: string;
}

export interface Transfer {
  id: string;
  quoteId: string;
  recipientId: string;
  amountUsdc6: Usdc6;
  idempotencyKey: string;
  circleTransactionId?: string;
  txHash?: string;
  explorerUrl?: string;
  createdAt: string;
  deliveredAt?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

interface Db {
  recipients: Map<string, Recipient>;
  quotes: Map<string, Quote>;
  transfers: Map<string, Transfer>;
  events: Map<string, StatusEvent[]>;
  idempotency: Map<string, string>;
  claimTokens: Map<string, string>;
}

// Survives hot-reload in dev by hanging off globalThis.
const g = globalThis as unknown as { __aurumDb?: Db };

export const db: Db =
  g.__aurumDb ??
  (g.__aurumDb = {
    recipients: new Map(),
    quotes: new Map(),
    transfers: new Map(),
    events: new Map(),
    idempotency: new Map(),
    claimTokens: new Map(),
  });

export function appendEvent(
  transferId: string,
  toState: TransferState,
  correlationId: string,
  reason?: string,
): StatusEvent {
  const existing = db.events.get(transferId) ?? [];
  const fromState = existing.length ? existing[existing.length - 1]!.toState : null;

  // FR-019: a failure without a reason is not representable.
  if (toState === "FAILED" && !reason) {
    throw new Error("A FAILED status event must carry a reason");
  }

  const event: StatusEvent = {
    id: crypto.randomUUID(),
    transferId,
    fromState,
    toState,
    occurredAt: new Date().toISOString(),
    reason,
    correlationId,
  };
  db.events.set(transferId, [...existing, event]);
  return event;
}

export function currentState(transferId: string): TransferState | null {
  const events = db.events.get(transferId);
  return events?.length ? events[events.length - 1]!.toState : null;
}

export const getEvents = (transferId: string): StatusEvent[] =>
  db.events.get(transferId) ?? [];
