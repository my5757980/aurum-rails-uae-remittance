/**
 * T006 — can App Kit / CCTP actually bridge USDC off Arc Testnet?
 *
 * spec.md §6.4 recorded risk R1 from third-party reports claiming the Bridge SDK
 * would not route Arc. research.md R1 then found Circle's own docs contradicting
 * that. This script settles it against the live API.
 *
 *   npm run spike:bridge
 *
 * Either outcome is a deliverable: a working bridge completes User Story 3, and
 * a reproducible failure is exactly the specific feedback SC-016 asks for.
 *
 * ON CONSTITUTION I: the guard exists to keep us off MAINNET. Cross-chain
 * delivery inherently needs a second chain, and the spec's User Story 3 names
 * Base Sepolia. Every chain touched here is a testnet, and the allowlist below
 * makes that explicit rather than implicit.
 */

import "dotenv/config";
import { config as loadEnv } from "dotenv";
import {
  initiateDeveloperControlledWalletsClient,
  type Blockchain,
} from "@circle-fin/developer-controlled-wallets";
import { AppKit, type BridgeChain } from "@circle-fin/app-kit";
import { createCircleWalletsAdapter } from "@circle-fin/adapter-circle-wallets";
import { formatUsdc6, parseUsdc6, gteUsdc6 } from "../lib/money";

loadEnv({ path: ".env.local", override: true });

/** Testnets only. Adding a mainnet here would violate Constitution I. */
const TESTNET_BRIDGE_CHAINS: Record<string, { circle: string; bridge: string }> = {
  ARC: { circle: "ARC-TESTNET", bridge: "Arc_Testnet" },
  BASE: { circle: "BASE-SEPOLIA", bridge: "Base_Sepolia" },
};

const AMOUNT = "0.05";
const log = (...a: unknown[]) => console.log(...a);

async function main() {
  log("\n══════════════════════════════════════════════════════════════");
  log("  T006 SPIKE — bridge USDC off Arc Testnet via App Kit / CCTP");
  log("══════════════════════════════════════════════════════════════\n");

  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
  const walletSetId = process.env.CIRCLE_WALLET_SET_ID;
  if (!apiKey || !entitySecret || !walletSetId) {
    log("❌ Missing Circle config. Run: npm run spike:send\n");
    process.exit(1);
  }

  const sdk = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });

  // ── Source: the funded Arc wallet ──────────────────────────────────────────
  const all = await sdk.listWallets({ walletSetId });
  const arcWallets = (all.data?.wallets ?? []).filter(
    (w) => w.blockchain === TESTNET_BRIDGE_CHAINS.ARC!.circle && w.id && w.address,
  );
  if (!arcWallets.length) {
    log("❌ No Arc wallets found.\n");
    process.exit(1);
  }

  let source = arcWallets[0]!;
  let sourceBalance = parseUsdc6("0");
  for (const w of arcWallets) {
    const b = await sdk.getWalletTokenBalance({ id: w.id! });
    const usdc = b.data?.tokenBalances?.find((t) => t.token?.symbol === "USDC");
    const amt = usdc?.amount ? parseUsdc6(usdc.amount) : parseUsdc6("0");
    if (gteUsdc6(amt, sourceBalance)) {
      sourceBalance = amt;
      source = w;
    }
  }
  log(`✓ Source (Arc)  ${source.address}`);
  log(`  balance       ${formatUsdc6(sourceBalance)} USDC`);

  if (!gteUsdc6(sourceBalance, parseUsdc6(AMOUNT))) {
    log(`\n⛽ Need at least ${AMOUNT} USDC. Fund ${source.address} at`);
    log(`   https://faucet.circle.com (Arc Testnet), then re-run.\n`);
    process.exit(2);
  }

  // ── Destination: a Base Sepolia wallet in the same set ─────────────────────
  const baseCircle = TESTNET_BRIDGE_CHAINS.BASE!.circle;
  let dest = (all.data?.wallets ?? []).find((w) => w.blockchain === baseCircle);

  if (!dest) {
    log(`\n→ Creating a ${baseCircle} wallet for the destination…`);
    try {
      const created = await sdk.createWallets({
        walletSetId,
        blockchains: [baseCircle as Blockchain],
        count: 1,
        accountType: (process.env.CIRCLE_ACCOUNT_TYPE ?? "SCA") as "SCA" | "EOA",
      });
      dest = created.data?.wallets?.[0];
    } catch (e) {
      log(`❌ Could not create a ${baseCircle} wallet: ${e instanceof Error ? e.message : e}`);
      log("   Recording as a finding — see docs/circle-feedback-notes.md\n");
      process.exit(1);
    }
  }
  if (!dest?.address) {
    log("❌ No destination address.\n");
    process.exit(1);
  }
  log(`✓ Destination   ${dest.address}  (${baseCircle})`);

  // ── Bridge ─────────────────────────────────────────────────────────────────
  log(`\n→ Bridging ${AMOUNT} USDC  Arc_Testnet → Base_Sepolia  (CCTP v2 FAST)…`);
  log("   This blocks until burn + attestation + mint complete (~8–20s expected).\n");

  const kit = new AppKit();
  const adapter = createCircleWalletsAdapter({ apiKey, entitySecret });
  const started = Date.now();

  try {
    const result = await kit.bridge({
      from: {
        adapter,
        chain: TESTNET_BRIDGE_CHAINS.ARC!.bridge as BridgeChain,
        address: source.address!,
      },
      to: {
        adapter,
        chain: TESTNET_BRIDGE_CHAINS.BASE!.bridge as BridgeChain,
        address: dest.address,
      },
      amount: AMOUNT,
      token: "USDC",
      config: { transferSpeed: "FAST" },
    });

    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    log("══════════════════════════════════════════════════════════════");
    log(`  ✅ T006 GREEN — Arc IS bridgeable. Risk R1 closed.`);
    log("══════════════════════════════════════════════════════════════");
    log(`  state    : ${result.state}`);
    log(`  elapsed  : ${elapsed}s`);
    for (const [i, s] of (result.steps ?? []).entries()) {
      log(`  step ${i + 1}   : ${s.name ?? "step"}  ${s.txHash ?? ""}`);
    }
    log("");
  } catch (error) {
    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    const message = error instanceof Error ? error.message : String(error);
    log("══════════════════════════════════════════════════════════════");
    log(`  ⚠️  T006 RED — bridge did not complete after ${elapsed}s`);
    log("══════════════════════════════════════════════════════════════");
    log(`  ${message}\n`);
    log("  This is a DELIVERABLE, not a dead end. Record it verbatim in");
    log("  docs/circle-feedback-notes.md — a reproducible limitation is");
    log("  exactly the specific feedback SC-016 asks for.\n");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("\n❌ Spike threw:\n", e);
  process.exit(1);
});
