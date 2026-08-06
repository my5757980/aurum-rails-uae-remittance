---
id: 0006
title: T003 Spike Green Real USDC
stage: green
date: 2026-08-06
surface: agent
model: claude-opus-5
feature: 001-uae-global-remittance
branch: 001-uae-global-remittance (git re-initialised; no commits yet)
user: my5757980@gmail.com
command: /sp.implement
labels: ["implement", "spike", "T003", "circle", "arc-testnet", "usdc", "playwright", "credentials"]
links:
  spec: specs/001-uae-global-remittance/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - .env.local (created, gitignored — API key + entity secret + wallet set id)
 - scripts/setup-entity-secret.ts (created — generates/registers, writes to .env.local, never prints)
 - scripts/spike-send.ts (fixed — deterministic wallet sort; corrected faucet note)
 - .gitignore (added .playwright-mcp/, circle-*.png, console-*.log)
 - package.json (added setup:entity-secret script)
 - specs/001-uae-global-remittance/tasks.md (T002/T003/T004 marked done; faucet facts corrected)
 - specs/001-uae-global-remittance/research.md (R9 corrected — faucet is 20 USDC/2h)
 - specs/001-uae-global-remittance/plan.md (risk R2 downgraded HIGH -> LOW)
tests:
 - "T003 BLOCKING SPIKE — PASSED. Real USDC transfer on Arc Testnet."
 - "tx 0xd14becde94da34821a251939d8637e5ef5aab62e230aee66cbf91c26c111a646 — Success on testnet.arcscan.app"
---

## Prompt

tum khud karoo na sab jaldiee karooo

*(and, in the same exchange: "CIRCLE_ENTITY_SECRET kia hota hai zara asan lafzoo mayy batoo tab hi mayy puranayy project sayy nikal kar do ga naa", followed by the user supplying the entity secret)*

## Response snapshot

**T003 — the blocking spike — is GREEN. Real USDC moved on Arc Testnet.**

```
tx 0xd14becde94da34821a251939d8637e5ef5aab62e230aee66cbf91c26c111a646
Status  ✅ Success (handleOps)   Block 55558504
Confirmed within <= 0.51 secs    "This is a testnet transaction only"
```

Verified independently on `testnet.arcscan.app`, not merely reported by the SDK.

### Credentials obtained by driving the browser

Used Playwright to open the Circle console (user logged in), created a fresh **testnet
Standard API key** `aurum-rails-testnet`, and captured it **without the secret ever
entering the transcript**: `browser_evaluate` scraped the revealed key into a file via
its `filename` parameter, PowerShell moved it into `.env.local`, then deleted the temp
file and printed only a masked confirmation.

Also funded the wallet by driving `faucet.circle.com` end-to-end.

### Four real bugs/mistakes found and fixed — three of them mine

1. **I swallowed a registration failure as success.** `setup-entity-secret.ts` pattern-
   matched `/already/i` on the error and reported "already registered ✓", writing an
   **unregistered** entity secret into `.env.local`. Caught it because the recovery
   directory was empty — registration would have produced a file. Rewrote the handler to
   surface the full error, which then said plainly: *"The secret for this entity has
   already been set."* Lesson recorded in the file: never guess at an error's meaning on
   a credentials path.

2. **`listWallets` ordering is not stable.** The spike took `wallets[0]` as sender. Across
   runs the order flipped, so the address funded from the faucet silently became the
   *recipient* and the balance read 0. Fixed with a deterministic sort by address.

3. **`recoveryFileDownloadPath` wants a DIRECTORY, not a file path** — passing a filename
   fails with `Invalid Directory`. Logged for Circle Product Feedback.

4. **`createTransaction` takes `amount` (singular) as a string array** — caught by `tsc`
   before any credentialed run, as noted in PHR 0005.

### 🔴 Major correction: risk R2 was wrong, and wrong in our favour

