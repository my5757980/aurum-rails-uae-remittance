/**
 * Apply SQL migrations to the Supabase Postgres database.
 *
 * Uses a direct Postgres connection rather than the dashboard SQL editor so
 * migrations are reproducible from a clean checkout — a judge should be able to
 * run one command, not click through a web UI.
 *
 *   npm run db:migrate
 *
 * Reads the database password from SUPABASE_DB_PASSWORD, or from the file
 * written by the Supabase setup (kept outside the repo).
 */

import "dotenv/config";
import { config as loadEnv } from "dotenv";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { Client } from "pg";

loadEnv({ path: ".env.local", override: true });

function projectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  const m = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
  if (!m) throw new Error(`Cannot parse project ref from ${url}`);
  return m[1]!;
}

function dbPassword(): string {
  if (process.env.SUPABASE_DB_PASSWORD) return process.env.SUPABASE_DB_PASSWORD;
  const file = join(homedir(), ".circle-aurum-rails", "supabase-db-password.txt");
  if (existsSync(file)) return readFileSync(file, "utf8").trim();
  throw new Error(
    "No database password. Set SUPABASE_DB_PASSWORD, or place it in " + file,
  );
}

async function main() {
  const ref = projectRef();
  const password = dbPassword();

  // Session pooler — reachable where direct 5432 is often blocked or IPv6-only.
  const candidates = [
    { host: `aws-0-ap-southeast-1.pooler.supabase.com`, port: 5432, user: `postgres.${ref}` },
    { host: `aws-1-ap-southeast-1.pooler.supabase.com`, port: 5432, user: `postgres.${ref}` },
    { host: `db.${ref}.supabase.co`, port: 5432, user: "postgres" },
  ];

  let client: Client | null = null;
  let lastError: unknown = null;

  for (const c of candidates) {
    const attempt = new Client({
      host: c.host,
      port: c.port,
      user: c.user,
      password,
      database: "postgres",
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 12_000,
    });
    try {
      process.stdout.write(`→ connecting ${c.host} … `);
      await attempt.connect();
      console.log("ok");
      client = attempt;
      break;
    } catch (e) {
      console.log("failed");
      lastError = e;
      try {
        await attempt.end();
      } catch {
        /* ignore */
      }
    }
  }

  if (!client) {
    console.error("\n❌ Could not connect to Postgres.");
    console.error(lastError instanceof Error ? lastError.message : lastError);
    process.exit(1);
  }

  const dir = join(process.cwd(), "supabase", "migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql") && f.includes("aurum_rails"))
    .sort();

  console.log(`\nApplying ${files.length} migration(s):`);
  for (const f of files) {
    const sql = readFileSync(join(dir, f), "utf8");
    process.stdout.write(`  ${f} … `);
    try {
      await client.query(sql);
      console.log("✓");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/already exists/i.test(msg)) {
        console.log("already applied");
      } else {
        console.log("✗");
        console.error(`\n    ${msg}\n`);
        await client.end();
        process.exit(1);
      }
    }
  }

  const { rows } = await client.query(
    `select table_name from information_schema.tables
     where table_schema='public' order by table_name`,
  );
  console.log(`\n✅ Tables in public: ${rows.map((r) => r.table_name).join(", ")}`);

  await client.end();
}

main().catch((e) => {
  console.error("\n❌", e);
  process.exit(1);
});
