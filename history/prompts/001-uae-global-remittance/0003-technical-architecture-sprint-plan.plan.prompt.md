---
id: 0003
title: Technical Architecture Sprint Plan
stage: plan
date: 2026-08-05
surface: agent
model: claude-opus-5
feature: 001-uae-global-remittance
branch: 001-uae-global-remittance (no git repo; SPECIFY_FEATURE only)
user: my5757980@gmail.com
command: /sp.plan
labels: ["plan", "architecture", "circle", "arc-testnet", "usdc", "gateway", "bridge-kit", "cctp", "nextjs", "supabase", "vercel"]
links:
  spec: specs/001-uae-global-remittance/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/001-uae-global-remittance/plan.md (created — 9 sections, 5 mermaid diagrams, 5-day schedule)
 - specs/001-uae-global-remittance/research.md (created — Phase 0, 10 resolved unknowns, 5 D0 spikes)
 - specs/001-uae-global-remittance/data-model.md (created — Phase 1, full DDL, RLS, state machine)
 - specs/001-uae-global-remittance/contracts/openapi.yaml (created — Phase 1, 7 endpoints)
 - specs/001-uae-global-remittance/quickstart.md (created — Phase 1, judge-facing 10-min path)
 - CLAUDE.md (updated by update-agent-context.ps1 — added TS/Node 22, Circle SDKs, Supabase)
tests:
 - none (planning artifacts; no executable code produced)
 - test strategy defined: Vitest units on money/fees/FX/state machine; one Playwright hero-path E2E
---

## Prompt

Based on the Constitution and the full Product Specification, create a detailed Technical Architecture and Implementation Plan optimized for a 5-day sprint.

Include:

1. High-level System Architecture (with mermaid diagram)
2. Component breakdown (Frontend, Backend APIs, Wallet service, Payment orchestration, Status tracking, Database)
3. Key data models
4. Sequence diagrams for the main payment / remittance flows
5. Exact Circle SDK / API integration points
6. Environment variables & secrets management
7. Recommended starting point (which official Arc sample apps to fork/extend)
8. Deployment plan (Vercel + Arc Testnet)
9. Risk list + mitigations (testnet issues, key management, time pressure)

Output everything in clean markdown with mermaid diagrams.

## Response snapshot

Produced `plan.md` (all 9 requested sections, 5 mermaid diagrams) plus the Phase 0/1
artifacts: `research.md`, `data-model.md`, `contracts/openapi.yaml`, `quickstart.md`.
Constitution Check **PASS on all nine gates**, pre-Phase-0 and post-Phase-1. Complexity
Tracking table empty — no violations to justify.

### Phase 0 research was decisive — it changed the plan three times

All facts sourced **first-party** from `circlefin/skills` (the `use-arc`, `use-gateway`,
`use-developer-controlled-wallets`, and `bridge-stablecoin` SKILL.md files) and the
`arc-commerce` repository, rather than from model memory.

**1. 🔄 Reversed spec risk R1 (HIGH → LOW).** Spec §6.4 recorded, from third-party
reporting, that "the Bridge SDK does not accept Arc Testnet as a routing source or
destination". **Circle's own `bridge-stablecoin` skill contradicts this**: Bridge Kit
supports bridging "between any two chains on Circle Wallets" and lists Arc Testnet as
supported, with a first-party `@circle-fin/adapter-circle-wallets` adapter that matches
our DCW topology exactly. User Story 3 moves from "likely dropped" to "likely ships".
First-party vendor docs outranked a secondary support article — and the adapter's
existence is corroborating evidence.

**2. ✅ De-risked the assumption that could have killed the project.** `ARC-TESTNET` is a
confirmed blockchain identifier in `@circle-fin/developer-controlled-wallets`, and
`arc-commerce/.env.example` ships `CIRCLE_BLOCKCHAIN=ARC-TESTNET` as a first-class
variable. Had this been false, Constitution IV's seedless-onboarding promise would have
collapsed and the whole persona strategy with it.

