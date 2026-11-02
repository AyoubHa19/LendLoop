import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { getCurrentUser, requireUser } from "./lib/auth";
import { changeStatus, isIsoDate, notifyN8n, overlaps, todayUtc } from "./lib/requests";

const MAX_LIST = 200;
const MAX_LOAN_DAYS = 30;

/**
 * Request plus what the UI shows: names, and recent automation activity
 * ("reminder sent"). No emails, no other users' data, and no failure
 * details (those are for admins only).
 */
async function describe(ctx: QueryCtx, r: Doc<"requests">) {
  const [tool, lender, borrower, events] = await Promise.all([
    ctx.db.get("tools", r.toolId),
    ctx.db.get("users", r.lenderId),
    ctx.db.get("users", r.borrowerId),
    ctx.db
      .query("automationEvents")
      .withIndex("by_requestId", (q) => q.eq("requestId", r._id))
      .order("desc")
      .take(10),
  ]);
  return {
    _id: r._id,
    _creationTime: r._creationTime,
    toolId: r.toolId,
    toolName: tool?.name ?? "Removed tool",
    lenderName: lender?.name ?? "Unknown",
    borrowerName: borrower?.name ?? "Unknown",
    startDate: r.startDate,
    endDate: r.endDate,
    status: r.status,
    returnedAt: r.returnedAt ?? null,
    activity: events
      .filter((e) => e.kind === "notification_sent" || e.kind === "reminder_sent")
      .slice(0, 3)
      .map((e) => ({ kind: e.kind, message: e.message, at: e._creationTime })),
  };
}

/** Loads a request and checks the caller is its lender. */
async function requireLenderOf(ctx: MutationCtx, requestId: Id<"requests">) {
  const me = await requireUser(ctx);
  const request = await ctx.db.get("requests", requestId);
  if (request === null) throw new ConvexError("Request not found.");
  if (request.lenderId !== me._id) throw new ConvexError("Only the tool's owner can do this.");
  return request;
}

async function approvedLoans(ctx: QueryCtx, toolId: Id<"tools">) {
  return await ctx.db
    .query("requests")
    .withIndex("by_toolId_and_status", (q) => q.eq("toolId", toolId).eq("status", "approved"))
    .take(100);
}

/** Borrow request for a date range (inclusive). */
export const create = mutation({
  args: { toolId: v.id("tools"), startDate: v.string(), endDate: v.string() },
  handler: async (ctx, { toolId, startDate, endDate }) => {
    const me = await requireUser(ctx);
    const tool = await ctx.db.get("tools", toolId);
    if (tool === null || tool.removed) throw new ConvexError("Tool not found.");
    if (tool.ownerId === me._id) throw new ConvexError("You can't borrow your own tool.");

    if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
      throw new ConvexError("Dates must be valid and written as YYYY-MM-DD.");
    }
    if (startDate > endDate) throw new ConvexError("The end date must be on or after the start date.");
    if (startDate < todayUtc()) throw new ConvexError("The start date can't be in the past.");
    const days = (Date.parse(endDate) - Date.parse(startDate)) / 86_400_000 + 1;
    if (days > MAX_LOAN_DAYS) throw new ConvexError(`A loan can last at most ${MAX_LOAN_DAYS} days.`);

    const range = { startDate, endDate };
    if ((await approvedLoans(ctx, toolId)).some((loan) => overlaps(loan, range))) {
      throw new ConvexError("The tool is already lent out for some of those dates.");
    }
    const pending = await ctx.db
      .query("requests")
      .withIndex("by_toolId_and_status", (q) => q.eq("toolId", toolId).eq("status", "pending"))
      .take(100);
    if (pending.some((r) => r.borrowerId === me._id)) {
      throw new ConvexError("You already have a pending request for this tool.");
    }

    const requestId = await ctx.db.insert("requests", {
      toolId,
      lenderId: tool.ownerId,
      borrowerId: me._id,
      startDate,
      endDate,
      status: "pending",
    });
    await notifyN8n(ctx, requestId, "pending");
    return requestId;
  },
});

/** Requests the caller made as a borrower. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUser(ctx);
    if (me === null) return [];
    const rows = await ctx.db
      .query("requests")
      .withIndex("by_borrowerId", (q) => q.eq("borrowerId", me._id))
      .order("desc")
      .take(MAX_LIST);
    return await Promise.all(rows.map((r) => describe(ctx, r)));
  },
});

/** Requests other people made for the caller's tools. */
export const incoming = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUser(ctx);
    if (me === null) return [];
    const rows = await ctx.db
      .query("requests")
      .withIndex("by_lenderId", (q) => q.eq("lenderId", me._id))
      .order("desc")
      .take(MAX_LIST);
    return await Promise.all(rows.map((r) => describe(ctx, r)));
  },
});

/** Lender approves a pending request, if the dates are still free. */
export const approve = mutation({
  args: { requestId: v.id("requests") },
  handler: async (ctx, { requestId }) => {
    const request = await requireLenderOf(ctx, requestId);
    if (request.status !== "pending") throw new ConvexError("Only pending requests can be approved.");
    if ((await approvedLoans(ctx, request.toolId)).some((loan) => overlaps(loan, request))) {
      throw new ConvexError("Those dates clash with a loan you already approved.");
    }
    await changeStatus(ctx, request, "approved");
  },
});

/** Lender declines a pending request. */
export const decline = mutation({
  args: { requestId: v.id("requests") },
  handler: async (ctx, { requestId }) => {
    const request = await requireLenderOf(ctx, requestId);
    if (request.status !== "pending") throw new ConvexError("Only pending requests can be declined.");
    await changeStatus(ctx, request, "declined");
  },
});

/** Lender confirms the tool came back. */
export const markReturned = mutation({
  args: { requestId: v.id("requests") },
  handler: async (ctx, { requestId }) => {
    const request = await requireLenderOf(ctx, requestId);
    if (request.status !== "approved") throw new ConvexError("Only an active loan can be marked returned.");
    await changeStatus(ctx, request, "returned");
  },
});

/** Borrower withdraws their own pending request. */
export const cancel = mutation({
  args: { requestId: v.id("requests") },
  handler: async (ctx, { requestId }) => {
    const me = await requireUser(ctx);
    const request = await ctx.db.get("requests", requestId);
    if (request === null) throw new ConvexError("Request not found.");
    if (request.borrowerId !== me._id) throw new ConvexError("You can only cancel your own requests.");
    if (request.status !== "pending") throw new ConvexError("Only pending requests can be cancelled.");
    await changeStatus(ctx, request, "cancelled");
  },
});
