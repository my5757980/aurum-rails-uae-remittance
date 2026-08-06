/**
 * T003 — BLOCKING SPIKE: move real USDC on Arc Testnet.
 *
 * This is the single most important script in the repository. Until it prints a
 * transaction hash that resolves on https://testnet.arcscan.app, nothing else in
 * the plan matters — the entire submission rests on this capability.
 *
 * WHAT IT DOES
 *   1. Creates (or reuses) a Circle wallet set
 *   2. Creates two ARC-TESTNET wallets — a sender and a recipient
 *   3. Reads the sender's USDC balance
 *   4. Transfers a small amount sender -> recipient
 *   5. Polls until the transaction reaches a terminal state
 *   6. Prints the Arc explorer URL
 *
 * RUN
 *   npm run spike:send
 *
 * FIRST RUN will create wallets and then stop, telling you to fund the sender
 * from https://faucet.circle.com. Fund it, then run again to perform the transfer.
 *
 * @see specs/001-uae-global-remittance/tasks.md — T003
 */

import "dotenv/config";
import { config as loadEnv } from "dotenv";
import {
  initiateDeveloperControlledWalletsClient,
  type Blockchain,
} from "@circle-fin/developer-controlled-wallets";
import { randomUUID } from "node:crypto";
import {
  ARC_BLOCKCHAIN,
  ARC_USDC_TOKEN_ID,
  assertArcBlockchain,
  explorerTxUrl,
  explorerAddressUrl,
  ARC_FAUCET_URL,
} from "../lib/chain";
import { parseUsdc6, formatUsdc6, usdc6, gteUsdc6 } from "../lib/money";

// .env.local takes precedence in Next.js projects; dotenv/config only reads .env
loadEnv({ path: ".env.local", override: true });

const AMOUNT_TO_SEND = "0.01"; // deliberately tiny — faucet gives ~1 USDC/day (R2)
const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 120_000;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`\n❌ Missing ${name}. Copy .env.example to .env.local and fill it in.\n`);
    process.exit(1);
  }
  return value;
}