**3. ⚠️ Found the highest-risk technical detail in the build — Arc's dual-interface gas
model.** Per `use-arc`: the native gas asset *is* USDC, and "the native view and the USDC
ERC-20 are the **same** pool of funds, exposed two ways" — **native 18 decimals for gas,
ERC-20 6 decimals for everything else**, `1e18 native = 1e6 ERC-20`, with Circle's
explicit instruction never to sum the two views. This is a silent 10¹²× money bug waiting
in the payment path. Mitigation: **branded TypeScript types** (`Usdc6` / `Native18`) that
make the confusion a **compile error**, with the native view touched in exactly one module.
Logged as new risk **R9 (HIGH)**.

### Other verified constants now hard-coded into the plan

Arc USDC `0x3600000000000000000000000000000000000000` (6dp) · EURC
`0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` · CCTP domain 26 · viem has **native**
`arcTestnet` (no custom chain def) · Gateway testnet API
`https://gateway-api-testnet.circle.com/v1/` with Wallet `0x0077777d…19B9` and Minter
`0x0022222A…475B`, **Arc Testnet confirmed in the testnet chain list** · Bridge Kit Fast
mode ≈8–20 s · DCW lifecycle `INITIATED→CLEARED→QUEUED→SENT→CONFIRMED→COMPLETE` with a
`STUCK` (low-fee) state · DCW requires UUID v4 `idempotencyKey` on every mutation ·
`arc-commerce` is `master`, Apache-2.0, Node 22+, with **webhook signature verification
already implemented**.

### Architectural decisions and their reasoning

- **Fork `circlefin/arc-commerce`** — the only official sample combining Next.js +
  Supabase + DCW on `ARC-TESTNET` *and* shipping Circle webhook signature verification,
  which turns our hardest requirement (live status, FR-016/NFR-004) into configuration.
  Read `arc-multichain-wallet` and `arc-fintech` for Gateway/treasury patterns, don't fork.
- **Webhooks → Supabase → Realtime → browser. Zero polling.** Satisfies FR-016 and the
  <2s NFR-004 budget while avoiding rate-limit exposure (R4).
- **The database is the source of truth for status, never the chain.** `status_events` is
  append-only; status is never re-derived from Arc at render time.
- **One orchestrator, two surfaces.** US2 batch is a loop over the same
  `executeTransfer()` as US1 — which is what makes the second hero cost UI time rather
  than architecture time (Constitution IX).
- **EOA, not SCA.** On Arc, USDC *is* gas, so an EOA funds its own gas — the usual "EOA
  needs a separate native token" objection doesn't apply here. SCA's benefits don't repay
  their complexity in 5 days.
- **Our transfer UUID *is* Circle's `idempotencyKey`**, backed by a `UNIQUE` index — FR-014
  and Circle's exactly-once guarantee become one concept instead of two that can disagree.

### Three Constitution gates are now structurally enforced, not merely intended

- **Gate 1** — `CHECK (chain_id = 5042002)` in the database. Even a catastrophic
  application bug cannot persist a non-Arc wallet.
- **Gate 7** — ESLint `no-restricted-imports` makes a Circle SDK import outside
  `wallet-service.ts` / `treasury.ts` / `bridge.ts` a **build failure** (NFR-011).
- **FR-018/FR-019** — branded money types make the decimal confusion a compile error;
  `CHECK (to_state <> 'FAILED' or reason is not null)` makes an unexplained failure
  **unrepresentable**.

### One spec amendment raised rather than applied silently

