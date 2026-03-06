import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const eventValidator = v.union(
  v.literal("context_load"),
  v.literal("response_sent"),
  v.literal("response_blocked"),
  v.literal("outreach_sent"),
  v.literal("unknown_number"),
  v.literal("message_failed"),
  v.literal("message_status_update"),
);

const detailsValidator = v.object({
  sectionsLoaded: v.optional(v.array(v.string())),
  triggerMessage: v.optional(v.string()),
  responseLength: v.optional(v.number()),
  leakageCheckPassed: v.optional(v.boolean()),
  leakedCategories: v.optional(v.array(v.string())),
  leakedTerms: v.optional(v.array(v.string())),
  severity: v.optional(v.string()),
  recipientPhone: v.optional(v.string()),
  initiatedBy: v.optional(v.string()),
  sentTo: v.optional(
    v.object({
      phone: v.string(),
      name: v.string(),
    }),
  ),
  purpose: v.optional(v.string()),
  phiDisclosed: v.optional(v.boolean()),
  sourceMessageId: v.optional(v.string()),
  failureReason: v.optional(v.string()),
  deliveryStatus: v.optional(v.string()),
});

export const listByFamily = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("auditLogs")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .collect();
  },
});

export const listByFamilyWindow = query({
  args: {
    familyId: v.id("families"),
    from: v.number(),
    to: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("auditLogs")
      .withIndex("by_family_timestamp", (q) =>
        q
          .eq("familyId", args.familyId)
          .gte("timestamp", args.from)
          .lte("timestamp", args.to),
      )
      .collect();
  },
});

export const create = mutation({
  args: {
    familyId: v.optional(v.id("families")),
    event: eventValidator,
    phone: v.optional(v.string()),
    accessLevel: v.optional(v.string()),
    role: v.optional(v.string()),
    details: v.optional(detailsValidator),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("auditLogs", args);
  },
});
