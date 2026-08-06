import { NextResponse } from "next/server";
import { db, getEvents } from "@/lib/domain";
import { transferDto, quoteDto, recipientDto } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const transfer = db.transfers.get(id);

  if (!transfer) {
    return NextResponse.json(
      {
        code: "NOT_FOUND",
        message: "We couldn't find that payment.",
        correlationId: crypto.randomUUID(),
      },
      { status: 404 },
    );
  }

  const quote = db.quotes.get(transfer.quoteId);
  const recipient = db.recipients.get(transfer.recipientId);

  return NextResponse.json({
    ...transferDto(transfer, getEvents(transfer.id)),
    quote: quote ? quoteDto(quote) : null,
    recipient: recipient ? recipientDto(recipient) : null,
  });
}
