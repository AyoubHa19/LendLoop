"use client";

import { useState, type ReactNode } from "react";
import { timeAgo } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { DateSlip } from "./DateSlip";
import { StatusBadge } from "./StatusBadge";
import { Button, type ButtonVariant, Empty, ErrorText, Loading } from "./ui";

export type LoanRow = {
  _id: string;
  toolName: string;
  lenderName: string;
  borrowerName: string;
  startDate: string;
  endDate: string;
  status: string;
  activity?: { kind: string; message: string; at: number }[];
};

/**
 * A list of requests/loans. `who` names the other side of the loan, and
 * `actions` adds the buttons the viewer is allowed to use.
 */
export function LoanList<T extends LoanRow>({
  rows,
  who,
  empty,
  actions,
}: {
  rows: T[] | undefined;
  who: (row: T) => string;
  empty: { title: string; hint?: string };
  actions?: (row: T) => ReactNode;
}) {
  if (rows === undefined) return <Loading />;
  if (rows.length === 0) return <Empty title={empty.title}>{empty.hint}</Empty>;

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      {rows.map((row) => (
        <li key={row._id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:gap-6">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="truncate text-[15px] font-medium">{row.toolName}</span>
              <DateSlip start={row.startDate} end={row.endDate} />
            </div>
            <span className="text-[13px] text-fg-2">{who(row)}</span>
            {row.activity && row.activity.length > 0 && (
              <ul className="flex flex-col gap-0.5">
                {row.activity.map((a) => (
                  <li key={`${a.kind}-${a.at}`} className="text-xs text-fg-3">
                    {a.message}, {timeAgo(a.at)}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="md:w-36">
            <StatusBadge loan={row} />
          </div>
          {actions && <div className="flex flex-wrap gap-2 md:w-56 md:justify-end">{actions(row)}</div>}
        </li>
      ))}
    </ul>
  );
}

/** A button that runs a Convex mutation and shows its error inline. */
export function ActionButton({
  label,
  run,
  variant = "secondary",
}: {
  label: string;
  run: () => Promise<unknown>;
  variant?: ButtonVariant;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onClick() {
    setBusy(true);
    setError("");
    try {
      await run();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant={variant} disabled={busy} onClick={onClick}>
        {label}
      </Button>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}
