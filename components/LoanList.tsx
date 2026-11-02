"use client";

import { useState, type ReactNode } from "react";
import { formatDate } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { StatusBadge } from "./StatusBadge";
import { Button, Card, Empty, ErrorText, Loading } from "./ui";

export type LoanRow = {
  _id: string;
  toolName: string;
  lenderName: string;
  borrowerName: string;
  startDate: string;
  endDate: string;
  status: string;
};

/**
 * A list of requests/loans. `who` picks which person to show (the other
 * side of the loan), and `actions` adds the buttons the viewer may use.
 */
export function LoanList<T extends LoanRow>({
  rows,
  who,
  empty,
  actions,
}: {
  rows: T[] | undefined;
  who: (row: T) => string;
  empty: string;
  actions?: (row: T) => ReactNode;
}) {
  if (rows === undefined) return <Loading />;
  if (rows.length === 0) return <Empty>{empty}</Empty>;

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <Card key={row._id}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{row.toolName}</span>
                <StatusBadge loan={row} />
              </div>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {who(row)} · {formatDate(row.startDate)} – {formatDate(row.endDate)}
              </span>
            </div>
            {actions && <div className="flex gap-2">{actions(row)}</div>}
          </div>
        </Card>
      ))}
    </div>
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
  variant?: "primary" | "secondary" | "danger";
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
