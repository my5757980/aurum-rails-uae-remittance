import { NextResponse, type NextRequest } from "next/server";
import { createQuote, QuoteError } from "@/lib/quote-engine";
import { db } from "@/lib/domain";
import { ensureSeeded } from "@/lib/seed";
import { quoteDto } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const correlationId = crypto.randomUUID();
  try {
    await ensureSeeded();
    const body = (await req.json().catch(() => ({}))) as {
      recipientId?: string;
      sendAed?: string;
    };

    if (!body.recipientId || !body.sendAed) {
      return NextResponse.json(
        {
          code: "VALIDATION_FAILED",
          message: "Choose who you're sending to and how much.",
          correlationId,
        },
        { status: 400 },
      );
    }

    const recipient = db.recipients.get(body.recipientId);
    if (!recipient) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "We couldn't find that person.", correlationId },
        { status: 404 },
      );
    }

    const quote = await createQuote(recipient, body.sendAed);
    return NextResponse.json(quoteDto(quote), { status: 201 });
  } catch (error) {
    if (error instanceof QuoteError) {
      return NextResponse.json(
        { code: error.code, message: error.message, correlationId },
        { status: error.code === "AMOUNT_OUT_OF_RANGE" ? 422 : 400 },
      );
    }
    return NextResponse.json(
      {
        code: "PROVIDER_ERROR",
        message: "We couldn't price that right now. Try again.",
        correlationId,
      },
      { status: 502 },
    );
  }
}
