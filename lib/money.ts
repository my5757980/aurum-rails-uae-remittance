/**
 * Money primitives for Aurum Rails.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS MODULE EXISTS  (read before changing anything here)
 * ─────────────────────────────────────────────────────────────────────────────
 * Arc exposes ONE pool of funds through TWO interfaces:
 *
 *   • Native view   — 18 decimals — used for gas and `msg.value`
 *   • ERC-20 view   —  6 decimals — used for balances, transfers, display
 *
 *   1e18 (native)  ===  1e6 (ERC-20)      <-- the same money, 10^12 apart
 *
 * Circle's own guidance is explicit: never sum the two views, and never treat
 * them as separate assets. Mixing them silently multiplies or divides a payment
 * by one trillion. On a remittance product that is the worst available bug.
 *
 * Defence: `Usdc6` and `Native18` are BRANDED types. They are both `bigint` at
 * runtime with zero overhead, but the compiler refuses to substitute one for the
 * other. Converting requires calling an explicit, named, tested function.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * RULES  (Constitution FR-018)
 * ─────────────────────────────────────────────────────────────────────────────
 *  1. `number` is NEVER used to represent a monetary value. Anywhere. Ever.
 *     JavaScript's `number` is a float64: `0.1 + 0.2 !== 0.3`. Money is integers.
 *  2. All amounts are integer minor units in `bigint`.
 *  3. Parsing goes through `parseUsdc6` / `parseAedFils`, which do exact string
 *     arithmetic. `parseFloat` is banned — it reintroduces the float64 bug.
 *  4. This module is PURE. No env, no I/O, no clock. That keeps it trivially
 *     testable, which is why it can be trusted.
 *
 * @see specs/001-uae-global-remittance/plan.md — risk R9
 * @see specs/001-uae-global-remittance/research.md — R4
 */

declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** USDC in the ERC-20 view: 6 decimals. This is the app's ONLY money type. */
export type Usdc6 = Brand<bigint, "Usdc6">;

/** Arc native/gas view: 18 decimals. Appears ONLY when reading gas cost. */
export type Native18 = Brand<bigint, "Native18">;

/** UAE dirhams in fils: 2 decimals. Display and quoting currency. */
export type AedFils = Brand<bigint, "AedFils">;

/** A destination-currency amount (INR, PKR, PHP…) in its own minor units. */
export type MinorUnits = Brand<bigint, "MinorUnits">;

// ─────────────────────────────────────────────────────────────────────────────
// Scale constants (bigint only — never `number`)
// ─────────────────────────────────────────────────────────────────────────────

export const USDC_DECIMALS = 6n;
export const NATIVE_DECIMALS = 18n;
export const AED_DECIMALS = 2n;

/** 10^12 — the factor between Arc's native view and its ERC-20 view. */
export const NATIVE_PER_USDC6 = 1_000_000_000_000n;

/** 10^6 — minor units per whole USDC. */
export const USDC6_PER_UNIT = 1_000_000n;

/** 10^2 — fils per whole dirham. */
export const FILS_PER_AED = 100n;

/**
 * The AED is pegged to the USD, not floated. Held as an integer scaled by 10^4
 * so peg arithmetic stays exact: 3.6725 AED = 1 USD.
 */
export const AED_PER_USD_SCALED = 36_725n;
export const PEG_SCALE = 10_000n;

// ─────────────────────────────────────────────────────────────────────────────
// Constructors
// ─────────────────────────────────────────────────────────────────────────────

export const usdc6 = (v: bigint): Usdc6 => v as Usdc6;
export const native18 = (v: bigint): Native18 => v as Native18;
export const aedFils = (v: bigint): AedFils => v as AedFils;
export const minorUnits = (v: bigint): MinorUnits => v as MinorUnits;

export const ZERO_USDC6 = usdc6(0n);
export const ZERO_AED = aedFils(0n);

// ─────────────────────────────────────────────────────────────────────────────
// The conversion that this whole module exists to make safe
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Arc native (18dp) → USDC ERC-20 (6dp).
 *
 * Used in exactly one place in the codebase: reading observed gas cost so the
 * fee can be shown to the user. Truncates, because gas cost is already spent —
 * rounding it up would overstate what the user paid.
 */
export function nativeToUsdc6(n: Native18): Usdc6 {
  return usdc6((n as bigint) / NATIVE_PER_USDC6);
}

/** USDC ERC-20 (6dp) → Arc native (18dp). Exact; never loses precision. */
export function usdc6ToNative(u: Usdc6): Native18 {
  return native18((u as bigint) * NATIVE_PER_USDC6);
}

// ─────────────────────────────────────────────────────────────────────────────
// Exact string parsing (never parseFloat)
// ─────────────────────────────────────────────────────────────────────────────

export class MoneyParseError extends Error {
  constructor(input: string, reason: string) {
    super(`Cannot parse "${input}" as a money amount: ${reason}`);
    this.name = "MoneyParseError";
  }
}

/**
 * Parse a decimal string into integer minor units, exactly.
 *
 * Deliberately does NOT use parseFloat. `parseFloat("0.07") * 100` is
 * 7.000000000000001 — the exact class of error that puts a cent of someone's
 * remittance in the wrong place. String arithmetic has no such failure mode.
 *
 * Excess precision is rejected rather than silently rounded: if a caller passes
 * more decimals than the currency has, that is a bug in the caller, and
 * swallowing it would hide a real defect.
 */
