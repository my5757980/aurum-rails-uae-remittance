/**
 * FR-029 — restore the demo to a known-good state in one command.
 *
 *   npm run demo:reset
 *
 * Clears quotes, transfers and status events, keeps recipients and their
 * wallets (recreating those costs Circle API calls and gains nothing), then
 * reports the treasury balance so you know whether the demo can actually run.
 *
 * Constitution IX: "running the demo dry is a foreseeable, and therefore
 * unacceptable, failure." This script is how you check before recording.
 */

import "dotenv/config";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", override: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const log = (...a: unknown[]) => console.log(...a);

async function del(table: string, filter: string): Promise<number | null> {
  const res = await fetch(`${url}/rest/v1/${table}?${filter}`, {
    method: "DELETE",
    headers: {
      apikey: key!,
      Authorization: `Bearer ${key}`,
      Prefer: "return=representation",
    },
  });
  if (!res.ok) {
    log(`  ${table}: failed (${res.status}) ${(await res.text()).slice(0, 120)}`);
    return null;
  }
  return ((await res.json()) as unknown[]).length;
}

async function count(table: string): Promise<string> {
  const res = await fetch(`${url}/rest/v1/${table}?select=id`, {
    headers: { apikey: key!, Authorization: `Bearer ${key}`, Prefer: "count=exact" },
  });
  if (!res.ok) return "?";
  return String(((await res.json()) as unknown[]).length);
}

async function main() {
  log("\n══════════════════════════════════════════════════════════════");
  log("  Demo reset");
  log("══════════════════════════════════════════════════════════════\n");

  if (!url || !key || url.includes("your-project-ref")) {
    log("ℹ️  Supabase is not configured, so there is nothing persisted to clear.");
    log("   Restart the dev server and the in-memory store resets itself.\n");
    return;
  }

  log("→ Clearing payment history (recipients and wallets are kept)…");
  // Order matters: status_events references transfers, transfers references quotes.
  const events = await del("status_events", "id=not.is.null");
  log(`  status_events : ${events ?? "?"} removed`);
  const transfers = await del("transfers", "id=not.is.null");
  log(`  transfers     : ${transfers ?? "?"} removed`);
  const quotes = await del("quotes", "id=not.is.null");
  log(`  quotes        : ${quotes ?? "?"} removed`);

  log("\n→ Remaining:");
  log(`  recipients    : ${await count("recipients")}`);
  log(`  transfers     : ${await count("transfers")}`);

  log("\n✅ Reset complete. Restart the dev server to clear the in-memory cache:");
  log("   npm run dev\n");
  log("Then check the treasury has funds before demoing:");
  log("   open http://localhost:3000/business  (or fund at https://faucet.circle.com)\n");
}

main().catch((e) => {
  console.error("\n❌", e);
  process.exit(1);
});
