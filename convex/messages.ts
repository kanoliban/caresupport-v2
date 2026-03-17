import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const directionValidator = v.union(
  v.literal("inbound"),
  v.literal("outbound"),
);

export const listByFamily = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .collect();
  },
});

export const create = mutation({
  args: {
    familyId: v.id("families"),
    senderPhone: v.optional(v.string()),
    direction: directionValidator,
    body: v.string(),
    timestamp: v.number(),
    linqMessageId: v.optional(v.string()),
    memberName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", args);
  },
});
