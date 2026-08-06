import { NextResponse } from "next/server";
import { db, getEvents } from "@/lib/domain";
import { getCorridor } from "@/lib/corridors";
import { formatMinorUnits } from "@/lib/money";

export const dynamic = "force-dynamic";

/**
 * Public recipient view (FR-021, FR-022).
 *
 * No auth, no install. Returns a MINIMAL projection only — never an address,
 * a wallet id, a transfer id, or any other recipient's data.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const recipientId = db.claimTokens.get(token);
  const recipient = recipientId ? db.recipients.get(recipientId) : undefined;

  if (!recipient) {
    return NextResponse.json({ code: "NOT_FOUND", message: "Link not found." }, { status: 404 });
  }

  const corridor = getCorridor(recipient.corridorCode);

  // Most recent delivered transfer to this person.
  const delivered = [...db.transfers.values()]
    .filter((t) => t.recipientId === recipient.id)
    .filter((t) => getEvents(t.id).some((e) => e.toState === "DELIVERED"))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];

  if (!delivered) {
    return NextResponse.json({
      recipientFirstName: recipient.name.split(" ")[0],
      hasPayment: false,
    });
  }

  const quote = db.quotes.get(delivered.quoteId);

  return NextResponse.json({
    recipientFirstName: recipient.name.split(" ")[0],
    hasPayment: true,
    senderFirstName: "Rajesh",
    amount: quote ? formatMinorUnits(quote.landedAmount, corridor.decimals) : null,
    currency: corridor.currency,
    symbol: corridor.currencySymbol,
    deliveredAt: delivered.deliveredAt,
    isSimulated: true,
  });
}
