/**
 * Constitution Principle II: anything simulated must be labelled at its point of
 * display. This component is the ONLY sanctioned way to render that label, so a
 * grep for "Simulated" finds every such surface in one place.
 */
export function SimulatedBadge({ title }: { title?: string }) {
  return (
    <span
      title={
        title ??
        "The local-currency payout is simulated. The USDC transfer on Arc is real and verifiable on the explorer."
      }
      className="ml-1.5 inline-flex shrink-0 items-center rounded border border-sky-400/40 bg-sky-400/10 px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-sky-300"
    >
      Simulated
    </span>
  );
}
