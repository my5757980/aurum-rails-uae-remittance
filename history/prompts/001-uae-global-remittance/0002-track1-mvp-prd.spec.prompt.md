---
id: 0002
title: Track 1 MVP PRD
stage: spec
date: 2026-08-05
surface: agent
model: claude-opus-5
feature: 001-uae-global-remittance
branch: 001-uae-global-remittance (no git repo; SPECIFY_FEATURE only)
user: my5757980@gmail.com
command: /sp.specify
labels: ["spec", "prd", "remittance", "uae-corridor", "circle", "arc-testnet", "usdc", "gateway", "cctp"]
links:
  spec: specs/001-uae-global-remittance/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/001-uae-global-remittance/spec.md (created — full PRD, 14 sections, 44 FRs, 25 NFRs, 18 SCs)
 - specs/001-uae-global-remittance/checklists/requirements.md (created — 22-item quality checklist)
 - history/prompts/001-uae-global-remittance/0002-track1-mvp-prd.spec.prompt.md (created)
tests:
 - none (specification artifact; no executable code produced)
 - testable acceptance scenarios defined: 8 (US1) + 4 (US2) + 3 (US3) = 15
---

## Prompt

Using the Project Constitution, write a complete and concrete Product Requirements Document (PRD) for the Track 1 MVP.

Structure:

# Product Specification – UAE → Global Cross-Border Payments on Arc

## 1. Problem Statement (UAE high-expat corridor pain points)
## 2. Target Users & Personas
## 3. Hero User Journeys (detailed step-by-step for 2–3 main flows)
## 4. Functional Requirements
   - Must-have
   - Should-have
   - Nice-to-have
## 5. Non-Functional Requirements (speed, transparency, security, UX)
## 6. Circle Product Integration Requirements (exactly which products and in which flows)
## 7. Fee & Transparency Model
## 8. Success Metrics for the Hackathon
## 9. Explicitly Out of Scope

Be very specific. Reference real Circle capabilities on Arc (USDC, Wallets, Gateway, CCTP/App Kit). Design for non-crypto-native users.

## Response snapshot

Created feature `001-uae-global-remittance` and authored the full PRD at
`specs/001-uae-global-remittance/spec.md` — the user's requested 9 sections plus 5
required by the spec template and Constitution (Key Entities, Open Clarifications,
Assumptions, Dependencies & Risks, Constitution Compliance).

**Scale**: 44 functional requirements (30 must / 7 should / 6 nice), 25 NFRs across 5
categories, 18 success criteria, 13 edge cases, 15 acceptance scenarios, 9 key entities,
8 risks.

### Two verified findings that materially reshaped the document

**1. The obvious pitch was wrong.** Research showed UAE remittance costs average
**under 3.5%** for major corridors versus a **6.62% global average** — UAE exchange
houses advertise **AED 15–26 flat**. A "we're cheaper" thesis would have been both
dishonest and trivially falsifiable by a judge. §1.2 was rewritten around where cost
actually hides: **hidden FX spread (P1), no real-time status (P2), banking-hours
dead-time (P3), physical queue friction (P4), unpredictable landed amount (P5), and the
freelancer/SME penalty (P6)**. The product thesis became *transparency and
time-to-settlement*, provable on-chain — which is both true and exactly what Constitution
Principle III already demanded.

**2. ⚠️ CCTP/Arc routing risk (R1, §6.4).** Arc Testnet is CCTP V2 **domain 26**, but
published reporting indicates the **Bridge SDK does not accept Arc Testnet as a routing
source or destination**. This directly threatens the fourth mandatory Circle product
under Constitution Principle V. Recorded as a HIGH risk, made the **first Phase 0
research task**, and given a four-option fallback ladder as Q2.

### Corridor and product facts verified (not recalled)

- UAE is the **world's #3 remittance sender**: ~USD 43.3B/yr (AED 183B in 2024),
  ~97M transactions/yr, ~88% expatriate population.
- Top corridors: India ~USD 14B (≈28% of exchange-house outward volume), Pakistan ~USD 6B,
  Philippines ~USD 3.5B.
- **Circle Gateway is available on Arc Testnet**, alongside Ethereum Sepolia, Base
  Sepolia and Avalanche Fuji. Non-custodial (Gateway Wallet contract + off-chain
  attestation), unified balance, **sub-500ms** cross-chain availability. Gateway Wallet
  contract uses the **same address on every chain**: `0x0077777d7EBA4688BDeF3E311b846F25870A19B9`.
- CCTP V2 **Fast Transfer** = opt-in finality threshold ≤ 500, minting ahead of source
  finality.

### Structural decisions

