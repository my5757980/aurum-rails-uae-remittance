# Provenance

Constitution Principle VI requires that we extend an official Circle sample rather
than build greenfield, and that the lineage is recorded honestly.

## Upstream

| | |
|---|---|
| **Repository** | [`circlefin/arc-commerce`](https://github.com/circlefin/arc-commerce) |
| **Branch** | `master` |
| **Commit** | `1a3a5e0d738daec127d9c95f790a73ed33bf00a3` |
| **Commit date** | 2026-07-15 |
| **Commit subject** | `App kit refactor (#46)` |
| **License** | Apache-2.0 (preserved — see `LICENSE`) |
| **Forked on** | 2026-08-05 |

Upstream copyright headers are retained in every inherited file. New Aurum Rails
files carry no Circle copyright.

## Why this sample

It is the only official Arc sample that already combines the entire target stack:
Next.js 15 + Supabase + Circle Developer-Controlled Wallets on `ARC-TESTNET`, with
**Circle webhook signature verification already implemented**. That last point matters
most — live status tracking (FR-016, NFR-004) is our hardest requirement, and
inheriting a working signed-webhook receiver turns it from a build into a configuration.

Read for patterns but **not** forked: `circlefin/arc-multichain-wallet` (Gateway
unified-balance UX), `circlefin/arc-fintech` (multi-chain treasury).

## What we inherited and kept

- Supabase auth, SSR client wiring, and migration tooling
- `lib/circle/developer-controlled-wallets-client.ts` — DCW client init
- `lib/circle/app-kit-client.ts` — App Kit + `createCircleWalletsAdapter`
- `app/api/circle/webhook/route.ts` — signed webhook receiver
- `lib/chains.ts` — multi-chain lookup tables (Arc, Ethereum Sepolia, Base Sepolia, Avalanche Fuji)
- Tailwind v4 + shadcn/ui baseline

## What we discovered on arrival (findings, not complaints)

These are real, verified observations from running the sample. They feed the
**Circle Product Feedback** deliverable (T085 / SC-016).

### 1. App Kit and CCTP are already wired — this resolved our biggest open risk

`package.json` already depends on `@circle-fin/app-kit@^1.7.0` and
`@circle-fin/adapter-circle-wallets@^1.3.2`, and `lib/chains.ts` ships:

```ts
export const CHAIN_DB_TO_BRIDGE_CHAIN: Record<string, string> = {
  "ARC-TESTNET": "Arc_Testnet",
  ...
};
```

There is also a migration named `20251016181326_enforce_single_cctp_mint.sql`.

**Impact**: spec §6.4 recorded risk **R1 (HIGH)** — third-party reports claimed the
Bridge SDK would not route Arc Testnet. Circle's own sample maps Arc to a Bridge
chain identifier and depends on the Circle-Wallets bridge adapter. **R1 is resolved.**
Cross-chain USDC (User Story 3) is materially more likely to ship than planned.

### 2. The sample does not typecheck out of the box

`npx tsc --noEmit` on a clean clone produced three errors:

```
components/ui/checkbox.tsx  → Cannot find module '@radix-ui/react-checkbox'
components/ui/command.tsx   → Cannot find module 'cmdk'
components/ui/form.tsx      → Cannot find module 'react-hook-form'
```

Committed `components/ui/*` files import packages absent from `package.json`.
**Fix applied**: added `@radix-ui/react-checkbox`, `cmdk`, `react-hook-form`.
Typecheck now exits 0.

### 3. Money is handled as floating-point `number`

`lib/utils/convert-to-smallest-unit.ts`:

```ts
const amountInSmallestUnit = parseFloat(amount) * multiplier;
return Math.round(amountInSmallestUnit);
```

and `app/api/transactions/route.ts` stores `amount_usdc` as a JS `number` into a
`numeric(18,6)` column.

For 6-decimal USDC at small amounts this mostly survives, but it is the exact
pattern Constitution FR-018 forbids, and it does not survive amounts beyond
`Number.MAX_SAFE_INTEGER`.

**Fix applied**: `lib/money.ts` — branded `Usdc6` / `Native18` / `AedFils` bigint
types with exact string parsing (no `parseFloat`). Our code never uses `number` for
money. The upstream helper remains for inherited paths we have not yet replaced.

### 4. Arc's dual-interface gas model needs a louder warning

Arc exposes one pool of funds as an 18-decimal native view (gas) and a 6-decimal
ERC-20 view (balances/transfers), where `1e18 native == 1e6 ERC-20`. This is
documented in `circlefin/skills → use-arc` but is easy to miss and would produce a
silent 10¹²× error in a payment path.

**Fix applied**: branded types make the confusion a compile error (`lib/money.ts`,
risk R9). Verified by `@ts-expect-error` assertions in `tests/unit/money.test.ts`.

### 5. `createTransaction` takes `amount` (singular) as a string **array**

```ts
sdk.createTransaction({ ..., amount: ["0.01"] })  // not `amounts`
```

Our first draft wrote `amounts` and was caught by `tsc` before it ever ran. The
singular name for an array field is a genuine trap. Good SDK typing saved a
credentialed round-trip here — worth saying so in the feedback, alongside the nit.

### 6. The sample's payment model is the opposite of ours — **the largest delta**

`arc-commerce` initiates payment from a **browser wallet** (wagmi + WalletConnect);
`/api/transactions` only *records* a hash after the client has broadcast it. The
Circle DCW wallet is the admin/receiving side.

Aurum Rails requires the inverse: **server-orchestrated DCW → DCW transfers**, because
Constitution IV forbids browser extensions and seed phrases for our non-crypto-native
persona. We therefore keep the DCW machinery and the webhook receiver, and replace the
payment-initiation path entirely with server-side `createTransaction`.

## What we are replacing

| Upstream | Aurum Rails |
|---|---|
| Credit-purchase domain | Remittance domain — recipients, quotes, transfers, status events |
| Browser-wallet payment initiation (wagmi) | Server-side DCW → DCW `createTransaction` |
| `convertToSmallestUnit` (float) | `lib/money.ts` (branded bigint) |
| Admin dashboard | Business payout surface (User Story 2) |
| Desktop-first product UI | Mobile-first send flow at 375px |

## What we are adding

`lib/money.ts` · `lib/chain.ts` (guard) · `lib/env.ts` (zod validation) ·
quote engine · orchestrator + persisted state machine · Realtime status timeline ·
claim-link recipient view · Gateway treasury panel · Bridge Kit cross-chain leg

## Open deviation from plan.md

**Wallet account type.** `research.md` R6 chose **EOA**, reasoning that on Arc USDC is
the gas asset so an EOA funds its own gas. The upstream sample uses **`accountType: "SCA"`**
and is proven on Arc.

Unresolved until T003 runs. `CIRCLE_ACCOUNT_TYPE` defaults to `SCA` (the proven path);
flip to `EOA` if the spike shows it works and is cheaper under the faucet limit.
