import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";

/**
 * Creates the caller's user row on first sign-in, and keeps name/email in
 * sync with Clerk afterwards. Called by the app once the user is signed in.
 * Role and Trusted Lender are never set here: a new user is always a plain
 * "user", whatever the client sends.
 */
export const ensure = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) throw new ConvexError("You need to be signed in.");

    const name = identity.name ?? identity.nickname ?? "Neighbour";
    const email = identity.email;

    const existing = await getCurrentUser(ctx);
    if (existing !== null) {
      if (existing.name !== name || existing.email !== email) {
        await ctx.db.patch("users", existing._id, { name, email });
      }
      return existing._id;
    }
    return await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      name,
      email,
      role: "user",
      trustedLender: false,
    });
  },
});

/** What the UI needs to know about the caller (null when signed out). */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (user === null) return null;
    return {
      _id: user._id,
      name: user.name,
      isAdmin: user.role === "admin",
      trustedLender: user.trustedLender,
    };
  },
});

/**
 * Makes an existing user an admin. Internal: it cannot be called from the
 * browser, only from the CLI or dashboard by whoever owns the deployment:
 *   npx convex run users:promoteToAdmin '{"email":"you@example.com"}'
 */
export const promoteToAdmin = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    // Small table and a one-off admin task, so a bounded scan is fine here.
    const users = await ctx.db.query("users").take(1000);
    const user = users.find((u) => u.email === email);
    if (user === undefined) throw new ConvexError(`No user with email ${email}. Sign in once first.`);
    await ctx.db.patch("users", user._id, { role: "admin" });
    return user._id;
  },
});
