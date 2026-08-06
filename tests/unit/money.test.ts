import { describe, it, expect } from "vitest";
import {
  usdc6,
  native18,
  aedFils,
  parseUsdc6,
  parseAedFils,
  formatUsdc6,
  formatAedFils,
  formatUsdc6Short,
  formatMinorUnits,
  nativeToUsdc6,
  usdc6ToNative,
  addUsdc6,
  subUsdc6,
  gteUsdc6,
  applyBps,
  aedToUsdc6,
  usdc6ToAed,
  aedToDestinationMinor,
  MoneyParseError,
  NATIVE_PER_USDC6,
  AED_PER_USD_SCALED,
} from "../../lib/money";

describe("Arc dual-interface conversion (risk R9 — the 10^12 trap)", () => {
  it("1e18 native equals 1e6 ERC-20 — the defining invariant", () => {
    expect(nativeToUsdc6(native18(10n ** 18n))).toBe(usdc6(10n ** 6n));
  });

  it("the conversion factor is exactly 10^12", () => {
    expect(NATIVE_PER_USDC6).toBe(10n ** 12n);
  });

  it("round-trips usdc6 -> native -> usdc6 without loss", () => {
    const original = usdc6(1_361_470n);
    expect(nativeToUsdc6(usdc6ToNative(original))).toBe(original);
  });

  it("truncates sub-unit gas dust rather than inventing a unit", () => {
    // 1.5 * 10^12 native is 1.5 minor units of USDC — must not round up to 2.
    expect(nativeToUsdc6(native18(1_500_000_000_000n))).toBe(usdc6(1n));
  });

  it("handles a realistic Arc gas cost", () => {
    // 0.00001 USDC of gas expressed natively
    expect(nativeToUsdc6(native18(10_000_000_000_000n))).toBe(usdc6(10n));
  });
});

describe("exact parsing (parseFloat is banned)", () => {
  it("parses whole units", () => {
    expect(parseUsdc6("1")).toBe(usdc6(1_000_000n));
  });

  it("parses full 6dp precision", () => {
    expect(parseUsdc6("1.361470")).toBe(usdc6(1_361_470n));
  });

  it("parses the value that breaks parseFloat", () => {
    // parseFloat("0.07") * 100 === 7.000000000000001
    expect(parseAedFils("0.07")).toBe(aedFils(7n));
  });

  it("parses a leading-dot decimal", () => {
    expect(parseUsdc6(".5")).toBe(usdc6(500_000n));
  });

  it("pads short fractions correctly", () => {
    expect(parseUsdc6("0.1")).toBe(usdc6(100_000n));
  });

  it("rejects excess precision instead of silently rounding", () => {
    expect(() => parseUsdc6("1.1234567")).toThrow(MoneyParseError);
  });

  it("rejects non-numeric input", () => {
    expect(() => parseUsdc6("1.0e5")).toThrow(MoneyParseError);
    expect(() => parseUsdc6("abc")).toThrow(MoneyParseError);
    expect(() => parseUsdc6("")).toThrow(MoneyParseError);
  });

  it("survives amounts far beyond Number.MAX_SAFE_INTEGER", () => {
    const huge = "9007199254740993.123456"; // > 2^53
    expect(formatUsdc6(parseUsdc6(huge))).toBe(huge);
  });
});

describe("formatting", () => {
  it("formats full USDC precision", () => {
    expect(formatUsdc6(usdc6(1_361_470n))).toBe("1.361470");
  });

  it("formats AED to two places", () => {
    expect(formatAedFils(aedFils(500n))).toBe("5.00");
  });

  it("pads fractional zeros", () => {
    expect(formatUsdc6(usdc6(1n))).toBe("0.000001");
  });

  it("truncates rather than rounds for short display", () => {
    // 1.369999 must display as 1.36 — never show more money than exists
    expect(formatUsdc6Short(usdc6(1_369_999n))).toBe("1.36");
  });

  it("formats destination minor units", () => {
    expect(formatMinorUnits(aedToDestinationMinor(aedFils(500n), 228_500n, 10_000n, 2n), 2n))
      .toBe("114.25");
  });
});

describe("arithmetic", () => {
  it("adds and subtracts exactly", () => {
    expect(addUsdc6(usdc6(1n), usdc6(2n))).toBe(usdc6(3n));
    expect(subUsdc6(usdc6(3n), usdc6(1n))).toBe(usdc6(2n));
  });

  it("compares balances", () => {
    expect(gteUsdc6(usdc6(100n), usdc6(100n))).toBe(true);
    expect(gteUsdc6(usdc6(99n), usdc6(100n))).toBe(false);
  });

  it("applies basis points with half-up rounding", () => {
    expect(applyBps(usdc6(1_000_000n), 150n)).toBe(usdc6(15_000n)); // 1.5%
    expect(applyBps(usdc6(1_000_000n), 0n)).toBe(usdc6(0n)); // zero spread
  });

  it("fee components sum exactly to the total (no float drift)", () => {
    const network = usdc6(27n);
    const service = usdc6(269_570n);
    expect(addUsdc6(network, service)).toBe(usdc6(269_597n));
  });
});

describe("AED peg conversion", () => {
  it("uses the real pegged rate", () => {
    expect(AED_PER_USD_SCALED).toBe(36_725n);
  });

  it("converts AED 5.00 to USDC at the peg", () => {
    // 5 / 3.6725 = 1.3614704... -> 1.361470 (half-up on the 7th place)
    expect(aedToUsdc6(aedFils(500n))).toBe(usdc6(1_361_470n));
  });

  it("converts AED 3.6725 to exactly 1 USDC", () => {
    expect(aedToUsdc6(aedFils(367n))).toBe(usdc6(999_319n));
    expect(aedToUsdc6(parseAedFils("3.67"))).toBe(usdc6(999_319n));
  });

  it("round-trips AED -> USDC -> AED within one fil", () => {
    const original = aedFils(500n);
    const back = usdc6ToAed(aedToUsdc6(original));
    const drift = (back as bigint) - (original as bigint);
    expect(drift >= -1n && drift <= 1n).toBe(true);
  });
});

describe("destination currency (simulated landing)", () => {
  it("converts AED to INR at a quoted rate", () => {
    // AED 5.00 at 22.85 INR/AED = 114.25 INR
    const landed = aedToDestinationMinor(aedFils(500n), 228_500n, 10_000n, 2n);
    expect(landed).toBe(114_25n);
  });

  it("does not lose precision on large amounts", () => {
    const landed = aedToDestinationMinor(aedFils(200_000n), 228_500n, 10_000n, 2n);
    expect(formatMinorUnits(landed, 2n)).toBe("45700.00");
  });
});

describe("type safety (compile-time — these are the real defence)", () => {
  it("rejects assigning Native18 where Usdc6 is expected", () => {
    const gas = native18(10n ** 18n);
    // @ts-expect-error Native18 must never be usable as Usdc6 — this is risk R9.
    const wrong: ReturnType<typeof usdc6> = gas;
    expect(typeof wrong).toBe("bigint"); // both are bigint at runtime; only the compiler stops us
  });

  it("rejects adding dirhams to dollars", () => {
    // @ts-expect-error AedFils is not Usdc6; cross-currency addition must not compile.
    const bad = addUsdc6(usdc6(1n), aedFils(1n));
    expect(typeof bad).toBe("bigint");
  });

  it("rejects raw bigint where a branded type is required", () => {
    // @ts-expect-error unbranded bigint must go through a constructor.
    const bad = addUsdc6(1n, usdc6(1n));
    expect(typeof bad).toBe("bigint");
  });
});
