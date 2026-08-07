/**
 * Delivery networks for cross-chain payouts (User Story 3).
 *
 * Separate from `lib/bridge.ts` because that module is `server-only` (it holds
 * Circle credentials), while this table is safe — and needed — in the browser
 * so the recipient form can offer the choice.
 *
 * ON CONSTITUTION I: the Arc guard exists to keep us off MAINNET. Cross-chain
 * delivery inherently needs a second chain. Every entry here is a TESTNET, and
 * keeping the list explicit is what makes that checkable rather than assumed.
 */

export interface Destination {
  /** Stored on the recipient. "ARC" means no bridge is needed. */
  code: string;
  label: string;
  /** Circle Wallets blockchain identifier. */
  circleChain: string;
  /** App Kit BridgeChain identifier. */
  bridgeChain: string;
  explorerBase: string;
  /** Measured where we have data, not marketed. See feedback notes. */
  etaSeconds: number;
}

/** TESTNETS ONLY. A mainnet here would violate Constitution I. */
export const DESTINATIONS: Record<string, Destination> = {
  ARC: {
    code: "ARC",
    label: "Arc (default)",
    circleChain: "ARC-TESTNET",
    bridgeChain: "Arc_Testnet",
    explorerBase: "https://testnet.arcscan.app/tx/",
    etaSeconds: 5,
  },
  BASE: {
    code: "BASE",
    label: "Base",
    circleChain: "BASE-SEPOLIA",
    bridgeChain: "Base_Sepolia",
    explorerBase: "https://sepolia.basescan.org/tx/",
    etaSeconds: 40, // measured 35.2s on T006
  },
  ETH: {
    code: "ETH",
    label: "Ethereum",
    circleChain: "ETH-SEPOLIA",
    bridgeChain: "Ethereum_Sepolia",
    explorerBase: "https://sepolia.etherscan.io/tx/",
    etaSeconds: 60,
  },
  AVAX: {
    code: "AVAX",
    label: "Avalanche",
    circleChain: "AVAX-FUJI",
    bridgeChain: "Avalanche_Fuji",
    explorerBase: "https://testnet.snowtrace.io/tx/",
    etaSeconds: 40,
  },
};

export const DESTINATION_LIST = Object.values(DESTINATIONS);

export const getDestination = (code: string | undefined): Destination =>
  DESTINATIONS[code ?? "ARC"] ?? DESTINATIONS.ARC!;

export const needsBridge = (code: string | undefined): boolean =>
  Boolean(code) && code !== "ARC";

export const destinationExplorerUrl = (code: string | undefined, hash: string): string =>
  `${getDestination(code).explorerBase}${hash}`;
