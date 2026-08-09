import { NextResponse } from "next/server";
import { db, getEvents } from "@/lib/domain";
import { advanceTransfer } from "@/lib/orchestrator";
import { fetchTransfer } from "@/lib/persist";
import { transferDto, quoteDto, recipientDto } from "@/lib/serialize";

export const dynamic = "force-dynamic";

/**
 * The cross-chain leg blocks on burn + attestation + mint (~35 s measured).
 * The default serverless limit would cut that off mid-bridge.
 */
export const maxDuration = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Fall back to the database: on serverless this request may be served by a
  // different instance than the one that created the transfer.
  if (!db.transfers.has(id) && !(await fetchTransfer(id))) {
    return NextResponse.json(
      {
        code: "NOT_FOUND",
        message: "We couldn't find that payment.",
        correlationId: crypto.randomUUID(),
      },
      { status: 404 },
    );
  }

  // Reading the status is what advances it. The UI polls this endpoint, so each
  // poll moves the state machine one step — the only pattern that works on a
  // serverless host, which freezes the function once it has responded.
  // No-ops once the transfer is terminal.
  await advanceTransfer(id);

  const transfer = db.transfers.get(id)!;
  const quote = db.quotes.get(transfer.quoteId);
  const recipient = db.recipients.get(transfer.recipientId);

  return NextResponse.json({
    ...transferDto(transfer, getEvents(transfer.id)),
    quote: quote ? quoteDto(quote) : null,
    recipient: recipient ? recipientDto(recipient) : null,
  });
}
