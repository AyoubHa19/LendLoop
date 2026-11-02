import { isOverdue } from "@/lib/dates";
import { Badge, type BadgeTone } from "./ui";

const STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  pending: { label: "Pending", tone: "amber" },
  approved: { label: "On loan", tone: "blue" },
  declined: { label: "Declined", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  returned: { label: "Returned", tone: "green" },
};

/** Request status, with "Overdue" taking over once an active loan is late. */
export function StatusBadge({ loan }: { loan: { status: string; endDate: string } }) {
  if (isOverdue(loan)) return <Badge tone="red">Overdue</Badge>;
  const s = STATUS[loan.status] ?? { label: loan.status, tone: "neutral" as const };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
