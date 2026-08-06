/**
 * Constitution Principle I: a persistent, unmissable testnet notice must appear
 * on EVERY user-facing surface. Not dismissible, not a footnote.
 */
export function TestnetBanner() {
  return (
    <div
      role="status"
      className="sticky top-0 z-50 w-full bg-amber-500/95 px-3 py-1.5 text-center text-[11px] font-semibold leading-tight text-amber-950 sm:text-xs"
    >
      Arc Testnet — educational demo. No real funds.
    </div>
  );
}
