/**
 * Wire serialisation.
 *
 * All money crosses the network as STRINGS of integer minor units. JSON numbers
 * are float64 and cannot represent int64 safely — sending money as a number
 * would reintroduce exactly the bug `lib/money.ts` exists to prevent (FR-018).
 */

import { formatUsdc6, formatAedFils, formatMinorUnits } from "./money";
import { formatRate } from "./fx";
import { getCorridor } from "./corridors";
import { getDestination, needsBridge } from "./destinations";
import {
  db,
  STATE_LABELS,
  TERMINAL_STATES,
  type Quote,
  type Recipient,
  type StatusEvent,
  type Transfer,
} from "./domain";

export const recipientDto = (r: Recipient) => {
  const c = getCorridor(r.corridorCode);
  return {
    id: r.id,
    name: r.name,
    country: c.country,
    flag: c.flag,
    currency: c.currency,
    currencySymbol: c.currencySymbol,
    contactHandle: r.contactHandle,
    claimToken: r.claimToken,
    destinationCode: r.destinationCode ?? "ARC",
    destinationLabel: getDestination(r.destinationCode).label,
    isCrossChain: needsBridge(r.destinationCode),
  };
};

export const quoteDto = (q: Quote) => {
  const corridorCode = db.recipients.get(q.recipientId)?.corridorCode ?? "IN";
  const c = getCorridor(corridorCode);
  return {
    id: q.id,
    recipientId: q.recipientId,
    sendAed: formatAedFils(q.sendAed),
    sendUsdc6: formatUsdc6(q.sendUsdc6),
    fees: {
      network: formatUsdc6(q.fees.networkUsdc6),
      service: formatUsdc6(q.fees.serviceUsdc6),
      total: formatUsdc6(q.fees.totalUsdc6),
      totalAed: formatAedFils(q.fees.totalAed),
      spreadBps: q.fees.spreadBps,
    },
    rate: {
      value: formatRate(q.rate),
      pair: `1 AED = ${formatRate(q.rate)} ${q.rate.quote}`,
      source: q.rate.source,
      retrievedAt: q.rate.retrievedAt,
      isStale: q.rate.isStale,
    },
    landed: {
      amount: formatMinorUnits(q.landedAmount, c.decimals),
      currency: q.landedCurrency,
      symbol: c.currencySymbol,
      isSimulated: q.landedIsSimulated,
    },
    etaSeconds: q.etaSeconds,
    expiresAt: q.expiresAt,
  };
};

export const eventDto = (e: StatusEvent) => ({
  fromState: e.fromState,
  toState: e.toState,
  label: STATE_LABELS[e.toState],
  occurredAt: e.occurredAt,
  reason: e.reason ?? null,
  correlationId: e.correlationId,
});

export const transferDto = (t: Transfer, events: StatusEvent[]) => {
  const state = events.length ? events[events.length - 1]!.toState : "INITIATED";
  const elapsedMs = t.deliveredAt
    ? new Date(t.deliveredAt).getTime() - new Date(t.createdAt).getTime()
    : null;
  return {
    id: t.id,
    quoteId: t.quoteId,
    recipientId: t.recipientId,
    amountUsdc6: formatUsdc6(t.amountUsdc6),
    state,
    stateLabel: STATE_LABELS[state],
    isTerminal: TERMINAL_STATES.has(state),
    txHash: t.txHash ?? null,
    explorerUrl: t.explorerUrl ?? null,
    destinationTxHash: t.destinationTxHash ?? null,
    destinationExplorerUrl: t.destinationExplorerUrl ?? null,
    createdAt: t.createdAt,
    deliveredAt: t.deliveredAt ?? null,
    elapsedMs,
    events: events.map(eventDto),
  };
};
