---
description: "Sprint task list — Track 1 Cross-Border Payments MVP"
---

# Sprint Plan – Track 1 Cross-Border Payments MVP

**Feature**: `001-uae-global-remittance` | **Created**: 2026-08-05
**Input**: [spec.md](./spec.md) · [plan.md](./plan.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/openapi.yaml](./contracts/openapi.yaml) · [quickstart.md](./quickstart.md)
**Governing authority**: `.specify/memory/constitution.md` v1.0.0
**Deadline**: 2026-08-10 · **Working days**: 5

**Tests**: Constitution mandates a *minimum* test set — money arithmetic, fee/FX
calculation, every state-machine transition, and one hero-path E2E. Those tasks are
included and are **not optional**. No further test coverage is required.

**Organization**: Days are the primary axis (as requested). Inside each day, tasks carry
their user-story label so independent testability is preserved.

## Format: `[ID] [P?] [Story] Description`

- **[P]** — parallelizable (different files, no incomplete dependencies)
- **[US1]** consumer remittance (P1, hero) · **[US2]** batch payout (P2) · **[US3]** cross-chain (P3)
- Setup / Foundational / Polish tasks carry **no** story label

---

## ⛔ Read this before starting

**Two tasks gate everything else: T003 and T005.** If a real USDC transfer cannot be made
on Arc Testnet from a Circle Developer-Controlled Wallet, nothing else in this plan
matters. Do not write product code until both are green.

**Constitution IX priority order is absolute and is baked into the day ordering:**

```
hero flow → transparency → README + diagram → demo video → secondary use cases → polish
```

If you fall behind, cut from the **bottom**. Day 5's documentation tasks are **not** the
buffer — Day 4's User Story 2 is.

---

# Day 1 – Foundation & Rails

*Phases 0–2. Exit: a quote endpoint returns the full §7.4 payload, and one real USDC
transfer has been made on Arc by hand.*

## Phase 0 — Blocking spikes (do these first, no product code)

- [x] **T001** Clone `circlefin/arc-commerce@master` into the repo root, run `nvm use` (Node 22), `npm install`, and verify `npm run dev` serves http://localhost:3000
  - **Acceptance**: dev server boots with no install or build errors; landing page renders
  - **Est**: 30 min
  - **Dependencies**: none
  - **If it fails**: pin SDK versions to the repo's lockfile; worst case scaffold Next.js 15 fresh and port the DCW patterns (research.md S1)

- [x] **T002** Create a Circle testnet API key, generate a 32-byte hex entity secret, register it, and store the recovery file **outside the repository**
  - **Acceptance**: `CIRCLE_API_KEY` and `CIRCLE_ENTITY_SECRET` present in `.env.local`; recovery file saved outside the repo; `.gitignore` already contains `.env*`, `*.pem`, `*-recovery-file.json`
  - **Est**: 20 min
  - **Dependencies**: T001
  - **Constitution**: VII — this is the highest-consequence secret in the project

- [x] **T003** 🔴 **BLOCKING SPIKE** Write `scripts/spike-send.ts` that creates a wallet set, creates one `ARC-TESTNET` EOA wallet, and sends USDC to a second wallet
  - **Acceptance**: a real transaction hash is produced and **resolves on https://testnet.arcscan.app**
  - **Est**: 1.5 h
  - **Dependencies**: T002
  - **If it fails**: STOP the sprint and escalate. This single capability *is* the submission (research.md S2)

- [x] **T004** [P] Fund 3–5 addresses from https://faucet.circle.com (Arc Testnet) and record them in `scripts/faucet-addresses.json`
  - **Acceptance**: ≥3 addresses hold USDC; a calendar reminder exists to repeat this **daily**
  - **Est**: 20 min
  - **Dependencies**: T003 (need addresses first)
  - **Risk**: R2 — the faucet gives 20 USDC/address every 2h (VERIFIED). Under-funding here surfaces as a dead demo on Day 5

- [ ] **T005** 🔴 **BLOCKING SPIKE** Verify Circle Gateway on Arc Testnet — read a unified balance for the wallet set against `https://gateway-api-testnet.circle.com/v1/`
  - **Acceptance**: a unified balance response is received including an Arc Testnet (domain 26) entry
  - **Est**: 1 h
  - **Dependencies**: T003
  - **If it fails**: treasury panel degrades to an Arc-only balance, honestly labelled; Bridge Kit becomes the fourth Circle product (research.md S3)

- [ ] **T006** [P] Verify Bridge Kit accepts Arc Testnet as a source/destination using `@circle-fin/bridge-kit` + `@circle-fin/adapter-circle-wallets` in `scripts/spike-bridge.ts`
  - **Acceptance**: either a successful Arc→Base Sepolia bridge quote, **or** a written finding in `docs/circle-feedback-notes.md`
  - **Est**: 1 h
  - **Dependencies**: T003
  - **Note**: research.md R1 found Circle's own docs claim Arc *is* supported, contradicting third-party reports. **Either outcome is valuable** — a confirmed limitation is high-quality Circle Product Feedback (SC-016)

## Phase 1 — Setup

- [x] **T007** Record fork provenance in `docs/PROVENANCE.md` — upstream repo, exact commit SHA, Apache-2.0 notice, and what was kept/replaced/added
  - **Acceptance**: file exists with the real SHA; upstream `LICENSE`/`NOTICE` preserved
  - **Est**: 20 min · **Dependencies**: T001 · **Constitution**: VI

