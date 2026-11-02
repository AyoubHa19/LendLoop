import { ConvexError, v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * Testing helper for the daily reminder workflow: moves an approved loan's
 * dates into the past so it shows up as overdue. Internal, so it can only
 * be run by the deployment owner from the CLI or dashboard:
 *   npx convex run devTools:makeLoanOverdue '{"requestId":"<id>"}'
 */
export const makeLoanOverdue = internalMutation({
  args: { requestId: v.id("requests") },
  handler: async (ctx, { requestId }) => {
    const loan = await ctx.db.get("requests", requestId);
    if (loan === null || loan.status !== "approved") {
      throw new ConvexError("Pick an approved (active) loan.");
    }
    const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
    await ctx.db.patch("requests", requestId, { startDate: day(-5), endDate: day(-2) });
  },
});
