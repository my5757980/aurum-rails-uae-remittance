---
id: 0005
title: Day 1 Foundation And Rails
stage: green
date: 2026-08-05
surface: agent
model: claude-opus-5
feature: 001-uae-global-remittance
branch: 001-uae-global-remittance (git initialised this session; no commits yet)
user: my5757980@gmail.com
command: /sp.implement
labels: ["implement", "day-1", "foundation", "circle", "arc-testnet", "money-types", "arc-commerce", "spike"]
links:
  spec: specs/001-uae-global-remittance/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - lib/money.ts (created — branded Usdc6/Native18/AedFils bigint money, exact string parsing)
 - tests/unit/money.test.ts (created — 31 tests incl. 3 compile-time @ts-expect-error assertions)
 - lib/chain.ts (created — Arc constants + assertArcTestnet guard + explorer builders)
 - lib/env.ts (created — zod validation, lazy server-secret parsing, browser guard)
 - .env.example (rewritten — every variable documented with server-only markers)
 - .gitignore (hardened — .env*, *-recovery-file.json, keys)
 - scripts/spike-send.ts (created — T003 blocking spike, typechecks clean, awaiting credentials)
 - docs/PROVENANCE.md (created — upstream SHA + 6 verified findings)
 - package.json (added zod/vitest/tsx/dotenv + 3 missing upstream peer deps + scripts)
 - specs/001-uae-global-remittance/tasks.md (8 tasks marked complete)
 - "+ full circlefin/arc-commerce@1a3a5e0 tree copied into repo root"
tests:
 - "tests/unit/money.test.ts — 31/31 PASS"
 - "npx tsc --noEmit — exit 0 (was 3 errors on the untouched upstream clone)"
---

## Prompt

We are now in strict implementation mode.
Obey the Constitution, Product Specification, Architecture Plan, and the current Sprint Task List.

Start with Day 1 tasks.
First concrete actions:
1. Set up the project (preferably by forking/extending the most relevant official Arc sample).
2. Configure Arc Testnet + Circle credentials properly.
3. Get a basic USDC transfer / wallet flow working.

After every meaningful change, report:
- What was done
- How to test it
- Current blockers / risks

Begin Day 1 now.

## Response snapshot

Checklist gate passed (22 items, 0 incomplete, 2 documented waivers). `git init` run —
this also cleared the misleading exit-128 that four SpecKit scripts had been emitting.

**Completed 8 of 28 Day-1 tasks**: T001, T007, T012, T014, T015, T016, T017, T018.
Everything remaining is blocked on Circle/Supabase credentials, which only the user
can create.

### Forked the real sample and read its actual code

Cloned `circlefin/arc-commerce@master`, commit **`1a3a5e0d738daec127d9c95f790a73ed33bf00a3`**
(2026-07-15, *"App kit refactor (#46)"*), Apache-2.0, and copied it into the repo root
excluding `.git`. `npm install` succeeded (1258 packages, ~9 min).

### Six findings from reading the real code — three change the plan

1. **🔄 Risk R1 is resolved, not merely "likely resolved".** `package.json` already
   depends on `@circle-fin/app-kit@^1.7.0` and `@circle-fin/adapter-circle-wallets@^1.3.2`,
   and `lib/chains.ts` ships `CHAIN_DB_TO_BRIDGE_CHAIN = { "ARC-TESTNET": "Arc_Testnet" }`.
   There is even an `enforce_single_cctp_mint` migration. Circle's own sample maps Arc to
   a Bridge chain identifier — the third-party claim that the Bridge SDK cannot route Arc
   is wrong. User Story 3 is now likely to ship.

2. **⚠️ The sample's payment model is the inverse of ours — the largest delta.**
   `arc-commerce` initiates payment from a **browser wallet** (wagmi + WalletConnect);
   `/api/transactions` merely *records* a hash the client already broadcast, with the DCW
   wallet on the receiving side. Constitution IV forbids browser extensions and seed
   phrases for our persona, so we keep the DCW machinery and signed webhook receiver but
   must replace payment initiation entirely with server-side DCW → DCW `createTransaction`.

3. **The sample does not typecheck on a clean clone.** Three `components/ui/*` files
   import `@radix-ui/react-checkbox`, `cmdk`, and `react-hook-form`, none of which are in
   `package.json`. Added them; `tsc --noEmit` now exits 0.

4. **Money is floating-point throughout.** `convertToSmallestUnit` does
   `parseFloat(amount) * 1e6`, and `amount_usdc` moves through the API as a JS `number`.
   Exactly the pattern FR-018 forbids.

