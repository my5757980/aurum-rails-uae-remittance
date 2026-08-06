import { NextResponse } from "next/server";
import { ensureSeeded, listRecipients } from "@/lib/seed";
import { recipientDto } from "@/lib/serialize";
import { getSenderWallet, getUsdcBalance } from "@/lib/wallet-service";
import { formatUsdc6Short } from "@/lib/money";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeeded();
    const sender = await getSenderWallet();
    const balance = await getUsdcBalance(sender.id);

    return NextResponse.json({
      recipients: listRecipients().map(recipientDto),
      balanceUsdc: formatUsdc6Short(balance),
      lowBalance: Number(formatUsdc6Short(balance)) < 1,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        code: "PROVIDER_ERROR",
        message:
          "Couldn't reach the demo wallet. Check .env.local, then run: npm run spike:send",
        detail: message,
        correlationId: crypto.randomUUID(),
      },
      { status: 503 },
    );
  }
}
