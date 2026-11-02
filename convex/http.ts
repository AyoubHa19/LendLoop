import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { env, httpAction } from "./_generated/server";
import { verifySignature } from "./lib/hmac";

/**
 * HTTP endpoints for n8n. Each one verifies the HMAC signature on the raw
 * request before doing anything; an unsigned, tampered or replayed request
 * gets 401 and touches no data. They expose only internal functions, with
 * the minimum data each workflow needs.
 */
const http = httpRouter();

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Reads the raw body and checks its signature. Null means "reject". */
async function verifiedBody(req: Request): Promise<string | null> {
  const secret = env.LENDLOOP_HMAC_SECRET;
  if (!secret) return null;
  const body = await req.text();
  return (await verifySignature(secret, req.headers, body)) ? body : null;
}

/**
 * Daily reminder workflow: the overdue loans to remind today.
 * GET, signed over an empty body.
 */
http.route({
  path: "/n8n/overdue-loans",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    if ((await verifiedBody(req)) === null) return json({ error: "invalid signature" }, 401);
    const today = new Date().toISOString().slice(0, 10);
    const loans = await ctx.runQuery(internal.automation.overdueLoans, { today });
    return json({ date: today, loans });
  }),
});

const N8N_KINDS = ["notification_sent", "reminder_sent", "workflow_error"] as const;
type N8nKind = (typeof N8N_KINDS)[number];

/**
 * Write-back from n8n: "I sent this email" or "this workflow failed".
 * Idempotent on idempotencyKey, so retries are safe: the answer is
 * "recorded" the first time and "duplicate" afterwards.
 */
http.route({
  path: "/n8n/activity",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const body = await verifiedBody(req);
    if (body === null) return json({ error: "invalid signature" }, 401);

    let data: unknown;
    try {
      data = JSON.parse(body);
    } catch {
      return json({ error: "body must be JSON" }, 400);
    }
    if (typeof data !== "object" || data === null) return json({ error: "body must be an object" }, 400);
    const { idempotencyKey, kind, message, requestId } = data as Record<string, unknown>;

    if (typeof idempotencyKey !== "string" || idempotencyKey.length === 0 || idempotencyKey.length > 200) {
      return json({ error: "idempotencyKey must be a non-empty string (max 200)" }, 400);
    }
    if (typeof kind !== "string" || !N8N_KINDS.includes(kind as N8nKind)) {
      return json({ error: `kind must be one of ${N8N_KINDS.join(", ")}` }, 400);
    }
    if (typeof message !== "string" || message.length === 0 || message.length > 500) {
      return json({ error: "message must be a non-empty string (max 500)" }, 400);
    }
    if (requestId !== undefined && typeof requestId !== "string") {
      return json({ error: "requestId must be a string" }, 400);
    }

    const result = await ctx.runMutation(internal.automation.recordEvent, {
      idempotencyKey,
      kind: kind as N8nKind,
      message,
      requestId,
    });
    if (result === "unknown_request") return json({ error: "unknown requestId" }, 400);
    return json({ result });
  }),
});

export default http;