function parseDecimalToMinor(input: string, decimals: bigint): bigint {
  const trimmed = input.trim();
  if (trimmed === "") throw new MoneyParseError(input, "empty");
  if (!/^-?\d*(\.\d*)?$/.test(trimmed)) {
    throw new MoneyParseError(input, "not a plain decimal number");
  }

  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [wholeRaw = "", fracRaw = ""] = unsigned.split(".");
  const whole = wholeRaw === "" ? "0" : wholeRaw;

  if (whole === "0" && fracRaw === "" && unsigned.includes(".") === false && wholeRaw === "") {
    throw new MoneyParseError(input, "no digits");
  }

  const places = Number(decimals);
  if (fracRaw.length > places) {
    throw new MoneyParseError(
      input,
      `too many decimal places (max ${places}, got ${fracRaw.length})`,
    );
  }

  const frac = fracRaw.padEnd(places, "0");
  const magnitude = BigInt(whole + frac);
  return negative ? -magnitude : magnitude;
}

export const parseUsdc6 = (s: string): Usdc6 => usdc6(parseDecimalToMinor(s, USDC_DECIMALS));
export const parseAedFils = (s: string): AedFils => aedFils(parseDecimalToMinor(s, AED_DECIMALS));

// ─────────────────────────────────────────────────────────────────────────────
// Formatting
// ─────────────────────────────────────────────────────────────────────────────

function formatMinor(value: bigint, decimals: bigint): string {
  const places = Number(decimals);
  const negative = value < 0n;
  const magnitude = negative ? -value : value;
  const divisor = 10n ** decimals;
  const whole = magnitude / divisor;
  const frac = (magnitude % divisor).toString().padStart(places, "0");
  const sign = negative ? "-" : "";
  return places === 0 ? `${sign}${whole}` : `${sign}${whole}.${frac}`;
}

/** Full precision, e.g. "1.361470". Use for technical detail and receipts. */
export const formatUsdc6 = (v: Usdc6): string => formatMinor(v as bigint, USDC_DECIMALS);

/** e.g. "5.00". Use for all AED display. */
export const formatAedFils = (v: AedFils): string => formatMinor(v as bigint, AED_DECIMALS);

/**
 * Two-decimal USDC for consumer display, e.g. "1.36".
 * Truncates rather than rounds — never show a user more money than they have.
 */
export const formatUsdc6Short = (v: Usdc6): string =>
  formatMinor((v as bigint) / 10_000n, 2n);

/** Format any destination-currency amount given its decimal count. */
export const formatMinorUnits = (v: MinorUnits, decimals: bigint): string =>
  formatMinor(v as bigint, decimals);

// ─────────────────────────────────────────────────────────────────────────────
// Arithmetic (typed — you cannot add dirhams to dollars)
// ─────────────────────────────────────────────────────────────────────────────

export const addUsdc6 = (a: Usdc6, b: Usdc6): Usdc6 => usdc6((a as bigint) + (b as bigint));
export const subUsdc6 = (a: Usdc6, b: Usdc6): Usdc6 => usdc6((a as bigint) - (b as bigint));
export const addAed = (a: AedFils, b: AedFils): AedFils => aedFils((a as bigint) + (b as bigint));

export const gteUsdc6 = (a: Usdc6, b: Usdc6): boolean => (a as bigint) >= (b as bigint);
export const isPositiveUsdc6 = (a: Usdc6): boolean => (a as bigint) > 0n;
export const isZeroUsdc6 = (a: Usdc6): boolean => (a as bigint) === 0n;

/** Divide, rounding half away from zero. Used wherever a fee must be exact. */
function divRoundHalf(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) throw new RangeError("division by zero");
  const negative = numerator < 0n !== denominator < 0n;
  const n = numerator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  const quotient = n / d;
  const remainder = n % d;
  const rounded = remainder * 2n >= d ? quotient + 1n : quotient;
  return negative ? -rounded : rounded;
}

/** Apply a basis-point rate (1 bp = 0.01%). Exact, with half-up rounding. */
export const applyBps = (amount: Usdc6, bps: bigint): Usdc6 =>
  usdc6(divRoundHalf((amount as bigint) * bps, 10_000n));

// ─────────────────────────────────────────────────────────────────────────────
// Currency conversion
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AED → USDC using the fixed USD peg.
 *
 * usdc6 = aedFils * 10^8 / AED_PER_USD_SCALED
 *
 * Derivation: aed = fils/100; usd = aed/peg; usdc6 = usd * 10^6, and
 * peg = AED_PER_USD_SCALED / 10^4. Substituting gives the factor 10^8.
 * Kept as a single expression so there is no intermediate rounding step.
 */
export function aedToUsdc6(amount: AedFils): Usdc6 {
  return usdc6(divRoundHalf((amount as bigint) * 100_000_000n, AED_PER_USD_SCALED));
}

/** USDC → AED at the same fixed peg. */
export function usdc6ToAed(amount: Usdc6): AedFils {
  return aedFils(divRoundHalf((amount as bigint) * AED_PER_USD_SCALED, 100_000_000n));
}

/**
 * AED → a destination currency at a quoted rate.
 *
 * The rate is supplied as an integer scaled by `rateScale`, never as a float,
 * so a rate of 22.85 INR/AED is passed as (228_500n, 10_000n). The caller owns
 * the rate's provenance; this function only does exact arithmetic on it.
 *
 * Result is a SIMULATED landed amount (Constitution II — label it in the UI).
 */
export function aedToDestinationMinor(
  amount: AedFils,
  rateScaled: bigint,
  rateScale: bigint,
  destinationDecimals: bigint,
): MinorUnits {
  const destScale = 10n ** destinationDecimals;
  const numerator = (amount as bigint) * rateScaled * destScale;
  const denominator = rateScale * FILS_PER_AED;
  return minorUnits(divRoundHalf(numerator, denominator));
}
