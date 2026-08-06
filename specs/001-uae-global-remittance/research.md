# Phase 0 Research — UAE → Global Cross-Border Payments on Arc

**Feature**: `001-uae-global-remittance` | **Date**: 2026-08-05
**Status**: ✅ All unknowns resolved. No `NEEDS CLARIFICATION` remain.

Sources are ranked: **first-party** (`circlefin/*` repositories, Circle/Arc docs) outrank
secondary reporting. Where the two conflicted, first-party won — and it did conflict once,
materially (R1).

---

## R0. Does Circle Developer-Controlled Wallets actually support Arc Testnet?

**This was the single question that could have invalidated the entire plan.**

- **Decision**: Yes. Use DCW with blockchain identifier **`ARC-TESTNET`**.
- **Evidence**: `circlefin/skills → use-developer-controlled-wallets` lists Arc among
  supported chains. `circlefin/arc-commerce/.env.example` ships
  `CIRCLE_BLOCKCHAIN=ARC-TESTNET` as a first-class variable. Circle community material
  demonstrates `createWallets` with `"ARC-TESTNET"`.
- **Rationale**: If this had been false, the entire Constitution IV promise (seedless,
  extension-free onboarding for a non-crypto persona) would have collapsed, and we would
  have been forced into self-custody wallets — contradicting Principle IV outright.
- **Alternatives considered**: User-Controlled Wallets (rejected: needs per-item user
  signing, breaks unattended batch demo); Modular/Smart-account wallets (rejected:
  additional moving parts for no persona benefit); raw viem + local keys (rejected:
  reintroduces key management and violates Principle IV).

---

## R1. Can CCTP / Bridge Kit route Arc Testnet? — ⚠️ **spec risk reversed**

- **Spec §6.4 recorded**: "Bridge SDK does not currently accept Arc Testnet as a source or
  destination" — **HIGH** risk, sourced from third-party reporting.
- **Phase 0 finding**: **Contradicted by Circle's own repository.**
  `circlefin/skills → bridge-stablecoin` states Bridge Kit supports bridging "between EVM
  chains, between EVM chains and Solana, and **between any two chains on Circle Wallets**",
  and **explicitly lists Arc Testnet as supported**. A first-party adapter
  `@circle-fin/adapter-circle-wallets` exists specifically to drive bridges through Circle
  Wallets — exactly our topology.
- **Decision**: Use **`@circle-fin/bridge-kit`** (bridge-only, lighter than App Kit) with
  `@circle-fin/adapter-circle-wallets` for User Story 3. **Risk R1 downgraded HIGH → LOW.**
- **Rationale**: First-party documentation from the vendor's own skills repository outranks
  a secondary support-article summary. The adapter's existence is corroborating evidence —
  Circle would not ship a Circle-Wallets bridge adapter that excluded its own L1.
- **Residual risk**: not yet verified hands-on. **D0 spike must confirm before US3 is
  scheduled.** The Q2 decision (Gateway-first) remains the safe default, so a failure here
  costs User Story 3 only, never the submission.
- **Useful specifics**: four steps — `approve` → `burn` → `fetchAttestation` → `mint`.
  Fast mode ≈ **8–20 s** (default), Standard ≈ 15–19 min. `useForwarder: true` automates
  attestation and removes any need for destination-wallet involvement. **No kit key
  required** for bridge operations (only for App Kit swap/send).

---

## R2. Is Circle Gateway available on Arc Testnet?

- **Decision**: Yes. Gateway is confirmed on Arc Testnet with **domain ID 26**.
- **Evidence** (`circlefin/skills → use-gateway`):
  - Testnet API: `https://gateway-api-testnet.circle.com/v1/`
  - Gateway Wallet (EVM testnet): `0x0077777d7EBA4688BDeF3E311b846F25870A19B9`
  - Gateway Minter (EVM testnet): `0x0022222ABE238Cc2C7Bb1f21003F0a260052475B`
  - Testnet chain list = all mainnet chains **+ Arc Testnet (26)**
- **Flow**: deposit USDC to Gateway Wallet → create burn intent (`sourceDomain`,
  `destinationDomain`, recipient, amount) → sign **EIP-712** → submit to Gateway API →
  receive attestation → call `gatewayMint` on destination.
- **Rationale**: Gateway is non-custodial (funds move only with both a user signature and
  a Circle attestation) and offers **<500 ms** cross-chain availability — which is what
  lets the treasury panel promise a guaranteed landed amount at quote time (pain point P5).
- **Note**: an earlier secondary source claimed Arc support was "coming in future
  releases". That is stale; first-party docs now list Arc Testnet explicitly.

---

