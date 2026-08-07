"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { SimulatedBadge } from "@/components/SimulatedBadge";

interface EventDto {
  toState: string;
  label: string;
  occurredAt: string;
  reason: string | null;
}

interface TransferDto {
  id: string;
  state: string;
  stateLabel: string;
  isTerminal: boolean;
  amountUsdc6: string;
  txHash: string | null;
  explorerUrl: string | null;
  destinationTxHash: string | null;
  destinationExplorerUrl: string | null;
  createdAt: string;
  deliveredAt: string | null;
  elapsedMs: number | null;
  events: EventDto[];
  quote: {
    sendAed: string;
    fees: { network: string; service: string; totalAed: string; spreadBps: number };
    rate: { pair: string; source: string; retrievedAt: string };
    landed: { amount: string; symbol: string; currency: string; isSimulated: boolean };
  } | null;
  recipient: { name: string; flag: string; country: string; claimToken: string } | null;
}

const STEPS = [
  { state: "INITIATED", label: "Payment started" },
  { state: "SUBMITTED", label: "Sending on Arc" },
  { state: "SETTLED", label: "Settled on Arc" },
  { state: "DELIVERED", label: "Delivered" },
];

export default function TransferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<TransferDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  // FR-016: status updates with no manual refresh.
  useEffect(() => {
    let stop = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/transfers/${id}`);
        const json = await res.json();
        if (stop) return;
        if (!res.ok) {
          setError(json.message ?? "Couldn't load this payment.");
          return;
        }
        setData(json);
        if (!json.isTerminal) setTimeout(poll, 1200);
      } catch {
        if (!stop) setTimeout(poll, 2000);
      }
    };
    poll();
    return () => {
      stop = true;
    };
  }, [id]);

  useEffect(() => {
    if (data?.isTerminal) return;
    const i = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(i);
  }, [data?.isTerminal]);

  if (error) {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
        <Link href="/" className="mt-4 block text-center text-sm text-emerald-400">
          ← Back
        </Link>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <div className="h-64 animate-pulse rounded-xl bg-slate-900" />
      </main>
    );
  }

  const reached = new Set(data.events.map((e) => e.toState));
  const failed = data.state === "FAILED";
  const delivered = data.state === "DELIVERED";
  const elapsed =
    data.elapsedMs ?? Math.max(0, now - new Date(data.createdAt).getTime());

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6">
      <div className="mb-6 text-center">
        <div className="text-5xl" aria-hidden>
          {failed ? "⚠️" : delivered ? "✅" : "⏳"}
        </div>
        <h1 className="mt-3 text-xl font-bold">
          {failed ? "Couldn't complete" : delivered ? "Delivered" : data.stateLabel}
        </h1>
        {data.quote && data.recipient && (
          <p className="mt-1 text-sm text-slate-400">
            AED {data.quote.sendAed} to {data.recipient.name}
          </p>
        )}
        <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-emerald-400">
          {(elapsed / 1000).toFixed(1)}s
        </p>
      </div>

      {/* Live timeline */}
      <ol className="mb-6 space-y-0" aria-live="polite">
        {STEPS.map((step, i) => {
          const done = reached.has(step.state);
          const active = !done && !failed && i === STEPS.findIndex((s) => !reached.has(s.state));
          const event = data.events.find((e) => e.toState === step.state);
          return (
            <li key={step.state} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                    done
                      ? "border-emerald-400 bg-emerald-400 text-emerald-950"
                      : active
                        ? "animate-pulse border-emerald-400 text-emerald-400"
                        : "border-slate-700 text-slate-700"
                  }`}
                >
                  {done ? "✓" : active ? "•" : ""}
                </span>
                {i < STEPS.length - 1 && (
                  <span
                    className={`h-8 w-px ${done ? "bg-emerald-400/50" : "bg-slate-800"}`}
                  />
                )}
              </div>
              <div className="pb-2">
                <p className={done || active ? "text-sm font-medium" : "text-sm text-slate-600"}>
                  {step.label}
                </p>
                {event && (
                  <p className="text-[11px] tabular-nums text-slate-500">
                    {new Date(event.occurredAt).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {failed && (
        <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4">
          <p className="text-sm text-red-200">
            {data.events.find((e) => e.toState === "FAILED")?.reason ??
              "Something went wrong."}
          </p>
          <Link
            href="/"
            className="mt-3 inline-block rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-100"
          >
            Try again
          </Link>
        </div>
      )}

      {/* Receipt */}
      {data.quote && (
        <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Receipt
          </h2>
          <ReceiptRow label="You sent" value={`AED ${data.quote.sendAed}`} />
          <ReceiptRow
            label={`${data.recipient?.name.split(" ")[0] ?? "They"} received`}
            value={`${data.quote.landed.symbol}${Number(
              data.quote.landed.amount,
            ).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            badge={data.quote.landed.isSimulated}
          />
          <ReceiptRow label="Total fee" value={`AED ${data.quote.fees.totalAed}`} />
          <ReceiptRow label="Rate" value={data.quote.rate.pair} />
          <ReceiptRow
            label="FX spread"
            value={`${(data.quote.fees.spreadBps / 100).toFixed(2)}%`}
          />
          <ReceiptRow
            label="Started"
            value={new Date(data.createdAt).toLocaleString()}
          />
          {data.deliveredAt && (
            <ReceiptRow
              label="Delivered"
              value={new Date(data.deliveredAt).toLocaleString()}
            />
          )}
        </div>
      )}

      {/* FR-017 — public verification */}
      {data.explorerUrl && (
        <a
          href={data.explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-3 block w-full rounded-xl border border-emerald-400/40 bg-emerald-400/10 py-3 text-center text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/20"
        >
          View on Arc explorer ↗
        </a>
      )}

      {/* US3 — the second leg gets its own link, on its own explorer. */}
      {data.destinationExplorerUrl && (
        <a
          href={data.destinationExplorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-3 block w-full rounded-xl border border-sky-400/40 bg-sky-400/10 py-3 text-center text-sm font-semibold text-sky-300 transition hover:bg-sky-400/20"
        >
          View delivery on their network ↗
        </a>
      )}

      {delivered && data.recipient && (
        <Link
          href={`/claim/${data.recipient.claimToken}`}
          className="mb-3 block w-full rounded-xl border border-slate-700 py-3 text-center text-sm font-medium text-slate-300 transition hover:border-slate-600"
        >
          See what {data.recipient.name.split(" ")[0]} sees
        </Link>
      )}

      <Link
        href="/"
        className="block w-full rounded-xl bg-slate-800 py-3 text-center text-sm font-medium transition hover:bg-slate-700"
      >
        Send another
      </Link>

      {/* FR-003 / NFR-017 — the only place technical detail is allowed */}
      <details className="mt-6 text-xs text-slate-500">
        <summary className="cursor-pointer select-none py-2">Technical details</summary>
        <dl className="mt-2 space-y-1 rounded-lg bg-slate-900/60 p-3 font-mono text-[11px] break-all">
          <div>
            <dt className="inline text-slate-600">payment id: </dt>
            <dd className="inline">{data.id}</dd>
          </div>
          <div>
            <dt className="inline text-slate-600">amount: </dt>
            <dd className="inline">{data.amountUsdc6} USDC (6dp)</dd>
          </div>
          <div>
            <dt className="inline text-slate-600">chain id: </dt>
            <dd className="inline">5042002 (Arc Testnet)</dd>
          </div>
          {data.txHash && (
            <div>
              <dt className="inline text-slate-600">tx: </dt>
              <dd className="inline">{data.txHash}</dd>
            </div>
          )}
          <div>
            <dt className="inline text-slate-600">rate source: </dt>
            <dd className="inline">{data.quote?.rate.source}</dd>
          </div>
        </dl>
      </details>
    </main>
  );
}

function ReceiptRow({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-1 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="text-right tabular-nums">
        {value}
        {badge && <SimulatedBadge />}
      </span>
    </div>
  );
}
