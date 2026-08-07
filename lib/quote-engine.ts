/**
 * Quote engine — prices a transfer and produces every field the disclosure
 * panel must render.
 *
 * Constitution III: fee (itemised), rate + source + timestamp, FX spread (shown
 * even at zero), landed amount, and arrival estimate must ALL exist before the
 * user can confirm. The panel is a pure projection of the quote, so it cannot
 * display a number the system did not commit to.
 *
 * @see specs/001-uae-global-remittance/spec.md §7.4
 */

import {
  aedFils,
  aedToUsdc6,
  addUsdc6,
  usdc6,
  usdc6ToAed,
  parseAedFils,
  aedToDestinationMinor,
  type AedFils,
  type Usdc6,
} from "./money";
import { getRate } from "./fx";
import { getCorridor } from "./corridors";
import { db, type Quote, type Recipient, type FeeBreakdown } from "./domain";
import { saveQuote } from "./persist";

/** Observed Arc network cost. Tiny because USDC is the native gas asset. */
const NETWORK_FEE_USDC6: Usdc6 = usdc6(300n); // 0.000300 USDC

/** Flat promotional service fee. Stated as promotional, not a modelled economic. */
const SERVICE_FEE_AED_DEFAULT = "0.99";

/** We take no margin on the exchange rate. Shown even though it is zero. */
const FX_SPREAD_BPS = 0;

const ETA_SECONDS = 5;

export const QUOTE_TTL_SECONDS = Number(process.env.QUOTE_TTL_SECONDS ?? 60);
export const DEMO_MAX_SEND_AED = Number(process.env.DEMO_MAX_SEND_AED ?? 20);
export const DEMO_MIN_SEND_AED = 1;

export class QuoteError extends Error {
  constructor(
    readonly code: "AMOUNT_OUT_OF_RANGE" | "VALIDATION_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "QuoteError";
  }
}

function serviceFeeUsdc6(): Usdc6 {
  const aed = parseAedFils(process.env.SERVICE_FEE_AED ?? SERVICE_FEE_AED_DEFAULT);
  return aedToUsdc6(aed);
}

export function computeFees(): FeeBreakdown {
  const service = serviceFeeUsdc6();
  const total = addUsdc6(NETWORK_FEE_USDC6, service);
  return {
    networkUsdc6: NETWORK_FEE_USDC6,
    serviceUsdc6: service,
    totalUsdc6: total,
    totalAed: usdc6ToAed(total),
    spreadBps: FX_SPREAD_BPS,
  };
}

export async function createQuote(
  recipient: Recipient,
  sendAedInput: string,
): Promise<Quote> {
  let sendAed: AedFils;
  try {
    sendAed = parseAedFils(sendAedInput);
  } catch {
    throw new QuoteError("VALIDATION_FAILED", "Enter a valid amount.");
  }

  const whole = Number(sendAed) / 100;
  if (whole < DEMO_MIN_SEND_AED) {
    throw new QuoteError(
      "AMOUNT_OUT_OF_RANGE",
      `The minimum you can send is AED ${DEMO_MIN_SEND_AED}.00.`,
    );
  }
  if (whole > DEMO_MAX_SEND_AED) {
    throw new QuoteError(
      "AMOUNT_OUT_OF_RANGE",
      `This demo is capped at AED ${DEMO_MAX_SEND_AED}.00 per transfer.`,
    );
  }

  const corridor = getCorridor(recipient.corridorCode);
  const rate = await getRate(corridor.currency);
  const fees = computeFees();

  const landedAmount = aedToDestinationMinor(
    sendAed,
    rate.rateScaled,
    rate.rateScale,
    corridor.decimals,
  );

  const now = new Date();
  const quote: Quote = {
    id: crypto.randomUUID(),
    recipientId: recipient.id,
    sendAed,
    sendUsdc6: aedToUsdc6(sendAed),
    fees,
    rate,
    landedAmount,
    landedCurrency: corridor.currency,
    landedIsSimulated: true, // Constitution II — the last mile is not real
    etaSeconds: ETA_SECONDS,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + QUOTE_TTL_SECONDS * 1000).toISOString(),
  };

  db.quotes.set(quote.id, quote);
  saveQuote(quote);
  return quote;
}

export const isExpired = (quote: Quote): boolean =>
  new Date(quote.expiresAt).getTime() <= Date.now();

/** Total the sender parts with: amount + fees. */
export const totalDebit = (quote: Quote): Usdc6 =>
  addUsdc6(quote.sendUsdc6, quote.fees.totalUsdc6);

export const aedOf = (minor: bigint): AedFils => aedFils(minor);
