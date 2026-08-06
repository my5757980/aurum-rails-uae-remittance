---
id: 0004
title: Sprint Task Breakdown
stage: tasks
date: 2026-08-05
surface: agent
model: claude-opus-5
feature: 001-uae-global-remittance
branch: 001-uae-global-remittance (no git repo; SPECIFY_FEATURE only)
user: my5757980@gmail.com
command: /sp.tasks
labels: ["tasks", "sprint", "hackathon", "circle", "arc-testnet", "remittance", "day-plan"]
links:
  spec: specs/001-uae-global-remittance/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/001-uae-global-remittance/tasks.md (created — 98 tasks across 8 phases, 5 days)
 - history/prompts/001-uae-global-remittance/0004-sprint-task-breakdown.tasks.prompt.md (created)
tests:
 - none executed (planning artifact)
 - mandated test tasks included and marked non-optional: T015 (money), T026 (fx), T028 (quote engine), T030 (state machine), T059 (hero-path E2E)
---

## Prompt

Break the Technical Architecture Plan into a realistic, prioritized task list for a 4–5 day solo + Claude Code sprint.

Format it as:

## Sprint Plan – Track 1 Cross-Border Payments MVP

### Day 1 – Foundation & Rails
- [ ] Task ...
  - Acceptance Criteria:
  - Est. time:
  - Dependencies:

### Day 2 – Core Payment Flows
...

### Day 3 – UX + Transparency Layer
...

### Day 4 – Polish, Status Tracking, Multi-flow Support
...

### Day 5 – Docs, Video Script, Circle Feedback, Final Submission Prep
...

Make every task concrete, with clear acceptance criteria, so Claude Code can execute them one by one.

## Response snapshot

Generated `tasks.md` — **98 tasks (T001–T098)** across 8 phases, mapped onto the requested
Day 1–5 structure. Every task carries the requested **Acceptance Criteria / Est. time /
Dependencies** triple *and* the SpecKit-mandated checklist format
(`- [ ] T0NN [P?] [US#] description with file path`), so both the user's format and the
command's contract are satisfied without duplication.

### Reconciling two required formats

The user asked for day-based sections; the command mandates user-story organisation.
Resolved by making **days the primary axis** (matching Constitution IX's schedule) with
**`[US1]`/`[US2]`/`[US3]` labels on every story task**, plus a story-independence table
and critical-path graph so per-story testability remains traceable. Setup, Foundational,
and Polish tasks correctly carry no story label.

### The honest reality check that mattered most

Total estimate came to **~100 hours across 5 days — roughly 20 h/day, which is not
achievable solo.** Rather than deflate the estimates or silently trim scope, the list is
kept **complete** and paired with an explicit **cut order**:

1. US3 (T077–T081) — designed to be dropped
2. US2 extras (T072, T073, T075, T076)
3. US2 entirely (T065–T076) — Gateway then appears in the diagram and Circle Product
   Feedback rather than in the product
4. **Never cut**: README + diagram + tables (T060–T063), video (T082–T084), Circle Product
   Feedback (T085), fund wallets (T095), DoD walk (T096)

Stated plainly in the file: **"Documentation is not the buffer. User Story 2 is."** At a
realistic 10–12 h/day the sprint lands at Days 1–3 complete + US2 partial — which still
satisfies **every** Constitution Definition-of-Done item, because US2 is not in the DoD
and the README is.

### Structural decisions

- **Two hard gates surfaced at the very top**: **T003** (send one real USDC on Arc via
  DCW) and **T005** (read a Gateway unified balance on Arc). Marked 🔴 BLOCKING with
  explicit "if it fails" instructions. No product code may be written until both are green
  — T003 *is* the submission.
- **T014 (branded `Usdc6`/`Native18` money types) flagged as the highest-value defensive
  task in the sprint**, directly mitigating R9 — Arc's 18-decimal native / 6-decimal
  ERC-20 dual interface over a single pool of funds.
- **Day 3 ends with a hard documentation gate.** T060–T063 must complete before Day 4
  begins. This encodes Constitution IX's ordering as a schedule constraint rather than an
  aspiration.
- **Every risk from plan.md is attached to a concrete task**: R2 → T004 + T057 + T095;
  R9 → T014 + T015; R10 → T036; R4 → T065; R7 → T012.
- **T006's failure is treated as a deliverable, not a setback** — a reproducible finding
  about Bridge Kit/Arc routing feeds T081 and T085, and SC-016 rewards exactly that.
- **T094 added** to verify on-screen amounts match on-chain amounts 1:1, enforcing the
  plan's amendment to spec Assumption 4 (no display scale factor).

### Coverage

All 44 FRs, 25 NFRs, 18 SCs, 13 edge cases, and both hero user stories map to at least one
task. Suggested MVP scope: **T001–T045 (45 tasks)** — Phases 0–3 — which alone delivers a
complete, verifiable, submittable product.

## Outcome

- ✅ Impact: The build is now executable task-by-task without further context. The two
  gating unknowns are isolated at the front where failure is cheap, the worst available
  bug has a dedicated defensive task, and the cut order means schedule slippage degrades
  the submission gracefully instead of catastrophically.
- 🧪 Tests: Five mandated test tasks included and marked non-optional — T015 (money
  arithmetic), T026 (FX), T028 (quote engine), T030 (every state-machine transition),
  T059 (one hero-path Playwright E2E). This is exactly the Constitution's minimum and is
  explicitly not negotiable downward.
- 📁 Files: `specs/001-uae-global-remittance/tasks.md`; this PHR.
- 🔁 Next prompts: `/sp.adr wallet-and-crosschain-architecture` (three decisions still
  undocumented), then `/sp.implement` starting at **T001**. Do **T003 tonight** — every
  other task is downstream of one USDC actually moving on Arc.
- 🧠 Reflection: The most useful thing in this artifact is not the task list — it is the
  cut order. A 98-task list that pretends 100 hours fits in 5 days would have quietly
  failed on Day 4, most likely by sacrificing the README to finish a second use case that
  no Definition-of-Done item requires. Naming the buffer explicitly, and naming what must
  never be cut, converts an unrealistic estimate into a usable plan. Estimating honestly
  and then stating the trade beats estimating optimistically.

## Evaluation notes (flywheel)

- Failure modes observed: `check-prerequisites.ps1` exits 128 from its internal `git` call
  in a non-git repo despite succeeding and emitting valid JSON — the third SpecKit script
  in this session with the same misleading exit code. All four design docs
  (`research.md`, `data-model.md`, `contracts/`, `quickstart.md`) were correctly detected.
- Graders run and results (PASS/FAIL): PASS — all 98 tasks follow the mandated checklist
  format (checkbox + sequential ID + `[P]` where parallel + `[US#]` on story tasks only +
  explicit file path); task IDs are sequential with no gaps; every user story has a stated
  independent test; dependency graph, critical path, and parallel-execution examples all
  present; MVP scope identified.
- Prompt variant (if applicable): none — single-pass generation from plan.md + spec.md +
  data-model.md + contracts/openapi.yaml + research.md.
- Next experiment (smallest change to try): after T003 succeeds, re-estimate Phases 2–3
  against actual measured velocity and prune the list to what the remaining hours truly
  support — the current estimates are unvalidated, and one real day of data would make the
  cut order a decision rather than a guess.
