# Product Specification – UAE → Global Cross-Border Payments on Arc

**Feature Branch**: `001-uae-global-remittance`
**Created**: 2026-08-05
**Status**: **Ready for `/sp.plan`** — all clarifications resolved 2026-08-05
**Governing authority**: `.specify/memory/constitution.md` v1.0.0
**Track**: Ignyte × Circle × Arc — Track 1, Best Cross-Border Payments & Remittances Experience
**Submission deadline**: 2026-08-10

**Input**: User description: "Using the Project Constitution, write a complete and concrete Product Requirements Document (PRD) for the Track 1 MVP... Be very specific. Reference real Circle capabilities on Arc (USDC, Wallets, Gateway, CCTP/App Kit). Design for non-crypto-native users."

---

## 1. Problem Statement (UAE high-expat corridor pain points)

### 1.1 The corridor

The UAE is the world's **third-largest remittance-sending country**, with roughly
**USD 43.3 billion** (AED 183 billion in 2024) leaving the country each year across
approximately **97 million transactions annually**. Around **88% of UAE residents are
expatriates**, and for most of them sending money home is a recurring monthly
obligation, not an occasional transaction.

The largest corridors are **UAE → India (~USD 14B/yr)**, **UAE → Pakistan (~USD 6B/yr)**,
and **UAE → Philippines (~USD 3.5B/yr)**, with Bangladesh and Egypt close behind.
India alone accounted for ~28% of exchange-house outward remittances in 2024.

### 1.2 The honest framing: this is not primarily a headline-fee problem

A naive pitch would claim UAE remittances are expensive. **They are not, at the
headline.** World Bank Remittance Prices Worldwide data puts the average cost of
sending USD 200 from the UAE at **under 3.5%** on major corridors — well below the
global average of **6.62%**. UAE exchange houses compete hard on advertised fees,
frequently at **AED 15–26 flat**.

Building this product on a "we're cheaper" claim would be both dishonest and easy for
a judge to falsify. The real, defensible pain is **where the cost hides and what the
sender cannot see**:

| # | Pain point | What the sender experiences |
|---|-----------|------------------------------|
| P1 | **Hidden FX spread** | The advertised fee is AED 15. The actual cost is the margin baked into the AED→INR rate, which is never shown next to a reference mid-market rate. The sender cannot compute what they paid. |
| P2 | **No real-time status** | After paying, the sender gets a reference number and "2–3 business days". There is no live tracking. Money is in a black box between correspondent banks. |
| P3 | **Banking hours and weekend dead-time** | A transfer initiated Friday evening in Dubai may not move until the following week. Value dates, cut-off times, and destination-country holidays are invisible to the sender. |
| P4 | **Physical friction** | Peak-time queues at exchange houses in Deira, Karama and Satwa; recipients travelling to a cash-pickup branch with ID during limited opening hours. |
| P5 | **Unpredictable landed amount** | The recipient often does not know the exact amount they will receive until it arrives, because of intermediary/lifting fees deducted in the correspondent chain. |
| P6 | **Freelancer/SME penalty** | A UAE freelancer paying an overseas collaborator, or an SME paying global suppliers, is pushed into slow bank wires with worse spreads and multi-day settlement, or into card rails with 3%+ effective cost. |

### 1.3 Why stablecoins on Arc address exactly these pain points

- **Arc Testnet settles with deterministic sub-second finality**, so P2 and P3 collapse:
  settlement completes in seconds, at 03:00 on a Friday, on a public holiday.
- **USDC is the native gas token on Arc** (6 decimals), so the network cost is
  denominated in the same unit as the payment. There is no "you need a second token for
  gas" step — the fee is expressible to the sender as a single, plain number in USD and
  AED. This directly attacks P1.
- **Every leg is publicly verifiable** on `testnet.arcscan.app`, so the black box in P2
  becomes a timestamped, linkable audit trail.
- **Circle Wallets** remove seed phrases and browser extensions, so the same person who
  queues in Deira can complete a send on a phone in under two minutes (P4).
- **Circle Gateway** gives the operator a unified USDC balance across chains, so the
  landed amount can be quoted and guaranteed up front rather than eroded by
  correspondents (P5).

### 1.4 Product thesis

> **Not "cheaper than the exchange house" — "you can see exactly what happens to your
> money, and it arrives while you are still looking at the screen."**
>
> We compete on **transparency and time-to-settlement**, and we prove both on-chain.

---

## 2. Target Users & Personas

### Persona A — Rajesh, the monthly remitter *(PRIMARY — hero persona)*

- 34, from Kerala, works as a site supervisor in Dubai. Lives in shared accommodation.
- Earns AED 6,500/month; sends **AED 2,000–3,000 home on the 2nd of each month** to
  their mother's account in Kochi.
- **Devices**: Android phone, 5–6" screen. The phone is the only computer they own.
- **Crypto literacy: zero.** Has heard "Bitcoin" on the news. Does not know what a
  wallet, a chain, or gas is, and has no reason to learn.
- **Current behaviour**: walks to an exchange house on payday, queues 20–40 minutes,
  pays AED 15, is told "2 days", texts the reference number to family, then fields
  "has it arrived?" messages for two days.
- **What they actually want**: certainty. That the exact amount they promised arrives,
  when they said it would, without a second trip.
- **Will abandon if**: they see the word "seed phrase", are asked to install an
  extension, hit any screen wider than their phone, or cannot tell what the recipient
  will actually receive before paying.

### Persona B — Layla, the freelancer/SME payer *(SECONDARY HERO)*

- 29, runs a three-person design studio in Dubai Media City, licensed in a UAE free zone.
- Pays **4–8 overseas contractors monthly** (Lahore, Manila, Cairo, Lisbon), each
  USD 300–2,500, on invoice.
- **Crypto literacy: low but curious.** Has heard of USDC; would use it if it did not
  require explaining anything to the contractors.
- **Pain**: bank wires cost AED 50–100 plus spread and take 2–5 days; contractors chase
  for status; reconciling which invoice was paid is manual.
- **What they want**: pay several people at once, each gets a receipt automatically,
  and the payment reference ties to the invoice.

### Persona C — Priya, the recipient *(critical, often ignored)*

