"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Transfer history (FR-033) with a one-tap repeat (FR-007).
 *
 * Tapping a past payment pre-fills the same recipient and amount, which is what
 * makes the monthly-remitter journey three taps rather than a fresh form.
 */

interface HistoryItem {
  id: string;
  state: string;
  stateLabel: string;
  sendAed: string | null;
  createdAt: string;
  explorerUrl: string | null;
  recipient: { id: string; name: string; flag: string; country: string } | null;
  landed: { amount: string; currency: string; symbol: string } | null;
}

export function History({
  onRepeat,
}: {
  onRepeat: (recipientId: string, aed: string) => void;
}) {
  const [items, setItems] = useState<HistoryItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/transfers");
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setItems(json.transfers ?? []);
      } catch {
        /* history is not critical — stay quiet rather than alarm the user */
      }
    })();
    return () => {
      cancelled = true;
    };
    // Sending navigates away to the transfer page, so this component
    // remounts on the way back and re-fetches. It has no other trigger.
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Recent payments
      </h2>
      <ul className="space-y-2">
        {items.slice(0, 6).map((t) => {
          const delivered = t.state === "DELIVERED";
          const failed = t.state === "FAILED";
          return (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2.5"
            >
              <span className="text-lg" aria-hidden>
                {t.recipient?.flag ?? "🌍"}
              </span>

              <Link href={`/transfers/${t.id}`} className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {t.recipient?.name ?? "Unknown"}
                </span>
                <span className="block text-[11px] text-slate-500">
                  {new Date(t.createdAt).toLocaleDateString()} ·{" "}
                  <span
                    className={
                      delivered
                        ? "text-emerald-400"
                        : failed
                          ? "text-red-400"
                          : "text-amber-400"
                    }
                  >
                    {delivered ? "Delivered" : failed ? "Failed" : t.stateLabel}
                  </span>
                </span>
              </Link>

              <span className="text-right">
                <span className="block text-sm font-semibold tabular-nums">
                  AED {t.sendAed}
                </span>
                {t.landed && (
                  <span className="block text-[11px] tabular-nums text-slate-500">
                    {t.landed.symbol}
                    {Number(t.landed.amount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                )}
              </span>

              {t.recipient && t.sendAed && (
                <button
                  onClick={() => onRepeat(t.recipient!.id, t.sendAed!)}
                  title={`Send AED ${t.sendAed} to ${t.recipient.name} again`}
                  className="shrink-0 rounded-lg border border-slate-700 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 transition hover:border-emerald-400/60 hover:text-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  Again
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
