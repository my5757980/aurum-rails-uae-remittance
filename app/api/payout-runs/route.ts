import { NextResponse, type NextRequest } from "next/server";
import { advanceTransfer, executeTransfer, TransferError } from "@/lib/orchestrator";
import { createQuote, QuoteError } from "@/lib/quote-engine";
import { currentState, db, getEvents, TERMINAL_STATES } from "@/lib/domain";
import { ensureSeeded } from "@/lib/seed";
import { transferDto, recipientDto } from "@/lib/serialize";

export const dynamic = "force-dynamic";

/** A run submits several transfers and waits for them to settle. */
export const maxDuration = 60;

interface Item {
  recipientId: string;
  sendAed: string;
  invoiceRef?: string;
}

/**
 * Batch payout (User Story 2, FR-023–025).
 *
 * Items settle and fail INDEPENDENTLY. One failure never rolls back its
 * siblings — a partially successful run is a first-class outcome, not an error
 * (E11, NFR-022). This is the same orchestrator the single-send hero path uses,
 * so the second use case costs UI rather than a second pipeline.
 */
export async function POST(req: NextRequest) {
  const correlationId = crypto.randomUUID();

  const idempotencyKey = req.headers.get("Idempotency-Key");
  if (!idempotencyKey) {
    return NextResponse.json(
      { code: "VALIDATION_FAILED", message: "Missing Idempotency-Key header.", correlationId },
      { status: 400 },
    );
  }

  try {
    await ensureSeeded();
    const body = (await req.json().catch(() => ({}))) as { items?: Item[] };
    const items = body.items ?? [];

    if (items.length === 0 || items.length > 25) {
      return NextResponse.json(
        {
          code: "VALIDATION_FAILED",
          message: "Choose between 1 and 25 people to pay.",
          correlationId,
        },
        { status: 400 },
      );
    }

    const runId = crypto.randomUUID();
    const results = [];

    for (const [index, item] of items.entries()) {
      const recipient = db.recipients.get(item.recipientId);
      if (!recipient) {
        results.push({
          recipientId: item.recipientId,
          recipient: null,
          invoiceRef: item.invoiceRef ?? null,
          ok: false,
          error: "We couldn't find that person.",
          transfer: null,
        });
        continue;
      }

      try {
        const quote = await createQuote(recipient, item.sendAed);
        // Deriving each item's key from the run key keeps the whole run
        // replay-safe: retrying the run cannot double-pay anyone.
        const transfer = await executeTransfer(quote.id, `${idempotencyKey}:${index}`);
        results.push({
          recipientId: item.recipientId,
          recipient: recipientDto(recipient),
          invoiceRef: item.invoiceRef ?? null,
          ok: true,
          error: null,
          transfer: transferDto(transfer, getEvents(transfer.id)),
        });
      } catch (error) {
        // Isolated per item — the loop continues (FR-025).
        const message =
          error instanceof TransferError || error instanceof QuoteError
            ? error.message
            : "Something went wrong paying this person.";
        results.push({
          recipientId: item.recipientId,
          recipient: recipientDto(recipient),
          invoiceRef: item.invoiceRef ?? null,
          ok: false,
          error: message,
          transfer: null,
        });
      }
    }

    // Drive every submitted item to a terminal state before responding, so the
    // results grid shows real outcomes rather than a snapshot taken the instant
    // each was submitted. Bounded, because a hung item must not hang the run.
    const pending = results.filter((r) => r.ok && r.transfer).map((r) => r.transfer!.id);
    const deadline = Date.now() + 30_000;

    while (pending.length && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 1500));
      await Promise.all(pending.map((id) => advanceTransfer(id)));
      for (let i = pending.length - 1; i >= 0; i--) {
        const state = currentState(pending[i]!);
        if (state && TERMINAL_STATES.has(state)) pending.splice(i, 1);
      }
    }

    // Refresh each item with where it actually ended up.
    for (const r of results) {
      if (!r.ok || !r.transfer) continue;
      const t = db.transfers.get(r.transfer.id);
      if (t) r.transfer = transferDto(t, getEvents(t.id));
    }

    const succeeded = results.filter((r) => r.ok).length;
    const state =
      succeeded === results.length
        ? "COMPLETED"
        : succeeded === 0
          ? "FAILED"
          : "PARTIALLY_FAILED";

    return NextResponse.json(
      { id: runId, state, total: results.length, succeeded, items: results },
      { status: 201 },
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { code: "PROVIDER_ERROR", message: "We couldn't start this run.", detail, correlationId },
      { status: 502 },
    );
  }
}
