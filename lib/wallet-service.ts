/**
 * Circle Developer-Controlled Wallets facade.
 *
 * Constitution VII / NFR-011: this is one of only three modules permitted to
 * import a Circle SDK. Nothing here may ever run in the browser.
 *
 * Verified working against Arc Testnet on 2026-08-06 — see PHR 0006, tx
 * 0xd14becde94da34821a251939d8637e5ef5aab62e230aee66cbf91c26c111a646.
 */

import "server-only";
import {
  initiateDeveloperControlledWalletsClient,
  type Blockchain,
} from "@circle-fin/developer-controlled-wallets";
import { ARC_BLOCKCHAIN, ARC_USDC_TOKEN_ID, assertArcBlockchain } from "./chain";
import { parseUsdc6, usdc6, formatUsdc6, type Usdc6 } from "./money";

export interface WalletInfo {
  id: string;
  address: string;
}

let client: ReturnType<typeof initiateDeveloperControlledWalletsClient> | null = null;

function sdk() {
  if (!client) {
    const apiKey = process.env.CIRCLE_API_KEY;
    const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
    if (!apiKey || !entitySecret) {
      throw new Error(
        "Missing CIRCLE_API_KEY or CIRCLE_ENTITY_SECRET. Copy .env.example to .env.local.",
      );
    }
    client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });
  }
  return client;
}

const blockchain = (): Blockchain => {
  const b = process.env.CIRCLE_BLOCKCHAIN ?? ARC_BLOCKCHAIN;
  assertArcBlockchain(b); // Constitution I — hard fail off Arc
  return b as Blockchain;
};

const accountType = (): "SCA" | "EOA" =>
  (process.env.CIRCLE_ACCOUNT_TYPE ?? "SCA") as "SCA" | "EOA";

function walletSetId(): string {
  const id = process.env.CIRCLE_WALLET_SET_ID;
  if (!id) throw new Error("CIRCLE_WALLET_SET_ID is not set. Run: npm run spike:send");
  return id;
}

/**
 * All wallets in the set, sorted by address.
 *
 * The sort is load-bearing: `listWallets` does NOT guarantee ordering, and an
 * earlier version that took wallets[0] silently swapped sender and recipient
 * between runs. See PHR 0006.
 */
export async function listWallets(): Promise<WalletInfo[]> {
  const res = await sdk().listWallets({ walletSetId: walletSetId() });
  return (res.data?.wallets ?? [])
    .filter((w): w is typeof w & { id: string; address: string } =>
      Boolean(w.id && w.address),
    )
    .map((w) => ({ id: w.id, address: w.address }))
    .sort((a, b) => a.address.localeCompare(b.address));
}

/**
 * The demo treasury wallet — the one payments are sent FROM.
 *
 * An earlier version returned `wallets[0]` sorted by address. That was a real
 * bug: adding a recipient mints a new wallet, which can sort ahead of the funded
 * one, silently making an empty wallet the treasury and dropping the visible
 * balance to zero. Selection must not depend on how many recipients exist.
 *
 * Resolution order:
 *   1. CIRCLE_TREASURY_WALLET_ID, if pinned — deterministic, preferred.
 *   2. Otherwise the wallet holding the most USDC. Self-healing, so a judge who
 *      funds any address from the faucet gets a working demo without editing env.
 */
export async function getSenderWallet(): Promise<WalletInfo> {
  const wallets = await listWallets();
  if (!wallets.length) {
    throw new Error("No wallets found in the wallet set. Run: npm run spike:send");
  }

  const pinned = process.env.CIRCLE_TREASURY_WALLET_ID;
  if (pinned) {
    const match = wallets.find((w) => w.id === pinned);
    if (match) return match;
    // Pinned but missing: fall through rather than fail the whole app.
  }

  const balances = await Promise.all(
    wallets.map(async (w) => ({ wallet: w, balance: await getUsdcBalance(w.id) })),
  );
  balances.sort((a, b) =>
    (b.balance as bigint) > (a.balance as bigint)
      ? 1
      : (b.balance as bigint) < (a.balance as bigint)
        ? -1
        : 0,
  );
  return balances[0]!.wallet;
}

/** Create a fresh wallet, e.g. for a new recipient. */
export async function createWallet(): Promise<WalletInfo> {
  const res = await sdk().createWallets({
    walletSetId: walletSetId(),
    blockchains: [blockchain()],
    count: 1,
    accountType: accountType(),
  });
  const w = res.data?.wallets?.[0];
  if (!w?.id || !w.address) throw new Error("Circle returned no wallet");
  return { id: w.id, address: w.address };
}

/**
 * Create a wallet on a specific chain, for cross-chain delivery (US3).
 *
 * Deliberately does NOT go through the Arc guard: this is the one path that
 * legitimately needs another chain. Callers must pass a chain from
 * `lib/bridge.ts` DESTINATIONS, which is a testnet-only allowlist — that is
 * where Constitution I's no-mainnet rule is enforced for this path.
 */
export async function createWalletOn(circleChain: string): Promise<WalletInfo> {
  const res = await sdk().createWallets({
    walletSetId: walletSetId(),
    blockchains: [circleChain as Blockchain],
    count: 1,
    accountType: accountType(),
  });
  const w = res.data?.wallets?.[0];
  if (!w?.id || !w.address) throw new Error(`Circle returned no wallet for ${circleChain}`);
  return { id: w.id, address: w.address };
}

/** USDC balance. Uses the dedicated balance endpoint, not getWallet. */
export async function getUsdcBalance(walletId: string): Promise<Usdc6> {
  const res = await sdk().getWalletTokenBalance({ id: walletId });
  const entry = res.data?.tokenBalances?.find(
    (b) => b.token?.symbol === "USDC" || b.token?.id === ARC_USDC_TOKEN_ID,
  );
  return entry?.amount ? parseUsdc6(entry.amount) : usdc6(0n);
}

export interface SubmitResult {
  circleTransactionId: string;
}

/**
 * Submit a USDC transfer on Arc.
 *
 * `idempotencyKey` is OUR transfer id, so FR-014 and Circle's exactly-once
 * guarantee are the same key rather than two that can disagree.
 */
export async function submitTransfer(params: {
  fromWalletId: string;
  toAddress: string;
  amount: Usdc6;
  idempotencyKey: string;
}): Promise<SubmitResult> {
  const res = await sdk().createTransaction({
    walletId: params.fromWalletId,
    tokenId: ARC_USDC_TOKEN_ID,
    destinationAddress: params.toAddress,
    // SDK quirk: the field is `amount` (singular) but takes a string ARRAY.
    amount: [formatUsdc6(params.amount)],
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    idempotencyKey: params.idempotencyKey,
  });
  const id = res.data?.id;
  if (!id) throw new Error("Circle returned no transaction id");
  return { circleTransactionId: id };
}

export interface CircleTxStatus {
  state: string;
  txHash?: string;
}

export async function getTransactionStatus(id: string): Promise<CircleTxStatus> {
  const res = await sdk().getTransaction({ id });
  const t = res.data?.transaction;
  return { state: t?.state ?? "UNKNOWN", txHash: t?.txHash };
}
