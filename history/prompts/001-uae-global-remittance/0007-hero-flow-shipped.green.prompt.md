---
id: 0007
title: Hero Flow Shipped End To End
stage: green
date: 2026-08-06
surface: agent
model: claude-opus-5
feature: 001-uae-global-remittance
branch: main (git re-initialised twice this session)
user: my5757980@gmail.com
command: /sp.implement
labels: ["implement", "hero-flow", "US1", "circle", "arc-testnet", "usdc", "ui", "readme", "shipped"]
links:
  spec: specs/001-uae-global-remittance/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - lib/corridors.ts, lib/fx.ts, lib/domain.ts, lib/quote-engine.ts (created)
 - lib/wallet-service.ts, lib/orchestrator.ts, lib/seed.ts, lib/serialize.ts (created)
 - app/api/{recipients,quotes,transfers,transfers/[id],claim/[token]}/route.ts (created)
 - app/page.tsx, app/layout.tsx (replaced — removed browser-wallet provider)
 - app/transfers/[id]/page.tsx, app/claim/[token]/page.tsx (created)
 - components/{TestnetBanner,SimulatedBadge,SidePanel}.tsx (created)
 - README.md (rewritten — architecture diagrams + Circle Product Feedback)
 - specs/001-uae-global-remittance/tasks.md (29 of 98 tasks complete)
tests:
 - "Hero flow verified end-to-end in browser: DELIVERED in 3.6s"
 - "tx 0x16f0e66d18a0c17f3619a966721001355735a2b49c2712eeba970c864b7db699 on Arc"
 - "FR-014 idempotency PASS — same key twice returned one transfer"
 - "FR-014 missing Idempotency-Key rejected 400 PASS"
 - "E3 expired quote rejected 409 PASS"
 - "E10 over/under amount limits rejected 422 PASS"
 - "npm run build — exit 0, 15 pages"
 - "npx tsc --noEmit — exit 0; 31/31 money unit tests"
---

## Prompt

to nahiii poora project baooo naaa jaldieee karoo complete karooo pooraaa baoooooo submission phir bad mayy kar dayy gayyyyy abhii project poora complete karoo jaldieeeee

*(and later: "ya ui sirf isii taraa dikhyy gii ya gayy hogaa sirf sidee mayy itnii siiii")*

## Response snapshot

**The hero flow is built, working, and verified end-to-end.** A real USDC transfer
initiated from the UI settles on Arc Testnet and is confirmed on the public explorer.

### One consequential scope decision, taken to protect velocity

The plan specified Supabase. Standing it up needs a credential only the user can create,
and it would have blocked every UI task behind it. Persistence is not on the critical
path for a demoable hero flow, so I built an **in-memory store behind a narrow interface**
(`lib/domain.ts`) and moved on. The status log is append-only exactly as it would be in
Postgres, so swapping Supabase in later is contained. Constitution IX: keep the hero path
demoable above all else. Flagged, not hidden.

Status tracking likewise uses **polling of Circle's `getTransaction`** rather than
webhooks, because webhooks need a public URL. The Circle→our state mapping is identical,
so the webhook path drops in later without touching the state machine.

### Built

Domain: `corridors.ts` (5 UAE corridors with sourced incumbent comparison data),
`fx.ts` (live rates from `open.er-api.com`, cached, with an honest stale flag and
fallback table), `quote-engine.ts` (the full spec §7.4 payload), `orchestrator.ts`
(append-only state machine, Circle state mapping, background poll to terminal),
`wallet-service.ts` (DCW facade, the only Circle importer), `seed.ts`, `serialize.ts`
(money crosses the wire as **strings**, never JSON numbers).

API: `/api/recipients`, `/api/quotes`, `/api/transfers`, `/api/transfers/[id]`,
`/api/claim/[token]`.

UI: send flow with the §7.4 disclosure panel rendered verbatim, live status timeline with
elapsed counter, receipt with explorer link, public recipient claim view, persistent
testnet banner, `SimulatedBadge` as the single sanctioned way to mark simulated values.

### Verified, not assumed

Measured against a running server, not reasoned about:

