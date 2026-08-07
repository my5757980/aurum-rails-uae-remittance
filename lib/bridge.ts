/**
 * Cross-chain USDC delivery via App Kit / CCTP v2 (User Story 3).
 *
 * Constitution VII / NFR-011: one of only three modules permitted to import a
 * Circle SDK.
 *
 * ON CONSTITUTION I: the Arc guard exists to keep us off MAINNET. Cross-chain
 * delivery inherently needs a second chain, and the spec's User Story 3 names
 * Base Sepolia. Every chain in DESTINATIONS is a testnet, and the allowlist is
 * explicit so a mainnet cannot be added by accident.
 *
 * Verified 2026-08-07 (T006): Arc_Testnet → Base_Sepolia, FAST, success in
 * 35.2s. See docs/circle-feedback-notes.md.
 */

import "server-only";
import { AppKit, type BridgeChain } from "@circle-fin/app-kit";
import { createCircleWalletsAdapter } from "@circle-fin/adapter-circle-wallets";
import { ARC_BRIDGE_CHAIN } from "./chain";
import { formatUsdc6, type Usdc6 } from "./money";
import { getDestination } from "./destinations";

// The destination table lives in ./destinations (no `server-only`) so the
// recipient form can offer the choice in the browser. Re-exported here so
// server code has one obvious import.
export {
  DESTINATIONS,
  DESTINATION_LIST,
  getDestination,
  needsBridge,
  destinationExplorerUrl,
  type Destination,
} from "./destinations";

export interface BridgeResult {
  state: string;
  /** Final mint hash on the destination chain, if the SDK reported one. */
  destinationTxHash?: string;
  burnTxHash?: string;
  steps: { name: string; txHash?: string }[];
}

/**
 * Move USDC from Arc to a supported testnet.
 *
 * Blocks until burn + attestation + mint complete. The caller is the background
 * tracker, never a request handler, so blocking here is safe.
 */
export async function bridgeToDestination(params: {
  fromAddress: string;
  toAddress: string;
  amount: Usdc6;
  destinationCode: string;
}): Promise<BridgeResult> {
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
  if (!apiKey || !entitySecret) throw new Error("Circle credentials are not configured");

  const destination = getDestination(params.destinationCode);
  if (destination.code === "ARC") {
    throw new Error("bridgeToDestination called for an Arc-to-Arc transfer");
  }

  const kit = new AppKit();
  const adapter = createCircleWalletsAdapter({ apiKey, entitySecret });

  const result = await kit.bridge({
    from: {
      adapter,
      chain: ARC_BRIDGE_CHAIN as BridgeChain,
      address: params.fromAddress,
    },
    to: {
      adapter,
      chain: destination.bridgeChain as BridgeChain,
      address: params.toAddress,
    },
    amount: formatUsdc6(params.amount),
    token: "USDC",
    config: { transferSpeed: "FAST" },
  });

  const steps = (result.steps ?? []).map((s) => ({
    name: String(s.name ?? "step"),
    txHash: s.txHash ?? undefined,
  }));

  return {
    state: String(result.state ?? "unknown"),
    burnTxHash: steps.find((s) => s.name === "burn")?.txHash,
    destinationTxHash: steps.find((s) => s.name === "mint")?.txHash,
    steps,
  };
}
