import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("families").collect();
  },
});

export const get = query({
  args: { id: v.id("families") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    status: v.union(
      v.literal("onboarding"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("archived"),
    ),
    timezone: v.string(),
    context: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    careRecipient: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("families", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("families"),
    name: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("onboarding"),
        v.literal("active"),
        v.literal("paused"),
        v.literal("archived"),
      ),
    ),
    timezone: v.optional(v.string()),
    context: v.optional(v.string()),
    careRecipient: v.optional(v.string()),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});
