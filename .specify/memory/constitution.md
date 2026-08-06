<!--
SYNC IMPACT REPORT
==================
Version change: (unversioned template) → 1.0.0
Bump rationale: MAJOR — initial ratification. The file previously contained only
unfilled template placeholders; this is the first binding governance document.

Modified principles: none (initial adoption). Nine principles established:
  I.    Arc Testnet Only (NON-NEGOTIABLE)
  II.   Real Flows Over Mockups (NON-NEGOTIABLE)
  III.  Radical Transparency
  IV.   Consumer-Grade, Non-Crypto-Native UX
  V.    Circle Surface Area Maximalism
  VI.   Extend, Don't Greenfield
  VII.  Secrets Discipline (NON-NEGOTIABLE)
  VIII. Judge-Runnable in Ten Minutes
  IX.   Demo-Path Integrity Under Deadline

Added sections:
  - Product Scope: Corridor, Personas, Hero Use Cases
  - Technology & Architecture Constraints
  - Submission Deliverables (Definition of Done)
  - Development Workflow & Quality Gates
  - Governance

Removed sections: none.

Templates requiring updates:
  ✅ .specify/memory/constitution.md (this file — authored)
  ⚠ .specify/templates/plan-template.md — "Constitution Check" section is a bare
     placeholder; gates enumerated in "Constitution Check Gates" below must be
     pasted in at first /sp.plan run.
  ✅ .specify/templates/spec-template.md — no change required; Success Criteria and
     prioritized user stories already satisfy Principles III and IX.
  ✅ .specify/templates/tasks-template.md — no change required; phase/checkpoint
     structure already satisfies Principle IX (vertical slices, demoable checkpoints).
  ✅ .claude/commands/sp.*.md — reviewed, no outdated agent-specific references found.
  ⚠ README.md — does not exist yet; Principle VIII and the Submission Deliverables
     section define its mandatory contents. Create before submission.

Deferred TODOs: none. All placeholders resolved.

Verified external facts (2026-08-05):
  - Arc Testnet Chain ID 5042002, RPC https://rpc.testnet.arc.network,
    explorer https://testnet.arcscan.app — confirmed via Arc docs / Alchemy.
  - USDC is the NATIVE GAS TOKEN on Arc (6 decimals) — confirmed.
  - faucet.circle.com dispenses ~1 USDC/day per address on Arc Testnet — confirmed.
    This is a hard operational constraint; see Principle IX.
  - Official sample apps confirmed to exist: circlefin/arc-commerce,
    circlefin/arc-multichain-wallet, circlefin/arc-nanopayments.
-->

# Aurum Rails Constitution

**Project**: Aurum Rails — UAE → Global stablecoin remittance & payout rails
**Submission**: Ignyte × Circle × Arc — Stablecoins Commerce Stack Challenge
**Track**: 1 — Best Cross-Border Payments & Remittances Experience (UAE → Global)
**Submission deadline**: 2026-08-10

This constitution is the supreme authority for this repository. Every specification,
plan, task, ADR, commit, and line of code MUST comply. Where any other document,
convention, habit, or convenience conflicts with this constitution, this constitution
wins. Non-compliance is a defect, not a style preference.

## Core Principles

### I. Arc Testnet Only (NON-NEGOTIABLE)

All on-chain activity MUST target **Arc Testnet, Chain ID 5042002**. No mainnet
connection, no mainnet key material, no mainnet RPC endpoint may exist anywhere in the
repository, environment files, or documentation.

- The chain ID MUST be read from a single exported constant sourced from environment
  configuration; it MUST NOT be inlined at call sites.
- Every code path that constructs a transaction, wallet, or RPC client MUST assert the
  active chain ID equals 5042002 and MUST fail loudly (throw, not warn) on mismatch.
- Canonical endpoints: RPC `https://rpc.testnet.arc.network`, explorer
  `https://testnet.arcscan.app`, faucet `https://faucet.circle.com`.
- USDC on Arc is the **native gas token** with **6 decimals**. All amount arithmetic
  MUST use integer minor units (`bigint`, 6dp). Floating-point math on money is
  forbidden. Display formatting is the only place decimals are introduced.
- Every user-facing surface MUST carry a persistent, unmissable **"Arc Testnet —
  educational demo. No real funds."** badge. This is not a footnote.

