import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const typeValidator = v.union(
  v.literal("shift"),
  v.literal("appointment"),
  v.literal("task"),
  v.literal("ride"),
  v.literal("careTask"),
);

const statusValidator = v.union(
  v.literal("scheduled"),
  v.literal("completed"),
  v.literal("cancelled"),
  v.literal("active"),
);

export const listByFamily = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scheduleItems")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .collect();
  },
});

export const listByFamilyAndType = query({
  args: {
    familyId: v.id("families"),
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
    familyId: v.id("families"),
    type: typeValidator,
    title: v.string(),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
    endTime: v.optional(v.string()),
    recurrence: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: statusValidator,
    day: v.optional(v.string()),
    provider: v.optional(v.string()),
    transport: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("scheduleItems", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("scheduleItems"),
    title: v.optional(v.string()),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
    endTime: v.optional(v.string()),
    recurrence: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.optional(statusValidator),
    day: v.optional(v.string()),
    provider: v.optional(v.string()),
    transport: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});
