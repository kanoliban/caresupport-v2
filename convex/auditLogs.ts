import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const eventValidator = v.union(
  v.literal("context_load"),
  v.literal("response_sent"),
  v.literal("response_blocked"),
  v.literal("unknown_user"),
  v.literal("message_failed"),
  v.literal("message_status_update"),
  v.literal("reaction_received"),
  v.literal("participant_changed"),
  v.literal("user_created"),
  v.literal("care_case_created"),
  v.literal("user_profile_updated"),
  v.literal("care_case_updated"),
  v.literal("memory_saved"),
  v.literal("outreach_requested"),
  v.literal("outreach_approved"),
  v.literal("outreach_blocked"),
  v.literal("outreach_sent"),
  v.literal("outreach_failed"),
  v.literal("care_contact_reply_received"),
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
  sourceMessageId: v.optional(v.string()),
  failureReason: v.optional(v.string()),
  deliveryStatus: v.optional(v.string()),
  reactionType: v.optional(v.string()),
  participantAction: v.optional(v.string()),
  participantPhone: v.optional(v.string()),
  savedCategories: v.optional(v.array(v.string())),
  outreachAttemptId: v.optional(v.string()),
  coordinationEventId: v.optional(v.string()),
  careContactId: v.optional(v.string()),
  messageBody: v.optional(v.string()),
  status: v.optional(v.string()),
  reason: v.optional(v.string()),
  matchedCount: v.optional(v.number()),
  linqChatId: v.optional(v.string()),
  linqMessageId: v.optional(v.string()),
});

export const listByCareCase = query({
  args: { careCaseId: v.id("careCases") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("auditLogs")
      .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
      .collect();
  },
});

export const create = mutation({
  args: {
    careCaseId: v.optional(v.id("careCases")),
    userId: v.optional(v.id("users")),
    event: eventValidator,
    phone: v.optional(v.string()),
    details: detailsValidator,
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("auditLogs", args);
  },
});