| Check | Result |
|---|---|
| Hero flow end-to-end from the browser | **DELIVERED in 3.6 s** |
| Real transaction on Arc | `0x16f0e66d…` ✅ Success |
| FR-014 idempotency (same key twice) | **PASS** — one transfer |
| FR-014 missing `Idempotency-Key` | **PASS** — 400 |
| E3 expired quote executes | **PASS** — 409, blocked |
| E10 amount over/under limits | **PASS** — 422, plain language |
| Production build | **exit 0**, 15 pages |
| Typecheck + unit tests | **exit 0**, 31/31 |

Live FX confirmed working: `1 AED = 25.9045 INR` from `open.er-api.com`, not the fallback.

### The user caught a real design gap

Seeing a 375px screenshot they asked whether the UI would "only be this small, off to the
side". The narrowness was my mobile test viewport — but the underlying point was correct:
on a laptop the centred column left most of the screen empty, and **Persona D (the judge)
evaluates on a laptop**. Added `components/SidePanel.tsx` — a desktop-only context panel
carrying the value proposition, the sourced incumbent comparison (FR-032), and the Circle
products list. Mobile is untouched; desktop now uses its width. This was a genuine
improvement I had not planned.

### README shipped before batch payouts

Constitution IX ranks documentation above the second use case, so the README went in
first: mermaid architecture and sequence diagrams, Circle products mapped to exact files,
the Real vs Simulated table, and **nine specific Circle Product Feedback findings** — the
Arc 18dp/6dp trap, `amount` as a singular-named array, `recoveryFileDownloadPath` wanting
a directory, the unhelpful entity-secret error, `listWallets` ordering, the sample failing
to typecheck, the sample's floating-point money, the widely-misreported faucet limit, and
the sample's browser-wallet payment model contradicting DCW's own value proposition.

## Outcome

- ✅ Impact: A working, verifiable product exists. Two commits (`0652e51`, `afe2cd0`)
  now protect the work — it had been entirely untracked, and `.git` vanished twice.
  29 of 98 tasks complete, and critically the completed ones are the ones Constitution IX
  ranks highest: hero flow, transparency, documentation.
- 🧪 Tests: All listed checks pass against a running server. Production build clean.
- 📁 Files: 8 domain modules, 5 API routes, 4 pages, 3 components, rewritten README.
- 🔁 Next prompts: demo video script (T082), then User Story 2 batch payouts, then
  Gateway/Bridge spikes (T005/T006). Supabase persistence and auth remain deliberately
  unbuilt.
- 🧠 Reflection: The most valuable thing was refusing to build in the order the plan
  listed. Supabase was scheduled early, would have blocked on a credential, and was not
  needed for the thing that actually had to work. Substituting an in-memory store behind
  an interface cost about twenty minutes and unblocked the entire day. The plan's *order*
  was wrong even though its *content* was right — and Constitution IX had already told me
  which way to break the tie.

## Evaluation notes (flywheel)

- Failure modes observed: (1) **`.git` disappeared twice** during the session, so the
  first two hours of work were unprotected; now committed, but the cause is unexplained
  and worth watching. (2) I wrote genuinely bad code in `serialize.ts` — a `require()`
  inside a function and a nonsense `[...Object.values({})].length ? … : …` expression —
  and had to clean it up immediately; speed pressure showed in the output. (3) `bash`
  lacks `curl`, `sleep`, `head`, and `python` in this environment; PowerShell is the only
  reliable shell. (4) Flag emoji render as regional-indicator letters (IN/PK/PH) on
  Windows Chrome — degrades acceptably, but worth knowing before recording the video.
- Graders run and results (PASS/FAIL): PASS — every acceptance criterion listed above was
  executed against a live server rather than inferred. Secret hygiene held across two
  commits: `.env.local` confirmed untracked, screenshots and key artifacts gitignored.
- Prompt variant (if applicable): none.
- Next experiment (smallest change to try): record the demo video now, while the flow is
  known-good. Constitution IX ranks the video above User Story 2, and a video of a working
  flow is worth more to the submission than an unfinished second use case.