**Rationale**: The submission is an educational testnet demo. Any ambiguity about
whether real value moves is both a judging risk and a user-safety risk. A hard assert
is cheaper than a retracted demo.

### II. Real Flows Over Mockups (NON-NEGOTIABLE)

The submission MUST include a working frontend and a working backend that together
execute **genuine USDC transfers on Arc Testnet**, verifiable by transaction hash on
the public explorer.

- The hero user journey MUST be end-to-end real: no stubbed transfer, no fake receipt,
  no simulated confirmation on the critical path.
- Anything simulated, mocked, or conceptual (for example, AED pay-in, FX pricing, KYC,
  StableFX where gated) MUST be labeled **"Simulated"** in the UI at the point of
  display, and listed in the README's *What Is Real vs. Simulated* table.
- Every completed transfer MUST surface a clickable explorer link to its transaction.
- Silently faking a flow to make a demo look better is a constitutional violation and
  grounds for reverting the change, regardless of deadline pressure.

**Rationale**: Judges discount demos they cannot verify. An honest, smaller real flow
beats a large unverifiable one, and honest labeling of simulated parts builds rather
than costs credibility.

### III. Radical Transparency

The product's core differentiator is that the sender always knows exactly what is
happening to their money. Every send flow MUST display, **before** the user confirms:

- **Amount sent** and **amount the recipient receives**, both explicit.
- **Total fee**, itemized into network cost and service fee, in both USD and AED.
- **Exchange rate** used, with its source and timestamp, whenever any currency
  conversion is shown.
- **Estimated arrival time**, stated as a concrete duration or timestamp.

After confirmation, the transfer MUST expose a live status timeline with named,
human-readable states (for example: Initiated → Funding → Settling on Arc → Delivered),
each timestamped, updating without a manual page refresh, and each terminal failure
state carrying a plain-language reason and a recoverable next action.

No fee, spread, or delay may be hidden, bundled, deferred to fine print, or disclosed
only after the user has committed.

**Rationale**: Opacity is precisely the incumbent remittance failure this track exists
to attack. Transparency is the product, not a feature of it.

### IV. Consumer-Grade, Non-Crypto-Native UX

The primary persona is a UAE-based expatriate worker sending money home who neither
knows nor cares what a blockchain is.

- Default UI copy MUST use everyday financial language: "send", "recipient", "arrives",
  "fee". Crypto vocabulary (gas, seed phrase, RPC, chain, nonce, approve) MUST NOT
  appear in the default path; where a raw value is genuinely needed, it belongs behind
  an explicitly opened "Technical details" disclosure.
- The application MUST be fully usable and visually correct at 375px viewport width.
  Mobile-first is a requirement, not an aspiration.
- No browser-extension wallet, no seed phrase, and no external signing step may block
  the hero journey. Onboarding to first send MUST be achievable in under two minutes.
- Every asynchronous action MUST render an explicit loading, empty, success, and error
  state. A frozen button is a defect.
- Accessibility floor: semantic HTML, keyboard-operable controls, visible focus rings,
  and WCAG AA contrast on all text.

**Rationale**: The track rewards *experience*. A technically flawless flow that
requires crypto literacy fails the stated corridor and its users.

### V. Circle Surface Area Maximalism

The submission MUST meaningfully integrate **at least four** Circle products, each
doing real work on a real path — not merely imported, name-dropped, or configured.

Mandatory:

1. **USDC on Arc Testnet** — the settlement rail for every transfer.
2. **Circle Wallets (Developer-Controlled)** — wallet creation and custody for sender
   and recipient, enabling the no-seed-phrase onboarding required by Principle IV.
3. **Circle Gateway** — treasury routing and multi-party or batched settlement,
   demonstrating unified balance and operational fund movement.
4. **CCTP and/or App Kit / Bridge Kit** — cross-chain USDC movement, used where the
   corridor genuinely calls for it (for example, delivering to a recipient on a
   non-Arc chain).

Optional and encouraged where it strengthens the story: **StableFX** concepts. If
access is gated, StableFX MUST still appear in the architecture diagram and be
implemented behind a clearly labeled simulated adapter that conforms to the same
interface a real integration would use.

Each integrated product MUST be traceable: the README MUST map product → the exact
source files and endpoints where it is exercised.

