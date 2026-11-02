import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Fixed lists keep the data clean and make category filtering an index lookup.
export const CATEGORIES = [
  "power-tools",
  "hand-tools",
  "garden",
  "ladders",
  "cleaning",
  "other",
] as const;
export const CONDITIONS = ["new", "good", "fair", "worn"] as const;

export const category = v.union(...CATEGORIES.map((c) => v.literal(c)));
export const condition = v.union(...CONDITIONS.map((c) => v.literal(c)));

// Lifecycle of a borrow request:
//   pending -> approved -> returned
//   pending -> declined | cancelled
// An "approved" request is an active (or upcoming) loan.
export const requestStatus = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("declined"),
  v.literal("cancelled"),
  v.literal("returned"),
);

export default defineSchema({
  // One row per Clerk user, created on first sign-in (users.ensure).
  users: defineTable({
    // Stable identity from the verified Clerk JWT. Never taken from client args.
    tokenIdentifier: v.string(),
    name: v.string(),
    // Kept only so reminders can be emailed; never returned to other users.
    email: v.optional(v.string()),
    // Roles are changed only by an admin or the CLI, never by the user.
    role: v.union(v.literal("user"), v.literal("admin")),
    trustedLender: v.boolean(),
  }).index("by_tokenIdentifier", ["tokenIdentifier"]),

  tools: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category,
    condition,
    description: v.string(),
    // Soft delete: a removed tool disappears from listings but its loan
    // history stays readable.
    removed: v.boolean(),
  })
    .index("by_removed", ["removed"])
    .index("by_removed_and_category", ["removed", "category"])
    .index("by_ownerId_and_removed", ["ownerId", "removed"]),

  requests: defineTable({
    toolId: v.id("tools"),
    // Copied from the tool so "incoming requests" is a single index lookup.
    lenderId: v.id("users"),
    borrowerId: v.id("users"),
    // Calendar dates as "YYYY-MM-DD" (a loan is booked by day, not by hour).
    startDate: v.string(),
    endDate: v.string(),
    status: requestStatus,
    returnedAt: v.optional(v.number()),
  })
    .index("by_borrowerId", ["borrowerId"])
    .index("by_lenderId", ["lenderId"])
    .index("by_toolId_and_status", ["toolId", "status"])
    // For the daily overdue check: approved loans whose end date has passed.
    .index("by_status_and_endDate", ["status", "endDate"]),
});
