import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const typeValidator = v.union(
  v.literal("appointment"),
  v.literal("task"),
  v.literal("reminder"),
);

const statusValidator = v.union(
  v.literal("scheduled"),
  v.literal("completed"),
  v.literal("cancelled"),
  v.literal("active"),
);

export const listByCareCase = query({
  args: { careCaseId: v.id("careCases") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scheduleItems")
      .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
      .collect();
  },
});

export const listByCareCaseAndType = query({
  args: {
    careCaseId: v.id("careCases"),
    type: typeValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scheduleItems")
      .withIndex("by_care_case_type", (q) =>
        q.eq("careCaseId", args.careCaseId).eq("type", args.type),
      )
      .collect();
  },
});

export const create = mutation({
  args: {
    careCaseId: v.id("careCases"),
    type: typeValidator,
    title: v.string(),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
    endTime: v.optional(v.string()),
    recurrence: v.optional(v.string()),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: statusValidator,
    provider: v.optional(v.string()),
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
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
    provider: v.optional(v.string()),
    status: v.optional(statusValidator),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});