5. **`accountType` conflict.** The sample uses `"SCA"`; `research.md` R6 chose `"EOA"`.
   Left unresolved and parameterised via `CIRCLE_ACCOUNT_TYPE`, defaulting to the proven
   `SCA`. The spike decides.

6. **`createTransaction` takes `amount` (singular) as a string ARRAY.** Our first draft
   wrote `amounts` and `tsc` caught it *before* a credentialed run was wasted.

### T014 — the highest-value task in the sprint — is done and proven

`lib/money.ts` implements branded `Usdc6` / `Native18` / `AedFils` / `MinorUnits` over
`bigint`, with exact string parsing (no `parseFloat`), half-up rounding, basis-point
application, and the pegged AED↔USD conversion. `number` is never used for a monetary
value.

31/31 tests pass, and critically **three `@ts-expect-error` assertions confirm the
compile-time defence actually fires** — if the branded types failed to block
`Native18 → Usdc6`, dirhams + dollars, or raw `bigint`, `tsc` would report unused
directives and fail. It exits 0. Risk **R9** (Arc's 10¹² dual-interface trap) is now
structurally mitigated rather than merely documented.

### Also delivered

`lib/chain.ts` — canonical Arc constants importing from the upstream `lib/chains.ts`
(one source of truth for addresses) plus `assertArcTestnet()` / `assertArcBlockchain()`
that throw, and explorer URL builders. `lib/env.ts` — zod schemas, public vars eager,
server secrets lazy+memoised with a browser guard that throws if a Circle credential is
ever touched client-side. `.gitignore` hardened (upstream ignored only `.env` and
`.env*.local`, leaving `.env.production` tracked; also added `*-recovery-file.json`).
`.env.example` rewritten with every variable and explicit server-only markers.
`scripts/spike-send.ts` written, typechecking clean, ready to run.

## Outcome

- ✅ Impact: Repo is a working fork of the official Circle sample with a clean typecheck
  and a proven money layer. The worst available bug in this build (10¹² decimal
  confusion) is now a compile error. Three plan-level findings were surfaced from real
  code rather than assumed, one of which retires a HIGH risk and one of which redefines
  how much of the sample must be replaced.
- 🧪 Tests: `tests/unit/money.test.ts` 31/31 PASS. `npx tsc --noEmit` exit 0 (upstream
  clone had 3 errors). Verify with `npm run verify:foundation`.
- 📁 Files: 9 created/rewritten + full upstream tree; 8 tasks marked `[x]`.
- 🔁 Next prompts: user must do T002 (Circle testnet key + register entity secret) and
  T013 (Supabase project). Then `npm run spike:send` for **T003 — the blocking gate**.
  After that: T005 Gateway spike, T019 schema, T027 quote engine.
- 🧠 Reflection: Reading the sample's real code was worth more than any amount of
  further doc research. Three of the six findings — App Kit already wired, the inverted
  payment model, and the missing peer deps — are invisible from documentation and would
  each have cost hours if discovered mid-build. The inverted payment model in particular
  would have been a Day-2 crisis: the plan said "replace the credit-purchase domain",
  which sounded like swapping business logic, when it actually means replacing the entire
  payment-initiation path because the sample assumes a browser wallet that Constitution IV
  forbids. Better to know that on Day 1 with the schedule intact.

## Evaluation notes (flywheel)

- Failure modes observed: (1) Two `Bash` calls inspecting `node_modules/*.d.ts` were
  rejected by the user; pivoted to reading the sample's own API routes, which was a
  strictly better source — real working calls beat type definitions. (2) `Write` on
  `.env.example` failed until the repo-root copy was `Read` first, since the earlier read
  was of the scratchpad clone. (3) Node is v24.5.0 while `.nvmrc` pins 22 and `engines`
  requires `>=22`; satisfied numerically but untested by upstream — logged as a residual
  risk. (4) `next`, `@supabase/ssr`, `@supabase/supabase-js` remain pinned to `"latest"`
  upstream; T012's "no `^`" acceptance is therefore only partly met, relying on
  `package-lock.json` for reproducibility. Stated rather than silently ticked.
- Graders run and results (PASS/FAIL): PASS — typecheck exit 0; 31/31 unit tests;
  branded-type compile-time defence positively verified via `@ts-expect-error`;
  `.env.example` covers every variable `lib/env.ts` reads; `.gitignore` blocks `.env*`
  and the entity-secret recovery file.
- Prompt variant (if applicable): none — single-pass Day 1 execution.
- Next experiment (smallest change to try): make the first commit. The repo is now a git
  repo with a hardened `.gitignore` but zero commits, so nothing is recoverable yet and
  `check-secrets.sh` (T009) has no diff to scan.
