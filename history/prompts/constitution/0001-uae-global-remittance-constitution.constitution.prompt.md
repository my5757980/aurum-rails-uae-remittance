---
id: 0001
title: UAE Global Remittance Constitution
stage: constitution
date: 2026-08-05
surface: agent
model: claude-opus-5
feature: none
branch: none (not a git repository)
user: my5757980@gmail.com
command: /sp.constitution
labels: ["constitution", "circle", "arc-testnet", "usdc", "remittance", "hackathon", "uae-corridor"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - .specify/memory/constitution.md (created — v1.0.0, ratified 2026-08-05)
 - history/prompts/constitution/0001-uae-global-remittance-constitution.constitution.prompt.md (created)
tests:
 - none (governance document; no executable code produced)
---

## Prompt

You are my principal engineer and product architect for a high-stakes hackathon submission.

Project: Stablecoins Commerce Stack Challenge (Ignyte + Circle + Arc)
Track: 1 – Best Cross-Border Payments & Remittances Experience (UAE → Global)
Deadline: 10 August 2026 (only ~5 days left — prioritize a polished, working MVP)

Core Vision:
Build a modern, transparent, low-cost cross-border payment / remittance experience optimized for the UAE → Global corridor. Users (expats, freelancers, SMEs, platforms) should be able to send money from UAE with clear fees, real-time settlement confirmation, and excellent UX — powered by Circle's regulated stablecoin stack on Arc.

Key Circle Products to showcase (must use at least 3–4):
- USDC on Arc Testnet (primary settlement rail)
- Circle Wallets (Developer-Controlled or User-Controlled / embedded for non-crypto users)
- Circle Gateway (treasury routing, multi-party settlement, operational movement)
- CCTP + Bridge Kit / App Kit (for cross-chain USDC movement where relevant)
- Optional but strong: StableFX concepts (even if only architectural / mocked if gated)

Non-negotiables (Constitution):
1. Everything runs on Arc Testnet (Chain ID 5042002). Educational / testnet demo only.
2. Must have working frontend + backend demonstrating real USDC flows.
3. Must include a clear architecture diagram.
4. Must produce a short (2–3 min) demo video script + high-quality GitHub README.
5. Must include a clearly labeled "Circle Product Feedback" section.
6. Prefer extending official Arc sample apps (commerce, multichain wallet, fintech, p2p payments) rather than pure greenfield.
7. Focus on transparency: show fees, exchange rate (if any), estimated arrival, and real-time status.
8. UX must feel consumer-grade (clean, mobile-friendly, non-crypto-native friendly).
9. Never hardcode secrets. Use environment variables + proper .env.example.
10. Code must be clean, documented, and easy for judges to run and understand.

Primary Use Cases to support (choose 1–2 as hero, others as secondary):
- Consumer remittance (UAE expat → family abroad)
- Freelancer / contractor payout
- Marketplace / platform settlement (UAE platform paying global sellers)
- Global payroll prototype
- "Pay-in AED, settle in USDC" conceptual flow (UX + rails)

Tech Stack Preferences:
- Frontend + API: Next.js 15 (App Router) + TypeScript
- Styling: Tailwind CSS + shadcn/ui
- Wallets: Circle Developer-Controlled Wallets (easier for automation) or User-Controlled
- Payments & Movement: Circle App Kit / Gateway / CCTP where useful
- Database: Supabase or simple Postgres
- Optional: simple FX rate display (mocked or public API)

Success Criteria for Judges:
- Instant / near-instant settlement feel on Arc
- Transparent fees and status tracking
- Strong demonstration of Circle tools (especially Wallets + Gateway + USDC)
- Clean UX focused on UAE → Global corridor
- Excellent documentation + honest Circle Product Feedback

Now write the complete Project Constitution in markdown. Make it authoritative so that every future specification, plan, and piece of code must obey it.

## Response snapshot

Authored `.specify/memory/constitution.md` at **v1.0.0** (initial ratification —
the file previously held only unfilled template placeholders).

**External verification performed before drafting** (per the Authoritative Source
Mandate — facts were not assumed from model memory):

- Arc Testnet Chain ID **5042002** — confirmed. RPC `https://rpc.testnet.arc.network`,
  explorer `https://testnet.arcscan.app`.
- **USDC is the native gas token on Arc** with **6 decimals** — confirmed. This is
  materially different from typical EVM chains and shapes the fee-transparency design.
- **faucet.circle.com dispenses ~1 USDC per address per day** on Arc Testnet —
  confirmed. Encoded as a hard operational constraint in Principle IX (demo amounts
  must be sized in cents; wallets must be funded early and continuously).
- Official sample apps confirmed to exist: `circlefin/arc-commerce` (Next.js +
  Supabase + Developer-Controlled Wallets), `circlefin/arc-multichain-wallet`
  (Arc + Gateway), `circlefin/arc-nanopayments`.

**Nine principles established** (I, II, VII flagged NON-NEGOTIABLE and explicitly
non-waivable under deadline pressure):

I. Arc Testnet Only · II. Real Flows Over Mockups · III. Radical Transparency ·
IV. Consumer-Grade, Non-Crypto-Native UX · V. Circle Surface Area Maximalism ·
VI. Extend, Don't Greenfield · VII. Secrets Discipline · VIII. Judge-Runnable in
Ten Minutes · IX. Demo-Path Integrity Under Deadline.

**Three judgment calls made and recorded** (user delegated the choice):

1. **Hero use cases = consumer remittance + freelancer payout.** Both are named in
   the track title and share one set of rails (quote → confirm → transfer → track →
   receipt), so the second hero costs incremental UI rather than incremental
   architecture. Marketplace batch settlement demoted to secondary as the natural
   Gateway showcase; AED pay-in kept conceptual and labeled simulated.
2. **Developer-Controlled Wallets as primary**, for automation and for the seedless
   onboarding that Principle IV requires.
3. **`circlefin/arc-commerce` designated as the base repo** — its stack (Next.js +
   Supabase + DCW) is an exact match for the stated preferences, with Gateway and
   cross-chain patterns lifted from `arc-multichain-wallet`.

**Supporting sections added**: Product Scope (corridor, personas, hero/secondary use
cases, explicit out-of-scope); Technology & Architecture Constraints (integer-minor-unit
money type, idempotency keys, explicit persisted transfer state machine, error taxonomy,
structured observability); Submission Deliverables as a 12-item Definition of Done;
Development Workflow with nine reusable Constitution Check Gates and a minimum testing
posture; Governance with amendment procedure, semantic versioning policy, and compliance
review points.

Sync Impact Report prepended as an HTML comment. Two ⚠ follow-ups flagged:
`plan-template.md`'s Constitution Check placeholder needs the nine gates pasted in at
first `/sp.plan`, and `README.md` does not yet exist.

## Outcome

- ✅ Impact: Project constitution ratified at v1.0.0 — the binding authority for every
  subsequent spec, plan, task, and commit. Chain ID, faucet limits, and sample-app
  provenance verified against live sources rather than assumed. Hero scope narrowed
  from five candidate use cases to two, which is the single highest-leverage decision
  available with five days remaining.
- 🧪 Tests: None — governance document, no executable code. Minimum testing posture is
  now itself mandated by the constitution (money arithmetic, FX conversion, and the
  full transfer state machine require unit tests; hero flow requires an E2E or
  documented repeatable manual test before submission).
- 📁 Files: `.specify/memory/constitution.md` (created, v1.0.0); this PHR.
- 🔁 Next prompts: `/sp.specify` for the hero remittance flow (UAE expat → family
  abroad, transparent quote → confirm → track → receipt); then `/sp.plan`, which must
  run the nine Constitution Check Gates and will very likely surface ADR-worthy
  decisions (wallet model, Gateway routing topology, base-repo fork strategy).
- 🧠 Reflection: The faucet's ~1 USDC/day ceiling was the most consequential discovery —
  it silently invalidates any demo designed around dollar-scale amounts, and would
  have surfaced as a dry-wallet failure on demo day rather than at design time.
  Verifying it up front converted a likely late-stage crisis into a one-line constraint.

## Evaluation notes (flywheel)

- Failure modes observed: `.specify/scripts/bash/create-phr.sh` referenced by the
  command does not exist in this repo (only `.specify/scripts/powershell/` is present,
  and it contains no PHR script) — fell back to agent-native PHR creation per CLAUDE.md
  step 3. Repository is not yet git-initialised, so `branch` is recorded as `none`.
- Graders run and results (PASS/FAIL): PASS — no unresolved bracket or `{{}}` tokens
  (verified by grep); version line matches Sync Impact Report; all dates ISO
  YYYY-MM-DD; principles written declaratively in MUST/MUST NOT form; file written to
  the stage-correct route `history/prompts/constitution/`.
- Prompt variant (if applicable): none — single-pass authoring.
- Next experiment (smallest change to try): add a `create-phr.ps1` to
  `.specify/scripts/powershell/` so PHR numbering and routing are mechanical rather
  than agent-derived on this Windows setup, removing an ID-collision risk as the
  history grows.