## R3. Which official sample app should we extend?

- **Decision**: Fork **`circlefin/arc-commerce`**, branch **`master`**, **Apache-2.0**.
- **Rationale**: it is the only official sample that already combines the whole stack —
  Next.js + Supabase + DCW on `ARC-TESTNET` — *and* ships **Circle webhook signature
  verification**, which is precisely the mechanism our live-status requirement (FR-016,
  NFR-004) depends on. Inheriting it converts our hardest real-time requirement into
  configuration.
- **Known specifics**: Node **v22+** (`.nvmrc`); admin wallet auto-created on first
  startup; ngrok documented for local webhook testing; directory layout
  `app/ components/ hooks/ lib/ supabase/ types/`; env vars `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY`, `SUPABASE_SECRET_KEY`, `CIRCLE_API_KEY`,
  `CIRCLE_ENTITY_SECRET`, `CIRCLE_BLOCKCHAIN`, `CIRCLE_USDC_TOKEN_ID`, `ADMIN_EMAIL`.
- **Alternatives considered**:
  - `arc-multichain-wallet` — best Gateway UX, but wallet-shaped not payment-shaped;
    **read for patterns, don't fork**.
  - `arc-fintech` — multi-chain treasury + cross-chain interop; **read for US2/US3 patterns**.
  - `arc-nanopayments`, `arc-escrow`, `arc-defi-lend-borrow` — wrong domain.
  - Greenfield — prohibited by Constitution VI, and would waste ~1.5 of 5 days on plumbing.

---

## R4. ⚠️ Arc's dual-interface gas model — the highest-risk detail found

- **Finding** (`circlefin/skills → use-arc`, verbatim): "the native gas asset is USDC
  itself. The native view and the USDC ERC-20 are the **same** pool of funds, exposed two
  ways."
  - Native view: **18 decimals** (gas, `msg.value`)
  - ERC-20 view: **6 decimals** (balances, transfers, approvals, display)
  - `1e18 native = 1e6 ERC-20`
  - Circle's explicit rule: **never sum both views or treat them as separate assets**
  - Additional warning: **never call `decimals()` on native sentinel addresses** — they
    are not ERC-20 contracts
- **Decision**: operate **exclusively in the 6-decimal ERC-20 view**. Touch the native view
  in exactly one place (reading observed gas cost for fee display) and convert immediately.
  Enforce with **branded types** so `Usdc6` and `Native18` are unassignable to each other.
- **Rationale**: this is a 10¹²× error waiting to happen, it would be silent, and it would
  be in the money path. A branded type turns it from a runtime catastrophe into a compile
  error. Cost: ~30 minutes. Expected value: enormous.
- **Alternatives considered**: plain `bigint` with naming discipline (rejected — discipline
  fails at 2am on day 4); a runtime-validated `Money` class (rejected — heavier, and catches
  the bug later than the compiler does).

---

## R5. Live status: webhooks or polling?

- **Decision**: **Circle webhooks → Supabase → Supabase Realtime → browser.** No polling.
- **Evidence**: DCW docs state webhooks are recommended over polling and are signed with
  `X-Circle-Signature`; `arc-commerce` already implements verification.
- **Transaction lifecycle** (verified): `INITIATED → CLEARED → QUEUED → SENT → CONFIRMED →
  COMPLETE`; terminals `COMPLETE`/`FAILED`/`DENIED`/`CANCELLED`; intermediates include
  `WAITING` and **`STUCK`** (low fees).
- **Rationale**: satisfies FR-016 and NFR-004 (<2 s) with no polling loop, no rate-limit
  exposure (R4), and reuses inherited code.
- **`STUCK` matters more here than usual**: on Arc, "low fees" means low USDC for gas —
  a *likely* condition given the ~1 USDC/day faucet. It maps to `PENDING_RETRY`, never to
  a resubmission (E6, NFR-023).
- **Fallback**: a 90-second sweeper moves silent transfers to `NEEDS_REVIEW` and reconciles
  by transaction hash via `getTransaction`.

---

## R6. EOA or SCA wallets?

- **Decision**: **EOA**.
- **Rationale**: on Arc, USDC *is* the gas asset, so an EOA holding USDC funds its own gas
  — the usual "EOA needs a separate native token" objection **does not apply on Arc**.
  EOA has no creation fee, higher TPS, and the broadest support. SCA's benefits (Gas Station
  sponsorship, ERC-4337 batching) don't repay their complexity in a 5-day build.