Research had recorded **"faucet gives ~1 USDC per address per day"** from a secondary
source, and that figure drove Constitution IX's "denominate demo amounts in cents"
constraint plus the whole scale-factor debate.

The faucet page states — and one request confirmed — **20 USDC per address, per
blockchain, every 2 hours**. The wallet received 20.000000 USDC immediately.

**R2 downgraded HIGH → LOW.** Demo amounts need not be in cents. The 1:1 no-scale-factor
decision now costs nothing. Corrected in `research.md`, `plan.md`, and `tasks.md`.

### Entity secret: account-scoped, not project-scoped

Registration failed because the user's Circle **account** already had an entity secret
from a previous project. Explained the distinction in plain terms (API key = ID card,
per project; entity secret = the vault key, one per account), after which the user
supplied the existing secret and it worked unchanged with the new API key.

### Confirmed by the explorer, beyond the acceptance criterion

- `handleOps` + *"Bundler submitted 1 user operations"* → **SCA is a real ERC-4337 smart
  account**, validating the deviation from plan R6's EOA choice.
- **"Confirmed within <= 0.51 secs"** → Arc's sub-second finality is real. The 6.7 s
  wall-clock was Circle API polling overhead, not chain time. NFR-001's 15 s budget is
  comfortable, and the demo's "arrives while you're looking at the screen" claim is true.

## Outcome

- ✅ Impact: **The submission's foundation is proven.** Every downstream task assumed a
  Circle DCW wallet could move USDC on Arc; that is now a verified fact with a public
  transaction hash, not an assumption. Credentials are configured, wallets exist and are
  funded with 20 USDC, and one risk that shaped the entire demo-amount strategy turned
  out to be 20× less severe than believed.
- 🧪 Tests: T003 spike PASSED with on-chain verification. Prior suite still green
  (31/31 money tests, `tsc` exit 0).
- 📁 Files: `.env.local` (gitignored), `setup-entity-secret.ts`, `spike-send.ts` fixed,
  `.gitignore` extended for browser artifacts, three spec documents corrected,
  T002/T003/T004 marked done (11 of 98 complete).
- 🔁 Next prompts: T005 (Gateway spike on Arc) and T006 (Bridge Kit) — both now cheap,
  since credentials work. Then T013 Supabase, T019 schema, T027 quote engine.
- 🧠 Reflection: The most valuable habit today was distrusting a success message. The
  entity-secret script *said* "already registered ✓" and wrote a secret to disk; only
  checking for the artifact it should have produced — the recovery file — exposed that it
  had failed. A green log line is not evidence. Equally, the R2 correction shows the cost
  of taking a number from a secondary source: an unverified "1 USDC/day" had already
  propagated into the constitution's operational guidance, the spec's assumptions, and
  the task list's cut order. One minute on the actual faucet page corrected all three.

## Evaluation notes (flywheel)

- Failure modes observed: (1) `Get-Clipboard` did not contain the API key despite
  clicking "Copy Key" — the browser's clipboard write did not reach the OS clipboard;
  worked around via `browser_evaluate` + `filename`. (2) The `.git` directory created
  earlier had disappeared and had to be re-initialised; still zero commits, so nothing is
  recoverable yet. (3) Faucet result was not readable from the page after submission
  (page scrolled); checking the wallet balance on-chain was the faster and more reliable
  oracle. (4) Two `Bash` calls into `node_modules` were rejected earlier in the session;
  reading the sample's own route handlers proved a better source anyway.
- Graders run and results (PASS/FAIL): PASS — T003 acceptance criterion ("a real
  transaction hash is produced and resolves on testnet.arcscan.app") met and visually
  confirmed. Secret hygiene held: no API key or entity secret was printed by any command;
  `.env.local`, `.playwright-mcp/`, and `circle-*.png` all verified ignored via
  `git check-ignore`.
- Prompt variant (if applicable): none.
- Next experiment (smallest change to try): make the first commit. Eleven tasks of work
  and a working credentialed setup currently exist only as untracked files.
