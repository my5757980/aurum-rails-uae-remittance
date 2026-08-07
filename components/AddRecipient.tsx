"use client";

import { useState } from "react";
import { CORRIDOR_LIST } from "@/lib/corridors";

/**
 * Add someone to send to (FR-005).
 *
 * A wallet is provisioned for them behind the scenes — the persona never learns
 * that one exists. Duplicates are surfaced as a merge prompt, not a silent
 * second entry (FR-006).
 */
export function AddRecipient({ onAdded }: { onAdded: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("IN");
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, corridorCode: country, contactHandle: handle }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message ?? "Couldn't add them.");
        // A duplicate is a usable outcome: select who they already have.
        if (json.existingId) {
          onAdded(json.existingId);
          setOpen(false);
        }
        return;
      }
      onAdded(json.id);
      setOpen(false);
      setName("");
      setHandle("");
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-dashed border-slate-700 px-4 py-3 text-sm text-slate-400 transition hover:border-slate-600 hover:text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
      >
        + Add someone new
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
      <h3 className="mb-3 text-sm font-semibold">Add someone new</h3>

      <label className="mb-1 block text-xs text-slate-500" htmlFor="r-name">
        Their name
      </label>
      <input
        id="r-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Fatima Khan"
        className="mb-3 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-400/60"
      />

      <label className="mb-1 block text-xs text-slate-500" htmlFor="r-country">
        Country
      </label>
      <select
        id="r-country"
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        className="mb-3 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-400/60"
      >
        {CORRIDOR_LIST.map((c) => (
          <option key={c.code} value={c.code}>
            {c.country} ({c.currency})
          </option>
        ))}
      </select>

      <label className="mb-1 block text-xs text-slate-500" htmlFor="r-handle">
        Phone number <span className="text-slate-600">(optional)</span>
      </label>
      <input
        id="r-handle"
        value={handle}
        onChange={(e) => setHandle(e.target.value)}
        placeholder="+91 98765 43210"
        className="mb-3 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-400/60"
      />

      {error && (
        <p className="mb-3 rounded-lg bg-amber-500/10 p-2 text-xs text-amber-200">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={busy || name.trim().length < 2}
          className="flex-1 rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
        >
          {busy ? "Setting up…" : "Add"}
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="rounded-lg border border-slate-800 px-4 py-2.5 text-sm text-slate-400 transition hover:border-slate-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
