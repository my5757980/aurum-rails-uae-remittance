# Quickstart — 10 Minutes from Cold Clone to a Real USDC Transfer on Arc

**Audience**: an Ignyte/Circle judge with no prior context (Persona D).
**Success criterion**: SC-001 — setup + hero flow complete in **under 10 minutes**.
**Everything here runs on Arc Testnet. No real funds are involved.**

> This file is the source for the project README's setup section. It is verified from a
> clean clone before submission (Constitution VIII) — untested instructions are treated
> as broken instructions.

---

## Prerequisites (≈2 min)

| Requirement | Why |
|-------------|-----|
| **Node.js v22+** | `.nvmrc` inherited from `arc-commerce` |
| A **Circle Developer account** | free — [console.circle.com](https://console.circle.com) |
| A **Supabase** project | free tier is sufficient |
| No Docker required | we use Supabase Cloud, not local Postgres |
| No crypto wallet required | wallets are provisioned for you |

---

## 1. Clone and install (≈1 min)

```bash
git clone <repo-url> aurum-rails
cd aurum-rails
nvm use          # Node 22
npm install
```

## 2. Circle setup (≈3 min)

1. In the Circle console, create a **testnet API key** → gives `CIRCLE_API_KEY`
   (format `TEST_API_KEY:<id>:<secret>`).
2. Generate a **32-byte hex entity secret** and register it once at
   [Register entity secret](https://developers.circle.com/wallets/dev-controlled/register-entity-secret).
   **Download the recovery file and store it outside this repository.**
3. Find the **USDC token id for `ARC-TESTNET`** in the console → `CIRCLE_USDC_TOKEN_ID`.

```bash
npm run bootstrap:wallet-set   # creates the wallet set, prints CIRCLE_WALLET_SET_ID
```

## 3. Configure environment (≈1 min)

```bash
cp .env.example .env.local
```

Fill in the values below. The app **validates every variable at startup and fails fast
naming any that is missing** (FR-028) — so a typo tells you exactly what is wrong.

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=...
SUPABASE_SECRET_KEY=...              # server only
CIRCLE_API_KEY=...                   # server only
CIRCLE_ENTITY_SECRET=...             # server only
CIRCLE_WALLET_SET_ID=...
CIRCLE_BLOCKCHAIN=ARC-TESTNET
CIRCLE_USDC_TOKEN_ID=...
NEXT_PUBLIC_ARC_CHAIN_ID=5042002
NEXT_PUBLIC_ARC_EXPLORER_URL=https://testnet.arcscan.app
```

> ⚠️ **No Circle value is ever `NEXT_PUBLIC_`.** If you find one, that is a bug — please
> tell us, it would be a Constitution VII violation.

## 4. Database (≈1 min)

```bash
npx supabase link --project-ref <your-ref>
npx supabase db push
```

## 5. Fund the demo treasury (≈1 min)

```bash
npm run treasury:address        # prints the treasury address
```

Visit **[faucet.circle.com](https://faucet.circle.com)**, choose **Arc Testnet**, paste
the address, and request USDC.

> **The faucet dispenses ~1 USDC per address per day.** That is why every demo amount in
> this app is small and why `DEMO_MAX_SEND_AED` exists. Amounts on screen are **1:1 with
> what moves on chain** — we deliberately rejected a display scale factor so that every
> receipt reconciles exactly against the explorer.

## 6. Seed and run (≈1 min)

```bash
npm run demo:seed     # demo users, recipients, funded sender wallet
npm run dev           # → http://localhost:3000
```

---

## The hero flow — what to look at (≈2 min)

Sign in as the seeded user (printed by `demo:seed`), then:

| Step | What to verify | Requirement |
|------|----------------|-------------|
| 1. **Enter AED 5.00** | Fee itemised into **network cost + service fee**; rate shown with **source and timestamp**; **FX spread shown even at 0.00%**; landed amount marked **[Simulated]**; arrival estimate; **60-second countdown** | FR-008–012 |
| 2. **Try waiting 60 s** | Quote expires, confirm disables, refresh offered — the stale rate is never executed | FR-010, E3 |
| 3. **Confirm** | Live timeline advances with **no page refresh**: Sending → Confirming → Settled ✓ → Delivered ✓, each timestamped | FR-016 |
| 4. **Open the receipt** | Click **View on Arc explorer** → a real transaction on `testnet.arcscan.app` | FR-017, SC-005 |
| 5. **Compare the numbers** | The amount on the explorer matches the amount on screen, 1:1 | Constitution II |
| 6. **Open the claim link** | The recipient view: plain language, **zero crypto vocabulary**, no login, no install | FR-021–022 |
| 7. **Resize to 375px** | Everything remains legible and operable, no horizontal scroll | NFR-016 |
| 8. **Double-tap confirm** | Exactly one transfer is created — idempotency holds | FR-014, E4 |

### Things we want you to try breaking

- **Send more than your balance** → blocked *before* submission with plain language and a
  funding action, never a raw chain error (E1).
- **Open *Technical details*** → this is the *only* place addresses and hashes appear.
  The default path contains no crypto vocabulary at all (NFR-017).
- **Look for a secret** → `.env.example` lists every variable; no Circle credential is
  reachable from the browser (NFR-011).

---

## Reset between runs

```bash
npm run demo:reset      # restores a known-good state in one command (FR-029)
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Missing environment variable: X` | Startup validation working as designed | Add `X` to `.env.local` |
| "Demo funds low" banner | Faucet limit reached (E2) | Wait for the daily faucet, or fund another address |
| Status stops at "Sending on Arc" | Webhook not reaching localhost | Expose with ngrok and register the URL in the Circle console; the 90 s sweeper reconciles regardless |
| `WRONG_CHAIN` error | `NEXT_PUBLIC_ARC_CHAIN_ID` ≠ 5042002 | Correct it — this guard is deliberate (Constitution I) |
| Transfer sits in "We're checking on this" | No webhook within 90 s | Expected fallback. It reconciles by tx hash and **never resubmits** (E6) |

---

## What is real vs. simulated

| Element | Status |
|---------|--------|
| USDC transfer on Arc Testnet | ✅ **Real** — verifiable on `testnet.arcscan.app` |
| Wallet creation and custody (Circle DCW) | ✅ **Real** |
| Network cost | ✅ **Real** — observed from the chain |
| Service fee | ✅ **Real** — charged in the flow |
| FX rate | ✅ **Real** — public source, name and timestamp displayed |
| Gateway unified treasury balance | ✅ **Real** |
| **Local-currency landing (INR/PKR/PHP)** | ⚠️ **Simulated** — labelled in-product |
| **AED pay-in** | ⚠️ **Simulated** — UX and rails only |
| KYC / AML / sanctions screening | ❌ **Not implemented** — out of scope, and a real product could not launch without it |

This table is duplicated in the README and is the honest answer to "what did you actually
build?" (Constitution II, NFR-008).
