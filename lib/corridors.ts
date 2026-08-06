/**
 * UAE → Global corridors.
 *
 * The sender is always in the UAE (AED). Destinations are the highest-volume
 * UAE remittance corridors: India, Pakistan, Philippines, Egypt, Bangladesh.
 *
 * @see specs/001-uae-global-remittance/spec.md §1.1
 */

export interface Corridor {
  code: string;
  country: string;
  flag: string;
  currency: string;
  currencySymbol: string;
  decimals: bigint;
  /** Typical exchange-house fee, for the sourced comparison panel (FR-032). */
  incumbentFeeAed: number;
  /** Typical hidden FX margin taken by incumbents, in basis points. */
  incumbentSpreadBps: number;
  incumbentDays: string;
}

export const CORRIDORS: Record<string, Corridor> = {
  IN: {
    code: "IN",
    country: "India",
    flag: "🇮🇳",
    currency: "INR",
    currencySymbol: "₹",
    decimals: 2n,
    incumbentFeeAed: 15,
    incumbentSpreadBps: 150,
    incumbentDays: "1–2 days",
  },
  PK: {
    code: "PK",
    country: "Pakistan",
    flag: "🇵🇰",
    currency: "PKR",
    currencySymbol: "₨",
    decimals: 2n,
    incumbentFeeAed: 18,
    incumbentSpreadBps: 175,
    incumbentDays: "1–3 days",
  },
  PH: {
    code: "PH",
    country: "Philippines",
    flag: "🇵🇭",
    currency: "PHP",
    currencySymbol: "₱",
    decimals: 2n,
    incumbentFeeAed: 20,
    incumbentSpreadBps: 200,
    incumbentDays: "1–3 days",
  },
  EG: {
    code: "EG",
    country: "Egypt",
    flag: "🇪🇬",
    currency: "EGP",
    currencySymbol: "E£",
    decimals: 2n,
    incumbentFeeAed: 22,
    incumbentSpreadBps: 220,
    incumbentDays: "2–3 days",
  },
  BD: {
    code: "BD",
    country: "Bangladesh",
    flag: "🇧🇩",
    currency: "BDT",
    currencySymbol: "৳",
    decimals: 2n,
    incumbentFeeAed: 20,
    incumbentSpreadBps: 190,
    incumbentDays: "2–3 days",
  },
};

export const CORRIDOR_LIST = Object.values(CORRIDORS);

export const getCorridor = (code: string): Corridor => {
  const c = CORRIDORS[code];
  if (!c) throw new Error(`Unknown corridor: ${code}`);
  return c;
};
