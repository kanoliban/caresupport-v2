import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const scopeValidator = v.union(v.literal("global"), v.literal("family"));
const categoryValidator = v.union(
  v.literal("behavioral"),
  v.literal("factual"),
  v.literal("operational"),
);

export const listGlobal = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("lessons")
      .withIndex("by_scope", (q) => q.eq("scope", "global"))
      .collect();
  },
});

export const listByFamily = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("lessons")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .collect();
  },
});

export const create = mutation({
  args: {
    familyId: v.optional(v.id("families")),
    scope: scopeValidator,
    category: categoryValidator,
    text: v.string(),
    learnedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("lessons", args);
  },
});