- 58, Rajesh's mother, in Kochi. Uses WhatsApp. Does not use crypto and never will.
- **Never installs anything.** Receives a link, sees an amount, and needs to know it is
  real and when it lands.
- **Design implication**: the recipient experience MUST work from a single link with no
  app, no account creation friction, and no wallet vocabulary.

### Persona D — The Ignyte/Circle judge *(explicit design target)*

- Evaluates many submissions under time pressure, on a laptop, possibly on the day.
- Needs to reach the "wow" moment in **under 10 minutes from a cold clone**, verify the
  transaction on the explorer, and identify which Circle products are genuinely used.
- **Design implication** (Constitution VIII): a seeded demo mode, a visible explorer
  link on every transfer, and a product→file map in the README are product requirements,
  not documentation chores.

### Non-users (explicitly not designed for)

Crypto-native DeFi users, traders, institutional treasury desks, and anyone who wants
to manage keys themselves. Serving them would compromise Persona A (Constitution IV).

---

## 3. Hero User Journeys

### User Story 1 — Consumer remittance, UAE → India (Priority: **P1**) 🎯 MVP

**Persona**: Rajesh (A), delivering to Priya (C).

**Why this priority**: This is the literal subject of Track 1 and the demo video
narrative. It exercises USDC on Arc, Circle Wallets, and the full transparency surface.
If only this ships, the submission is still viable.

**Independent test**: From a clean seeded database, a new user signs up, adds a
recipient, sends 0.25 USDC, and both sender and recipient see a settled transfer with a
working `testnet.arcscan.app` transaction link — with no other user story implemented.

**Step-by-step**:

1. **Land** — Rajesh opens the app on his phone. Above the fold: "Send money home from
   the UAE. See every fee. Arrives in seconds." Persistent **"Arc Testnet — educational
   demo. No real funds."** badge is visible (Constitution I).
2. **Sign up** — Email address + one-time code. No password, no seed phrase, no
   extension. Target: under 60 seconds.
3. **Wallet provisioned invisibly** — A Circle Developer-Controlled Wallet is created
   for him on Arc Testnet in the background. The UI says "Setting up your account",
   never "generating wallet". He never sees an address unless he opens *Technical
   details*.
4. **Add recipient** — Name (Priya Nair), country (India), delivery method, and a
   contact handle for the claim link. Saved for reuse; the second send skips this step.
5. **Enter amount** — He types **AED 100**. The quote panel updates live and shows,
   before he can proceed:
   - You send: **AED 100.00**
   - Our fee: **AED 1.00** *(itemised: network cost AED 0.01 · service fee AED 0.99)*
   - Rate: **1 AED = 22.85 INR** — mid-market, source + timestamp shown, **0% spread**
   - Priya receives: **≈ INR 2,262** *(simulated last-mile — clearly labelled)*
   - Arrives: **in about 5 seconds**
   - **Quote valid for 60 seconds**, with a visible countdown.
6. **Review** — A single confirmation screen restating amount out, amount in, total
   cost, and arrival. One primary button: **"Send AED 100"**. No hidden terms.
7. **Confirm** — Button enters a loading state. It is never dead or double-submittable
   (idempotency key attached).
8. **Watch it settle** — A live timeline advances without a page refresh:
   `Initiated ✓` → `Funding ✓` → `Settling on Arc ⟳` → `Delivered ✓`, each with a
   timestamp. Total elapsed time is shown as a running counter and typically reads
   **under 10 seconds**.
9. **Receipt** — Amount sent, amount received, total fee, rate used, timestamps, and a
   **"View on Arc explorer"** link resolving to the real transaction hash
   (Constitution II).
10. **Recipient side** — Priya opens the claim link on her phone: "Rajesh sent you
    ₹2,262. Received 04 Aug, 21:14." Plain language, no wallet vocabulary, no install.
11. **Repeat send** — Next month, Rajesh taps Priya on his home screen, the last amount
    is pre-filled, and he completes the send in **under 20 seconds and 3 taps**.

**Acceptance scenarios**:

1. **Given** a signed-in sender with a funded wallet and a saved recipient, **When** they
   enter AED 100 and confirm, **Then** a real USDC transfer executes on Arc Testnet
   (chain 5042002) and the receipt exposes a resolvable explorer transaction link.
2. **Given** the amount entry screen, **When** any amount is entered, **Then** fee
   (itemised), rate with source and timestamp, recipient amount, and arrival estimate
   are all visible **before** the confirm control is enabled.
3. **Given** a displayed quote, **When** 60 seconds elapse without confirmation, **Then**
   the quote expires, the confirm control disables, and a refresh action is offered.
4. **Given** a confirmed transfer, **When** the sender remains on the status screen,
   **Then** the timeline advances through named states with timestamps and reaches a
   terminal state with **no manual refresh**.
5. **Given** a sender wallet with insufficient balance, **When** they attempt to
   confirm, **Then** they are blocked *before* submission with a plain-language message
   and a funding action — never with a raw provider or chain error.
6. **Given** a completed transfer, **When** the recipient opens the claim link, **Then**
   they see sender name, amount in local currency, and delivery time, with zero crypto
   terminology on screen.
7. **Given** the confirm request is retried with the same idempotency key, **When** it
   is received, **Then** the original transfer is returned and **no second transfer** is
   created.
8. **Given** any screen in the flow, **When** rendered at 375px width, **Then** all
   content is legible and operable with no horizontal scroll (Constitution IV).

---

### User Story 2 — Freelancer / contractor batch payout (Priority: **P2**)

**Persona**: Layla (B), paying contractors including Persona C-like recipients.

**Why this priority**: Named in the track title and shares User Story 1's rails
end-to-end (quote → confirm → transfer → track → receipt). It is the natural showcase
for **Circle Gateway** multi-party settlement and adds a second credible market without
new architecture (Constitution VI, IX).

**Independent test**: A business user uploads or selects 3 contractors, reviews one
aggregate quote, confirms once, and all 3 payouts settle on Arc with individual
explorer links and per-contractor receipts.

**Step-by-step**:

1. Layla signs in and switches to the **Business** surface (same account, different view).
2. **Payees** — Adds contractors once: name, country, payout currency, invoice reference.
3. **New payout run** — Selects 3 contractors and enters an amount per contractor, or
   pastes a simple list.
