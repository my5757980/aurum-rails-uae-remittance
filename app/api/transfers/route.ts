import { NextResponse, type NextRequest } from "next/server";
import { executeTransfer, TransferError } from "@/lib/orchestrator";
import { db, getEvents } from "@/lib/domain";
import { transferDto, recipientDto } from "@/lib/serialize";
import { ensureSeeded } from "@/lib/seed";
import { formatAedFils, formatMinorUnits } from "@/lib/money";
import { getCorridor } from "@/lib/corridors";

export const dynamic = "force-dynamic";

/** Transfer history, newest first (FR-033). */
export async function GET() {
  await ensureSeeded();

  const transfers = [...db.transfers.values()]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 50)
    .map((t) => {
      const recipient = db.recipients.get(t.recipientId);
      const quote = db.quotes.get(t.quoteId);
      return {
        ...transferDto(t, getEvents(t.id)),
        events: undefined, // the list view doesn't need the full timeline
        recipient: recipient ? recipientDto(recipient) : null,
        sendAed: quote ? formatAedFils(quote.sendAed) : null,
        landed: quote
          ? {
              amount: formatMinorUnits(
                quote.landedAmount,
                getCorridor(recipient?.corridorCode ?? "IN").decimals,
              ),
              currency: quote.landedCurrency,
              symbol: getCorridor(recipient?.corridorCode ?? "IN").currencySymbol,
            }
          : null,
      };
    });

  return NextResponse.json({ transfers });
}

export async function POST(req: NextRequest) {
  const correlationId = crypto.randomUUID();

  // FR-014 — idempotency is required, not optional.
  const idempotencyKey = req.headers.get("Idempotency-Key");
  if (!idempotencyKey) {
    return NextResponse.json(
      {
        code: "VALIDATION_FAILED",
        message: "Missing Idempotency-Key header.",
        correlationId,
      },
      { status: 400 },
    );
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { quoteId?: string };
    if (!body.quoteId) {
      return NextResponse.json(
        { code: "VALIDATION_FAILED", message: "Missing quoteId.", correlationId },
        { status: 400 },
      );
    }

    const transfer = await executeTransfer(body.quoteId, idempotencyKey);
    return NextResponse.json(transferDto(transfer, getEvents(transfer.id)), {
      status: 201,
    });
  } catch (error) {
    if (error instanceof TransferError) {
      return NextResponse.json(
        { code: error.code, message: error.message, correlationId },
        { status: error.httpStatus },
      );
    }
    const detail = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        code: "PROVIDER_ERROR",
        message: "We couldn't start this payment. Nothing was sent.",
        detail,
        correlationId,
      },
      { status: 502 },
    );
  }
}
