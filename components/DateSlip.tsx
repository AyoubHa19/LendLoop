import { formatRange } from "@/lib/dates";

/**
 * The loan dates as a small slip, like the card a tool library staples to
 * what it lends. LendLoop's one recurring detail: dates always look like this.
 */
export function DateSlip({ start, end }: { start: string; end: string }) {
  return (
    <span className="inline-flex h-6 items-center rounded-md border border-line bg-raised px-2 font-mono text-xs tabular-nums text-fg-2">
      {formatRange(start, end)}
    </span>
  );
}