4. **Batch quote** — One panel shows, per contractor and in aggregate: amount out, fee,
   rate, landed amount, and arrival estimate. **Total cost of the run** is stated once,
   in USD and AED.
5. **Treasury check** — The app shows the operator's **unified USDC balance via Circle
   Gateway** and states plainly whether the run is covered. If liquidity sits on another
   chain, the UI explains in one line: "Moving funds to Arc to cover this run."
6. **Confirm once** — A single confirmation authorises the whole run.
7. **Watch the fan-out** — A live grid shows each payout advancing independently through
   the same named states, each with its own explorer link. Partial failure is expected
   and handled: one failed payout does **not** roll back or block the others.
8. **Reconciliation** — Each contractor receives a receipt carrying their invoice
   reference. Layla can export the run as CSV.

**Acceptance scenarios**:

1. **Given** 3 selected payees with amounts, **When** the batch quote renders, **Then**
   per-payee and aggregate fees, rates, and landed amounts are all shown before confirm.
2. **Given** a confirmed run, **When** settlement proceeds, **Then** each payout produces
   an independent Arc transaction with its own explorer link and status timeline.
3. **Given** one payout in the run fails, **When** the run completes, **Then** the other
   payouts settle successfully, the failed one shows a plain-language reason and a retry
   action, and the run reports an accurate partial-success summary.
4. **Given** operator liquidity is distributed across chains, **When** the treasury panel
   renders, **Then** a Gateway-sourced unified balance is displayed with its per-chain
   composition available on expansion.

---

### User Story 3 — Cross-chain delivery to a non-Arc recipient (Priority: **P3**)

**Persona**: A contractor from Layla's run who is paid to a wallet on Base Sepolia
rather than on Arc.

**Why this priority**: Satisfies the fourth Circle product requirement (Constitution V)
and demonstrates that Arc is a settlement hub rather than a walled garden. It is
genuinely optional to the core narrative and is scheduled last per Constitution IX.

> ⚠️ **Dependency risk — see §6.4.** CCTP V2 recognises Arc Testnet as **domain 26**,
> but published reports indicate the Bridge SDK does not currently accept Arc Testnet
> as a routing source or destination. This story's implementation route is **Q2 below**.

**Step-by-step**:

1. In payee setup, the contractor selects **"Receive on another network"** and picks a
   supported destination (e.g. Base Sepolia).
2. At quote time, the panel discloses **both** legs' costs and a combined arrival
   estimate — the sender still sees exactly one total.
3. On confirm, the transfer settles on Arc and then moves cross-chain to the destination.
4. The status timeline gains explicit legs: `Settling on Arc ✓` → `Moving to Base ⟳` →
   `Delivered ✓`, with a link for each leg.
5. The receipt shows both transaction references.

**Acceptance scenarios**:

1. **Given** a payee configured for a non-Arc destination, **When** the quote renders,
   **Then** the combined cost and combined arrival estimate are shown as one number to
   the sender, with per-leg detail available on expansion.
2. **Given** a cross-chain payout, **When** it settles, **Then** the timeline shows both
   legs with independent, resolvable explorer links.
3. **Given** the cross-chain route is unavailable, **When** a user selects it, **Then**
   the option is disabled with a plain-language explanation — never a silent failure or
   a fabricated success (Constitution II).

---

### Edge Cases

| # | Condition | Required behaviour |
|---|-----------|--------------------|
| E1 | Sender balance insufficient | Blocked **pre-submission** with plain language + funding action. Never a chain error. |
| E2 | Operator treasury/faucet exhausted | Demo-mode banner: "Demo funds low — reset the demo." Reset script offered. Never a raw failure. |
| E3 | Quote expires mid-flow | Confirm disables; refresh offered; **stale rate is never used** to execute. |
| E4 | Double-submit / double-tap / retry | Idempotency key returns the original transfer. Exactly one transfer exists. |
| E5 | Arc RPC unreachable or timing out | Transfer enters `Pending — retrying`, not `Failed`. Status is honest and recoverable. |
| E6 | Transaction submitted but confirmation unseen | State machine treats it as `Submitted — verifying`; reconciliation resolves by transaction hash. **Never resubmits.** |
| E7 | FX rate source unavailable | Last known rate is used, **explicitly labelled stale with its timestamp**, or the flow blocks. Never silently invented. |
| E8 | Wrong network detected (chain ≠ 5042002) | Hard failure with an explicit message (Constitution I). |
| E9 | Recipient never opens the claim link | Funds remain settled and visible to the sender; sender can resend the link. No expiry that destroys value. |
| E10 | Amount below dust / below network cost | Blocked at entry with the minimum stated in AED and USD. |
| E11 | Batch partially fails | Per-item status; successful items stand; failed items independently retryable. No all-or-nothing rollback. |
| E12 | Same recipient added twice | Duplicate detected and merge offered, rather than creating a silent second payee. |
| E13 | Session expires mid-transfer | On re-auth the user returns to the live status of the in-flight transfer, not to a blank home screen. |

---

## 4. Functional Requirements

### 4.1 Must-have (MVP — submission fails without these)

**Identity & wallets**

- **FR-001**: Users MUST sign up and sign in with email + one-time code. No password,
  no seed phrase, no browser extension anywhere in the flow.
- **FR-002**: The system MUST provision a Circle Developer-Controlled Wallet on Arc
  Testnet for each user automatically, with no user-visible key management step.
- **FR-003**: The wallet address MUST NOT appear in the default UI. It MUST be available
  only inside an explicitly opened *Technical details* disclosure.
- **FR-004**: Users MUST be able to view their available balance in USDC with an AED
  equivalent shown alongside.

**Recipients**

- **FR-005**: Users MUST be able to create, edit, and reuse recipients (name, country,
  delivery currency, contact handle).
- **FR-006**: The system MUST detect and offer to merge duplicate recipients.
- **FR-007**: A returning user MUST be able to repeat a previous send in **3 taps or
  fewer**.

**Quoting & transparency** *(Constitution III — each item independently testable)*

- **FR-008**: Before the confirm control is enabled, the system MUST display: amount
  sent, total fee, itemised network cost, itemised service fee, exchange rate, rate
  source, rate timestamp, recipient landed amount, and estimated arrival.
- **FR-009**: All fee and rate values MUST be shown in **both AED and USD**.
- **FR-010**: Quotes MUST expire after a fixed window (60 seconds) with a visible
  countdown, and MUST NOT be executable once expired.
