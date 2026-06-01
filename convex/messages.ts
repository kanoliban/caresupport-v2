import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const directionValidator = v.union(
  v.literal("inbound"),
  v.literal("outbound"),
);

const actorTypeValidator = v.union(
  v.literal("user"),
  v.literal("assistant"),
  v.literal("system"),
);

export const listByCareCase = query({
  args: { careCaseId: v.id("careCases") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
      .collect();
  },
});

export const create = mutation({
  args: {
    careCaseId: v.id("careCases"),
    userId: v.id("users"),
    senderPhone: v.optional(v.string()),
    actorType: actorTypeValidator,
    direction: directionValidator,
    body: v.string(),
    timestamp: v.number(),
    linqMessageId: v.optional(v.string()),
    displayName: v.optional(v.string()),
    careContactId: v.optional(v.id("careContacts")),
    coordinationEventId: v.optional(v.id("coordinationEvents")),
    outreachAttemptId: v.optional(v.id("outreachAttempts")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", args);
  },
});