- [ ] **T008** [P] Configure `eslint.config.mjs` with a `no-restricted-imports` rule banning `@circle-fin/*` outside `lib/wallet-service.ts`, `lib/treasury.ts`, `lib/bridge.ts`
  - **Acceptance**: importing a Circle SDK in `app/` **fails the build**
  - **Est**: 30 min · **Dependencies**: T001 · **Constitution**: VII (NFR-011 enforced structurally)

- [ ] **T009** [P] Write `scripts/check-secrets.sh` — greps the diff for `CIRCLE_`, `sk_`, `service_role`, and any 32-hex run
  - **Acceptance**: script exits non-zero on a planted test secret
  - **Est**: 30 min · **Dependencies**: none

- [ ] **T010** [P] Write `scripts/check-copy.ts` — fails on banned terms (gas, seed phrase, private key, RPC, chain, nonce, approve, sign, blockchain, crypto) in `app/**` excluding `components/TechnicalDetails.tsx`
  - **Acceptance**: script exits non-zero on a planted banned term
  - **Est**: 45 min · **Dependencies**: none · **Requirement**: NFR-017, SC-007

- [ ] **T011** [P] Add `.github/workflows/ci.yml` running typecheck, lint, unit tests, `check-secrets.sh`, `check-copy.ts`
  - **Acceptance**: CI green on a clean commit, red when any gate is planted-failed
  - **Est**: 30 min · **Dependencies**: T008, T009, T010

- [x] **T012** [P] Install dependencies: `@circle-fin/bridge-kit`, `@circle-fin/adapter-circle-wallets`, `viem`, `zod`, `vitest`, `@playwright/test`
  - **Acceptance**: `npm run typecheck` passes; all versions pinned (no `^`)
  - **Est**: 20 min · **Dependencies**: T001 · **Risk**: R7

- [ ] **T013** Create a Supabase Cloud project and link it (`npx supabase link`)
  - **Acceptance**: `npx supabase db push` succeeds against the cloud project
  - **Est**: 20 min · **Dependencies**: T001 · **Note**: cloud not local Docker — judges must not need Docker (quickstart.md)

## Phase 2 — Foundational (blocks every user story)

- [x] **T014** 🔴 Implement `lib/money.ts` with branded `Usdc6` / `Native18` bigint types, `nativeToUsdc6`, `usdc6ToDisplay`, `aedToUsdc6`, `parseUsdc6`
  - **Acceptance**: assigning a `Native18` where `Usdc6` is expected is a **compile error**; no `number` appears anywhere in the module
  - **Est**: 1.5 h
  - **Dependencies**: T012
  - **Risk**: **R9 (HIGH)** — Arc's dual-interface model (18dp native gas vs 6dp ERC-20, same pool). This is the single highest-value defensive task in the sprint

- [x] **T015** [P] Write `tests/unit/money.test.ts` covering conversions, rounding, and boundary values
  - **Acceptance**: ≥15 assertions; explicitly asserts `1e18 native === 1e6 usdc6`
  - **Est**: 45 min · **Dependencies**: T014 · **Constitution**: mandated minimum test set

- [x] **T016** Implement `lib/chain.ts` — `ARC_CHAIN_ID = 5042002`, `USDC_ADDRESS = 0x3600…0000`, explorer URL builder, and `assertArcTestnet()` that **throws**
  - **Acceptance**: `assertArcTestnet(1)` throws; chain values are imported from `lib/env.ts`, never inlined at call sites
  - **Est**: 45 min · **Dependencies**: T012 · **Requirement**: FR-013, E8, Constitution I

- [x] **T017** [P] Implement `lib/env.ts` — zod schema over every variable in plan.md §6, validated at import, throwing with the missing variable's name
  - **Acceptance**: removing any required var produces `Missing environment variable: X`; no `NEXT_PUBLIC_CIRCLE_*` key is permitted by the schema
  - **Est**: 1 h · **Dependencies**: T012 · **Requirement**: FR-028, NFR-012

- [x] **T018** [P] Write `.env.example` with every variable, a description, and a safe placeholder
  - **Acceptance**: every key read by `lib/env.ts` is present; no real value is committed
  - **Est**: 20 min · **Dependencies**: T017 · **Requirement**: NFR-012

- [ ] **T019** Write `supabase/migrations/0001_remittance_schema.sql` — all enums and tables per data-model.md
  - **Acceptance**: `npx supabase db push` succeeds; `wallets.chain_id` has `CHECK (chain_id = 5042002)`; `status_events` has `failure_needs_reason`; `transfers` has the unique `(user_id, idempotency_key)` index
  - **Est**: 1.5 h · **Dependencies**: T013 · **Requirement**: FR-014, FR-015, FR-019, Constitution I

- [ ] **T020** Write `supabase/migrations/0002_rls_policies.sql` — RLS per data-model.md, including the **absence** of insert/update/delete policies on `status_events`
  - **Acceptance**: an authenticated user cannot read another user's transfers; `status_events` is append-only for end users
  - **Est**: 1 h · **Dependencies**: T019 · **Requirement**: NFR-013

- [ ] **T021** [P] Create `supabase/migrations/0003_current_status_view.sql` with the `transfer_current_status` view
  - **Acceptance**: view returns exactly one row per transfer, the latest event
  - **Est**: 20 min · **Dependencies**: T019

