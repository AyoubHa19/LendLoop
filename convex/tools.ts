import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { getCurrentUser, requireUser } from "./lib/auth";
import { changeStatus } from "./lib/requests";
import { category, condition } from "./schema";

const MAX_LIST = 200;

/** Reads active tools, optionally of one category, through an index. */
async function activeTools(ctx: QueryCtx, cat: Doc<"tools">["category"] | undefined) {
  const q =
    cat === undefined
      ? ctx.db.query("tools").withIndex("by_removed", (q) => q.eq("removed", false))
      : ctx.db
          .query("tools")
          .withIndex("by_removed_and_category", (q) => q.eq("removed", false).eq("category", cat));
  return await q.order("desc").take(MAX_LIST);
}

/** A tool is on loan while it has an approved (not yet returned) request. */
async function isOnLoan(ctx: QueryCtx, toolId: Id<"tools">) {
  const loan = await ctx.db
    .query("requests")
    .withIndex("by_toolId_and_status", (q) => q.eq("toolId", toolId).eq("status", "approved"))
    .first();
  return loan !== null;
}

function cleanText(value: string, field: string, max: number) {
  const text = value.trim();
  if (text.length === 0) throw new ConvexError(`${field} is required.`);
  if (text.length > max) throw new ConvexError(`${field} must be at most ${max} characters.`);
  return text;
}

/**
 * Public page: anyone, signed in or not. Returns ONLY name and category —
 * no owner, condition or description — so nothing about neighbours leaks
 * to anonymous visitors.
 */
export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const tools = await activeTools(ctx, undefined);
    return tools.map((t) => ({ _id: t._id, name: t.name, category: t.category }));
  },
});

/** Signed-in board: every active tool with details and availability. */
export const list = query({
  args: { category: v.optional(category) },
  handler: async (ctx, args) => {
    const me = await getCurrentUser(ctx);
    if (me === null) return [];

    const tools = await activeTools(ctx, args.category);
    return await Promise.all(
      tools.map(async (t) => {
        const owner = await ctx.db.get("users", t.ownerId);
        return {
          _id: t._id,
          name: t.name,
          category: t.category,
          condition: t.condition,
          description: t.description,
          available: !(await isOnLoan(ctx, t._id)),
          isMine: t.ownerId === me._id,
          // Lender's display name and badge only; their email stays private.
          ownerName: owner?.name ?? "Unknown",
          ownerTrusted: owner?.trustedLender ?? false,
        };
      }),
    );
  },
});

/** The caller's own active listings. */
export const myListings = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUser(ctx);
    if (me === null) return [];

    const tools = await ctx.db
      .query("tools")
      .withIndex("by_ownerId_and_removed", (q) => q.eq("ownerId", me._id).eq("removed", false))
      .order("desc")
      .take(MAX_LIST);
    return await Promise.all(
      tools.map(async (t) => ({
        _id: t._id,
        name: t.name,
        category: t.category,
        condition: t.condition,
        description: t.description,
        available: !(await isOnLoan(ctx, t._id)),
      })),
    );
  },
});

export const create = mutation({
  args: { name: v.string(), category, condition, description: v.string() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    return await ctx.db.insert("tools", {
      // The owner is always the caller; it is not an argument.
      ownerId: me._id,
      name: cleanText(args.name, "Name", 80),
      category: args.category,
      condition: args.condition,
      description: cleanText(args.description, "Description", 1000),
      removed: false,
    });
  },
});

export const update = mutation({
  args: {
    toolId: v.id("tools"),
    name: v.string(),
    category,
    condition,
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const tool = await ctx.db.get("tools", args.toolId);
    if (tool === null || tool.removed) throw new ConvexError("Tool not found.");
    // Only the owner may edit. Admins can remove a listing, not rewrite it.
    if (tool.ownerId !== me._id) throw new ConvexError("You can only edit your own listings.");

    await ctx.db.patch("tools", tool._id, {
      name: cleanText(args.name, "Name", 80),
      category: args.category,
      condition: args.condition,
      description: cleanText(args.description, "Description", 1000),
    });
  },
});

/**
 * Owner deletes their listing, or an admin removes any listing.
 * Pending requests for it are declined so borrowers aren't left waiting.
 * A tool that is currently lent out can't be removed until it's returned.
 */
export const remove = mutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, { toolId }) => {
    const me = await requireUser(ctx);
    const tool = await ctx.db.get("tools", toolId);
    if (tool === null || tool.removed) throw new ConvexError("Tool not found.");

    const isOwner = tool.ownerId === me._id;
    const isAdmin = me.role === "admin";
    if (!isOwner && !isAdmin) throw new ConvexError("You can only delete your own listings.");
    if (await isOnLoan(ctx, toolId)) {
      throw new ConvexError("This tool is on loan. Mark it returned before removing it.");
    }

    const pending = await ctx.db
      .query("requests")
      .withIndex("by_toolId_and_status", (q) => q.eq("toolId", toolId).eq("status", "pending"))
      .take(100);
    for (const r of pending) {
      await changeStatus(ctx, r, "declined");
    }
    await ctx.db.patch("tools", toolId, { removed: true });
  },
});