const log = (...args: unknown[]) => console.log(...args);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  log("\n══════════════════════════════════════════════════════════════");
  log("  T003 SPIKE — real USDC transfer on Arc Testnet (5042002)");
  log("══════════════════════════════════════════════════════════════\n");

  const apiKey = requireEnv("CIRCLE_API_KEY");
  const entitySecret = requireEnv("CIRCLE_ENTITY_SECRET");
  const blockchain = process.env.CIRCLE_BLOCKCHAIN ?? ARC_BLOCKCHAIN;
  const accountType = (process.env.CIRCLE_ACCOUNT_TYPE ?? "SCA") as "SCA" | "EOA";

  // Constitution I — refuse to run against anything but Arc Testnet.
  assertArcBlockchain(blockchain);
  log(`✓ Chain guard passed: ${blockchain}`);
  log(`  Account type: ${accountType}`);
  log(`  USDC token id: ${ARC_USDC_TOKEN_ID}\n`);

  const sdk = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });

  // ── 1. Wallet set ──────────────────────────────────────────────────────────
  let walletSetId = process.env.CIRCLE_WALLET_SET_ID;
  if (!walletSetId) {
    log("→ Creating a wallet set…");
    const created = await sdk.createWalletSet({ name: "aurum-rails-spike" });
    walletSetId = created.data?.walletSet?.id;
    if (!walletSetId) throw new Error("Circle returned no wallet set id");
    log(`✓ Wallet set created: ${walletSetId}`);
    log(`\n  ⚠️  Add this to .env.local so future runs reuse it:`);
    log(`      CIRCLE_WALLET_SET_ID=${walletSetId}\n`);
  } else {
    log(`✓ Reusing wallet set: ${walletSetId}`);
  }

  // ── 2. Wallets ─────────────────────────────────────────────────────────────
  log("→ Listing existing wallets…");
  const existing = await sdk.listWallets({ walletSetId });
  let wallets = existing.data?.wallets ?? [];

  if (wallets.length < 2) {
    log(`→ Creating ${2 - wallets.length} wallet(s) on ${blockchain}…`);
    const created = await sdk.createWallets({
      walletSetId,
      blockchains: [blockchain as Blockchain],
      count: 2 - wallets.length,
      accountType,
    });
    wallets = [...wallets, ...(created.data?.wallets ?? [])];
  }

  // listWallets does NOT guarantee ordering — an earlier version took wallets[0]
  // as the sender and got a different wallet on each run, so the funded address
  // silently became the recipient. Sort by address for a stable assignment.
  wallets = [...wallets].sort((a, b) => (a.address ?? "").localeCompare(b.address ?? ""));

  const [sender, recipient] = wallets;
  if (!sender?.address || !recipient?.address) {
    throw new Error("Could not obtain two wallets with addresses");
  }

  log(`✓ Sender    ${sender.address}`);
  log(`  ${explorerAddressUrl(sender.address)}`);
  log(`✓ Recipient ${recipient.address}\n`);

  // ── 3. Balance ─────────────────────────────────────────────────────────────
  log("→ Reading sender USDC balance…");
  const balances = await sdk.getWalletTokenBalance({ id: sender.id });
  const usdcBalance = balances.data?.tokenBalances?.find(
    (b) => b.token?.symbol === "USDC" || b.token?.id === ARC_USDC_TOKEN_ID,
  );
  const balance = usdcBalance ? parseUsdc6(usdcBalance.amount ?? "0") : usdc6(0n);
  log(`✓ Balance: ${formatUsdc6(balance)} USDC`);

  const required = parseUsdc6(AMOUNT_TO_SEND);
  if (!gteUsdc6(balance, required)) {
    log(`\n──────────────────────────────────────────────────────────────`);
    log(`  ⛽ FUND THE SENDER, THEN RUN THIS AGAIN`);
    log(`──────────────────────────────────────────────────────────────`);
    log(`  1. Open ${ARC_FAUCET_URL}`);
    log(`  2. Select "Arc Testnet"`);
    log(`  3. Paste: ${sender.address}`);
    log(`  4. Re-run: npm run spike:send`);
    log(`\n  The faucet gives 20 USDC per address every 2 hours (verified at`);
    log(`  faucet.circle.com — NOT the ~1 USDC/day some sources claim).\n`);
    process.exit(2);
  }

  // ── 4. Transfer ────────────────────────────────────────────────────────────
  const idempotencyKey = randomUUID();
  log(`\n→ Sending ${AMOUNT_TO_SEND} USDC…`);
  log(`  idempotencyKey: ${idempotencyKey}`);

  const tx = await sdk.createTransaction({
    walletId: sender.id,
    tokenId: ARC_USDC_TOKEN_ID,
    destinationAddress: recipient.address,
    // NOTE: the SDK field is `amount` (singular) but takes a string ARRAY.
    // Easy to get wrong; worth flagging in Circle Product Feedback (T085).
    amount: [AMOUNT_TO_SEND],
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    idempotencyKey,
  });

  const txId = tx.data?.id;
  if (!txId) throw new Error("Circle returned no transaction id");
  log(`✓ Submitted. Circle transaction id: ${txId}`);

  // ── 5. Poll to a terminal state ────────────────────────────────────────────
  log("\n→ Polling for confirmation…");
  const started = Date.now();
  const terminal = new Set(["COMPLETE", "FAILED", "DENIED", "CANCELLED"]);
  let state = "INITIATED";
  let txHash: string | undefined;

  while (Date.now() - started < POLL_TIMEOUT_MS) {
    await sleep(POLL_INTERVAL_MS);
    const current = await sdk.getTransaction({ id: txId });
    const t = current.data?.transaction;
    if (!t) continue;

    if (t.state !== state) {
      const elapsed = ((Date.now() - started) / 1000).toFixed(1);
      log(`  [${elapsed}s] ${state} → ${t.state}`);
      state = t.state ?? state;
    }
    if (t.txHash) txHash = t.txHash;
    if (terminal.has(state)) break;
  }

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  log("\n══════════════════════════════════════════════════════════════");

  if (state === "COMPLETE" && txHash) {
    log(`  ✅ SPIKE PASSED — T003 is GREEN`);
    log("══════════════════════════════════════════════════════════════");
    log(`  Settled in ${elapsed}s`);
    log(`  Tx hash: ${txHash}`);
    log(`  Explorer: ${explorerTxUrl(txHash)}`);
    log(`\n  Open that URL. If the transaction is there, the foundation of`);
    log(`  this submission is proven and Day 1 can proceed.\n`);
    return;
  }

  log(`  ❌ SPIKE DID NOT COMPLETE`);
  log("══════════════════════════════════════════════════════════════");
  log(`  Final state: ${state} after ${elapsed}s`);
  if (txHash) log(`  Tx hash: ${txHash} → ${explorerTxUrl(txHash)}`);
  log(`\n  Per tasks.md this is a STOP condition. Record the exact error in`);
  log(`  docs/circle-feedback-notes.md before changing anything — a`);
  log(`  reproducible failure is itself a submission deliverable (SC-016).\n`);
  process.exit(1);
}

main().catch((error: unknown) => {
  console.error("\n❌ Spike threw:\n", error);
  console.error(
    "\nIf this is an auth error, re-check CIRCLE_API_KEY and that the entity " +
      "secret has been REGISTERED (not merely generated).\n",
  );
  process.exit(1);
});
