import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { env, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { signedHeaders } from "./lib/hmac";
import { requestStatus } from "./schema";

/**
 * Everything Convex does for the n8n integration. All functions here are
 * internal: the browser can't call them. n8n reaches Convex only through
 * the signed HTTP endpoints in http.ts.
 */

export const eventKind = v.union(
  v.literal("notification_sent"),
  v.literal("reminder_sent"),
  v.literal("notification_failed"),
  v.literal("workflow_error"),
);

/**
 * Records an automation event once. Calling it again with the same
 * idempotencyKey changes nothing, so n8n can safely retry a write-back
 * (after a timeout, say) without creating duplicates.
 */
export const recordEvent = internalMutation({
  args: {
    idempotencyKey: v.string(),
    kind: eventKind,
    message: v.string(),
    // A string because it can come from n8n; checked below.
    requestId: v.optional(v.string()),
  },
  handler: async (ctx, { requestId: rawRequestId, ...event }) => {
    const requestId =
      rawRequestId === undefined ? undefined : ctx.db.normalizeId("requests", rawRequestId);
    if (requestId === null) return "unknown_request" as const;

    const existing = await ctx.db
      .query("automationEvents")
      .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", event.idempotencyKey))
      .first();
    if (existing !== null) return "duplicate" as const;
    await ctx.db.insert("automationEvents", { ...event, requestId });
    return "recorded" as const;
  },
});

// Who hears about each status change, and why.
const RECIPIENT: Record<Doc<"requests">["status"], "lender" | "borrower"> = {
  pending: "lender", // a new request is waiting for them
  cancelled: "lender", // the borrower withdrew it
  approved: "borrower",
  declined: "borrower",
  returned: "borrower",
};

/**
 * The webhook body for one request event. Data minimisation: only what the
 * email needs — the one recipient's name and email, the other person's
 * display name, the tool name and the dates. No other emails, no user ids,
 * no tool descriptions.
 */
export const notificationPayload = internalQuery({
  args: { requestId: v.id("requests"), status: requestStatus },
  handler: async (ctx, { requestId, status }) => {
    const request = await ctx.db.get("requests", requestId);
    if (request === null) return null;
    const role = RECIPIENT[status];
    const [tool, recipient, otherParty] = await Promise.all([
      ctx.db.get("tools", request.toolId),
      ctx.db.get("users", role === "lender" ? request.lenderId : request.borrowerId),
      ctx.db.get("users", role === "lender" ? request.borrowerId : request.lenderId),
    ]);
    if (!recipient?.email) return null;
    return {
      // Stable per event: a request reaches each status at most once.
      eventId: `${requestId}:${status}`,
      type: status === "pending" ? "request.created" : "request.status_changed",
      requestId,
      status,
      toolName: tool?.name ?? "a tool",
      startDate: request.startDate,
      endDate: request.endDate,
      recipient: { role, name: recipient.name, email: recipient.email },
      otherPartyName: otherParty?.name ?? "a neighbour",
    };
  },
});

// Wait before each retry: 30 s, 2 min, 10 min, 30 min. Then give up loudly.
const RETRY_DELAYS_MS = [30_000, 120_000, 600_000, 1_800_000];

/**
 * Sends one request event to the n8n webhook, signed with HMAC.
 * Scheduled from the mutation that changed the request, so it only runs if
 * that change was actually saved. On failure it reschedules itself with
 * backoff; after the last attempt it records a visible failure event.
 */
export const sendRequestEvent = internalAction({
  args: { requestId: v.id("requests"), status: requestStatus, attempt: v.number() },
  handler: async (ctx, args) => {
    const url = env.N8N_WEBHOOK_URL;
    const secret = env.LENDLOOP_HMAC_SECRET;
    if (!url || !secret) {
      console.log("n8n not configured (N8N_WEBHOOK_URL / LENDLOOP_HMAC_SECRET); skipping notification.");
      return;
    }

    const payload = await ctx.runQuery(internal.automation.notificationPayload, {
      requestId: args.requestId,
      status: args.status,
    });
    if (payload === null) return;

    const body = JSON.stringify(payload);
    let problem: string;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await signedHeaders(secret, body)) },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) return;
      problem = `n8n answered ${res.status}`;
    } catch (e) {
      problem = e instanceof Error ? e.message : "network error";
    }

    const delay = RETRY_DELAYS_MS[args.attempt - 1];
    if (delay !== undefined) {
      console.warn(`Notification ${payload.eventId} failed (${problem}); retry ${args.attempt + 1} in ${delay / 1000}s.`);
      await ctx.scheduler.runAfter(delay, internal.automation.sendRequestEvent, {
        ...args,
        attempt: args.attempt + 1,
      });
      return;
    }

    await ctx.runMutation(internal.automation.recordEvent, {
      idempotencyKey: `notify-failed:${payload.eventId}`,
      kind: "notification_failed",
      message: `Notification could not be delivered after ${args.attempt} attempts (${problem}).`,
      requestId: args.requestId,
    });
  },
});

/**
 * Approved loans whose end date is before `today` and that haven't had a
 * reminder recorded for `today` yet — so re-running the daily workflow on
 * the same day doesn't email anyone twice. Only the borrower's contact
 * details are included: they are the one being reminded.
 */
export const overdueLoans = internalQuery({
  args: { today: v.string() },
  handler: async (ctx, { today }) => {
    const loans = await ctx.db
      .query("requests")
      .withIndex("by_status_and_endDate", (q) => q.eq("status", "approved").lt("endDate", today))
      .take(200);

    const result = [];
    for (const loan of loans) {
      const reminded = await ctx.db
        .query("automationEvents")
        .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", reminderKey(loan._id, today)))
        .first();
      if (reminded !== null) continue;

      const [tool, borrower] = await Promise.all([
        ctx.db.get("tools", loan.toolId),
        ctx.db.get("users", loan.borrowerId),
      ]);
      if (!borrower?.email) continue;
      result.push({
        requestId: loan._id,
        toolName: tool?.name ?? "a tool",
        endDate: loan.endDate,
        daysOverdue: Math.round((Date.parse(today) - Date.parse(loan.endDate)) / 86_400_000),
        borrower: { name: borrower.name, email: borrower.email },
        // n8n sends this back with its write-back, so a retry is recognised.
        idempotencyKey: reminderKey(loan._id, today),
      });
    }
    return result;
  },
});

function reminderKey(requestId: string, date: string) {
  return `reminder:${requestId}:${date}`;
}
