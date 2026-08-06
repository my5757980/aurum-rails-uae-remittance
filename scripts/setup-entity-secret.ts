/**
 * T002 — generate and register the Circle entity secret.
 *
 * The entity secret is the master key for every developer-controlled wallet you
 * own. Circle never stores it in plaintext; you generate it, register an
 * RSA-encrypted ciphertext once, and the SDK produces a fresh ciphertext per
 * request so a captured one cannot be replayed.
 *
 * RUN
 *   npm run setup:entity-secret
 *
 * WHAT IT DOES
 *   1. Generates 32 bytes of hex (unless CIRCLE_ENTITY_SECRET is already real)
 *   2. Registers the ciphertext with Circle
 *   3. Writes the recovery file OUTSIDE this repository (Constitution VII)
 *   4. Prints the line to paste into .env.local
 *
 * The recovery file is the only way to rotate a lost entity secret. It must
 * never live in the repo — `.gitignore` blocks it, but "outside" is the rule.
 *
 * @see specs/001-uae-global-remittance/tasks.md — T002
 */

import "dotenv/config";
import { config as loadEnv } from "dotenv";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { registerEntitySecretCiphertext } from "@circle-fin/developer-controlled-wallets";

loadEnv({ path: ".env.local", override: true });

const PLACEHOLDER = "0".repeat(64);
const log = (...a: unknown[]) => console.log(...a);

async function main() {
  log("\n══════════════════════════════════════════════════════════════");
  log("  T002 — Circle entity secret setup");
  log("══════════════════════════════════════════════════════════════\n");

  const apiKey = process.env.CIRCLE_API_KEY;
  if (!apiKey || apiKey.includes("your-key-id")) {
    log("❌ CIRCLE_API_KEY is not set in .env.local.\n");
    log("   Your new key is already on your clipboard — paste it in as:");
    log("   CIRCLE_API_KEY=TEST_API_KEY:<id>:<secret>\n");
    process.exit(1);
  }
  if (apiKey.split(":").length !== 3) {
    log("❌ CIRCLE_API_KEY looks malformed. Expected PREFIX:ID:SECRET.\n");
    process.exit(1);
  }
  log(`✓ API key loaded (prefix ${apiKey.split(":")[0]}:${apiKey.split(":")[1]?.slice(0, 5)}…)`);

  // ── 1. Entity secret ───────────────────────────────────────────────────────
  let entitySecret = process.env.CIRCLE_ENTITY_SECRET;
  const needsNew = !entitySecret || entitySecret === PLACEHOLDER || entitySecret.length !== 64;

  if (needsNew) {
    entitySecret = randomBytes(32).toString("hex");
    log("✓ Generated a new 32-byte entity secret");
  } else {
    log("✓ Reusing the entity secret already in .env.local");
  }

  // ── 2. Recovery file location — OUTSIDE the repository ─────────────────────
  // NOTE: `recoveryFileDownloadPath` wants a DIRECTORY, not a file path. Passing
  // a filename fails with "Invalid Directory". Worth flagging in Circle feedback (T085).
  const recoveryDir = join(homedir(), ".circle-aurum-rails");
  if (!existsSync(recoveryDir)) mkdirSync(recoveryDir, { recursive: true });
  const recoveryFile = recoveryDir;

  // ── 3. Register ────────────────────────────────────────────────────────────
  log("\n→ Registering the entity secret ciphertext with Circle…");
  try {
    await registerEntitySecretCiphertext({
      apiKey,
      entitySecret: entitySecret!,
      recoveryFileDownloadPath: recoveryFile,
    });
    log("✓ Registered.");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    // Surface the FULL error. An earlier version pattern-matched /already/ and
    // swallowed a real failure as benign, leaving an UNREGISTERED secret in
    // .env.local. Never guess at an error's meaning on a credentials path.
    log(`\n❌ Registration failed.`);
    log(`   message: ${message}`);
    const details = (error as { response?: { data?: unknown } })?.response?.data;
    if (details) log(`   details: ${JSON.stringify(details)}`);
    log("");
    process.exit(1);
  }

  // ── 4. Write it straight into .env.local — never print a secret ────────────
  const envPath = ".env.local";
  if (existsSync(envPath)) {
    const current = readFileSync(envPath, "utf8");
    const updated = current.replace(
      /^CIRCLE_ENTITY_SECRET=.*$/m,
      `CIRCLE_ENTITY_SECRET=${entitySecret}`,
    );
    writeFileSync(envPath, updated);
    log("✓ Wrote CIRCLE_ENTITY_SECRET into .env.local (value not printed).");
  } else {
    log("⚠️  .env.local not found — create it from .env.example first.");
  }

  log("\n══════════════════════════════════════════════════════════════");
  log("  ✅ DONE");
  log("══════════════════════════════════════════════════════════════\n");
  log(`   Entity secret: [${entitySecret!.length} hex chars, stored in .env.local]\n`);
  log(`🔐 Recovery file: ${recoveryFile}`);
  log("   This is OUTSIDE the repo, by design. Back it up somewhere safe.");
  log("   Losing it means you cannot rotate the secret if it leaks.\n");
  log("Next: npm run spike:send\n");
}

main().catch((e: unknown) => {
  console.error("\n❌ Threw:\n", e);
  process.exit(1);
});