- [ ] **T022** Implement `lib/wallet-service.ts` — the **only** DCW importer. `ensureWalletForUser`, `ensureWalletForRecipient`, `getUsdcBalance`, `createTransfer`, `getTransaction`
  - **Acceptance**: creates `ARC-TESTNET` **EOA** wallets; uses the dedicated balance endpoint (**not** `getWallet`); every mutation passes a UUID v4 `idempotencyKey`
  - **Est**: 2 h · **Dependencies**: T003, T014, T016, T017 · **Requirement**: FR-002–004, FR-014

- [ ] **T023** [P] Implement `lib/errors.ts` — the error taxonomy from `contracts/openapi.yaml` with correlation-ID generation
  - **Acceptance**: every code in the OpenAPI enum has a user-safe message; no raw provider error text can pass through
  - **Est**: 45 min · **Dependencies**: T012 · **Requirement**: FR-019, NFR-025

- [ ] **T024** [P] Implement `lib/logger.ts` — structured logs with correlation ID, operation, outcome, duration; secrets redacted
  - **Acceptance**: a log line containing an API key is redacted by a unit test
  - **Est**: 45 min · **Dependencies**: T023 · **Requirement**: FR-030

- [x] **T025** [P] Implement `lib/fx/provider.ts` + `lib/fx/stablefx-simulated.ts` — public rate fetch, cache, staleness flag, fixed AED peg 3.6725
  - **Acceptance**: returns rate + source + timestamp; marks stale on fetch failure and never invents a rate
  - **Est**: 1 h · **Dependencies**: T014 · **Requirement**: NFR-007, E7, FR-039

- [ ] **T026** [P] Write `tests/unit/fx.test.ts` — conversion, peg, staleness
  - **Acceptance**: asserts a failed fetch yields `is_stale = true`, never a fabricated rate
  - **Est**: 30 min · **Dependencies**: T025 · **Constitution**: mandated minimum

- [x] **T027** Implement `lib/quote-engine.ts` — prices a transfer and persists a `quotes` row with every §7.4 field
  - **Acceptance**: returns the complete `Quote` schema from `contracts/openapi.yaml`; `expires_at = now + 60s`; `fx_spread_bps = 0` present and rendered even at zero
  - **Est**: 2 h · **Dependencies**: T014, T025 · **Requirement**: FR-008–011

- [x] **T028** [P] Write `tests/unit/quote-engine.test.ts` — fee itemisation, totals, expiry, zero-spread
  - **Acceptance**: asserts network fee + service fee = total fee exactly in minor units, with no floating-point drift
  - **Est**: 45 min · **Dependencies**: T027 · **Constitution**: mandated minimum

**Day 1 total: ≈ 22 h of tasks.** This is more than one day for one person — T004, T006,
T009, T010, T011 are deferrable to Day 2 without blocking anything. **T003 and T005 are not.**

**Checkpoint**: `POST /api/quotes` can be built. One real Arc transaction exists.

---

# Day 2 – Core Payment Flows

*Phase 3 — User Story 1 (P1, hero). Exit: **the hero path works end-to-end**. From here,
`main` must always be demoable.*

**Independent test**: from a clean seeded database, a new user signs up, adds a recipient,
sends AED 5.00, and both sender and recipient see a settled transfer with a working
`testnet.arcscan.app` link — with no other user story implemented.

- [x] **T029** [US1] Implement `lib/status.ts` — append-only `status_events` writer and `mapCircleState()` per plan.md §2.4
  - **Acceptance**: maps all 8 Circle states; `STUCK → PENDING_RETRY`; no path writes a mutable status column
  - **Est**: 1.5 h · **Dependencies**: T019, T023 · **Requirement**: FR-015

- [ ] **T030** [P] [US1] Write `tests/unit/state-machine.test.ts` covering **every** transition in data-model.md
  - **Acceptance**: all legal transitions pass, all illegal ones are rejected; asserts `NEEDS_REVIEW` never leads to a resubmission
  - **Est**: 1 h · **Dependencies**: T029 · **Constitution**: mandated minimum

- [x] **T031** [US1] Implement `lib/orchestrator.ts` — `executeTransfer(quoteId, idempotencyKey)` per plan.md §2.4
  - **Acceptance**: calls `assertArcTestnet` before any wallet call; validates quote expiry and balance **pre-submission**; persists `INITIATED` then `SUBMITTED`
  - **Est**: 2.5 h · **Dependencies**: T022, T027, T029 · **Requirement**: FR-013, FR-014, E1, E3

- [x] **T032** [US1] Implement `POST /api/quotes` in `app/api/quotes/route.ts`
  - **Acceptance**: matches the OpenAPI contract; rejects amounts outside `DEMO_MAX_SEND_AED` with 422; responds in < 500 ms
  - **Est**: 1 h · **Dependencies**: T027 · **Requirement**: FR-008, NFR-002, E10

- [x] **T033** [US1] Implement `POST /api/transfers` in `app/api/transfers/route.ts`
  - **Acceptance**: requires `Idempotency-Key`; a repeated key returns **200 with the original transfer**, never a second row; returns 402/409/503 per the contract
  - **Est**: 1.5 h · **Dependencies**: T031 · **Requirement**: FR-014, E4

