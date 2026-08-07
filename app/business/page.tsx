"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SimulatedBadge } from "@/components/SimulatedBadge";

/**
 * Business payout surface (User Story 2).
 *
 * Same account, different view. Layla pays several contractors in one
 * authorisation and watches them settle independently.
 */

interface Payee {
  id: string;
  name: string;
  country: string;
  flag: string;
  currency: string;
  currencySymbol: string;
}

interface Treasury {
  unified: string;
  perChain: { domain: number; chain: string; usdc: string }[];
  source: "gateway" | "arc-only";
  gatewayNote: string | null;
  isLow: boolean;
}

interface RunItem {
  recipientId: string;
  recipient: Payee | null;
  invoiceRef: string | null;
  ok: boolean;
  error: string | null;
  transfer: { id: string; state: string; stateLabel: string; explorerUrl: string | null } | null;
}

interface Run {
  id: string;
  state: string;
  total: number;
  succeeded: number;
  items: RunItem[];
}

export default function BusinessPage() {
  const [payees, setPayees] = useState<Payee[] | null>(null);
  const [treasury, setTreasury] = useState<Treasury | null>(null);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [invoices, setInvoices] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState<Run | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [r, t] = await Promise.all([
          fetch("/api/recipients").then((x) => x.json()),
          fetch("/api/treasury").then((x) => x.json()),
        ]);
        setPayees(r.recipients ?? []);
        if (!t.code) setTreasury(t);
      } catch {
        setError("Couldn't load the payout screen.");
      }
    })();
  }, []);

  const toggle = useCallback((id: string) => {
    setSelected((s) => {
      const next = { ...s };
      if (next[id] !== undefined) delete next[id];
      else next[id] = "5";
      return next;
    });
  }, []);

  const chosen = Object.keys(selected);
  const totalAed = chosen.reduce((sum, id) => sum + (Number(selected[id]) || 0), 0);
  const feeAed = chosen.length * 0.99;

  async function execute() {
    if (!chosen.length || running) return;
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/payout-runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          items: chosen.map((id) => ({
            recipientId: id,
            sendAed: selected[id],
            invoiceRef: invoices[id] || undefined,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message ?? "The run couldn't start.");
        return;
      }
      setRun(json);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6">
      <header className="mb-6">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Pay your team</h1>
          <Link href="/" className="text-xs text-emerald-400 hover:underline">
            ← Personal
          </Link>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Pay several contractors at once. Each is paid independently — one failure
          never stops the rest.
        </p>
      </header>

      {/* Treasury — FR-026 */}
      {treasury && (
        <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Treasury
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                treasury.source === "gateway"
                  ? "bg-emerald-400/10 text-emerald-300"
                  : "bg-slate-700/40 text-slate-400"
              }`}
            >
              {treasury.source === "gateway" ? "Circle Gateway" : "Arc only"}
            </span>
          </div>

          <p className="mt-2 font-mono text-2xl font-bold tabular-nums">
            {treasury.unified} USDC
          </p>

          <ul className="mt-3 space-y-1">
            {treasury.perChain.map((c) => (
              <li
                key={`${c.domain}-${c.chain}`}
                className="flex justify-between text-xs text-slate-500"
              >
                <span>
                  {c.chain}{" "}
                  <span className="text-slate-700">· domain {c.domain}</span>
                </span>
                <span className="tabular-nums">{c.usdc} USDC</span>
              </li>
            ))}
          </ul>

          {treasury.gatewayNote && (
            <p className="mt-3 border-t border-slate-800 pt-2 text-[11px] leading-relaxed text-slate-500">
              {treasury.gatewayNote}
            </p>
          )}

          {chosen.length > 0 && (
            <p
              className={`mt-3 text-xs ${
                totalAed / 3.6725 <= Number(treasury.unified)
                  ? "text-emerald-400"
                  : "text-amber-400"
              }`}
            >
              {totalAed / 3.6725 <= Number(treasury.unified)
                ? `✓ Covered — this run needs about ${(totalAed / 3.6725).toFixed(2)} USDC`
                : `⚠ Short — this run needs about ${(totalAed / 3.6725).toFixed(2)} USDC`}
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Results */}
      {run ? (
        <section>
          <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="text-sm font-semibold">
              {run.state === "COMPLETED"
                ? "All payments sent ✓"
                : run.state === "PARTIALLY_FAILED"
                  ? "Partly sent"
                  : "Run failed"}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {run.succeeded} of {run.total} paid successfully.
            </p>
          </div>

          <ul className="space-y-2">
            {run.items.map((it, i) => (
              <li
                key={`${it.recipientId}-${i}`}
                className={`rounded-xl border p-3 ${
                  it.ok
                    ? "border-emerald-400/30 bg-emerald-400/5"
                    : "border-red-500/30 bg-red-500/5"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {it.recipient?.flag} {it.recipient?.name ?? it.recipientId}
                    </span>
                    {it.invoiceRef && (
                      <span className="block text-[11px] text-slate-500">
                        Invoice {it.invoiceRef}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-right">
                    {it.ok ? (
                      <>
                        <span className="block text-xs text-emerald-400">
                          {it.transfer?.stateLabel}
                        </span>
                        {it.transfer && (
                          <Link
                            href={`/transfers/${it.transfer.id}`}
                            className="text-[11px] text-slate-400 hover:underline"
                          >
                            View →
                          </Link>
                        )}
                      </>
                    ) : (
                      <span className="block max-w-[16rem] text-xs text-red-300">
                        {it.error}
                      </span>
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <button
            onClick={() => {
              setRun(null);
              setSelected({});
            }}
            className="mt-4 w-full rounded-xl bg-slate-800 py-3 text-sm font-medium transition hover:bg-slate-700"
          >
            New payout run
          </button>
        </section>
      ) : (
        <>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Who are you paying?
          </h2>

          {!payees ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-900" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {payees.map((p) => {
                const on = selected[p.id] !== undefined;
                return (
                  <div
                    key={p.id}
                    className={`rounded-xl border px-3 py-2.5 transition ${
                      on
                        ? "border-emerald-400/50 bg-emerald-400/5"
                        : "border-slate-800 bg-slate-900/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggle(p.id)}
                        aria-label={`Pay ${p.name}`}
                        className="h-4 w-4 accent-emerald-500"
                      />
                      <span className="text-lg" aria-hidden>
                        {p.flag}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{p.name}</span>
                        <span className="block text-[11px] text-slate-500">
                          {p.country} · {p.currency}
                        </span>
                      </span>

                      {on && (
                        <span className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-500">AED</span>
                          <input
                            inputMode="decimal"
                            value={selected[p.id]}
                            onChange={(e) =>
                              setSelected((s) => ({
                                ...s,
                                [p.id]: e.target.value.replace(/[^\d.]/g, ""),
                              }))
                            }
                            className="w-16 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-emerald-400/60"
                          />
                        </span>
                      )}
                    </div>

                    {on && (
                      <input
                        value={invoices[p.id] ?? ""}
                        onChange={(e) =>
                          setInvoices((v) => ({ ...v, [p.id]: e.target.value }))
                        }
                        placeholder="Invoice reference (optional)"
                        className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs outline-none focus:border-emerald-400/60"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {chosen.length > 0 && (
            <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">
                  {chosen.length} {chosen.length === 1 ? "person" : "people"}
                </span>
                <span className="font-semibold tabular-nums">
                  AED {totalAed.toFixed(2)}
                </span>
              </div>
              <div className="mt-1 flex justify-between text-sm">
                <span className="text-slate-400">Total fees</span>
                <span className="tabular-nums text-slate-300">AED {feeAed.toFixed(2)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-slate-800 pt-2 text-sm">
                <span className="font-medium">Total cost</span>
                <span className="font-bold tabular-nums">
                  AED {(totalAed + feeAed).toFixed(2)}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Each contractor receives their local currency
                <SimulatedBadge />
              </p>
            </div>
          )}

          <button
            onClick={execute}
            disabled={!chosen.length || running}
            className="mt-5 w-full rounded-xl bg-emerald-500 py-4 font-semibold text-emerald-950 transition hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
          >
            {running
              ? `Paying ${chosen.length}…`
              : chosen.length
                ? `Pay ${chosen.length} ${chosen.length === 1 ? "person" : "people"}`
                : "Choose who to pay"}
          </button>
        </>
      )}
    </div>
  );
}
