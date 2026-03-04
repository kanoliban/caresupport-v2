import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getByFamilyId = query({
  args: { familyId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("families")
      .withIndex("by_family_id", (q) => q.eq("familyId", args.familyId))
      .first();
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("families").collect();
  },
});

export const create = mutation({
  args: {
    familyId: v.string(),
    familyName: v.string(),
    careRecipient: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("archived"),
    ),
    timezone: v.string(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("families", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("families"),
    familyName: v.optional(v.string()),
    careRecipient: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("paused"),
        v.literal("archived"),
      ),
    ),
    timezone: v.optional(v.string()),
    notes: v.optional(v.string()),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});
