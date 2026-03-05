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
      .query("conversations")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .collect();
  },
});

export const listByPhone = query({
  args: { phone: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const q = ctx.db
      .query("conversations")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .order("desc");
    if (args.limit) {
      return await q.take(args.limit);
    }
    return await q.collect();
  },
});

export const listRecent = query({
  args: { familyId: v.string(), limit: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conversations")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .order("desc")
      .take(args.limit);
  },
});

export const create = mutation({
  args: {
    familyId: v.string(),
    phone: v.string(),
    direction: directionValidator,
    memberName: v.optional(v.string()),
    body: v.string(),
    timestamp: v.number(),
    sourceMessageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("conversations", args);
  },
});
