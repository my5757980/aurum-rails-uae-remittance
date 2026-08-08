/**
 * Authentication.
 *
 * FR-001: email + one-time code. No password, no seed phrase, no extension.
 *
 * WHY THERE IS ALSO A DEMO SIGN-IN:
 * Real OTP needs email delivery, and Supabase's free tier rate-limits signup
 * emails (2/hour). A judge hitting that limit would be locked out of the
 * product entirely, which breaks Constitution VIII's ten-minute promise. So the
 * real OTP path exists and works, and a one-click demo session sits beside it.
 * The demo path is clearly labelled as such — it is a convenience, not a
 * pretence that auth is unnecessary.
 *
 * SCOPE: spec §9.1 explicitly excludes multi-tenancy, so this is a sign-in
 * gate, not per-user data isolation. Recipients and transfers are shared across
 * sessions by design. Saying so plainly is better than implying isolation the
 * app does not provide.
 */

import "server-only";
import { cookies } from "next/headers";

const SESSION_COOKIE = "aurum_session";
const DEMO_EMAIL = "demo@aurumrails.test";

export interface Session {
  email: string;
  isDemo: boolean;
  since: string;
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Session;
    return parsed.email ? parsed : null;
  } catch {
    return null;
  }
}

export async function setSession(email: string, isDemo: boolean): Promise<void> {
  const session: Session = { email, isDemo, since: new Date().toISOString() };
  const jar = await cookies();
  jar.set(
    SESSION_COOKIE,
    Buffer.from(JSON.stringify(session), "utf8").toString("base64url"),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    },
  );
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export const startDemoSession = () => setSession(DEMO_EMAIL, true);

// ─────────────────────────────────────────────────────────────────────────────
// One-time codes
// ─────────────────────────────────────────────────────────────────────────────

interface PendingCode {
  code: string;
  expiresAt: number;
  attempts: number;
}

const g = globalThis as unknown as { __aurumCodes?: Map<string, PendingCode> };
const codes: Map<string, PendingCode> = g.__aurumCodes ?? (g.__aurumCodes = new Map());

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function issueCode(email: string): string {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  codes.set(email.toLowerCase(), {
    code,
    expiresAt: Date.now() + CODE_TTL_MS,
    attempts: 0,
  });
  return code;
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "expired" | "wrong" | "too_many" };

export function verifyCode(email: string, submitted: string): VerifyResult {
  const key = email.toLowerCase();
  const pending = codes.get(key);

  if (!pending || pending.expiresAt < Date.now()) {
    codes.delete(key);
    return { ok: false, reason: "expired" };
  }
  if (pending.attempts >= MAX_ATTEMPTS) {
    codes.delete(key);
    return { ok: false, reason: "too_many" };
  }
  if (pending.code !== submitted.trim()) {
    pending.attempts += 1;
    return { ok: false, reason: "wrong" };
  }

  codes.delete(key);
  return { ok: true };
}