- [x] **T034** [P] [US1] Implement `GET /api/transfers/[id]` in `app/api/transfers/[id]/route.ts`
  - **Acceptance**: returns `TransferDetail` with ordered status events; 404 for another user's transfer
  - **Est**: 45 min · **Dependencies**: T029, T020

- [ ] **T035** [US1] Adapt the inherited Circle webhook receiver at `app/api/webhooks/circle/route.ts` to drive `status.ts`
  - **Acceptance**: signature verified before any state change; invalid signature → 401 with **no** side effects; valid webhook appends a status event with tx hash and explorer URL
  - **Est**: 1.5 h · **Dependencies**: T029, T001 · **Requirement**: FR-015, FR-017

- [ ] **T036** [US1] Implement the 90-second `NEEDS_REVIEW` sweeper in `lib/reconcile.ts`
  - **Acceptance**: a transfer with no webhook after 90 s moves to `NEEDS_REVIEW`; reconciles by tx hash via `getTransaction`; **never resubmits**
  - **Est**: 1 h · **Dependencies**: T031, T035 · **Requirement**: E6, NFR-023, risk R10

- [ ] **T037** [P] [US1] Adapt auth to email + OTP in `app/(auth)/`
  - **Acceptance**: signup → signed in in < 60 s; no password field anywhere
  - **Est**: 1 h · **Dependencies**: T013 · **Requirement**: FR-001

- [ ] **T038** [US1] Provision a wallet on signup via a Supabase auth hook calling `ensureWalletForUser`
  - **Acceptance**: a new user has an `ARC-TESTNET` wallet row; the UI shows "Setting up your account", never "generating wallet"
  - **Est**: 1 h · **Dependencies**: T022, T037 · **Requirement**: FR-002, FR-003

- [ ] **T039** [P] [US1] Build recipient CRUD in `app/recipients/` with duplicate detection
  - **Acceptance**: creating a same-name-same-country recipient offers a merge instead of silently duplicating
  - **Est**: 1.5 h · **Dependencies**: T019, T037 · **Requirement**: FR-005, FR-006, E12

- [x] **T040** [US1] Build the send flow at `app/send/page.tsx` — amount entry + recipient selection
  - **Acceptance**: quote refreshes on amount change; confirm control is **disabled** until a valid unexpired quote exists
  - **Est**: 2 h · **Dependencies**: T032, T039 · **Requirement**: FR-008, FR-010

- [x] **T041** [US1] Build `components/QuotePanel.tsx` rendering spec §7.4 **verbatim**
  - **Acceptance**: every line in §7.4 is present — amount, itemised network + service fee, rate with source and timestamp, FX spread (shown at 0.00%), landed amount with `[Simulated]`, arrival, total cost in AED and USD, expiry countdown
  - **Est**: 2.5 h · **Dependencies**: T040 · **Requirement**: FR-008–012, SC-006

- [x] **T042** [P] [US1] Build `components/SimulatedBadge.tsx` — the **only** permitted way to render a simulated value
  - **Acceptance**: visually unmissable; used by the landed amount; grep confirms no other component renders "Simulated"
  - **Est**: 30 min · **Dependencies**: none · **Requirement**: FR-012, Q1 decision

- [x] **T043** [US1] Build `app/transfers/[id]/page.tsx` with `components/StatusTimeline.tsx` subscribed to Supabase Realtime
  - **Acceptance**: timeline advances through named states **with no manual refresh**; each state timestamped; a running elapsed counter is visible
  - **Est**: 2 h · **Dependencies**: T034, T035 · **Requirement**: FR-016, NFR-004

- [x] **T044** [US1] Add the receipt view to `app/transfers/[id]/page.tsx`
  - **Acceptance**: shows amount sent, amount received, total fee, rate, timestamps, and a **working** `testnet.arcscan.app` link
  - **Est**: 1 h · **Dependencies**: T043 · **Requirement**: FR-020, FR-017, SC-005

- [x] **T045** [US1] Add `components/TestnetBanner.tsx` to the root layout
  - **Acceptance**: "Arc Testnet — educational demo. No real funds." visible on **every** page; not dismissible
  - **Est**: 30 min · **Dependencies**: none · **Requirement**: FR-027, Constitution I

**Day 2 total: ≈ 21 h.** T036, T039 are deferrable to Day 3 if needed.

**🎯 CHECKPOINT — MVP.** The hero flow works end-to-end on Arc. **Commit, deploy, and
verify on the deployed URL.** From this point `main` must never be left broken overnight
(NFR-024).

---

# Day 3 – UX + Transparency Layer

*Phase 4 — User Story 1 completion + **documentation, which ships before User Story 2**.*

- [ ] **T046** [P] [US1] Build `components/TechnicalDetails.tsx` — a collapsed `<details>` holding addresses, hashes, chain id
  - **Acceptance**: collapsed by default; the **only** place in the app where an address appears
  - **Est**: 45 min · **Dependencies**: T044 · **Requirement**: FR-003, NFR-017

- [ ] **T047** [US1] Run `scripts/check-copy.ts` and remove every banned term from the default path
  - **Acceptance**: script exits 0; a manual read of the send flow finds no crypto vocabulary
  - **Est**: 1.5 h · **Dependencies**: T041, T043, T046 · **Requirement**: NFR-017, SC-007