- **Alternatives considered**: SCA (rejected — extra concepts, gas-sponsorship config, and
  an ERC-4337 failure surface for a benefit Arc's gas model already gives us free).

---

## R7. Idempotency

- **Decision**: use **our transfer UUID as Circle's `idempotencyKey`**, and require an
  `Idempotency-Key` header on `POST /api/transfers`, stored `UNIQUE` per user.
- **Evidence**: DCW docs — "All mutations require UUID v4 `idempotencyKey` for exactly-once
  execution."
- **Rationale**: FR-014 and Circle's own guarantee become *the same key*, so there is one
  concept to reason about instead of two that can disagree. A duplicate tap is a no-op at
  both layers, and a `UNIQUE` constraint makes the database the final arbiter.

---

## R8. FX rate source

- **Decision**: public mid-market API, cached, with **source name + timestamp displayed**.
  AED↔USD is a **fixed peg at 3.6725**, displayed as a peg rather than a live quote.
- **Rationale**: the AED is pegged in reality, so quoting it as if it floated would be
  theatre. Publishing the source and timestamp is what makes the 0.00% spread claim
  checkable rather than a marketing line.
- **Failure mode**: stale rate is used **and labelled stale with its timestamp**, or the
  flow blocks. A rate is never invented (E7).

---

## R9. Demo denomination under the faucet limit — **amends spec Assumption 4**

> ### ✅ CORRECTED 2026-08-06 — measured, not assumed
>
> The "~1 USDC per day" figure below came from a secondary source and is **wrong**.
> `faucet.circle.com` states, and we verified by using it: **20 USDC per address, per
> blockchain, every 2 hours.** One address yielded 20.000000 USDC immediately.
>
> **Impact**: risk **R2 drops HIGH → LOW**. Demo amounts no longer need to be in cents;
> `DEMO_MAX_SEND_AED=20` (≈5.4 USDC) is comfortably fundable, and a single address
> refills faster than we can spend it. The 1:1 no-scale-factor decision stands and is
> now *easy* rather than constraining.

- ~~**Constraint**: `faucet.circle.com` dispenses **~1 USDC per address per day** on Arc.~~
  **Actual**: 20 USDC per address per blockchain every 2 hours.
- **Spec Assumption 4** permitted a display scale factor ("AED 100 in copy maps to a
  sub-USDC on-chain amount").
- **Decision**: **reject scaling. Use honest 1:1 amounts at small denominations** —
  sends of AED 1–20, capped by `DEMO_MAX_SEND_AED`, funded from 3–5 faucet addresses
  accumulated daily from D0.
- **Rationale**: a scale factor means the number on screen is not the number on chain.
  Constitution II exists to prevent exactly that, and a judge comparing the UI to the
  explorer would spot it immediately. Losing some demo drama is a cheap price for a
  receipt that reconciles perfectly against `testnet.arcscan.app`.
- **Operational consequence**: fund from **D0 and every day** — this is R2's mitigation and
  the reason SC-018 requires a wallet check within 4 hours of submission.

---

## R10. Chain configuration in code

- **Decision**: `viem`'s **native `arcTestnet`** chain — `import { arcTestnet } from 'viem/chains'`.
  No custom chain definition.
- **Evidence**: `use-arc` confirms native viem support and shows the wagmi config.
- **Rationale**: less code, no hand-maintained RPC/explorer constants that can drift.
- **Verified constants for `lib/chain.ts`**: chain ID `5042002` (`0x4CEF52`); RPC
  `https://rpc.testnet.arc.network`; WSS `wss://rpc.testnet.arc.network`; explorer
  `https://testnet.arcscan.app`; USDC `0x3600000000000000000000000000000000000000`;
  EURC `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a`; CCTP domain `26`.

---

## Open items carried into D0 spikes

| # | To verify hands-on | Blocks | If it fails |
|---|--------------------|--------|-------------|
| S1 | `arc-commerce@master` installs and runs on Node 22 with current SDKs | Everything | Pin older SDK versions; worst case scaffold Next.js fresh and port DCW patterns |
| S2 | One real USDC transfer on Arc via DCW, visible on the explorer | Hero path | Escalate immediately — this is the submission |
| S3 | Gateway unified balance readable for our wallet set on Arc Testnet | FR-026 / US2 | Treasury panel degrades to Arc-only balance, honestly labelled |
| S4 | Bridge Kit accepts Arc Testnet as source/destination (R1) | US3 only | Drop US3; Gateway already satisfies Constitution V |
| S5 | Webhook delivery reaches a public endpoint with valid signature | FR-016 | Fall back to the 90 s `getTransaction` sweeper |

**Rule**: S1 and S2 must both be green before any product code is written on D1. If S2
fails, the entire schedule stops and that failure becomes the only priority — everything
else in this plan is downstream of one USDC actually moving on Arc.
