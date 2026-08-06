import { NextResponse, type NextRequest } from "next/server";
import { executeTransfer, TransferError } from "@/lib/orchestrator";
import { getEvents } from "@/lib/domain";
import { transferDto } from "@/lib/serialize";

export const dynamic = "force-dynamic";

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
