import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const typeValidator = v.union(
  v.literal("ride"),
  v.literal("careTask"),
  v.literal("appointment"),
);

const statusValidator = v.union(
  v.literal("active"),
  v.literal("completed"),
  v.literal("cancelled"),
);

export const listByFamily = query({
  args: { familyId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scheduleItems")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .collect();
  },
});

export const listByFamilyAndType = query({
  args: {
    familyId: v.string(),
    type: typeValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scheduleItems")
      .withIndex("by_family_type", (q) =>
        q.eq("familyId", args.familyId).eq("type", args.type),
      )
      .collect();
  },
});

export const create = mutation({
  args: {
    familyId: v.string(),
    type: typeValidator,
    title: v.string(),
    day: v.optional(v.string()),
    time: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
    provider: v.optional(v.string()),
    location: v.optional(v.string()),
    transport: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: statusValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("scheduleItems", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("scheduleItems"),
    title: v.optional(v.string()),
    day: v.optional(v.string()),
    time: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
    provider: v.optional(v.string()),
    location: v.optional(v.string()),
    transport: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.optional(statusValidator),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});
