import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const statusValidator = v.union(
  v.literal("onboarding"),
  v.literal("active"),
  v.literal("paused"),
  v.literal("archived"),
);

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("careCases").collect();
  },
});

export const get = query({
  args: { id: v.id("careCases") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    status: statusValidator,
    timezone: v.string(),
    careRecipientName: v.optional(v.string()),
    relationshipToRecipient: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("careCases", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("careCases"),
    title: v.optional(v.string()),
    status: v.optional(statusValidator),
    timezone: v.optional(v.string()),
    careRecipientName: v.optional(v.string()),
    relationshipToRecipient: v.optional(v.string()),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});