- **FR-011**: The system MUST display the applied FX spread explicitly, including when
  it is zero.
- **FR-012**: Every value that is simulated rather than real MUST carry a visible
  **"Simulated"** marker at its point of display (Constitution II).

**Transfers**

- **FR-013**: The system MUST execute real USDC transfers on Arc Testnet, chain ID
  **5042002**, and MUST hard-fail if the active chain ID differs.
- **FR-014**: Every transfer-initiating endpoint MUST accept and honour an idempotency
  key; a repeated key MUST return the original transfer and create no second transfer.
- **FR-015**: Every transfer MUST persist an explicit state-machine status with recorded,
  timestamped transitions. Status MUST NOT be inferred ad hoc at render time.
- **FR-016**: Transfer status MUST update on the sender's screen **without a manual page
  refresh**.
- **FR-017**: Every settled transfer MUST expose a resolvable `testnet.arcscan.app`
  transaction link.
- **FR-018**: All monetary amounts MUST be stored and computed as integer minor units
  (USDC, 6 decimals). Floating-point money arithmetic is prohibited.
- **FR-019**: Every terminal failure state MUST carry a plain-language reason and a
  recoverable next action. Raw provider or chain errors MUST NOT reach the UI.

**Receipts & recipient experience**

- **FR-020**: Each completed transfer MUST produce a receipt showing amount sent, amount
  received, total fee, rate applied, all timestamps, and the explorer link.
- **FR-021**: Recipients MUST be able to view a received payment from a single link with
  **no account creation and no app install**.
- **FR-022**: The recipient view MUST contain zero crypto vocabulary in its default state.

**Batch payouts (User Story 2)**

- **FR-023**: Business users MUST be able to select multiple payees and execute a single
  authorised payout run.
- **FR-024**: A batch quote MUST show per-payee and aggregate costs before confirmation.
- **FR-025**: Batch items MUST settle and fail independently, with per-item status and
  per-item retry.
- **FR-026**: The system MUST display the operator's Gateway-sourced unified USDC
  balance with per-chain composition available on expansion.

**Trust, safety & operations**

- **FR-027**: A persistent, unmissable **"Arc Testnet — educational demo. No real
  funds."** badge MUST appear on every user-facing surface.
- **FR-028**: The system MUST validate all required environment variables at startup and
  fail fast, naming any missing variable.
- **FR-029**: A single-command seed/reset script MUST restore the demo to a known-good
  state (Constitution IX).
- **FR-030**: Every Circle API call and chain submission MUST emit a structured log with
  correlation ID, operation, outcome, and duration — never containing secrets.

### 4.2 Should-have (strongly improves judged outcome; build after must-haves)

- **FR-031**: Cross-chain delivery to a non-Arc destination (User Story 3), subject to §6.4.
- **FR-032**: A live comparison panel: "Traditional exchange house: AED 15 fee + ~1.5%
  hidden spread, 2–3 days. This transfer: AED 1.00 total, 5 seconds." Comparison inputs
  MUST be sourced and labelled, never invented.
- **FR-033**: Transfer history with search and filter by recipient, status, and date.
- **FR-034**: CSV export of a payout run for reconciliation.
- **FR-035**: Recurring/scheduled send scaffolding for the monthly-remitter pattern
  (payroll prototype seed).
- **FR-036**: Corridor presets for India, Pakistan, Philippines, Egypt, and Bangladesh
  with correct currency and formatting.
- **FR-037**: A demo mode toggle that pre-seeds users, recipients, and history so a judge
  reaches the hero flow in one click.

### 4.3 Nice-to-have (only if all above are complete and stable)

- **FR-038**: A "Pay in AED" conceptual on-ramp screen — clearly simulated, demonstrating
  UX and rails only (Constitution II, §9).
- **FR-039**: StableFX-style architectural surface for AED↔USD conversion behind a
  labelled simulated adapter conforming to a real integration's interface.
- **FR-040**: Arabic (RTL) and Hindi localisation of the send flow.
- **FR-041**: Shareable receipt image for WhatsApp — the actual channel Persona A uses.
- **FR-042**: Push/email notification to the recipient on delivery.
- **FR-043**: Savings counter: cumulative AED saved versus a labelled baseline.

---

## 5. Non-Functional Requirements

### 5.1 Speed

- **NFR-001**: Perceived settlement — from confirm to `Delivered` — MUST complete in
  **under 15 seconds** on Arc Testnet under normal conditions; target under 10.
- **NFR-002**: Quote panel MUST update within **500 ms** of an amount change.
- **NFR-003**: First contentful paint on the send flow MUST occur within **2.5 seconds**
  on a simulated 4G mobile connection.
- **NFR-004**: Status updates MUST reach the sender's screen within **2 seconds** of a
  state transition.
- **NFR-005**: Signup to first completed send MUST be achievable in **under 2 minutes**
  by a first-time user.

### 5.2 Transparency

- **NFR-006**: No fee, spread, or delay may be disclosed only after the user has
  committed. Full disclosure precedes the confirm control, without exception.
- **NFR-007**: Every displayed rate MUST carry its source and timestamp.
- **NFR-008**: Every simulated element MUST be labelled at point of display **and**
  enumerated in the README's *What Is Real vs. Simulated* table.
- **NFR-009**: Every settled transfer MUST be independently verifiable by a third party
  via the public explorer, with no access to the application required.

### 5.3 Security

- **NFR-010**: No secret, API key, entity secret, private key, wallet set ID, or database
  credential may appear in source, config, fixtures, logs, screenshots, README, diagram,
  or demo video (Constitution VII).
- **NFR-011**: All Circle SDK calls MUST execute server-side only. No Circle credential
  may be reachable from client code or any `NEXT_PUBLIC_` variable.
- **NFR-012**: `.env.example` MUST enumerate every required variable with a description
  and a safe placeholder, and MUST stay in sync with the code.
- **NFR-013**: All transfer-initiating endpoints MUST authenticate the caller and
  authorise that the caller owns the source wallet.
- **NFR-014**: Amount, recipient, and currency inputs MUST be validated server-side.
  Client-side validation is a convenience, never a control.
- **NFR-015**: No mainnet endpoint, key, or chain ID may exist anywhere in the repository.

