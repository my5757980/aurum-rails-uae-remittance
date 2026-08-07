import { NextResponse, type NextRequest } from "next/server";
import { ensureSeeded, listRecipients } from "@/lib/seed";
import { recipientDto } from "@/lib/serialize";
import {
  getSenderWallet,
  getUsdcBalance,
  createWallet,
  createWalletOn,
} from "@/lib/wallet-service";
import { getDestination, needsBridge } from "@/lib/bridge";
import { formatUsdc6Short } from "@/lib/money";
import { db, type Recipient } from "@/lib/domain";
import { CORRIDORS } from "@/lib/corridors";
import { saveRecipient } from "@/lib/persist";

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

/** Add someone to send to (FR-005). A wallet is provisioned for them silently. */
export async function POST(req: NextRequest) {
  const correlationId = crypto.randomUUID();
  try {
    await ensureSeeded();
    const body = (await req.json().catch(() => ({}))) as {
      name?: string;
      corridorCode?: string;
      contactHandle?: string;
      destinationCode?: string;
    };

    const name = (body.name ?? "").trim();
    const corridorCode = (body.corridorCode ?? "").trim().toUpperCase();

    if (name.length < 2) {
      return NextResponse.json(
        { code: "VALIDATION_FAILED", message: "Enter their full name.", correlationId },
        { status: 400 },
      );
    }
    if (!CORRIDORS[corridorCode]) {
      return NextResponse.json(
        { code: "VALIDATION_FAILED", message: "Choose a country.", correlationId },
        { status: 400 },
      );
    }

    // FR-006 — offer a merge instead of silently creating a duplicate.
    const duplicate = [...db.recipients.values()].find(
      (r) => r.name.toLowerCase() === name.toLowerCase() && r.corridorCode === corridorCode,
    );
    if (duplicate) {
      return NextResponse.json(
        {
          code: "DUPLICATE_RECIPIENT",
          message: `You already have ${duplicate.name} saved for ${CORRIDORS[corridorCode]!.country}.`,
          existingId: duplicate.id,
          correlationId,
        },
        { status: 409 },
      );
    }

    const destinationCode = (body.destinationCode ?? "ARC").toUpperCase();
    const destination = getDestination(destinationCode);

    const wallet = await createWallet();

    // Cross-chain recipients need an address on the destination network too.
    // A wallet set gives the same address across EVM chains, so this is
    // usually identical — but we resolve it rather than assume.
    let destinationAddress = wallet.address;
    if (needsBridge(destination.code)) {
      try {
        const destWallet = await createWalletOn(destination.circleChain);
        destinationAddress = destWallet.address;
      } catch {
        // Fall back to the Arc address: same wallet set, same EVM address.
        destinationAddress = wallet.address;
      }
    }

    const recipient: Recipient = {
      id: `r-${crypto.randomUUID().slice(0, 8)}`,
      name,
      corridorCode,
      contactHandle: (body.contactHandle ?? "").trim(),
      claimToken: `claim-${crypto.randomUUID().replace(/-/g, "")}`,
      walletId: wallet.id,
      address: wallet.address,
      destinationCode: destination.code,
      destinationAddress,
      createdAt: new Date().toISOString(),
    };

    db.recipients.set(recipient.id, recipient);
    db.claimTokens.set(recipient.claimToken, recipient.id);
    saveRecipient(recipient);

    return NextResponse.json(recipientDto(recipient), { status: 201 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        code: "PROVIDER_ERROR",
        message: "We couldn't add them right now. Try again.",
        detail,
        correlationId,
      },
      { status: 502 },
    );
  }
}
