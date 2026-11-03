import { isOverdue } from "@/lib/dates";
import { Status, type Tone } from "./ui";

const STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Waiting for reply", tone: "warning" },
  approved: { label: "On loan", tone: "positive" },
  declined: { label: "Declined", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  returned: { label: "Returned", tone: "neutral" },
};

/** Request status, with "Overdue" taking over once an active loan is late. */
export function StatusBadge({ loan }: { loan: { status: string; endDate: string } }) {
  if (isOverdue(loan)) return <Status tone="negative">Overdue</Status>;
  const s = STATUS[loan.status] ?? { label: loan.status, tone: "neutral" as const };
  return <Status tone={s.tone}>{s.label}</Status>;
}
