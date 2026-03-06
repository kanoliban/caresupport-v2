import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const statusValidator = v.union(
  v.literal("active"),
  v.literal("held"),
  v.literal("tapering"),
  v.literal("discontinued"),
);

export const listByFamily = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("medications")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .collect();
  },
});

export const listActiveByFamily = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("medications")
      .withIndex("by_family_status", (q) =>
        q.eq("familyId", args.familyId).eq("status", "active"),
      )
      .collect();
  },
});

export const create = mutation({
  args: {
    familyId: v.id("families"),
    name: v.string(),
    dose: v.string(),
    schedule: v.string(),
    prescriber: v.optional(v.string()),
    pharmacy: v.optional(v.string()),
    lastConfirmed: v.optional(v.number()),
    refillDue: v.optional(v.string()),
    status: statusValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("medications", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("medications"),
    name: v.optional(v.string()),
    dose: v.optional(v.string()),
    schedule: v.optional(v.string()),
    prescriber: v.optional(v.string()),
    pharmacy: v.optional(v.string()),
    lastConfirmed: v.optional(v.number()),
    refillDue: v.optional(v.string()),
    status: v.optional(statusValidator),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});