### 5.4 UX

- **NFR-016**: Every screen MUST be fully usable and visually correct at **375px** width
  with no horizontal scroll.
- **NFR-017**: The default path MUST contain **zero** occurrences of: gas, seed phrase,
  private key, RPC, chain, nonce, approve, sign, blockchain, or crypto. Verified by an
  automated copy check.
- **NFR-018**: Every asynchronous action MUST render explicit loading, empty, success,
  and error states. A frozen or unresponsive control is a defect.
- **NFR-019**: WCAG AA contrast on all text; keyboard-operable controls; visible focus
  rings; semantic HTML.
- **NFR-020**: Currency MUST be formatted per the destination locale (₹2,262 / ₨ / ₱)
  with correct grouping.
- **NFR-021**: Error messages MUST state what happened, why, and what to do next, in
  language Persona A understands.

### 5.5 Reliability & operability

- **NFR-022**: A partially failed batch MUST never corrupt successful items.
- **NFR-023**: The system MUST NOT resubmit a transaction whose confirmation is merely
  unseen; reconciliation resolves by transaction hash (E6).
- **NFR-024**: The hero path MUST be demoable at every commit on `main` (Constitution IX).
- **NFR-025**: Every API error MUST return a stable machine-readable code, a user-safe
  message, and a correlation ID.

---

## 6. Circle Product Integration Requirements

Constitution V requires **at least four** Circle products doing real work on real paths.
This specification integrates **four mandatory** plus one optional.

### 6.1 USDC on Arc Testnet — *settlement rail* **[MANDATORY]**

- **Chain ID 5042002**; RPC `https://rpc.testnet.arc.network`; explorer
  `https://testnet.arcscan.app`; faucet `https://faucet.circle.com`.
- USDC is the **native gas token** on Arc, with **6 decimals**. The product exploits
  this directly: the network cost is quoted to the user in the same unit as the payment,
  which is what makes the single-number fee disclosure in FR-008 honest and simple.
- **Used in**: User Stories 1, 2, 3 — every transfer.
- **Verifiable by**: a resolvable explorer transaction link on every receipt (FR-017).

### 6.2 Circle Wallets — Developer-Controlled — *custody & onboarding* **[MANDATORY]**

- Provisions a wallet per sender and per operator treasury, automatically and invisibly.
- **This is the product requirement that makes Persona A possible at all**: it is what
  removes seed phrases, extensions, and key management from the flow (FR-002, FR-003).
- Developer-Controlled is chosen over User-Controlled for automation, for batch payout
  execution without per-item user signing, and for a demo that runs unattended.
- **Used in**: User Story 1 (sender + recipient wallets), User Story 2 (treasury +
  payee wallets).
- **Verifiable by**: signup-to-send in under 2 minutes with no key material shown.

### 6.3 Circle Gateway — *unified balance & treasury routing* **[MANDATORY]**

- Gateway is a **non-custodial** system: a Gateway Wallet contract plus an off-chain
  attestation service. USDC deposited remains under the depositor's control; movement
  requires both a user signature and a Circle attestation.
- Deposit once, then access a **unified USDC balance on any supported chain**, with
  cross-chain availability in **under 500 ms**.
- The Gateway Wallet contract uses the **same address on all supported chains**:
  `0x0077777d7EBA4688BDeF3E311b846F25870A19B9`.
- Testnet support includes Ethereum Sepolia, Base Sepolia, Avalanche Fuji, **and Arc
  Testnet**.
- **Used in**: User Story 2 — the operator treasury panel (FR-026) showing a unified
  balance with per-chain composition, and covering a batch run whose liquidity is not
  all on Arc.
- **Why it earns its place**: it is the honest answer to pain point **P5** — the landed
  amount can be guaranteed at quote time because the operator's liquidity is unified
  rather than trapped per-chain.
- **Verifiable by**: the treasury panel showing real per-chain balances that sum to the
  displayed unified balance.

### 6.4 CCTP V2 and/or App Kit / Bridge Kit — *cross-chain delivery* **[MANDATORY — route TBD]**

- CCTP V2 provides canonical burn-and-mint USDC transfer across supported chains, with
  **Fast Transfer** as an opt-in mode (finality threshold ≤ 500) that mints on the
  destination ahead of source finality, reducing wall-clock time to seconds.
- **Arc Testnet is recognised as CCTP V2 domain 26.**

> ### ⚠️ VERIFIED RISK — this is the single largest scope risk in the specification
>
> Published reporting indicates the **Bridge SDK does not currently accept Arc Testnet
> as a routing source or destination**, even though the CCTP domain exists. If this
> holds at build time, User Story 3 cannot be implemented as a direct Arc↔other-chain
> CCTP hop, and the fourth mandatory Circle product is at risk.
>
> **This MUST be verified against live Circle documentation as the first task of
> `/sp.plan` Phase 0 research — before any implementation begins.**
>
> Fallback options are presented as **Q2** in §11. Under no circumstances may a
> cross-chain transfer be faked to appear real (Constitution II).

- **Used in**: User Story 3, and as the mechanism behind Gateway rebalancing in User Story 2.
- **Verifiable by**: two resolvable explorer links, one per leg.

### 6.5 StableFX concepts — *AED↔USD* **[OPTIONAL — architectural]**

- If access is gated, StableFX MUST still appear in the architecture diagram and be
  implemented behind a **clearly labelled simulated adapter** conforming to the interface
  a real integration would use (Constitution V, FR-039).
- **Used in**: the AED pay-in conceptual flow (FR-038) and the AED↔USD rate display.

### 6.6 Integration traceability requirement

- **FR-044**: The README MUST contain a table mapping each Circle product to the exact
  source files and endpoints where it is exercised (Constitution V, VIII).

---

## 7. Fee & Transparency Model

### 7.1 Design principles

1. **One number the user cares about**: "Priya receives ₹2,262." Everything else is
   supporting detail.
2. **Nothing hides in the rate.** The FX spread is a named line item, shown even when it
   is **0.00%** — because showing a zero is what proves the line item is real.
3. **Simulated is labelled, always** (Constitution II).
4. **The comparison is sourced, not invented.** Any competitor baseline carries its
   source and date, and we do **not** claim a headline-fee advantage we cannot evidence
   (§1.2).

