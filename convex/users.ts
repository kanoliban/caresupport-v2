import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const statusValidator = v.union(
  v.literal("onboarding"),
  v.literal("active"),
  v.literal("paused"),
  v.literal("archived"),
);

export const listByCareCase = query({
  args: { careCaseId: v.id("careCases") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();
  },
});

export const create = mutation({
  args: {
    phone: v.string(),
    name: v.string(),
    careCaseId: v.id("careCases"),
    status: statusValidator,
    relationshipToRecipient: v.optional(v.string()),
    chatId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("users"),
    name: v.optional(v.string()),
    status: v.optional(statusValidator),
    relationshipToRecipient: v.optional(v.string()),
    chatId: v.optional(v.string()),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});