- [ ] **T048** [US1] Mobile pass at **375px** across every screen
  - **Acceptance**: no horizontal scroll anywhere; all controls tappable; verified in devtools at 375×667
  - **Est**: 2 h · **Dependencies**: T041, T043, T044 · **Requirement**: NFR-016, SC-009

- [ ] **T049** [P] [US1] Add explicit loading / empty / success / error states to every async action
  - **Acceptance**: no control can be left frozen; every state is reachable in manual testing
  - **Est**: 1.5 h · **Dependencies**: T040, T043 · **Requirement**: NFR-018

- [ ] **T050** [P] [US1] Accessibility pass — semantic HTML, keyboard operability, visible focus rings, WCAG AA contrast
  - **Acceptance**: full hero flow completable by keyboard alone; contrast checked on all text
  - **Est**: 1.5 h · **Dependencies**: T048 · **Requirement**: NFR-019

- [x] **T051** [US1] Implement `GET /api/claim/[token]` in `app/api/claim/[token]/route.ts`
  - **Acceptance**: returns only sender first name, landed amount, currency, delivered time; **never** an address, email, or transfer id
  - **Est**: 1 h · **Dependencies**: T019, T044 · **Requirement**: FR-021

- [x] **T052** [US1] Build the public recipient view at `app/claim/[token]/page.tsx`
  - **Acceptance**: no auth, no install; **zero** crypto vocabulary; renders correctly at 375px
  - **Est**: 1.5 h · **Dependencies**: T051 · **Requirement**: FR-021, FR-022, E9

- [x] **T053** [P] [US1] Plain-language error surfaces for E1, E3, E10 in the send flow
  - **Acceptance**: insufficient balance blocks **pre-submission** with a funding action; expired quote offers refresh; below-minimum states the minimum in AED and USD
  - **Est**: 1 h · **Dependencies**: T033, T041 · **Requirement**: FR-019, NFR-021

- [ ] **T054** [P] [US1] Repeat-send shortcut on the home screen
  - **Acceptance**: a returning user completes a repeat send in **≤ 3 taps**
  - **Est**: 1 h · **Dependencies**: T040 · **Requirement**: FR-007, SC-003

- [x] **T055** [P] Write `scripts/demo-seed.ts` — treasury, demo users, recipients, funded sender wallet
  - **Acceptance**: one command produces a state where the hero flow is immediately runnable
  - **Est**: 1.5 h · **Dependencies**: T022, T039 · **Requirement**: FR-037

- [ ] **T056** [P] Write `scripts/demo-reset.ts` — restores a known-good state
  - **Acceptance**: runs green from a clean database; documented in the README
  - **Est**: 1 h · **Dependencies**: T055 · **Requirement**: FR-029, SC-017

- [ ] **T057** [P] Write `scripts/fund-treasury.ts` + low-balance banner (E2)
  - **Acceptance**: banner appears below `TREASURY_LOW_BALANCE_USDC`; message is "Demo funds low — reset the demo", never a raw failure
  - **Est**: 1 h · **Dependencies**: T022 · **Requirement**: E2, risk R2

- [ ] **T058** Deploy to Vercel and register the Circle webhook against the public URL
  - **Acceptance**: hero flow completes on the deployed URL; webhook delivers; all secrets are Encrypted Env Vars
  - **Est**: 1.5 h · **Dependencies**: T035, T044 · **Requirement**: plan.md §8

- [ ] **T059** [P] Write `tests/e2e/hero-flow.spec.ts` — one Playwright happy-path smoke
  - **Acceptance**: signup → recipient → quote → confirm → delivered → explorer link present
  - **Est**: 1.5 h · **Dependencies**: T044 · **Constitution**: mandated minimum

- [ ] **T060** 📄 Write `docs/architecture.mmd` and embed the mermaid diagram in the README
  - **Acceptance**: renders inline on GitHub; shows user, frontend, backend, Circle services, Arc Testnet
  - **Est**: 1 h · **Dependencies**: T058 · **Requirement**: SC-014, Constitution VIII

- [ ] **T061** 📄 Write the README: problem, solution, track, corridor, architecture diagram, setup from `quickstart.md`, demo link
  - **Acceptance**: a judge can go from clone to hero flow in **< 10 minutes** using it alone
  - **Est**: 2 h · **Dependencies**: T060, T056 · **Requirement**: SC-001, Constitution VIII

- [ ] **T062** [P] 📄 Add the **Circle products used** table to the README, mapping each product to its exact source files and endpoints
  - **Acceptance**: all four products mapped to real paths that exist
  - **Est**: 45 min · **Dependencies**: T061 · **Requirement**: FR-044, SC-008

- [ ] **T063** [P] 📄 Add the **What Is Real vs. Simulated** table to the README, leading with the landed amount
  - **Acceptance**: every simulated element in the product appears in the table
  - **Est**: 30 min · **Dependencies**: T061 · **Requirement**: NFR-008, SC-011

- [ ] **T064** [P] Add screenshots of the hero flow to `docs/screenshots/` and embed in the README
  - **Acceptance**: ≥4 screenshots, mobile viewport, no secrets visible
  - **Est**: 45 min · **Dependencies**: T058

**Day 3 total: ≈ 22 h.**

**🚨 CHECKPOINT — HARD GATE.** T060–T063 (README + diagram + tables) **must be complete
before starting Day 4.** Constitution IX puts documentation above the second use case.
If you are behind, cut User Story 2 — **not** the README.

---

# Day 4 – Polish, Status Tracking, Multi-flow Support

