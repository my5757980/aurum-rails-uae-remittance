"use client";

import { use, useEffect, useState } from "react";

/**
 * The recipient's view (FR-021, FR-022).
 *
 * No sign-in, no install, no wallet vocabulary. Persona C opens a link on her
 * phone and needs exactly two facts: how much arrived, and when.
 */

interface ClaimDto {
  recipientFirstName: string;
  hasPayment: boolean;
  senderFirstName?: string;
  amount?: string | null;
  currency?: string;
  symbol?: string;
  deliveredAt?: string | null;
  isSimulated?: boolean;
}

export default function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<ClaimDto | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/claim/${token}`);
      if (!res.ok) {
        setNotFound(true);
        return;
      }
      setData(await res.json());
    })();
  }, [token]);

  if (notFound) {
    return (
      <main className="mx-auto flex min-h-[70dvh] max-w-md items-center px-4">
        <p className="w-full text-center text-slate-400">
          This link isn&apos;t valid any more.
        </p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <div className="h-48 animate-pulse rounded-2xl bg-slate-900" />
      </main>
    );
  }

  if (!data.hasPayment) {
    return (
      <main className="mx-auto flex min-h-[70dvh] max-w-md items-center px-4">
        <div className="w-full text-center">
          <p className="text-4xl" aria-hidden>
            📭
          </p>
          <p className="mt-3 text-slate-400">
            Hello {data.recipientFirstName} — nothing has arrived yet.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-10">
      <div className="rounded-2xl border border-emerald-400/30 bg-gradient-to-b from-emerald-400/10 to-transparent p-6 text-center">
        <p className="text-5xl" aria-hidden>
          💰
        </p>

        <p className="mt-4 text-sm text-slate-300">
          {data.senderFirstName} sent you
        </p>

        <p className="mt-2 text-4xl font-bold tabular-nums">
          {data.symbol}
          {Number(data.amount ?? 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
          })}
        </p>
        <p className="mt-1 text-xs text-slate-500">{data.currency}</p>

        {data.deliveredAt && (
          <p className="mt-4 text-sm text-emerald-300">
            Arrived {new Date(data.deliveredAt).toLocaleString()}
          </p>
        )}
      </div>

      <p className="mt-6 text-center text-xs leading-relaxed text-slate-500">
        Hello {data.recipientFirstName} — this money has been sent to you from the UAE.
        You don&apos;t need to sign up or install anything.
      </p>

      {data.isSimulated && (
        <p className="mt-4 rounded-lg bg-slate-900/60 p-3 text-center text-[11px] leading-relaxed text-slate-500">
          Demo note: the local-currency payout shown here is simulated. The underlying
          transfer really did settle on Arc Testnet.
        </p>
      )}
    </main>
  );
}
