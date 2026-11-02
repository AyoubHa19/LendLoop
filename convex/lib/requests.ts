import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

/**
 * Queues the n8n notification for a request event. Scheduled from inside
 * the mutation, so it runs only if the mutation's changes are saved.
 */
export async function notifyN8n(
  ctx: MutationCtx,
  requestId: Id<"requests">,
  status: Doc<"requests">["status"],
) {
  await ctx.scheduler.runAfter(0, internal.automation.sendRequestEvent, {
    requestId,
    status,
    attempt: 1,
  });
}

/**
 * The single place where a request's status changes. Keeping every
 * transition here means the n8n notification is triggered from one spot
 * and can't be forgotten by a new code path.
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
  await notifyN8n(ctx, request._id, status);
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
