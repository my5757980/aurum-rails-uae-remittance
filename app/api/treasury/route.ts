import { NextResponse } from "next/server";
import { getTreasury } from "@/lib/treasury";
import { formatUsdc6Short } from "@/lib/money";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const t = await getTreasury();
    return NextResponse.json({
      unified: formatUsdc6Short(t.unified),
      perChain: t.perChain.map((c) => ({
        domain: c.domain,
        chain: c.chain,
        usdc: formatUsdc6Short(c.usdc6),
      })),
      source: t.source,
      gatewayNote: t.gatewayNote,
      observedAt: t.observedAt,
      isLow: Number(formatUsdc6Short(t.unified)) < 1,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        code: "PROVIDER_ERROR",
        message: "Couldn't read the treasury balance.",
        detail,
        correlationId: crypto.randomUUID(),
      },
      { status: 503 },
    );
  }
}
