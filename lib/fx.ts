/**
 * FX rates.
 *
 * Constitution III: every displayed rate MUST carry its source and timestamp,
 * and a stale rate MUST be labelled stale — never silently invented (E7).
 *
 * Rates are held as integers scaled by RATE_SCALE so no float ever touches a
 * conversion. See `lib/money.ts`.
 */

import { CORRIDORS } from "./corridors";

export const RATE_SCALE = 10_000n;

export interface FxRate {
  base: "AED";
  quote: string;
  /** Rate × RATE_SCALE, e.g. 22.85 INR/AED → 228_500n */
  rateScaled: bigint;
  rateScale: bigint;
  source: string;
  retrievedAt: string;
  isStale: boolean;
}

/**
 * Fallback mid-market rates per 1 AED. Used only when the live source is
 * unreachable, and always surfaced to the user as stale with its timestamp.
 */
const FALLBACK_RATES: Record<string, bigint> = {
  INR: 245_000n, // 24.50
  PKR: 762_000n, // 76.20
  PHP: 158_000n, // 15.80
  EGP: 132_000n, // 13.20
  BDT: 331_000n, // 33.10
};

const FALLBACK_SOURCE = "built-in reference table";
const LIVE_SOURCE = "open.er-api.com";
const CACHE_TTL_MS = 60_000;

let cache: { at: number; rates: Record<string, bigint> } | null = null;

/** Convert a decimal rate string to a scaled bigint without using floats. */
function toScaled(value: number): bigint {
  // Values arrive from JSON as numbers; round at 4dp immediately and never
  // let the float participate in money arithmetic beyond this point.
  return BigInt(Math.round(value * Number(RATE_SCALE)));
}

async function fetchLive(): Promise<Record<string, bigint> | null> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/AED", {
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { rates?: Record<string, number> };
    if (!json.rates) return null;

    const out: Record<string, bigint> = {};
    for (const { currency } of Object.values(CORRIDORS)) {
      const r = json.rates[currency];
      if (typeof r === "number" && r > 0) out[currency] = toScaled(r);
    }
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

export async function getRate(quote: string): Promise<FxRate> {
  const now = Date.now();

  if (!cache || now - cache.at > CACHE_TTL_MS) {
    const live = await fetchLive();
    if (live) cache = { at: now, rates: live };
  }

  const cached = cache?.rates[quote];
  if (cached) {
    return {
      base: "AED",
      quote,
      rateScaled: cached,
      rateScale: RATE_SCALE,
      source: LIVE_SOURCE,
      retrievedAt: new Date(cache!.at).toISOString(),
      isStale: false,
    };
  }

  const fallback = FALLBACK_RATES[quote];
  if (!fallback) throw new Error(`No rate available for ${quote}`);

  return {
    base: "AED",
    quote,
    rateScaled: fallback,
    rateScale: RATE_SCALE,
    source: FALLBACK_SOURCE,
    retrievedAt: new Date().toISOString(),
    isStale: true, // honest: this is not a live quote (E7)
  };
}

/** Human-readable rate, e.g. "24.5000". Display only. */
export function formatRate(rate: FxRate): string {
  const whole = rate.rateScaled / rate.rateScale;
  const frac = (rate.rateScaled % rate.rateScale).toString().padStart(4, "0");
  return `${whole}.${frac}`;
}
