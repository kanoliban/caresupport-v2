import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const directionValidator = v.union(
  v.literal("inbound"),
  v.literal("outbound"),
);

export const listByFamily = query({
  args: { familyId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("timelineEvents")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .collect();
  },
});

export const listByFamilyChronological = query({
  args: { familyId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const q = ctx.db
      .query("timelineEvents")
      .withIndex("by_family_timestamp", (q) =>
        q.eq("familyId", args.familyId),
      )
      .order("desc");
    if (args.limit) {
      return await q.take(args.limit);
    }
    return await q.collect();
  },
});

export const create = mutation({
  args: {
    familyId: v.string(),
    timestamp: v.number(),
    direction: directionValidator,
    memberName: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("timelineEvents", args);
  },
});