*Phase 5 — User Story 2. Phase 6 — User Story 3 (optional). **Record the demo video.***

**US2 independent test**: a business user selects 3 contractors, reviews one aggregate
quote, confirms once, and all 3 payouts settle with individual explorer links.

- [ ] **T065** [US2] Implement `lib/treasury.ts` — the **only** Gateway importer; unified balance + per-chain composition
  - **Acceptance**: returns `TreasuryBalance` per the OpenAPI contract; cached 30 s
  - **Est**: 2 h · **Dependencies**: T005, T017 · **Requirement**: FR-026, risk R4
  - **If T005 failed**: return an Arc-only balance with an honest "Arc only" label

- [ ] **T066** [P] [US2] Implement `GET /api/treasury` in `app/api/treasury/route.ts`
  - **Acceptance**: matches contract; sets `isLowBalance` per `TREASURY_LOW_BALANCE_USDC`
  - **Est**: 45 min · **Dependencies**: T065

- [ ] **T067** [US2] Implement `POST /api/payout-runs` in `app/api/payout-runs/route.ts` — fans out over `orchestrator.executeTransfer`
  - **Acceptance**: items settle and fail **independently**; a single failure never rolls back siblings; run reports `PARTIALLY_FAILED` accurately
  - **Est**: 2 h · **Dependencies**: T031, T019 · **Requirement**: FR-023, FR-025, E11, NFR-022

- [ ] **T068** [P] [US2] Batch quote support in `lib/quote-engine.ts` — per-payee and aggregate
  - **Acceptance**: aggregate fee equals the exact sum of per-payee fees in minor units
  - **Est**: 1 h · **Dependencies**: T027 · **Requirement**: FR-024

- [ ] **T069** [US2] Build the business surface at `app/business/page.tsx` — payee list and batch composer
  - **Acceptance**: same account, different view; select ≥3 payees with per-payee amounts
  - **Est**: 2 h · **Dependencies**: T039, T068 · **Requirement**: FR-023

- [ ] **T070** [US2] Build `components/TreasuryPanel.tsx` — unified balance with expandable per-chain split
  - **Acceptance**: states plainly whether the run is covered; per-chain composition sums to the unified total
  - **Est**: 1.5 h · **Dependencies**: T066, T069 · **Requirement**: FR-026

- [ ] **T071** [US2] Build the live batch grid — per-item status, per-item explorer link, per-item retry
  - **Acceptance**: 3 payouts advance independently via Realtime; a failed item retries without touching the others
  - **Est**: 2 h · **Dependencies**: T067, T043 · **Requirement**: FR-025, E11

- [ ] **T072** [P] [US2] Per-contractor receipts carrying the invoice reference
  - **Acceptance**: each receipt shows its `invoice_ref`
  - **Est**: 45 min · **Dependencies**: T071 · **Requirement**: FR-023

- [ ] **T073** [P] [US2] CSV export of a payout run
  - **Acceptance**: downloadable CSV with amounts, fees, statuses, tx hashes
  - **Est**: 45 min · **Dependencies**: T071 · **Requirement**: FR-034

- [ ] **T074** [P] [US2] Extend `scripts/demo-seed.ts` with a business user and 3 payees
  - **Acceptance**: US2 is demoable immediately after seeding
  - **Est**: 30 min · **Dependencies**: T055, T069

- [ ] **T075** [P] Corridor presets (India, Pakistan, Philippines, Egypt, Bangladesh) with correct currency formatting
  - **Acceptance**: ₹ / ₨ / ₱ / £E / ৳ render with correct locale grouping
  - **Est**: 1 h · **Dependencies**: T039 · **Requirement**: FR-036, NFR-020

- [ ] **T076** [P] Comparison panel — "Exchange house: AED 15 + ~1.5% spread, 2–3 days · This: AED 1.00, 5 seconds"
  - **Acceptance**: every comparison input carries a **cited source and date**; no unsourced claim appears
  - **Est**: 1 h · **Dependencies**: T041 · **Requirement**: FR-032, §9.3 anti-goals

### Phase 6 — User Story 3 (only if T006 succeeded and Day 4 is on schedule)

- [ ] **T077** [P] [US3] Implement `lib/bridge.ts` — the **only** Bridge Kit importer
  - **Acceptance**: `bridge(from, to, amount)` returns both leg hashes; `useForwarder: true`
  - **Est**: 2 h · **Dependencies**: T006, T022 · **Requirement**: FR-031

- [ ] **T078** [US3] Add a destination-chain option to recipient setup
  - **Acceptance**: selecting a non-Arc destination sets `destination_chain_id`; unsupported routes are **disabled with a plain-language explanation**, never a silent failure
  - **Est**: 1 h · **Dependencies**: T077, T039 · **Requirement**: US3 AC-3, Constitution II

- [ ] **T079** [US3] Two-leg status timeline with independent explorer links
  - **Acceptance**: `Settling on Arc ✓ → Moving to Base ⟳ → Delivered ✓`, each leg linkable
  - **Est**: 1.5 h · **Dependencies**: T077, T043 · **Requirement**: US3 AC-2

- [ ] **T080** [P] [US3] Combined cross-chain quote — one total to the sender, per-leg detail on expand
  - **Acceptance**: sender sees exactly one number; expansion reveals both legs
  - **Est**: 1 h · **Dependencies**: T077, T041 · **Requirement**: US3 AC-1

