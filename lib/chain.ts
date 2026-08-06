/**
 * Arc Testnet configuration and the network guard.
 *
 * Constitution Principle I: everything runs on Arc Testnet, chain 5042002.
 * No mainnet endpoint, key, or chain id may exist anywhere in this repository.
 *
 * NOTE ON NAMING: the upstream sample ships `lib/chains.ts` (plural) holding the
 * multi-chain lookup tables. This module deliberately does NOT duplicate those
 * tables — it imports them, so there is exactly one source of truth for every
 * contract address. What this module adds is the Aurum Rails guard layer:
 * a single canonical chain id, an explorer URL builder, and `assertArcTestnet`,
 * which every wallet-touching code path must call.
 *
 * @see specs/001-uae-global-remittance/plan.md §2, Constitution Gate 1
 */

import {
  SupportedChainId,
  CHAIN_IDS_TO_USDC_ADDRESSES,
  CHAIN_IDS_TO_USDC_TOKEN_ID,
  CHAIN_TO_CHAIN_NAME,
} from "./chains";

// ─────────────────────────────────────────────────────────────────────────────
// Canonical Arc Testnet constants — verified against circlefin/skills `use-arc`
// ─────────────────────────────────────────────────────────────────────────────

/** The only chain this application may ever transact on. */
export const ARC_CHAIN_ID = SupportedChainId.ARC_TESTNET; // 5042002

/** Circle's blockchain identifier, as accepted by the Wallets API. */
export const ARC_BLOCKCHAIN = "ARC-TESTNET" as const;

/** App Kit / Bridge Kit identifier for the same network. */
export const ARC_BRIDGE_CHAIN = "Arc_Testnet" as const;

export const ARC_RPC_URL = "https://rpc.testnet.arc.network";
export const ARC_WSS_URL = "wss://rpc.testnet.arc.network";
export const ARC_EXPLORER_URL = "https://testnet.arcscan.app";
export const ARC_FAUCET_URL = "https://faucet.circle.com";

/** CCTP V2 domain for Arc Testnet. */
export const ARC_CCTP_DOMAIN = 26;

/** USDC on Arc. It is BOTH the ERC-20 token and the native gas asset. */
export const ARC_USDC_ADDRESS = CHAIN_IDS_TO_USDC_ADDRESSES[SupportedChainId.ARC_TESTNET];

/** Circle's token id for USDC on Arc Testnet. */
export const ARC_USDC_TOKEN_ID = CHAIN_IDS_TO_USDC_TOKEN_ID[SupportedChainId.ARC_TESTNET];

export const ARC_CHAIN_NAME = CHAIN_TO_CHAIN_NAME[SupportedChainId.ARC_TESTNET];

/**
 * USDC has 6 decimals in its ERC-20 view on Arc.
 * The native (gas) view has 18. See `lib/money.ts` — never mix them.
 */
export const ARC_USDC_DECIMALS = 6;

// ─────────────────────────────────────────────────────────────────────────────
// The guard
// ─────────────────────────────────────────────────────────────────────────────

export class WrongChainError extends Error {
  readonly code = "WRONG_CHAIN";
  constructor(actual: unknown) {
    super(
      `Refusing to transact: expected Arc Testnet (${ARC_CHAIN_ID}) but got ${String(actual)}. ` +
        `This build is testnet-only and must never touch another network.`,
    );
    this.name = "WrongChainError";
  }
}

/**
 * Hard-fails unless the supplied chain id is Arc Testnet.
 *
 * Throws rather than warns, deliberately. Constitution Principle I treats a
 * chain mismatch as unrecoverable: a warning that scrolls past in a log is not
 * a safety control on a payments path.
 *
 * Call this in every server action that creates a wallet or moves value.
 */
export function assertArcTestnet(chainId: number | string | undefined | null): void {
  const numeric = typeof chainId === "string" ? Number(chainId) : chainId;
  if (numeric !== ARC_CHAIN_ID) throw new WrongChainError(chainId);
}

/** Same check against Circle's string identifier, e.g. from a webhook payload. */
export function assertArcBlockchain(blockchain: string | undefined | null): void {
  if (blockchain !== ARC_BLOCKCHAIN) throw new WrongChainError(blockchain);
}

// ─────────────────────────────────────────────────────────────────────────────
// Explorer links (FR-017 — every settled transfer must be publicly verifiable)
// ─────────────────────────────────────────────────────────────────────────────

export const explorerTxUrl = (txHash: string): string =>
  `${ARC_EXPLORER_URL}/tx/${txHash}`;

export const explorerAddressUrl = (address: string): string =>
  `${ARC_EXPLORER_URL}/address/${address}`;