### 7.2 Fee composition

| Component | Definition | MVP treatment | Real or simulated |
|-----------|------------|---------------|-------------------|
| **Network cost** | Arc Testnet transaction cost, paid in USDC as the native gas token | Actual observed cost, shown to 2 decimals in AED | **Real** |
| **Service fee** | Our platform fee | Flat **0.99 AED** per transfer (transparent, promotional, and stated as such) | **Real** (charged in the flow) |
| **FX spread** | Margin over mid-market on AED→destination currency | **0.00%** — the deliberate product statement | **Real (zero)** |
| **Last-mile payout cost** | Cost of local-currency delivery | **0** in MVP; the last mile is out of scope | **Simulated — labelled** |
| **Recipient-side deduction** | Intermediary/lifting fees | **None.** Landed amount is guaranteed at quote | **N/A by design** |

### 7.3 Rate model

- Mid-market AED→destination rate from a public FX source, with **source name and
  timestamp displayed** (FR-008, NFR-007).
- AED is pegged at **1 USD = 3.6725 AED**, so AED↔USD conversion is deterministic and
  displayed as a fixed peg rather than a live quote.
- If the rate source is unavailable, the last known rate is used and **explicitly
  labelled stale with its timestamp**, or the flow blocks. A rate is never invented (E7).
- Quotes lock for **60 seconds** with a visible countdown (FR-010).

### 7.4 The disclosure panel — exact required content

```
You send                                    AED 100.00
─────────────────────────────────────────────────────
Our fee                                       AED 1.00
   ├ Network cost (Arc)                       AED 0.01
   └ Service fee                              AED 0.99
Exchange rate            1 AED = 22.85 INR  ⓘ mid-market
   └ FX spread                                   0.00%
   └ Source: <provider> · 04 Aug 2026, 21:13:48
─────────────────────────────────────────────────────
Priya receives                             ≈ INR 2,262   [Simulated]
Arrives in                              about 5 seconds
─────────────────────────────────────────────────────
Total cost                     AED 1.00  (USD 0.27) · 1.0%
                                   Quote expires in 0:47
```

Every line above is a **hard requirement**, not a mockup suggestion. Section 7.4 is the
acceptance reference for FR-008.

### 7.5 Status transparency — the transfer state machine

Named states, each persisted with a timestamp (FR-015), each rendered in plain language:

| State | Shown to user as | Terminal |
|-------|-----------------|----------|
| `INITIATED` | Payment started | No |
| `QUOTE_LOCKED` | Rate locked | No |
| `FUNDING` | Preparing your money | No |
| `SUBMITTED` | Sending on Arc | No |
| `SETTLING` | Confirming on Arc | No |
| `SETTLED` | Settled on Arc ✓ | No |
| `DELIVERING` | Delivering to recipient | No |
| `DELIVERED` | Delivered ✓ | **Yes** |
| `FAILED` | Couldn't complete — *reason* + action | **Yes** |
| `PENDING_RETRY` | Taking longer than usual — retrying | No |
| `NEEDS_REVIEW` | We're checking on this | No |

**Constraints**: transitions MUST be recorded, not inferred (FR-015); `FAILED` MUST
always carry a reason and a recoverable action (FR-019); an unseen confirmation maps to
`NEEDS_REVIEW`, never to a resubmission (E6, NFR-023).

---

## 8. Success Metrics for the Hackathon

### 8.1 Judged-outcome criteria

- **SC-001**: A judge with no prior context completes setup and the hero flow in **under
  10 minutes** from a cold clone, using the README alone (Constitution VIII).
- **SC-002**: A first-time user completes signup → first settled send in **under 2
  minutes**.
- **SC-003**: A returning user completes a repeat send in **under 20 seconds and 3 taps**.
- **SC-004**: Perceived settlement time from confirm to delivered is **under 15 seconds**
  in 95% of demo runs.
- **SC-005**: **100%** of settled transfers expose a resolvable public explorer link.
- **SC-006**: **100%** of quotes display fee, itemised network cost, itemised service
  fee, rate, rate source, rate timestamp, landed amount, and arrival estimate **before**
  the confirm control enables.
- **SC-007**: **Zero** crypto-vocabulary terms appear in the default path, verified by an
  automated copy check (NFR-017).
- **SC-008**: **Four or more** Circle products are genuinely integrated and mapped to
  source files in the README (Constitution V).
- **SC-009**: **100%** of screens render correctly at 375px with no horizontal scroll.
- **SC-010**: **Zero** secrets present anywhere in the repository, README, diagram, or
  demo video, verified by a scan before submission.
- **SC-011**: **100%** of simulated elements are labelled in-product **and** listed in the
  README's *What Is Real vs. Simulated* table.
- **SC-012**: A non-crypto-native test user completes the hero flow **unassisted** on
  first attempt, without asking what any term means.

### 8.2 Submission completeness (Constitution Definition of Done)

- **SC-013**: Both hero journeys (User Stories 1 and 2) execute end-to-end on Arc Testnet.
- **SC-014**: An architecture diagram is committed and renders inline in the README.
- **SC-015**: A 2–3 minute demo video script is written **against flows that already
  work**, and the video is recorded.
- **SC-016**: A clearly headed **"Circle Product Feedback"** section is written, specific
  and constructive, citing concrete documentation and SDK surfaces. Generic praise does
  not satisfy this.
- **SC-017**: The seed/reset script runs green from a clean database.
- **SC-018**: Demo wallets are funded and verified within **4 hours** of submission
  (Constitution IX — the faucet dispenses only ~1 USDC/address/day).

### 8.3 Anti-metrics — explicitly *not* optimised for

Transaction throughput, user acquisition, revenue, TVL, or any figure that would tempt
inflation of a testnet demo into a false production claim.

---

## 9. Explicitly Out of Scope

### 9.1 Hard exclusions — will not be built

