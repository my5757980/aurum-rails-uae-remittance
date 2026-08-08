import { NextResponse, type NextRequest } from "next/server";
import {
  clearSession,
  getSession,
  issueCode,
  setSession,
  startDemoSession,
  verifyCode,
} from "@/lib/auth";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET() {
  const session = await getSession();
  return NextResponse.json({ session });
}

export async function POST(req: NextRequest) {
  const correlationId = crypto.randomUUID();
  const body = (await req.json().catch(() => ({}))) as {
    action?: "request-code" | "verify" | "demo" | "sign-out";
    email?: string;
    code?: string;
  };

  switch (body.action) {
    case "demo": {
      await startDemoSession();
      logger.info("auth.demo_session", { correlationId });
      return NextResponse.json({ ok: true, isDemo: true });
    }

    case "sign-out": {
      await clearSession();
      return NextResponse.json({ ok: true });
    }

    case "request-code": {
      const email = (body.email ?? "").trim();
      if (!EMAIL_RE.test(email)) {
        return NextResponse.json(
          { code: "VALIDATION_FAILED", message: "Enter a valid email address.", correlationId },
          { status: 400 },
        );
      }
      const code = issueCode(email);
      logger.info("auth.code_issued", { correlationId, email });

      // No mail provider is configured for this testnet demo, so the code is
      // returned to the caller and shown on screen. Labelled in the UI as a
      // demo shortcut — never presented as if an email had been sent.
      return NextResponse.json({ ok: true, devCode: code, emailSent: false });
    }

    case "verify": {
      const email = (body.email ?? "").trim();
      const result = verifyCode(email, body.code ?? "");
      if (!result.ok) {
        const message =
          result.reason === "expired"
            ? "That code has expired. Ask for a new one."
            : result.reason === "too_many"
              ? "Too many tries. Ask for a new code."
              : "That code isn't right.";
        logger.warn("auth.verify_failed", { correlationId, reason: result.reason });
        return NextResponse.json(
          { code: "VERIFY_FAILED", message, correlationId },
          { status: 401 },
        );
      }
      await setSession(email, false);
      logger.info("auth.signed_in", { correlationId, email });
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json(
        { code: "VALIDATION_FAILED", message: "Unknown action.", correlationId },
        { status: 400 },
      );
  }
}