- **Three prioritised, independently testable user stories**: P1 consumer remittance
  (Rajesh → Priya, the demo video narrative and the viable-alone MVP), P2 freelancer
  batch payout (the Gateway showcase, sharing P1's rails entirely), P3 cross-chain
  delivery (droppable, gated on R1).
- **Four personas including the judge as an explicit design target** (Persona D) —
  which converts "seeded demo mode" (FR-037) and "product→file map" (FR-044) from
  documentation chores into product requirements.
- **§7.4 specifies the fee disclosure panel line-by-line** as the binding acceptance
  reference for FR-008, rather than describing transparency in prose.
- **§7.5 specifies the 11-state transfer state machine** with the user-facing label for
  each state, satisfying Constitution III's live-status mandate concretely.
- **FX spread is shown even at 0.00%** — showing the zero is what proves the line item
  is real.
- **§9.3 anti-goals** commit in writing to not claiming a fee advantage we cannot
  evidence.

### Clarifications — both put to the architect and RESOLVED in-session

- **Q1 = A** — **simulated local-currency landing** ("Priya receives ₹2,262 [Simulated]").
  Consequence: FR-012 labelling discipline becomes critical path, because the most
  prominent number in the product is the simulated one.
- **Q2 = A** — **Gateway-first for cross-chain**; CCTP used only where Phase 0 proves it
  works on Arc, with the routing gap written up honestly in *Circle Product Feedback*.
  Consequences: Gateway is **promoted to load-bearing** for Constitution V's cross-chain
  requirement (new HIGH risk **R1b**, added to §13); R1 downgraded HIGH→MEDIUM; User
  Story 3 re-scoped to Gateway and explicitly droppable rather than fakeable; App Kit /
  Bridge Kit named as the substitute fourth product.

Quality checklist scored **21/22 pass** after resolution. CHK001 and CHK008 remain
documented, justified partial waivers (Constitution V and the user's §6 request both
mandate naming specific Circle products). No blocking items remain; spec status is
**Ready for `/sp.plan`**.

## Outcome

- ✅ Impact: Track 1 MVP is now fully specified and traceable to Constitution v1.0.0 via
  §14. The problem statement was corrected from a false premise to a defensible one
  before any code was written. The largest technical risk to the submission (R1, CCTP on
  Arc) is identified, severity-rated, and assigned a fallback ladder rather than being
  discovered mid-build with two days left.
- 🧪 Tests: No code yet. 15 acceptance scenarios and 13 edge cases are written to be
  directly executable as tests at `/sp.tasks`.
- 📁 Files: `spec.md` (PRD), `checklists/requirements.md` (22-item validation), this PHR.
- 🔁 Next prompts: answer Q1/Q2 → `/sp.plan`. Phase 0 research task #1 is CCTP/Arc
  routing verification; task #2 is a smoke-run of `circlefin/arc-commerce` against
  current SDK versions (R7). `/sp.adr` is warranted for the wallet model, the Gateway
  treasury topology, and the CCTP fallback once Q2 is decided.
- 🧠 Reflection: The highest-value work in this spec was disproving the assumed problem.
  "Remittances are expensive" is the reflexive framing for this track, and the data does
  not support it for the UAE specifically. Had the pitch shipped on that premise, a judge
  familiar with the corridor could have dismantled it in one question. The verified
  framing — cost hides in the spread, and nobody can see status — is narrower, true, and
  maps one-to-one onto what the Circle stack on Arc actually fixes.

## Evaluation notes (flywheel)

- Failure modes observed: (1) `create-new-feature.ps1` exits 128 from an internal `git`
  call in a non-git repo but still completes correctly and emits valid JSON — the
  non-zero exit is misleading and could cause a future run to be treated as failed.
  (2) Branch creation was skipped (no git repo); feature identity rests on
  `SPECIFY_FEATURE` and the directory name alone. (3) The Write tool required a prior
  Read because the script had already copied the template into `spec.md`.
- Graders run and results (PASS/FAIL): PASS — 20/22 checklist items pass; 2 documented
  waivers; 1 genuinely open item (Q1/Q2). All 44 FRs uniquely numbered with no gaps; all
  9 Constitution gates mapped in §14; all 6 pain points, 4 personas, and 13 edge cases
  traced to requirements in the checklist cross-check.
- Prompt variant (if applicable): none — single-pass authoring after four verification
  searches (Arc chain config, Arc sample apps, UAE corridor economics, Gateway/CCTP on Arc).
- Next experiment (smallest change to try): run `git init` so feature branches, PHR
  routing, and `/sp.git.commit_pr` behave as SpecKit expects — currently three
  subsystems are degrading silently to directory-name-only identity.
