/**
 * Treasury — Circle Gateway facade.
 *
 * Constitution VII / NFR-011: one of only three modules permitted to import a
 * Circle SDK or call a Circle API directly.
 *
 * Gateway gives a unified USDC balance across chains, which is what lets a
 * business promise a landed amount at quote time rather than discovering
 * mid-run that liquidity sits on the wrong chain (spec pain point P5).
 *
 * HONESTY RULE (Constitution II): if the Gateway API is unreachable or does not
 * return a balance for our depositor, we do NOT fabricate a unified figure. We
 * fall back to the real per-wallet Arc balances and label the source as
 * "arc-only" so the UI can say so plainly.
 */

import "server-only";
import { ARC_CCTP_DOMAIN } from "./chain";
import { addUsdc6, usdc6, type Usdc6 } from "./money";
import { getSenderWallet, getUsdcBalance, listWallets } from "./wallet-service";

const GATEWAY_API =
  process.env.GATEWAY_API_URL ?? "https://gateway-api-testnet.circle.com/v1";

export interface ChainBalance {
  domain: number;
  chain: string;
  usdc6: Usdc6;
}

export interface TreasurySnapshot {
  /** Total spendable USDC. */
  unified: Usdc6;
  perChain: ChainBalance[];
  /** Where the number came from. Rendered to the user — never guessed. */
  source: "gateway" | "arc-only";
  gatewayNote: string | null;
  observedAt: string;
}

let cached: { at: number; snapshot: TreasurySnapshot } | null = null;
const CACHE_MS = 30_000;

/**
 * Ask Gateway for a unified balance.
 * Returns null on any failure — the caller degrades honestly rather than lying.
 */
async function tryGateway(depositor: string): Promise<{
  unified: Usdc6;
  perChain: ChainBalance[];
} | null> {
  try {
    const res = await fetch(`${GATEWAY_API}/balances`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "USDC", depositor }),
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    if (!res.ok) return null;

    const json = (await res.json()) as {
      balances?: { domain?: number; chain?: string; balance?: string }[];
    };
    if (!json.balances?.length) return null;

    const perChain: ChainBalance[] = json.balances.map((b) => ({
      domain: Number(b.domain ?? 0),
      chain: String(b.chain ?? `domain ${b.domain}`),
      // Gateway returns decimal USDC strings; keep them exact.
      usdc6: usdc6(BigInt(Math.round(Number(b.balance ?? "0") * 1_000_000))),
    }));

    return {
      unified: perChain.reduce((sum, c) => addUsdc6(sum, c.usdc6), usdc6(0n)),
      perChain,
    };
  } catch {
    return null;
  }
}

export async function getTreasury(): Promise<TreasurySnapshot> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.snapshot;

  const treasuryWallet = await getSenderWallet();
  const gateway = await tryGateway(treasuryWallet.address);

  let snapshot: TreasurySnapshot;

  if (gateway) {
    snapshot = {
      unified: gateway.unified,
      perChain: gateway.perChain,
      source: "gateway",
      gatewayNote: null,
      observedAt: new Date().toISOString(),
    };
  } else {
    // Real Arc balances across the wallet set. Not a unified cross-chain view —
    // and the UI is told exactly that.
    const wallets = await listWallets();
    const balances = await Promise.all(
      wallets.map(async (w) => await getUsdcBalance(w.id)),
    );
    const total = balances.reduce((sum, b) => addUsdc6(sum, b), usdc6(0n));

    snapshot = {
      unified: total,
      perChain: [{ domain: ARC_CCTP_DOMAIN, chain: "Arc Testnet", usdc6: total }],
      source: "arc-only",
      gatewayNote:
        "Gateway did not return a balance for this depositor, so this shows real " +
        "Arc Testnet balances only — not a unified cross-chain view.",
      observedAt: new Date().toISOString(),
    };
  }

  cached = { at: Date.now(), snapshot };
  return snapshot;
}
