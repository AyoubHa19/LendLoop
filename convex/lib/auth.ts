import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Access-control helpers. Every public function that reads private data or
 * changes anything starts with one of these. The caller is always derived
 * from the verified Clerk JWT (ctx.auth), never from a function argument,
 * so a client cannot claim to be someone else.
 */

/** The signed-in user's row, or null if signed out / not yet registered. */
export async function getCurrentUser(ctx: QueryCtx | MutationCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
}

/** The signed-in user's row; throws if there is none. */
export async function requireUser(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (user === null) throw new ConvexError("You need to be signed in.");
  return user;
}

/** The signed-in user's row, only if they are an admin. */
export async function requireAdmin(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.role !== "admin") throw new ConvexError("Admins only.");
  return user;
}
