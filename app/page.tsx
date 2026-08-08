"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SimulatedBadge } from "@/components/SimulatedBadge";
import { SidePanel } from "@/components/SidePanel";
import { AddRecipient } from "@/components/AddRecipient";
import { History } from "@/components/History";

interface Recipient {
  id: string;
  name: string;
  country: string;
  flag: string;
  currency: string;
  currencySymbol: string;
  contactHandle: string;
}

interface Quote {
  id: string;
  sendAed: string;
  sendUsdc6: string;
  fees: {
    network: string;
    service: string;
    total: string;
    totalAed: string;
    totalUsd: string;
    networkUsd: string;
    serviceUsd: string;
    spreadBps: number;
  };
  rate: { pair: string; source: string; retrievedAt: string; isStale: boolean };
  landed: { amount: string; currency: string; symbol: string; isSimulated: boolean };
  etaSeconds: number;
  expiresAt: string;
}

const AMOUNT_PRESETS = ["5", "10", "20"];

export default function SendPage() {
  const router = useRouter();

  const [recipients, setRecipients] = useState<Recipient[] | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [lowBalance, setLowBalance] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Recipient | null>(null);
  const [amount, setAmount] = useState("5");

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadRecipients = useCallback(async (selectId?: string) => {
    try {
      const res = await fetch("/api/recipients");
      const json = await res.json();
      if (!res.ok) {
        setLoadError(json.message ?? "Couldn't load your contacts.");
        return;
      }
      setRecipients(json.recipients);
      setBalance(json.balanceUsdc);
      setLowBalance(json.lowBalance);
      setSelected((current) => {
        if (selectId) {
          return json.recipients?.find((r: Recipient) => r.id === selectId) ?? current;
        }
        return current ?? json.recipients?.[0] ?? null;
      });
    } catch {
      setLoadError("Couldn't reach the server.");
    }
  }, []);

  useEffect(() => {
    void loadRecipients();
  }, [loadRecipients]);

  /** FR-007 — repeat a past payment in one tap. */
  const repeat = useCallback(
    (recipientId: string, aed: string) => {
      setRecipients((rs) => {
        const found = rs?.find((r) => r.id === recipientId);
        if (found) setSelected(found);
        return rs;
      });
      setAmount(aed);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [],
  );

  // FR-008: full disclosure must exist before confirm is enabled.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const requestQuote = useCallback(async (recipientId: string, sendAed: string) => {
    setQuoting(true);
    setQuoteError(null);
    setSendError(null);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId, sendAed }),
      });
      const json = await res.json();
      if (!res.ok) {
        setQuote(null);
        setQuoteError(json.message ?? "Couldn't price that.");
        return;
      }
      setQuote(json);
    } catch {
      setQuote(null);
      setQuoteError("Couldn't reach the server.");
    } finally {
      setQuoting(false);
    }
  }, []);

  useEffect(() => {
    if (!selected || !amount) {
      setQuote(null);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => requestQuote(selected.id, amount), 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [selected, amount, requestQuote]);

  // FR-010: an expired quote can never be executed.
  useEffect(() => {
    if (!quote) return;
    const tick = () => {
      const ms = new Date(quote.expiresAt).getTime() - Date.now();
      setSecondsLeft(Math.max(0, Math.ceil(ms / 1000)));
    };
    tick();
    const i = setInterval(tick, 250);
    return () => clearInterval(i);
  }, [quote]);

  const expired = Boolean(quote) && secondsLeft <= 0;
  const canSend = Boolean(quote) && !expired && !quoting && !sending;

  async function handleSend() {
    if (!quote || !canSend) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // FR-014 — exactly-once, even on a double tap.
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ quoteId: quote.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSendError(json.message ?? "We couldn't start this payment.");
        setSending(false);
        return;
      }
      router.push(`/transfers/${json.id}`);
    } catch {
      setSendError("Couldn't reach the server.");
      setSending(false);
    }
  }

  if (loadError) {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <h2 className="font-semibold text-red-200">Setup needed</h2>
          <p className="mt-1 text-sm text-red-200/80">{loadError}</p>
          <p className="mt-3 text-xs text-red-200/60">
            Fill in <code className="rounded bg-black/30 px-1">.env.local</code>, then run{" "}
            <code className="rounded bg-black/30 px-1">npm run spike:send</code>.
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 pb-16 pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:gap-14 lg:pt-12">
      <SidePanel />

      <main className="w-full lg:max-w-md">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight lg:text-xl">Send money home</h1>
        <p className="mt-1 text-sm text-slate-400">
          From the UAE. See every fee before you send. Arrives in seconds.
        </p>
      </header>

      {balance !== null && (
        <div
          className={`mb-5 flex items-center justify-between rounded-xl border px-4 py-3 ${
            lowBalance
              ? "border-amber-500/40 bg-amber-500/10"
              : "border-slate-800 bg-slate-900/60"
          }`}
        >
          <span className="text-xs text-slate-400">Demo balance</span>
          <span className="font-mono text-sm font-semibold">
            {balance} USDC
            {lowBalance && (
              <span className="ml-2 text-[11px] font-normal text-amber-300">
                low — top up from the faucet
              </span>
            )}
          </span>
        </div>
      )}

      <section className="mb-5">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Who are you sending to?
        </h2>
        {!recipients ? (
          <div className="space-y-2" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-900" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {recipients.map((r) => {
              const active = selected?.id === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  aria-pressed={active}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                    active
                      ? "border-emerald-400/60 bg-emerald-400/10"
                      : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                  }`}
                >
                  <span className="text-2xl" aria-hidden>
                    {r.flag}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{r.name}</span>
                    <span className="block truncate text-xs text-slate-400">
                      {r.country} · {r.contactHandle}
                    </span>
                  </span>
                  {active && <span className="text-emerald-400">✓</span>}
                </button>
              );
            })}
            <AddRecipient onAdded={(id) => void loadRecipients(id)} />
          </div>
        )}
      </section>

      <section className="mb-5">
        <label
          htmlFor="amount"
          className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
        >
          How much?
        </label>
        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 focus-within:border-emerald-400/60">
          <span className="text-sm font-semibold text-slate-400">AED</span>
          <input
            id="amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            className="w-full bg-transparent text-2xl font-semibold tabular-nums outline-none"
            placeholder="0.00"
          />
        </div>
        <div className="mt-2 flex gap-2">
          {AMOUNT_PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setAmount(p)}
              className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              AED {p}
            </button>
          ))}
        </div>
      </section>

      {/* Disclosure panel — spec §7.4 */}
      <section aria-live="polite" className="mb-5">
        {quoting && !quote && <div className="h-52 animate-pulse rounded-xl bg-slate-900" />}

        {quoteError && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
            {quoteError}
          </div>
        )}

        {quote && !quoteError && (
          <div
            className={`rounded-xl border bg-slate-900/60 p-4 transition ${
              expired ? "border-amber-500/50 opacity-70" : "border-slate-800"
            }`}
          >
            <Row label="You send" value={`AED ${quote.sendAed}`} strong />

            <div className="my-3 border-t border-slate-800" />

            {/* FR-009 — every fee in BOTH AED and USD. */}
            <Row
              label="Our fee"
              value={`AED ${quote.fees.totalAed}  ·  USD ${quote.fees.totalUsd}`}
            />
            <Row
              label="Network cost (Arc)"
              // A real cost below one cent. "USD 0.00" would read as free, which
              // it is not — say "less than a cent" rather than round it away.
              value={
                quote.fees.networkUsd === "0.00"
                  ? "under USD 0.01"
                  : `USD ${quote.fees.networkUsd}`
              }
              indent
              muted
            />
            <Row
              label="Service fee"
              value={`USD ${quote.fees.serviceUsd}`}
              indent
              muted
            />

            <div className="my-3 border-t border-slate-800" />

            <Row label="Exchange rate" value={quote.rate.pair} />
            <Row
              label="FX spread"
              value={`${(quote.fees.spreadBps / 100).toFixed(2)}%`}
              indent
              muted
              highlight={quote.fees.spreadBps === 0}
            />
            <p className="mt-1 pl-3 text-[11px] leading-relaxed text-slate-500">
              Source: {quote.rate.source}
              {quote.rate.isStale && (
                <span className="ml-1 text-amber-400">(last known rate)</span>
              )}{" "}
              · {new Date(quote.rate.retrievedAt).toLocaleString()}
            </p>

            <div className="my-3 border-t border-slate-800" />

            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm text-slate-400">
                {selected?.name.split(" ")[0]} receives
              </span>
              <span className="text-right">
                <span className="text-lg font-bold tabular-nums">
                  {quote.landed.symbol}
                  {Number(quote.landed.amount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
                {quote.landed.isSimulated && <SimulatedBadge />}
              </span>
            </div>

            <Row label="Arrives in" value={`about ${quote.etaSeconds} seconds`} />

            <div className="my-3 border-t border-slate-800" />

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Total cost AED {quote.fees.totalAed} · USD {quote.fees.totalUsd}
              </span>
              <span
                className={
                  expired || secondsLeft <= 10
                    ? "font-semibold tabular-nums text-amber-400"
                    : "tabular-nums text-slate-500"
                }
              >
                {expired
                  ? "Rate expired"
                  : `Rate held ${Math.floor(secondsLeft / 60)}:${String(
                      secondsLeft % 60,
                    ).padStart(2, "0")}`}
              </span>
            </div>
          </div>
        )}
      </section>

      {sendError && (
        <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {sendError}
        </div>
      )}

      {expired ? (
        <button
          onClick={() => selected && requestQuote(selected.id, amount)}
          className="w-full rounded-xl bg-amber-500 py-4 font-semibold text-amber-950 transition hover:bg-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          Refresh rate
        </button>
      ) : (
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="w-full rounded-xl bg-emerald-500 py-4 font-semibold text-emerald-950 transition hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
        >
          {sending ? "Sending…" : quote ? `Send AED ${quote.sendAed}` : "Enter an amount"}
        </button>
      )}

      <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-600">
        Settled in USDC on Arc Testnet. Every payment is verifiable on the public explorer.
      </p>

      <History onRepeat={repeat} refreshKey={refreshKey} />
      </main>
    </div>
  );
}

function Row({
  label,
  value,
  indent,
  muted,
  strong,
  highlight,
}: {
  label: string;
  value: string;
  indent?: boolean;
  muted?: boolean;
  strong?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-2 ${indent ? "mt-1 pl-3" : ""} ${
        strong ? "text-base" : "text-sm"
      } ${muted ? "text-slate-500" : "text-slate-300"}`}
    >
      <span className={indent ? "before:mr-1 before:text-slate-700 before:content-['└']" : ""}>
        {label}
      </span>
      <span
        className={`tabular-nums ${strong ? "font-bold text-slate-100" : ""} ${
          highlight ? "font-semibold text-emerald-400" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