- [ ] **T081** [US3] Record the outcome (success or limitation) in `docs/circle-feedback-notes.md`
  - **Acceptance**: reproducible detail — SDK version, chain pair, exact error if any
  - **Est**: 30 min · **Dependencies**: T077 · **Requirement**: SC-016

### Demo video

- [ ] **T082** 🎬 Write the 2–3 minute demo video script in `docs/demo-script.md`, **against flows that already work**
  - **Acceptance**: every beat maps to a working feature; no planned or aspirational functionality appears
  - **Est**: 1 h · **Dependencies**: T071 (or T044 if US2 was cut) · **Requirement**: SC-015, Constitution IX

- [ ] **T083** 🎬 Pre-recording check — fund wallets, pre-warm caches, verify no secret is visible on screen, in terminal scrollback, or in devtools
  - **Acceptance**: written checklist completed and signed off
  - **Est**: 30 min · **Dependencies**: T082 · **Requirement**: Constitution VII

- [ ] **T084** 🎬 Record and upload the demo video; link it in the README
  - **Acceptance**: 2–3 minutes; shows the hero flow and a live explorer verification
  - **Est**: 1.5 h · **Dependencies**: T083 · **Requirement**: SC-015

**Day 4 total: ≈ 24 h with US3, ≈ 17 h without.** **US3 (T077–T081) is the designated cut.**

---

# Day 5 – Docs, Video Script, Circle Feedback, Final Submission Prep

*Phase 7 — buffer, honesty, and verification. **Not a build day.***

