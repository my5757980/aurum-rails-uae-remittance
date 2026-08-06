/**
 * Environment validation.
 *
 * Constitution Principle VII (Secrets Discipline) + FR-028: the app validates
 * every required variable and fails fast, naming the one that is missing.
 * Nothing else in the codebase may read `process.env` directly.
 *
 * WHY SERVER VARS ARE VALIDATED LAZILY:
 * Validating server secrets at module-import time would break `next build`,
 * `tsc`, and `vitest` on any machine without a populated `.env.local` — including
 * CI, where secrets are deliberately absent. Instead `getServerEnv()` validates
 * once, on first use, and memoises. For a running server that is still
 * fail-fast: the first request that needs a secret fails loudly and by name,
 * rather than producing a confusing downstream error from the Circle SDK.
 *
 * @see specs/001-uae-global-remittance/plan.md §6
 */

import { z } from "zod";
import { ARC_CHAIN_ID } from "./chain";

// ─────────────────────────────────────────────────────────────────────────────
// Public — safe to expose to the browser. Deliberately tiny.
// ─────────────────────────────────────────────────────────────────────────────

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_ARC_CHAIN_ID: z.coerce.number().int().optional(),
  NEXT_PUBLIC_ARC_EXPLORER_URL: z.string().url().optional(),
});

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY,
  NEXT_PUBLIC_ARC_CHAIN_ID: process.env.NEXT_PUBLIC_ARC_CHAIN_ID,
  NEXT_PUBLIC_ARC_EXPLORER_URL: process.env.NEXT_PUBLIC_ARC_EXPLORER_URL,
});

// ─────────────────────────────────────────────────────────────────────────────
// Server — secrets. Must never reach the client bundle.
// ─────────────────────────────────────────────────────────────────────────────

const serverSchema = z.object({
  // Supabase
  SUPABASE_SECRET_KEY: z.string().min(1),

  // Circle — format is PREFIX:ID:SECRET
  CIRCLE_API_KEY: z
    .string()
    .min(1)
    .refine((v) => v.split(":").length === 3, {
      message: "CIRCLE_API_KEY must look like TEST_API_KEY:<id>:<secret>",
    }),
  CIRCLE_ENTITY_SECRET: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "CIRCLE_ENTITY_SECRET must be 32 bytes of hex (64 chars)"),
  CIRCLE_BLOCKCHAIN: z.literal("ARC-TESTNET"),
  CIRCLE_USDC_TOKEN_ID: z.string().uuid(),
  CIRCLE_WALLET_SET_ID: z.string().uuid().optional(),

  // Demo policy
  SERVICE_FEE_AED: z.string().default("0.99"),
  QUOTE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  DEMO_MAX_SEND_AED: z.coerce.number().int().positive().default(20),
  TREASURY_LOW_BALANCE_USDC: z.string().default("0.50"),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

export class EnvironmentError extends Error {
  constructor(issues: z.ZodIssue[]) {
    const lines = issues.map((i) => `  • ${i.path.join(".")}: ${i.message}`).join("\n");
    super(
      `Environment is not configured correctly.\n${lines}\n\n` +
        `Copy .env.example to .env.local and fill in the values above.`,
    );
    this.name = "EnvironmentError";
  }
}

/**
 * Validated server environment. Throws by name on the first missing variable.
 * Server-side only — calling this in the browser is a programming error.
 */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  if (typeof window !== "undefined") {
    throw new Error(
      "getServerEnv() was called in the browser. Circle credentials are server-only " +
        "(Constitution VII). Move this call into a Route Handler or Server Action.",
    );
  }

  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) throw new EnvironmentError(parsed.error.issues);

  cached = parsed.data;
  return cached;
}

/**
 * Constitution Principle I, enforced at configuration level: if the deployment
 * declares any chain other than Arc Testnet, refuse to start.
 */
export function assertTestnetOnlyConfig(): void {
  const declared = publicEnv.NEXT_PUBLIC_ARC_CHAIN_ID;
  if (declared !== undefined && declared !== ARC_CHAIN_ID) {
    throw new Error(
      `NEXT_PUBLIC_ARC_CHAIN_ID is ${declared} but this build only supports Arc Testnet ` +
        `(${ARC_CHAIN_ID}). Refusing to start.`,
    );
  }
}

/** Test-only escape hatch so suites can exercise validation failures. */
export function __resetServerEnvCache(): void {
  cached = null;
}
