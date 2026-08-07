# Circle Product Feedback — raw notes

Working notes captured while building, with the reproducible detail that the
polished README section summarises. Recorded as they happened, including the
cases where our own assumption was the thing that was wrong.

---

## ✅ T006 — Arc Testnet **is** bridgeable via App Kit / CCTP v2

**Date**: 2026-08-07 · **Result**: SUCCESS · **Risk R1 CLOSED**

```
Arc_Testnet → Base_Sepolia   0.05 USDC   transferSpeed: FAST
state    : success
elapsed  : 35.2s
step 1   approve            0xb183a081d1749979954011ca92b26cd2c56d6dc4d58b510efd7cabc36d9ec8c6
step 2   burn               0xcc42e7554576438fd16274037ea93d4955d0407faa78f1d273d7fe8a69b3cadf
step 3   fetchAttestation   (no hash)
step 4   mint               0xf185ce3bce14e24b48c37853a5c61ebc939f08c23ba3bd4ad0e1bd0106d28275
```

**Why this matters**: `spec.md` §6.4 recorded a HIGH risk from third-party
reporting that the Bridge SDK "does not accept Arc Testnet as a source or
destination". That reporting is **wrong**. Circle's own `circlefin/skills →
bridge-stablecoin` was right, and the `arc-commerce` sample already ships an
`ARC-TESTNET → Arc_Testnet` mapping in `lib/chains.ts`.

**The correction we owe ourselves**: we nearly designed around a limitation that
did not exist, on the strength of a secondary source. First-party docs won.

### Feedback: FAST mode took 35.2s, not the documented 8–20s

`bridge-stablecoin` states Fast mode "completes in ~8-20 seconds". Our measured
run took **35.2 s** end to end on Arc → Base Sepolia. Not a failure, but the
documented range sets an expectation a UI will be built around — ours quotes an
arrival estimate to the user. A stated p50/p95, or a note that Arc is newer and
may sit outside the range, would help.

---

## ⚠️ T005 — Gateway returned no balance for a wallet holding USDC on Arc

**Date**: 2026-08-07 · **Result**: no balance · **Expected, but easy to misread**

`POST https://gateway-api-testnet.circle.com/v1/balances` with
`{ token: "USDC", depositor: <our Arc wallet address> }` returned nothing usable
for a wallet holding 20 USDC on Arc Testnet.

**This is correct behaviour, not a bug.** Gateway reports balances *deposited
into the Gateway Wallet contract*, not USDC held directly in a wallet. We had
not made that deposit.

**Feedback**: the distinction between "USDC I hold" and "USDC I have deposited
into Gateway" is the single most important concept for a newcomer, and it is
easy to miss. An empty response is indistinguishable from "Gateway is not
available on this chain" — which is exactly the wrong conclusion to draw, and
the one we nearly drew. A response that distinguished *no deposits* from
*unsupported chain* would remove the ambiguity entirely.

**What we did instead of guessing**: `lib/treasury.ts` falls back to real Arc
balances and the UI labels the source **"ARC ONLY"** with a plain sentence
saying it is not a unified cross-chain view. Constitution II — better a smaller
true number than a bigger invented one.

---

## SDK friction, in the order we hit it

### 1. `createTransaction` takes `amount` (singular) as a string **array**

```ts
await sdk.createTransaction({ ..., amount: ["0.01"] });   // correct
await sdk.createTransaction({ ..., amounts: ["0.01"] });  // what we wrote first
```

TypeScript caught it before a credentialed call, which was a genuine save. The
singular name for an array field is still a trap.

### 2. `registerEntitySecretCiphertext({ recoveryFileDownloadPath })` wants a directory

Passing a filename fails with `Invalid Directory`. The parameter name reads like
a file path.

### 3. "The secret for this entity has already been set" is accurate but not actionable

The entity secret is **account-scoped**, not project-scoped. Arriving from a
second project with a fresh API key, this error does not say the one thing you
need to hear: *reuse your existing entity secret — it works with any API key on
this account.*

This cost us the most time of anything in the build, and it is a one-line docs fix.

### 4. `listWallets` does not guarantee ordering

We took `wallets[0]` as the sender. The order changed between runs, so the
address we had funded silently became the *recipient* and the balance read zero.
Later, adding a recipient minted a new wallet that sorted ahead of the funded
one and dropped the treasury balance to zero in the UI.

Both were our bugs. But an explicit "ordering is not stable" note, or a sort
parameter, would have prevented both.

---

## `arc-commerce` sample

### 5. It does not typecheck on a clean clone

```
components/ui/checkbox.tsx  → Cannot find module '@radix-ui/react-checkbox'
components/ui/command.tsx   → Cannot find module 'cmdk'
components/ui/form.tsx      → Cannot find module 'react-hook-form'
```

Committed files import packages absent from `package.json`. A CI typecheck on
the sample would catch this.

### 6. The sample uses floating-point money

`lib/utils/convert-to-smallest-unit.ts`:

```ts
const amountInSmallestUnit = parseFloat(amount) * multiplier;
```

and `amount_usdc` moves through the API as a JS `number` into a `numeric(18,6)`
column. For 6-decimal USDC at small amounts this mostly survives, and it fails
above `Number.MAX_SAFE_INTEGER`. For a *payments* sample this is a pattern
developers will copy. `bigint` minor units would set a much better example.

### 7. The sample's payment model inverts DCW's own value proposition

`arc-commerce` initiates payment from a **browser wallet** (wagmi/WalletConnect)
and uses the Circle wallet only to receive. But the entire pitch of
Developer-Controlled Wallets — no seed phrase, no extension, no key management —
argues for **server-initiated** transfers.

We had to replace the whole payment-initiation path to build a product for a
non-crypto-native persona. A sample showing DCW → DCW would be far more
representative of what DCW is actually for.

---

## Arc

### 8. ⚠️ The dual-interface decimal model needs a much louder warning

Arc exposes **one pool of funds** through two interfaces:

- native view — **18 decimals** — gas, `msg.value`
- ERC-20 view — **6 decimals** — balances, transfers, display
- `1e18 native == 1e6 ERC-20`

This is documented in roughly one sentence in `use-arc`. Mixing the two is a
**silent 10¹² error in a payment path** — the worst class of bug a money product
can have, and completely invisible in testing at small amounts.

It deserves a prominent callout in the Arc quickstart, and ideally SDK-level
types that make the two views non-interchangeable. We defended against it with
branded TypeScript types (`lib/money.ts`), verified by `@ts-expect-error`
assertions, but every team will have to reinvent that.

### 9. The faucet limit is widely misreported

Third-party sources claim ~1 USDC/day. The faucet itself gives **20 USDC per
address every 2 hours**. We designed an entire cent-denominated demo strategy
around the wrong number before checking the source.

Not Circle's fault — but a prominent, quotable statement of the limit on the
Arc docs would stop the misinformation propagating.

### 10. Sub-second finality is real, and worth advertising harder

The explorer reported **"Confirmed within ≤ 0.51 secs"** on our first transfer.
Our measured 3.6 s wall-clock was Circle API polling overhead, not chain time.
For a remittance product, "arrives while you are still looking at the screen" is
the single most compelling property of the chain — and it is genuinely true.
