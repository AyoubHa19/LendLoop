/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

/** A date n days from today, as "YYYY-MM-DD" (UTC, like the backend). */
function day(n: number) {
  return new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
}

/** Fresh backend with three signed-up users: two neighbours and an admin. */
async function setup() {
  const t = convexTest(schema, modules);
  const alice = t.withIdentity({ subject: "alice", name: "Alice", email: "alice@example.com" });
  const bob = t.withIdentity({ subject: "bob", name: "Bob", email: "bob@example.com" });
  const admin = t.withIdentity({ subject: "admin", name: "Admin", email: "admin@example.com" });
  await alice.mutation(api.users.ensure, {});
  await bob.mutation(api.users.ensure, {});
  await admin.mutation(api.users.ensure, {});
  await t.mutation(internal.users.promoteToAdmin, { email: "admin@example.com" });

  const drill = await alice.mutation(api.tools.create, {
    name: "Cordless drill",
    category: "power-tools",
    condition: "good",
    description: "18V, two batteries.",
  });
  return { t, alice, bob, admin, drill };
}

describe("public page", () => {
  test("anonymous visitors see only name and category", async () => {
    const { t } = await setup();
    const tools = await t.query(api.tools.listPublic, {});
    expect(tools).toHaveLength(1);
    expect(Object.keys(tools[0]).sort()).toEqual(["_id", "category", "name"]);
  });

  test("anonymous visitors can't create listings", async () => {
    const { t } = await setup();
    await expect(
      t.mutation(api.tools.create, {
        name: "Saw",
        category: "hand-tools",
        condition: "fair",
        description: "Sharp.",
      }),
    ).rejects.toThrow("signed in");
  });
});

describe("listings", () => {
  test("only the owner can edit a listing", async () => {
    const { bob, admin, drill } = await setup();
    const edit = { toolId: drill, name: "Mine now", category: "garden", condition: "new", description: "x" } as const;
    await expect(bob.mutation(api.tools.update, edit)).rejects.toThrow("your own listings");
    // Admins remove listings; they don't rewrite other people's.
    await expect(admin.mutation(api.tools.update, edit)).rejects.toThrow("your own listings");
  });

  test("another user can't delete a listing, an admin can", async () => {
    const { t, bob, admin, drill } = await setup();
    await expect(bob.mutation(api.tools.remove, { toolId: drill })).rejects.toThrow("your own listings");
    await admin.mutation(api.tools.remove, { toolId: drill });
    expect(await t.query(api.tools.listPublic, {})).toHaveLength(0);
  });
});

describe("requests and loans", () => {
  test("full loan: request, approve, return", async () => {
    const { alice, bob, drill } = await setup();
    const req = await bob.mutation(api.requests.create, { toolId: drill, startDate: day(1), endDate: day(3) });

    expect(await alice.query(api.requests.incoming, {})).toHaveLength(1);
    await alice.mutation(api.requests.approve, { requestId: req });
    expect((await bob.query(api.tools.list, {}))[0].available).toBe(false);

    await alice.mutation(api.requests.markReturned, { requestId: req });
    const [mine] = await bob.query(api.requests.mine, {});
    expect(mine.status).toBe("returned");
  });

  test("the borrower can't approve or return their own request", async () => {
    const { alice, bob, drill } = await setup();
    const req = await bob.mutation(api.requests.create, { toolId: drill, startDate: day(1), endDate: day(2) });
    await expect(bob.mutation(api.requests.approve, { requestId: req })).rejects.toThrow("owner");
    await alice.mutation(api.requests.approve, { requestId: req });
    await expect(bob.mutation(api.requests.markReturned, { requestId: req })).rejects.toThrow("owner");
  });

  test("a third user can't touch someone else's request", async () => {
    const { t, bob, drill } = await setup();
    const carol = t.withIdentity({ subject: "carol", name: "Carol" });
    await carol.mutation(api.users.ensure, {});
    const req = await bob.mutation(api.requests.create, { toolId: drill, startDate: day(1), endDate: day(2) });

    await expect(carol.mutation(api.requests.decline, { requestId: req })).rejects.toThrow("owner");
    await expect(carol.mutation(api.requests.cancel, { requestId: req })).rejects.toThrow("your own requests");
    expect(await carol.query(api.requests.incoming, {})).toHaveLength(0);
    expect(await carol.query(api.requests.mine, {})).toHaveLength(0);
  });

  test("you can't borrow your own tool", async () => {
    const { alice, drill } = await setup();
    await expect(
      alice.mutation(api.requests.create, { toolId: drill, startDate: day(1), endDate: day(2) }),
    ).rejects.toThrow("your own tool");
  });

  test("overlapping dates are refused once a loan is approved", async () => {
    const { t, alice, bob, drill } = await setup();
    const req = await bob.mutation(api.requests.create, { toolId: drill, startDate: day(1), endDate: day(5) });
    await alice.mutation(api.requests.approve, { requestId: req });

    const carol = t.withIdentity({ subject: "carol", name: "Carol" });
    await carol.mutation(api.users.ensure, {});
    await expect(
      carol.mutation(api.requests.create, { toolId: drill, startDate: day(4), endDate: day(6) }),
    ).rejects.toThrow("already lent out");
  });

  test("bad dates are refused", async () => {
    const { bob, drill } = await setup();
    const create = (startDate: string, endDate: string) =>
      bob.mutation(api.requests.create, { toolId: drill, startDate, endDate });
    await expect(create("2026-02-30", "2026-03-01")).rejects.toThrow("YYYY-MM-DD");
    await expect(create(day(3), day(1))).rejects.toThrow("on or after");
    await expect(create(day(-2), day(1))).rejects.toThrow("past");
  });
});

describe("admin", () => {
  test("only admins see all loans and grant Trusted Lender", async () => {
    const { t, alice, bob, admin } = await setup();
    await expect(bob.query(api.admin.allLoans, {})).rejects.toThrow("Admins only");

    const aliceId = (await alice.query(api.users.me, {}))!._id;
    await expect(
      bob.mutation(api.admin.setTrustedLender, { userId: aliceId, trusted: true }),
    ).rejects.toThrow("Admins only");

    await admin.mutation(api.admin.setTrustedLender, { userId: aliceId, trusted: true });
    expect((await alice.query(api.users.me, {}))!.trustedLender).toBe(true);
    expect(await t.query(api.users.me, {})).toBeNull();
  });

  test("signing in again never resets or grants a role", async () => {
    const { admin, bob } = await setup();
    await admin.mutation(api.users.ensure, {});
    expect((await admin.query(api.users.me, {}))!.isAdmin).toBe(true);
    await bob.mutation(api.users.ensure, {});
    expect((await bob.query(api.users.me, {}))!.isAdmin).toBe(false);
  });
});