| Area | Excluded | Why |
|------|----------|-----|
| **Mainnet** | Any mainnet deployment, key, endpoint, or chain ID | Constitution I |
| **Real fiat** | Actual AED collection, bank/card debit, real payout to a bank account or cash-pickup point | No licence; not the demo's point. The AED pay-in is **conceptual only** (FR-038) |
| **Real last mile** | INR/PKR/PHP delivery into a real bank account, UPI, or wallet | Requires local PSP partnerships and licensing. Landed amount is **simulated and labelled** |
| **Compliance** | Real KYC/AML, sanctions screening, transaction monitoring, regulatory reporting, UAE Central Bank licensing | Out of hackathon scope; a real product could not launch without it, and we say so in the README |
| **Custody of real value** | Holding any real user funds | Testnet demo only |
| **Native mobile apps** | iOS/Android builds | Mobile-responsive web meets Persona A's needs |
| **Multi-tenancy** | Organisations, roles, permissions, admin hierarchies | Not needed for either hero journey |
| **Production ops** | HA, DR, autoscaling, SLAs, on-call, load testing | Demo-grade only |
| **Self-custody** | User-managed keys, seed phrases, extension wallets, WalletConnect | Directly contradicts Constitution IV |
| **Trading** | Swaps, yield, lending, non-USDC assets | Not a remittance concern |

### 9.2 Deliberately deferred (would be next, not now)

Recurring/scheduled payments beyond scaffolding; full payroll with tax handling;
merchant/marketplace checkout; dispute and refund flows; multi-currency stablecoins
(EURC); recipient-initiated payment requests; full localisation beyond FR-040; native
notifications beyond FR-042.

### 9.3 Explicit anti-goals

- **We will not claim a headline-fee advantage over UAE exchange houses.** Their
  advertised fees are genuinely low (§1.2). We compete on **transparency and speed**.
- **We will not fake a flow to improve the demo** (Constitution II).
- **We will not present testnet activity as production-ready** anywhere.

---

## 10. Key Entities

| Entity | Represents | Key attributes | Relationships |
|--------|-----------|----------------|---------------|
| **User** | A sender (Persona A or B) | id, email, display name, account type (personal/business), created_at | has one Wallet; has many Recipients, Transfers, PayoutRuns |
| **Wallet** | A Circle Developer-Controlled Wallet on Arc | id, provider wallet id, address, chain id (5042002), owner type (user/treasury) | belongs to User or Treasury |
| **Recipient** | A saved payee (Persona C) | id, name, country, delivery currency, contact handle, delivery destination, created_at | belongs to User; has many Transfers |
| **Quote** | A time-boxed priced offer | id, send amount (minor units), send currency, fee breakdown, fx rate, rate source, rate timestamp, landed amount, expires_at | referenced by one Transfer |
| **Transfer** | One payment attempt | id, sender, recipient, quote, amount (minor units, 6dp), status, idempotency key, tx hash, explorer url, created_at, delivered_at | belongs to User + Recipient; has many StatusEvents |
| **StatusEvent** | One recorded state transition | id, transfer, from state, to state, occurred_at, reason, correlation id | belongs to Transfer |
| **PayoutRun** | A batch payout (User Story 2) | id, business user, aggregate amount, aggregate fee, status, created_at | belongs to User; has many Transfers |
| **TreasuryBalance** | Gateway unified balance snapshot | unified amount, per-chain composition, observed_at | belongs to Treasury |
| **FxRate** | A retrieved rate | base, quote, rate, source, retrieved_at, is_stale | referenced by Quotes |

**Invariants**

- All monetary amounts are integer minor units with an explicit currency tag (FR-018).
- A Transfer's status is only ever changed by appending a StatusEvent (FR-015).
- A Transfer's idempotency key is unique per user (FR-014).
- No Transfer may exist against a chain id other than 5042002 (FR-013).

---

## 11. Resolved Clarifications

> Both questions were put to the architect on 2026-08-05 and **resolved**. The decisions
> are binding on `/sp.plan` and all downstream work. Original options retained for
> traceability.

### Q1: Last-mile delivery model — ✅ **RESOLVED: Option A**

**Decision (2026-08-05)**: **Show simulated local-currency landing.** The recipient sees
"Priya receives ₹2,262" with a visible **[Simulated]** marker.

**Binding consequences**:
- FR-012 labelling discipline is now **critical path**, not hygiene — the landed amount
  is the single most prominent number in the product and it is simulated.
- The *What Is Real vs. Simulated* README table (NFR-008, SC-011) must lead with the
  landed amount, not bury it.
- §7.4's `[Simulated]` marker on the "Priya receives" line is mandatory, not illustrative.

**Context**: §7.2 treats the landed local-currency amount as simulated; §9.1 excludes
real payout rails. But *how far* the product visibly goes shapes the demo narrative and
the entire fee panel.

**What we need to know**: Does delivery end at USDC in the recipient's wallet, or does
the product present a simulated local-currency payout as the final step?

| Option | Answer | Implications |
|--------|--------|--------------|
| **A** *(default)* | **Show simulated local-currency landing** — "Priya receives ₹2,262 [Simulated]" | Strongest corridor narrative; matches how Persona A actually thinks; requires clear labelling discipline everywhere |
| B | **USDC-only delivery** — "Priya receives 27.23 USDC" | Fully real end-to-end, nothing simulated on the hero path; weaker remittance story; Persona C must understand USDC |
| C | **Both, user-selectable** | Most complete; costs UI time that Constitution IX says belongs to the hero path first |
| Custom | Provide your own | — |

**Original options considered**: A *(chosen)* · B USDC-only delivery · C both, user-selectable.

### Q2: CCTP route, given the verified Arc Bridge SDK limitation (§6.4) — ✅ **RESOLVED: Option A**

**Context**: Arc Testnet is CCTP V2 **domain 26**, but reporting indicates the Bridge SDK
does not accept Arc Testnet as a routing source or destination. The fourth mandatory
Circle product (Constitution V) depends on how we respond.

**What we need to know**: If Phase 0 research confirms the limitation, which route do we take?

| Option | Answer | Implications |
|--------|--------|--------------|
| **A** *(default)* | **Lean on Gateway for cross-chain**; use CCTP only where it demonstrably works, and document the limitation honestly in *Circle Product Feedback* | Lowest risk; Gateway already covers cross-chain; turns a blocker into high-value product feedback — which is itself a judged deliverable (SC-016) |
| B | **Demonstrate CCTP on a non-Arc pair** (e.g. Base Sepolia ↔ Avalanche Fuji) as an operator rebalancing leg | Genuine CCTP usage, real transactions; slightly off-corridor; more build time |
| C | **Drop CCTP; substitute App Kit / Bridge Kit** as the fourth product | Keeps four products; depends on App Kit's own Arc support, which is equally unverified |
| D | **Direct CCTP contract calls**, bypassing the Bridge SDK | Most impressive if it works; highest risk of burning 1–2 of 5 remaining days |

