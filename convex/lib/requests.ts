import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

/**
 * The single place where a request's status changes. Keeping every
 * transition here means the n8n notification (stage 4) is triggered from
 * one spot and can't be forgotten by a new code path.
 */
export async function changeStatus(
  ctx: MutationCtx,
  request: Doc<"requests">,
  status: Doc<"requests">["status"],
) {
  await ctx.db.patch("requests", request._id, {
    status,
    ...(status === "returned" ? { returnedAt: Date.now() } : {}),
  });
}

/** Two inclusive "YYYY-MM-DD" ranges overlap. String order = date order. */
export function overlaps(
  a: { startDate: string; endDate: string },
  b: { startDate: string; endDate: string },
) {
  return a.startDate <= b.endDate && b.startDate <= a.endDate;
}

/** Today as "YYYY-MM-DD" in UTC. Only call from mutations/actions. */
export function todayUtc() {
  return new Date(Date.now()).toISOString().slice(0, 10);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real calendar date written as "YYYY-MM-DD". */
export function isIsoDate(value: string) {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
