# Demo Video Script — Aurum Rails

**Ignyte × Circle × Arc — Track 1: Cross-Border Payments & Remittances (UAE → Global)**

**Target length**: 2 min 40 s · **Format**: 1280×720 screen capture + voiceover
**Recorded footage**: `demo-video/*.webm` (silent) — narrate over it

---

## Before you record

- [ ] Treasury has **≥ 5 USDC** — check `/business`, top up at [faucet.circle.com](https://faucet.circle.com) (Arc Testnet, 20 USDC per address per 2 h)
- [ ] `npm run dev` running, app loads at `localhost:3000`
- [ ] **No secrets on screen** — close terminals, editors, `.env.local`, browser devtools
- [ ] Browser zoom 100 %, notifications silenced
- [ ] Read the script aloud once first — pace matters more than perfection

**Tone**: calm, factual, unhurried. You are showing something that works, not selling. Let the product carry it. Do not rush the settlement moment — the silence while it lands is the most persuasive part of the video.

---

## Section 1 — The problem (0:00 – 0:22)

**On screen**: sign-in page, then the home screen after "Try the demo".

**On-screen text**: `UAE → Global · Arc Testnet`

> "The UAE sends about forty-three billion dollars home every year — the third largest remittance flow in the world.
>
> Here is what most demos get wrong. UAE remittances are not expensive. The World Bank puts the average cost of sending two hundred dollars from the UAE at under three and a half percent — well below the global average. Exchange houses advertise fifteen dirhams flat.
>
> So we are not going to claim we are cheaper. The real problem is that the fee you are shown is not the cost you pay. The rest is hidden in the exchange rate, and once you have paid, nobody can tell you where your money is."

**Delivery note**: this paragraph is the single most important thing in the video. It tells a judge you researched the corridor instead of assuming it. Say it slowly.

---

## Section 2 — Transparent quote (0:22 – 1:00)

**On screen**: type `5` into the amount field. The disclosure panel renders.

**On-screen text**: `Every cost, before you commit`

> "This is Rajesh, a site supervisor in Dubai, sending money to his mother in Kochi.
>
> He types an amount, and before he can press send, he sees everything.
>
> The fee, split into what the network costs and what we charge. The exchange rate, with its source and the exact time we fetched it. And the foreign exchange spread — displayed at zero point zero zero percent.
>
> We show that zero deliberately. A line item that only appears when it is non-zero is not transparency. Showing the zero is what proves the line is real.
>
> He sees exactly what his mother receives, and he sees that the local currency payout is simulated — labelled, in the product, not buried in a footnote.
>
> The rate is held for sixty seconds. When it expires, the transfer is blocked until he refreshes. A stale rate is never executed."

**Delivery note**: pause for a beat on "zero point zero zero percent". Let the viewer read it.

---

## Section 3 — Settlement (1:00 – 1:32)

**On screen**: click Send. The live timeline advances. The elapsed counter runs.

**On-screen text**: `Real USDC on Arc Testnet · chain 5042002`

> "He presses send once.
>
> Payment started. Sending on Arc. Settled. Delivered."

**[Now stop talking. Let three or four seconds of silence pass while the counter lands.]**

> "Under eight seconds, end to end. No page refresh — the status is a persisted, append-only event log, not a spinner.
>
> And this is a real USDC transfer on Arc Testnet. Not a mock, not a simulation."

**Delivery note**: the silence is intentional. Speaking over the settlement moment wastes it.

---

## Section 4 — Public proof (1:32 – 1:52)

**On screen**: click "View on Arc explorer". The transaction loads on `testnet.arcscan.app`.

**On-screen text**: `Verify it yourself`

> "Every payment carries a link to the public explorer.
>
> There is the transaction. Confirmed on chain in about half a second — Arc's sub-second finality is real, and the wall-clock difference is our own polling, not the network.
>
> The amount on the explorer is the amount on the screen. We deliberately refused a display scale factor: if the interface said one hundred dirhams while a fraction of a dollar moved on chain, the number the user sees would not be the number that settled. Small real amounts, perfectly reconcilable."

---

## Section 5 — The recipient (1:52 – 2:08)

**On screen**: the claim link view.

**On-screen text**: `No app. No sign-up. No wallet.`

> "This is what his mother sees.
>
> She opens a link. She sees who sent it, how much arrived, and when. No account, no app, no wallet, and not one word of crypto vocabulary anywhere on the page.
>
> That constraint is enforced by an automated check in the build — user-facing copy is scanned, and a banned term fails the build."

---

## Section 6 — Business & cross-chain (2:08 – 2:32)

**On screen**: `/business` — treasury panel, then select three contractors.

**On-screen text**: `Freelancer & contractor payouts`

> "The same rails serve a UAE business paying contractors abroad. One authorisation, several people, each settled independently — one failure never blocks the rest.
>
> The treasury panel is worth a moment. It reads Arc only, not a unified cross-chain balance, because Circle Gateway reports funds deposited into its wallet contract and we have not made that deposit. We could have shown a bigger number. We show the true one and say why.
>
> And when a contractor is paid on another network, the payment bridges through CCTP — Arc to Base Sepolia, verified end to end, with a transaction hash on each side."

**Delivery note**: the Gateway honesty line is a scoring moment. Do not skip it and do not apologise for it.

---

## Section 7 — Close (2:32 – 2:45)

**On screen**: mobile view at 390 px.

**On-screen text**: `Aurum Rails · github.com/<user>/aurum-rails-uae-remittance`

> "Mobile-first, because the person sending money home is holding a phone, not a laptop.
>
> Four Circle products doing real work: USDC on Arc, Developer-Controlled Wallets, Gateway, and CCTP.
>
> Aurum Rails. Not cheaper than the exchange house — but you can see exactly what happens to your money, and it arrives while you are still looking at the screen.
>
> Thank you."

---

## Recording checklist

| Step | Tool |
|---|---|
| Screen capture | OBS Studio (free) or Windows `Win + G` |
| Voiceover | Record with the screen capture, or separately and sync in the editor |
| Editing | CapCut, DaVinci Resolve (free), or Clipchamp |
| On-screen text | Add the captions above as lower-thirds — they carry the video if watched muted |
| Export | 1080p, MP4, under 100 MB |
| Upload | YouTube **unlisted** or Loom → paste the link into the submission form |

**If you would rather not narrate live**: record the screen silently, then read the script into your phone, and lay the audio over it in the editor. The pacing is easier to control that way.

---

## Word count and timing

| Section | Words | At ~140 wpm |
|---|---:|---:|
| 1 — Problem | 118 | 0:22 |
| 2 — Quote | 172 | 0:38 |
| 3 — Settlement | 78 | 0:32 (incl. pause) |
| 4 — Proof | 108 | 0:20 |
| 5 — Recipient | 84 | 0:16 |
| 6 — Business | 122 | 0:24 |
| 7 — Close | 76 | 0:13 |
| **Total** | **758** | **≈ 2:45** |

If you run long, cut Section 6's first paragraph — the batch payout is visible without narration. **Do not cut Section 1** (it is the differentiator) or the silence in Section 3.