**Decision (2026-08-05)**: **Lean on Circle Gateway for all cross-chain movement.** Use
CCTP only where Phase 0 proves it demonstrably works on Arc Testnet, and document the
limitation honestly and specifically in the *Circle Product Feedback* section.

**Binding consequences**:
- **Gateway is promoted from a User Story 2 supporting product to a load-bearing
  mandatory product.** It now carries the cross-chain requirement of Constitution V
  alone if CCTP proves unroutable. §6.3 verification in Phase 0 is therefore as critical
  as §6.4's.
- **User Story 3 is re-scoped**: cross-chain delivery is implemented via Gateway rather
  than a direct CCTP hop. If Gateway alone cannot express the destination-chain delivery,
  User Story 3 is **dropped** rather than faked (Constitution II, IX).
- **The four mandatory products become**: USDC on Arc · Circle Wallets (DCW) · Circle
  Gateway · CCTP *where proven*, with **App Kit / Bridge Kit as the named substitute**
  if CCTP contributes nothing demonstrable. Phase 0 must confirm which fourth product
  is real before implementation begins.
- **R1 is downgraded from a submission risk to a product-feedback asset.** A precise,
  reproducible write-up of the Arc/Bridge-SDK routing gap — domain 26 exists, SDK will
  not route it — is exactly the specific, constructive feedback SC-016 demands, and is
  worth more to the submission than a rushed workaround.
- FR-031 is explicitly **droppable** without failing the submission.

---

## 12. Assumptions

Recorded so they can be challenged rather than silently inherited.

1. **Recipient onboarding is claim-link based.** A Circle wallet is auto-provisioned for
   the recipient; they need no account and install nothing (FR-021). *Rationale*: Persona C.
2. **Both hero journeys share one set of rails.** User Story 2 is an additional surface
   over User Story 1's quote→confirm→transfer→track→receipt engine, not a second
   architecture (Constitution IX).
3. **Authentication is email + one-time code.** Industry-standard, no password reset flow
   to build, no wallet vocabulary.
4. **Demo amounts are denominated in cents.** The Arc faucet dispenses ~1 USDC per address
   per day, so every seeded balance, fixture, and demo transfer is sized accordingly
   (Constitution IX). AED 100 in copy maps to a sub-USDC on-chain amount in the demo.
5. **The AED peg is fixed at 1 USD = 3.6725 AED** and displayed as a peg, not a live quote.
6. **The service fee of AED 0.99 is illustrative** and presented as promotional, not as a
   modelled unit economic.
7. **Comparison baselines are sourced and dated**, never invented (FR-032, §9.3).
8. **The operator treasury is a Developer-Controlled Wallet** funded from the faucet and
   topped up via the reset script.
9. **One environment only** — Arc Testnet. No staging/production split.
10. **Judges evaluate on desktop; users are on mobile.** Both must work; 375px is the
    binding constraint (NFR-016).

---

## 13. Dependencies & Risks

| # | Dependency / Risk | Severity | Mitigation |
|---|-------------------|----------|------------|
| R1 | **CCTP Bridge SDK does not route Arc Testnet** (§6.4) — verified concern | **MEDIUM** *(downgraded by Q2 decision)* | Q2 resolved to Gateway-first. Phase 0 research task #1 still verifies. Outcome becomes *Circle Product Feedback* content (SC-016) rather than a blocker |
| R1b | **Gateway is now load-bearing** — it alone carries Constitution V's cross-chain requirement | **HIGH** *(new, created by Q2 decision)* | Phase 0 research task #2: verify Gateway on Arc Testnet hands-on before building User Story 2's treasury panel. Fallback: App Kit / Bridge Kit as named fourth product |
| R2 | **Faucet limit ~1 USDC/address/day** — demo runs dry | **HIGH** | Cent-scale amounts (Assumption 4); fund early and daily; reset script (FR-029); SC-018 pre-submission check |
| R3 | Gateway testnet availability or behaviour on Arc differs from documentation | MEDIUM | Verify in Phase 0; User Story 2's treasury panel degrades to Arc-only balance with an honest label |
| R4 | Circle API rate limits during live demo | MEDIUM | Cache treasury/balance reads; never rate-limit the hero path; pre-warm before recording |
| R5 | Public FX source unavailable or rate-limited | LOW | Cached last-known rate labelled stale (E7); fixed peg for AED↔USD |
| R6 | **5-day timeline** — scope overrun | **HIGH** | Constitution IX priority order is absolute; User Story 3 and all §4.3 items are droppable without failing the submission |
| R7 | `arc-commerce` base app diverges from current Circle SDK versions | MEDIUM | Pin versions; record provenance (Constitution VI); Phase 0 smoke-run of the sample before building on it |
| R8 | Sub-second finality claim not reproduced under demo conditions | LOW | NFR-001 budgets 15s, not 1s; the running counter shows the honest number whatever it is |

---

## 14. Constitution Compliance

| Gate | Principle | Where satisfied |
|------|-----------|-----------------|
| 1 | I — Arc Testnet only, hard assert | FR-013, FR-027, NFR-015, E8 |
| 2 | II — Real flows, simulated labelled | FR-012, FR-017, NFR-008, SC-011, §9.3 |
| 3 | III — Radical transparency | FR-008–FR-011, §7.4, §7.5, NFR-006–NFR-009 |
| 4 | IV — Consumer-grade, non-crypto UX | FR-001–FR-003, FR-022, NFR-016–NFR-021, SC-007, SC-012 |
| 5 | V — 4+ Circle products, mapped | §6.1–§6.5, FR-044, SC-008 |
| 6 | VI — Extend `arc-commerce`, record provenance | R7; enforced at `/sp.plan` |
| 7 | VII — Secrets discipline | FR-028, NFR-010–NFR-012, SC-010 |
| 8 | VIII — Judge-runnable in 10 minutes | FR-037, SC-001, SC-014, SC-016 |
| 9 | IX — Demo-path integrity | FR-029, NFR-024, SC-017, SC-018, R2, R6, §3 priority order |
