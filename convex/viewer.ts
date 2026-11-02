import { query } from "./_generated/server";

/**
 * Who is signed in, as Convex sees it (null when signed out).
 * Used in stage 1 to prove the chain works end to end:
 * Clerk signs the user in -> the browser sends Clerk's JWT ->
 * Convex verifies it (auth.config.ts) -> ctx.auth knows the user.
 */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) return null;
    return { name: identity.name ?? null };
  },
});