**Rationale**: The challenge is a showcase of the Circle stack. Depth of genuine
integration is the primary technical scoring axis; breadth without use is transparent
to judges.

### VI. Extend, Don't Greenfield

Official Circle sample applications are the starting point. Building from scratch what
Circle already ships is forbidden.

- The base MUST be an official `circlefin` Arc sample application. **`circlefin/arc-commerce`
  is the designated base** (Next.js + Supabase + Circle Developer-Controlled Wallets —
  an exact match for this constitution's stack), with patterns lifted from
  `circlefin/arc-multichain-wallet` for Gateway and cross-chain flows.
- Provenance MUST be recorded: the README MUST state which sample apps were used, their
  commit or version, and a clear summary of what was changed, added, and removed.
- Divergence from a sample's established pattern requires a one-line justification in
  the plan. Rewriting a working sample subsystem for taste alone is prohibited.
- Upstream licenses and attribution MUST be preserved.

**Rationale**: With five days available, sample apps convert scarce hours from
plumbing into differentiation, and demonstrate fluency with Circle's intended
developer path.

### VII. Secrets Discipline (NON-NEGOTIABLE)

No secret, API key, entity secret, private key, wallet set identifier, database
credential, or access token may ever appear in source, configuration, fixtures, test
data, logs, screenshots, the README, the architecture diagram, or the demo video.

- All secrets MUST be supplied via environment variables.
- `.env.example` MUST exist, MUST enumerate every required variable with a description
  and a safe placeholder value, and MUST be kept in sync with the code. A variable read
  by code but absent from `.env.example` is a defect.
- `.env*` files (except `.env.example`) MUST be git-ignored from the first commit.
- Circle API keys and entity secrets are **server-side only**. Any secret reachable
  from a `NEXT_PUBLIC_` variable or shipped in a client bundle is a critical defect
  requiring immediate key rotation.
- Startup MUST validate required environment variables and fail fast with an actionable
  message naming the missing variable.
- Before recording the demo video or pushing any commit, secrets MUST be re-verified as
  absent from the diff and from anything on screen.

**Rationale**: A leaked key is unrecoverable in public judging, is the single most
common hackathon failure, and instantly disqualifies a payments submission.

### VIII. Judge-Runnable in Ten Minutes

A judge with no prior context MUST be able to clone, configure, run, and complete the
hero flow in **ten minutes or less**, on the strength of the README alone.

The README MUST contain, at minimum:

- A one-paragraph statement of the problem and the solution.
- The track and corridor addressed.
- An **architecture diagram** (Mermaid preferred; committed to the repo and rendered
  inline) showing user, frontend, backend, Circle services, and Arc Testnet.
- Copy-pasteable setup: prerequisites, install, environment configuration, faucet
  instructions, run command.
- A **Circle products used** table mapping each product to the files that exercise it.
- A **What Is Real vs. Simulated** table (Principle II).
- A clearly headed **"Circle Product Feedback"** section (Principle IX).
- A demo video link and screenshots of the hero flow.

Setup steps MUST be verified by executing them from a clean checkout before
submission. Untested instructions are treated as broken instructions.

**Rationale**: Judges are time-constrained and evaluate many submissions. Friction in
the first ten minutes caps the score regardless of what the code does afterwards.

### IX. Demo-Path Integrity Under Deadline

With approximately five days to the deadline, scope discipline is a first-class
engineering constraint, not a project-management afterthought.

- The **hero path MUST always be demoable**. Work is delivered as vertical slices;
  `main` MUST never be left in a state where the hero flow is broken overnight.
- Priority order is absolute and MUST NOT be inverted: **hero flow works → transparency
  surfaces (Principle III) → README and architecture diagram → demo video → secondary
  use cases → polish.** Secondary features MUST NOT be started while any higher item
  is incomplete.
- **Faucet reality**: the Arc Testnet faucet dispenses roughly **1 USDC per address per
  day**. All demo amounts, seeded balances, and test fixtures MUST be sized in cents,
  not dollars. Treasury and recipient wallets MUST be funded early and continuously;
  running the demo dry is a foreseeable, and therefore unacceptable, failure.
- A **deterministic seed/reset script** MUST exist so the demo can be returned to a
  known-good state in one command.
- Every merged change MUST leave the application running. "It will work once X lands"
  is not a valid state at any checkpoint.
- The demo video script (2–3 minutes) MUST be written against flows that already work,
  never against flows that are planned.

**Rationale**: The most common cause of a failed hackathon submission is not weak
code — it is a strong build that could not be demonstrated on the day.

## Product Scope: Corridor, Personas, Hero Use Cases

**Corridor**: UAE → Global. The sender is always in the UAE; recipients are global,
with an emphasis on high-volume UAE remittance destinations (India, Pakistan,
Philippines, Egypt, Bangladesh). AED is the sender-side reference currency in all
fee and rate displays.

**Hero use cases** (both MUST be fully working and demoable):

1. **Consumer remittance** — a UAE-based expatriate sends money to family abroad.
   This is the primary demo narrative and the subject of the demo video.
2. **Freelancer / contractor payout** — a UAE business pays an individual overseas.

*Rationale for this pairing*: both are literally named in the track title, and they
share one set of rails — quote, confirm, transfer, track, receipt. One build serves
both, so the second hero costs incremental UI rather than incremental architecture.

**Secondary use cases** (build only after all Principle IX priorities above them are
complete):

3. **Marketplace / platform settlement** — a UAE platform pays many global sellers in
   one batch. This is the natural showcase for Circle Gateway multi-party settlement.
4. **Global payroll prototype** — a recurring, scheduled extension of case 3.
5. **"Pay-in AED, settle in USDC"** — the AED on-ramp is **conceptual**: UX and rails
   are demonstrated, the pay-in itself is simulated and labeled per Principle II.

**Explicitly out of scope**: mainnet deployment, real fiat movement, real KYC/AML
onboarding, custody of real user funds, mobile native applications, production
compliance certification, and multi-tenant account management.

## Technology & Architecture Constraints

The following stack is binding. Substitutions require an ADR (see Governance).

- **Framework**: Next.js 15, App Router, TypeScript in `strict` mode.
- **API layer**: Next.js Route Handlers and Server Actions. All Circle SDK calls
  execute server-side only.
- **Styling**: Tailwind CSS with shadcn/ui. Custom components only where shadcn/ui has
  no equivalent.
- **Wallets**: Circle **Developer-Controlled Wallets** as primary, chosen for
  automation and for the seedless onboarding Principle IV demands.
- **Movement**: Circle Gateway, CCTP, and App Kit / Bridge Kit per Principle V.
- **Database**: Supabase (Postgres). Schema MUST be captured as committed migrations,
  never as manual console changes.
- **FX rates**: a public rate API where available; otherwise a mocked rate provider
  behind a stable interface. Either way the source and timestamp MUST be displayed
  (Principle III).
- **Money type**: a single shared `Amount` representation in integer minor units with
  an explicit currency tag. Ad-hoc `number` money values are forbidden.
- **Idempotency**: every payment-initiating endpoint MUST accept and honour an
  idempotency key. A duplicated request MUST NOT produce a second transfer.
- **State model**: transfer status MUST be an explicit, persisted state machine with
  enumerated states and recorded transitions. Status MUST NOT be inferred ad hoc from
  chain queries at render time.
- **Error taxonomy**: API errors MUST return a stable machine-readable code, a
  user-safe message, and a correlation ID. Raw provider errors MUST NOT reach the UI.
- **Observability**: every Circle API call and on-chain submission MUST emit a
  structured log containing correlation ID, operation, outcome, and duration — with
  amounts included and secrets never included.
- **Configuration**: all endpoints, chain IDs, contract addresses, and keys come from
  environment variables validated at startup.

## Submission Deliverables (Definition of Done)

The submission is **not** done until every item below is true. This list is the final
acceptance gate.

- [ ] Hero flow (consumer remittance) executes end-to-end on Arc Testnet with a
      verifiable transaction hash on `testnet.arcscan.app`.
- [ ] Second hero flow (freelancer payout) executes end-to-end.
- [ ] At least four Circle products genuinely integrated (Principle V).
- [ ] Full fee, rate, arrival-estimate, and live status transparency (Principle III).
- [ ] Mobile-correct, consumer-grade UI at 375px with testnet badge (Principles I, IV).
- [ ] Architecture diagram committed and rendered in the README.
- [ ] README complete per Principle VIII, with setup verified from a clean clone.
- [ ] `.env.example` complete, accurate, and secret-free; repository scanned for
      leaked secrets (Principle VII).
- [ ] Demo video script (2–3 minutes) written, and video recorded against working flows.
- [ ] **"Circle Product Feedback"** section written: honest, specific, and constructive
      — what was excellent, what was confusing, what was missing, what would have saved
      time, with concrete references to documentation and SDK surfaces. Generic praise
      does not satisfy this requirement.
- [ ] Seed/reset script runs green from a clean database.
- [ ] Demo wallets funded and verified within four hours of submission.

## Development Workflow & Quality Gates

**Flow**: `/sp.specify` → `/sp.plan` → `/sp.tasks` → `/sp.implement`, with a PHR
recorded for every user prompt and an ADR suggested for every architecturally
significant decision.

**Constitution Check Gates** — every `/sp.plan` MUST evaluate and record these, and
paste them into the plan template's *Constitution Check* section:

1. Does every on-chain path target Chain ID 5042002 with a hard assertion? (I)
2. Is the hero path real, with anything simulated explicitly labeled? (II)
3. Are fees, rate, arrival estimate, and live status all surfaced pre-confirmation? (III)
4. Is the flow completable on a 375px screen with zero crypto vocabulary? (IV)
5. Are four or more Circle products doing real work, and mapped in the README? (V)
6. Is this extending an official sample rather than rebuilding it, with provenance? (VI)
7. Are all secrets environment-sourced, server-side, and in `.env.example`? (VII)
8. Can a judge run this in ten minutes from the README alone? (VIII)
9. Does this change keep the hero path demoable, and respect the priority order? (IX)

Any "no" MUST be justified in the plan's Complexity Tracking table with the simpler
alternative that was rejected and why, or the plan MUST be revised.

**Testing posture**: given the five-day constraint, exhaustive TDD is not mandated.
The following minimum is mandated and is not negotiable down:

- Money arithmetic, fee calculation, and FX conversion MUST have unit tests.
- The transfer state machine MUST have unit tests covering every transition, including
  failure and terminal states.
- The hero flow MUST have at least one end-to-end happy-path test or a documented,
  repeatable manual test script executed before submission.

**Code standards**: TypeScript `strict`; no `any` on money, identity, or transfer
paths; every exported function documented with its purpose and failure modes; smallest
viable diff; no unrelated refactors; commit messages that state intent.

**Human checkpoints** (per CLAUDE.md's Human-as-Tool strategy): stop and ask the user
when requirements are ambiguous, when an undocumented dependency or gated Circle
product surfaces, when two architectures carry materially different risk, and at each
completed milestone.

## Governance

**Supremacy**: This constitution supersedes all other practices, preferences, and
prior conventions in this repository. Specifications, plans, tasks, ADRs, and code
that conflict with it are defective and MUST be corrected rather than excused.

**Amendment procedure**:

1. Propose the amendment with an explicit rationale and the principle(s) affected.
2. Obtain the project owner's (the architect's) explicit consent. Amendments MUST NOT
   be self-approved by an agent.
3. Apply the edit, bump the version, update the Sync Impact Report at the top of this
   file, and propagate consequences to `.specify/templates/` and the README.
4. Record the amendment as a PHR under `history/prompts/constitution/`.

**Versioning policy** (semantic):

- **MAJOR** — a principle is removed, or redefined in a backward-incompatible way.
- **MINOR** — a principle or governance section is added, or guidance is materially
  expanded.
- **PATCH** — clarification, wording, or typo correction with no semantic change.

**Compliance review**:

- `/sp.plan` MUST run the nine Constitution Check Gates before Phase 0 and again after
  Phase 1 design.
- `/sp.implement` MUST verify Principles I, II, and VII on every change that touches
  chain configuration, a transfer path, or configuration handling.
- Before submission, the Definition of Done checklist MUST be walked in full, item by
  item, with each box verified rather than assumed.

**Non-negotiable principles** (I, II, VII) MUST NOT be waived under deadline pressure.
Deadline pressure is the exact condition they were written to survive.

**Runtime guidance**: `CLAUDE.md` governs agent behaviour, PHR creation, and ADR
suggestion. Where `CLAUDE.md` and this constitution conflict on project substance,
this constitution prevails.

**Version**: 1.0.0 | **Ratified**: 2026-08-05 | **Last Amended**: 2026-08-05
