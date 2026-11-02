/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { beforeEach, describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { signedHeaders, verifySignature } from "./lib/hmac";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const SECRET = "test-secret-only-for-tests";

beforeEach(() => {
  process.env.LENDLOOP_HMAC_SECRET = SECRET;
});

function day(n: number) {
  return new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
}

/** A backend with one approved loan that ended two days ago. */
async function withOverdueLoan() {
  const t = convexTest(schema, modules);
  const requestId = await t.run(async (ctx) => {
    const lender = await ctx.db.insert("users", {
      tokenIdentifier: "lender", name: "Alice", email: "alice@example.com", role: "user", trustedLender: false,
    });
    const borrower = await ctx.db.insert("users", {
      tokenIdentifier: "borrower", name: "Bob", email: "bob@example.com", role: "user", trustedLender: false,
    });
    const toolId = await ctx.db.insert("tools", {
      ownerId: lender, name: "Ladder", category: "ladders", condition: "good", description: "3 m", removed: false,
    });
    return await ctx.db.insert("requests", {
      toolId, lenderId: lender, borrowerId: borrower, startDate: day(-5), endDate: day(-2), status: "approved",
    });
  });
  return { t, requestId };
}

async function signedPost(t: ReturnType<typeof convexTest>, path: string, data: unknown, secret = SECRET) {
  const body = JSON.stringify(data);
  return await t.fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await signedHeaders(secret, body)) },
    body,
  });
}

describe("HMAC", () => {
  test("accepts the exact body it signed", async () => {
    const headers = new Headers(await signedHeaders(SECRET, '{"a":1}'));
    expect(await verifySignature(SECRET, headers, '{"a":1}')).toBe(true);
  });

  test("rejects a changed body, a wrong secret and an old timestamp", async () => {
    const headers = new Headers(await signedHeaders(SECRET, '{"a":1}'));
    expect(await verifySignature(SECRET, headers, '{"a":2}')).toBe(false);
    expect(await verifySignature("other-secret", headers, '{"a":1}')).toBe(false);

    const tenMinutesAgo = Date.now() - 10 * 60_000;
    const old = new Headers(await signedHeaders(SECRET, "", tenMinutesAgo));
    expect(await verifySignature(SECRET, old, "")).toBe(false);
  });
});

describe("n8n endpoints", () => {
  test("refuse unsigned or wrongly signed calls", async () => {
    const { t } = await withOverdueLoan();
    expect((await t.fetch("/n8n/overdue-loans", { method: "GET" })).status).toBe(401);
    const forged = await signedPost(t, "/n8n/activity", { idempotencyKey: "x", kind: "reminder_sent", message: "hi" }, "wrong");
    expect(forged.status).toBe(401);
  });

  test("overdue-loans returns only what the reminder needs", async () => {
    const { t, requestId } = await withOverdueLoan();
    const res = await t.fetch("/n8n/overdue-loans", { method: "GET", headers: await signedHeaders(SECRET, "") });
    expect(res.status).toBe(200);
    const { loans } = await res.json();
    expect(loans).toHaveLength(1);
    expect(loans[0]).toMatchObject({ requestId, toolName: "Ladder", daysOverdue: 2, borrower: { name: "Bob", email: "bob@example.com" } });
    // The lender's email is not needed for a reminder, so it isn't sent.
    expect(JSON.stringify(loans)).not.toContain("alice@example.com");
  });

  test("write-back is idempotent and stops a second reminder the same day", async () => {
    const { t, requestId } = await withOverdueLoan();
    const res = await t.fetch("/n8n/overdue-loans", { method: "GET", headers: await signedHeaders(SECRET, "") });
    const [loan] = (await res.json()).loans;

    const event = { idempotencyKey: loan.idempotencyKey, kind: "reminder_sent", message: "Reminder email sent", requestId };
    expect(await (await signedPost(t, "/n8n/activity", event)).json()).toEqual({ result: "recorded" });
    expect(await (await signedPost(t, "/n8n/activity", event)).json()).toEqual({ result: "duplicate" });

    const events = await t.run((ctx) => ctx.db.query("automationEvents").collect());
    expect(events).toHaveLength(1);

    const again = await t.fetch("/n8n/overdue-loans", { method: "GET", headers: await signedHeaders(SECRET, "") });
    expect((await again.json()).loans).toHaveLength(0);
  });

  test("rejects malformed write-backs", async () => {
    const { t } = await withOverdueLoan();
    const badKind = await signedPost(t, "/n8n/activity", { idempotencyKey: "k", kind: "notification_failed", message: "x" });
    expect(badKind.status).toBe(400);
    const badId = await signedPost(t, "/n8n/activity", { idempotencyKey: "k", kind: "reminder_sent", message: "x", requestId: "nope" });
    expect(badId.status).toBe(400);
  });

  test("users see sent reminders on their loan, not failures", async () => {
    const { t, requestId } = await withOverdueLoan();
    await signedPost(t, "/n8n/activity", { idempotencyKey: "r1", kind: "reminder_sent", message: "Reminder email sent", requestId });
    await signedPost(t, "/n8n/activity", { idempotencyKey: "e1", kind: "workflow_error", message: "SMTP down", requestId });

    const bob = t.withIdentity({ tokenIdentifier: "borrower" });
    const [loan] = await bob.query(api.requests.mine, {});
    expect(loan.activity.map((a) => a.message)).toEqual(["Reminder email sent"]);
  });
});
