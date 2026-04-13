import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const scopeValidator = v.union(
  v.literal("user"),
  v.literal("care_case"),
);

const categoryValidator = v.union(
  v.literal("profile"),
  v.literal("communication_preference"),
  v.literal("care_preference"),
  v.literal("care_note"),
  v.literal("lesson"),
);

export const listByCareCase = query({
  args: { careCaseId: v.id("careCases") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("memoryEntries")
      .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
      .collect();
  },
});

export const listByUserScope = query({
  args: {
    userId: v.id("users"),
    scope: scopeValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("memoryEntries")
      .withIndex("by_user_scope", (q) =>
        q.eq("userId", args.userId).eq("scope", args.scope),
      )
      .collect();
  },
});

export const create = mutation({
  args: {
    careCaseId: v.id("careCases"),
    userId: v.id("users"),
    scope: scopeValidator,
    category: categoryValidator,
    content: v.string(),
    source: v.optional(v.string()),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("memoryEntries", args);
  },
});