Spec Assumption 4 permitted a **display scale factor** ("AED 100 maps to a sub-USDC
on-chain amount"). The plan **rejects it** in favour of **honest 1:1 amounts at small
denominations** (AED 1–20, `DEMO_MAX_SEND_AED`). A scale factor means the number on screen
is not the number on chain — precisely what Constitution II exists to prevent, and
trivially detectable by a judge comparing the UI to the explorer. Flagged for
acknowledgement rather than changed quietly.

### 5-day schedule, ordered strictly by Constitution IX

D0 spikes only (fork, run, **send one real USDC on Arc**, verify Gateway + Bridge Kit,
fund treasury) → D1 foundation (money/chain/env, schema, quote engine) → **D2 hero flow
end-to-end, after which `main` is always demoable** → D3 transparency + claim link +
**README and architecture diagram** → D4 US2 batch + Gateway panel + **record video** →
D5 buffer, Circle Product Feedback, DoD walk, submit.

**Hard rule recorded**: D3's README ships before D4's second hero. If the schedule slips,
User Story 2 is cut before documentation is.

## Outcome

- ✅ Impact: The build is fully specified end-to-end and every high-risk unknown is either
  resolved or assigned to a D0 spike with a named fallback. The two facts most likely to
  have derailed the sprint — whether DCW supports Arc at all, and Arc's 18dp/6dp
  dual-interface trap — were found *before* any code was written. One spec risk was
  reversed and one new HIGH risk was discovered, which is the correct direction of travel
  for a research phase.
- 🧪 Tests: No code yet. Strategy fixed: Vitest units on money arithmetic, fee/FX
  calculation, and every state-machine transition; one Playwright hero-path E2E. This is
  the Constitution's mandated minimum and is not negotiable downward.
- 📁 Files: `plan.md`, `research.md`, `data-model.md`, `contracts/openapi.yaml`,
  `quickstart.md`, plus `CLAUDE.md` updated by the agent-context script.
- 🔁 Next prompts: `/sp.tasks` to generate the dependency-ordered task list, phased to the
  D0–D5 schedule with D0 spikes S1–S5 as blocking prerequisites. `/sp.adr` is warranted
  for at least three decisions (Gateway-vs-CCTP strategy, DCW EOA custody model,
  arc-commerce fork strategy). Then `/sp.implement` starting with the D0 spikes.
- 🧠 Reflection: The dual-interface gas model was the find of the session. It is
  documented in one sentence inside a skill file, it is invisible in normal use, and it
  would have produced a 10¹²× error in the money path that unit tests written from the
  spec alone would not have caught — because the spec had no reason to know about it.
  Thirty minutes of branded types buys immunity from the single worst outcome available
  in this build. This is the concrete argument for the Authoritative Source Mandate:
  the fact was not derivable from reasoning, only from reading the vendor's own docs.

## Evaluation notes (flywheel)

- Failure modes observed: (1) `setup-plan.ps1` exits 128 from an internal `git` call in a
  non-git repo despite succeeding and emitting valid JSON — same misleading exit code as
  `create-new-feature.ps1`. (2) Write tool required a prior Read because the script had
  already copied the template into `plan.md`. (3) `raw.githubusercontent.com/.../main/README.md`
  404'd for `arc-commerce`; the default branch is `master`, and the GitHub HTML page
  fetched fine — worth remembering before concluding a repo lacks a README.
  (4) `circlefin/skills` has **no** `use-cctp` skill; the CCTP material lives under
  `bridge-stablecoin`, which cost one wasted fetch.
- Graders run and results (PASS/FAIL): PASS — Constitution Check passes all 9 gates twice
  (pre-Phase-0 and post-Phase-1); no unresolved `NEEDS CLARIFICATION`; all 5 requested
  mermaid diagrams render; all 9 user-requested sections present; every Phase 0 unknown
  either resolved or assigned to a named D0 spike with a fallback.
- Prompt variant (if applicable): none — single-pass planning after 6 targeted
  verification fetches against first-party Circle sources.
- Next experiment (smallest change to try): run `git init` before `/sp.tasks`. Three
  subsystems (branch creation, PHR routing, `/sp.git.commit_pr`) are now silently
  degrading to directory-name-only identity, and the misleading exit-128 from every
  SpecKit script is a direct consequence.
