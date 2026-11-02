import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

/**
 * Admin-only functions. Each one calls requireAdmin first, so hiding the
 * admin page in the UI is a convenience, not the protection.
 */

/** Every loan request, newest first, with the names involved. */
export const allLoans = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("requests").order("desc").take(200);
    return await Promise.all(
      rows.map(async (r) => {
        const [tool, lender, borrower] = await Promise.all([
          ctx.db.get("tools", r.toolId),
          ctx.db.get("users", r.lenderId),
          ctx.db.get("users", r.borrowerId),
        ]);
        return {
          _id: r._id,
          toolName: tool?.name ?? "Removed tool",
          lenderName: lender?.name ?? "Unknown",
          borrowerName: borrower?.name ?? "Unknown",
          startDate: r.startDate,
          endDate: r.endDate,
          status: r.status,
        };
      }),
    );
  },
});

/** Users, for granting the Trusted Lender badge. Emails are not exposed. */
export const users = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("users").take(500);
    return rows.map((u) => ({
      _id: u._id,
      name: u.name,
      isAdmin: u.role === "admin",
      trustedLender: u.trustedLender,
    }));
  },
});

export const setTrustedLender = mutation({
  args: { userId: v.id("users"), trusted: v.boolean() },
  handler: async (ctx, { userId, trusted }) => {
    await requireAdmin(ctx);
    const user = await ctx.db.get("users", userId);
    if (user === null) throw new ConvexError("User not found.");
    await ctx.db.patch("users", userId, { trustedLender: trusted });
  },
});