- [ ] **T085** 📄 Write the **"Circle Product Feedback"** README section — specific, constructive, citing concrete docs and SDK surfaces
  - **Acceptance**: names real friction encountered (e.g. Arc's 18dp/6dp dual-interface documentation, `getWallet` balance caveat, Bridge Kit Arc routing, faucet limits vs realistic demo needs); generic praise does **not** satisfy this
  - **Est**: 1.5 h · **Dependencies**: T081, T006 · **Requirement**: SC-016, Constitution DoD

- [ ] **T086** Verify setup from a **genuinely clean clone** in a fresh directory, following only the README
  - **Acceptance**: works first time in < 10 min; every deviation found is fixed in the README
  - **Est**: 1.5 h · **Dependencies**: T061 · **Requirement**: SC-001, Constitution VIII

- [ ] **T087** [P] Run the full secret scan across repo, README, diagram, screenshots, and video
  - **Acceptance**: `scripts/check-secrets.sh` clean; manual review of all images and video frames
  - **Est**: 1 h · **Dependencies**: T084 · **Requirement**: SC-010, Constitution VII

- [ ] **T088** [P] Verify `.env.example` matches every variable read by `lib/env.ts`
  - **Acceptance**: a diff of both lists is empty
  - **Est**: 20 min · **Dependencies**: T018 · **Requirement**: NFR-012

- [ ] **T089** [P] Run `npm run demo:reset` against a clean database and confirm green
  - **Acceptance**: reset completes; hero flow immediately runnable afterwards
  - **Est**: 30 min · **Dependencies**: T056 · **Requirement**: SC-017

- [ ] **T090** [P] Confirm all four Circle products are genuinely integrated and correctly mapped in the README
  - **Acceptance**: each mapped file path exists and actually calls the product
  - **Est**: 30 min · **Dependencies**: T062 · **Requirement**: SC-008, Constitution V

- [ ] **T091** [P] Re-verify the 375px pass on the deployed URL on a real phone
  - **Acceptance**: hero flow completable on an actual mobile device
  - **Est**: 45 min · **Dependencies**: T058 · **Requirement**: SC-009

- [ ] **T092** [P] Non-crypto-native user test — hand the deployed URL to someone unfamiliar and observe silently
  - **Acceptance**: they complete the hero flow **unassisted** without asking what a term means
  - **Est**: 30 min · **Dependencies**: T058 · **Requirement**: SC-012

- [ ] **T093** [P] Confirm every settled transfer exposes a resolvable explorer link
  - **Acceptance**: spot-check ≥5 transfers; all resolve on `testnet.arcscan.app`
  - **Est**: 30 min · **Dependencies**: T044 · **Requirement**: SC-005

- [ ] **T094** [P] Verify on-screen amounts match on-chain amounts **1:1**
  - **Acceptance**: pick 3 transfers, compare UI against the explorer; exact match in every case
  - **Est**: 30 min · **Dependencies**: T093 · **Requirement**: Constitution II, plan.md Assumption-4 amendment

- [ ] **T095** 🔴 Fund all demo wallets and verify balances **within 4 hours of submission**
  - **Acceptance**: treasury and demo sender wallets funded; a full hero flow run immediately before submitting
  - **Est**: 30 min · **Dependencies**: T004 · **Requirement**: SC-018, risk R2

- [ ] **T096** Walk the Constitution **Definition of Done** checklist item by item, verifying each rather than assuming
  - **Acceptance**: all 12 boxes ticked with evidence
  - **Est**: 1 h · **Dependencies**: T085–T095 · **Requirement**: Constitution DoD

- [ ] **T097** [P] Update `docs/PROVENANCE.md` with the final delta from upstream
  - **Acceptance**: accurately reflects what was kept, replaced, and added
  - **Est**: 30 min · **Dependencies**: T007 · **Requirement**: Constitution VI

- [ ] **T098** Submit — repo link, deployed demo URL, video link, and track declaration
  - **Acceptance**: submission accepted before the 2026-08-10 deadline
  - **Est**: 30 min · **Dependencies**: T096

**Day 5 total: ≈ 11 h — deliberately light.** Day 5 is buffer. If Days 1–4 slipped, this
is where the slack lives.

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 0 (spikes)** — no dependencies. **T003 and T005 block everything.**
- **Phase 1 (setup)** — depends on T001.
- **Phase 2 (foundational)** — **blocks all user stories.** T014 and T016 block the most.
- **Phase 3 (US1)** — depends on Phase 2. **Independently deliverable = the MVP.**
- **Phase 4 (UX + docs)** — depends on US1. **Docs gate Day 4.**
- **Phase 5 (US2)** — depends on Phase 2 + T031. Independent of US1's UI work.
- **Phase 6 (US3)** — depends on T006 + T077. **Fully droppable.**
- **Phase 7 (submission)** — depends on everything shipped.

### Story independence

| Story | Can start after | Independently testable? | Droppable? |
|-------|-----------------|------------------------|------------|
| **US1** (P1) | Phase 2 | ✅ Yes — this alone is a viable submission | ❌ Never |
| **US2** (P2) | Phase 2 + T031 | ✅ Yes — reuses US1's orchestrator, not its UI | ⚠️ Yes, if Day 4 slips |
| **US3** (P3) | T006 + T077 | ✅ Yes | ✅ Designated cut |

### Critical path

```
T001 → T002 → T003 → T022 → T031 → T033 → T040 → T041 → T043 → T044 → T058 → T061 → T084 → T098
```

Everything else can flex around this line.

### Parallel opportunities

```bash
# Day 1 — after T012
T015, T017, T023, T024, T025  # independent modules, different files

# Day 2 — after T031
T034, T037, T039              # API read, auth, recipients — no shared files

# Day 3 — after T044
T046, T049, T050, T055, T059  # UI polish, scripts, E2E

# Day 4 — after T067
T068, T072, T073, T075, T076  # batch extras, presets, comparison

# Day 5 — nearly everything
T087, T088, T089, T090, T091, T092, T093, T097
```

---

## Implementation Strategy

### MVP first (User Story 1 only)

1. Phase 0 spikes — **T003 must be green** or stop
2. Phase 2 foundational — T014 (branded money) is the highest-value defensive task
3. Phase 3 US1 — **stop and validate**
4. Deploy. **You now have a viable submission.**

### Incremental delivery

```
Day 1  Foundation           → quote endpoint live
Day 2  US1                  → 🎯 MVP — viable submission exists
Day 3  UX + docs            → judge-runnable, documented
Day 4  US2 (+US3) + video   → stronger submission
Day 5  Verify + submit      → buffer
```

Each day adds value without breaking the previous one.

### If you fall behind — cut in this order

1. **US3** (T077–T081) — designed to be dropped
2. **US2 extras** (T072, T073, T075, T076)
3. **US2 entirely** (T065–T076) — Gateway then appears in the architecture diagram and
   Circle Product Feedback rather than in the product
4. **Never cut**: T060–T063 (README + diagram + tables), T082–T084 (video),
   T085 (Circle Product Feedback), T095 (fund wallets), T096 (DoD walk)

> Documentation is not the buffer. **User Story 2 is.**

---

## Task Summary

| Phase | Tasks | Story | Est. |
|-------|-------|-------|------|
| Phase 0 — Spikes | T001–T006 (6) | — | ~4.5 h |
| Phase 1 — Setup | T007–T013 (7) | — | ~3.5 h |
| Phase 2 — Foundational | T014–T028 (15) | — | ~14 h |
| Phase 3 — US1 hero | T029–T045 (17) | US1 | ~21 h |
| Phase 4 — UX + docs | T046–T064 (19) | US1 + docs | ~22 h |
| Phase 5 — US2 batch | T065–T076 (12) | US2 | ~15 h |
| Phase 6 — US3 cross-chain | T077–T081 (5) | US3 | ~6 h |
| Phase 7 — Submission | T085–T098 (14) | — | ~11 h |
| Video | T082–T084 (3) | — | ~3 h |
| **Total** | **98 tasks** | | **~100 h** |

**Reality check**: ~100 hours across 5 days is ~20 h/day, which is not achievable solo.
That is deliberate — the list is **complete**, and the cut order above tells you exactly
what to drop. A realistic solo + Claude Code pace of 10–12 h/day lands at roughly
**Days 1–3 complete + US2 partial**, which still satisfies every Constitution
Definition-of-Done item, because US2 is not in the DoD and the README is.

**Suggested MVP scope**: Phase 0 + Phase 1 + Phase 2 + Phase 3 (**T001–T045, 45 tasks**)
delivers a complete, verifiable, submittable product.

---

## Notes

- `[P]` tasks touch different files and have no incomplete dependencies
- Commit after each task or logical group; `main` must stay demoable from T045 onward
- **T003 and T005 are hard gates** — do not proceed past Phase 0 without them
- **T014 (branded money types) prevents the worst available bug** in this build: Arc's
  18-decimal native / 6-decimal ERC-20 dual interface over one pool of funds
- Fund the faucet **every single day** (T004, T095) — R2 is the most likely cause of a
  failed demo
