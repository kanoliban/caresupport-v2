import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

const directionValidator = v.union(
  v.literal("inbound"),
  v.literal("outbound"),
);

const eventValidator = v.union(
  v.literal("context_load"),
  v.literal("response_sent"),
  v.literal("response_blocked"),
  v.literal("outreach_sent"),
  v.literal("unknown_number"),
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
  sentTo: v.optional(v.object({ phone: v.string(), name: v.string() })),
  purpose: v.optional(v.string()),
  phiDisclosed: v.optional(v.boolean()),
});

const scopeValidator = v.union(v.literal("global"), v.literal("family"));
const categoryValidator = v.union(
  v.literal("behavioral"),
  v.literal("factual"),
  v.literal("operational"),
);

const statusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("expired"),
);

const updateValidator = v.object({
  section: v.string(),
  operation: v.string(),
  content: v.string(),
  oldContent: v.string(),
});

export const logConversation = internalMutation({
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

export const logTimeline = internalMutation({
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

export const logAudit = internalMutation({
  args: {
    familyId: v.string(),
    event: eventValidator,
    phone: v.string(),
    accessLevel: v.optional(v.string()),
    role: v.optional(v.string()),
    details: detailsValidator,
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("auditLogs", args);
  },
});

export const persistLesson = internalMutation({
  args: {
    familyId: v.optional(v.string()),
    scope: scopeValidator,
    category: categoryValidator,
    text: v.string(),
    learnedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("lessons", args);
  },
});

export const createApproval = internalMutation({
  args: {
    familyId: v.string(),
    status: statusValidator,
    requesterPhone: v.string(),
    requesterName: v.string(),
    approverPhones: v.array(v.string()),
    description: v.string(),
    update: updateValidator,
    createdAt: v.number(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("approvals", args);
  },
});

export const updateMemberChatId = internalMutation({
  args: {
    memberId: v.id("members"),
    chatId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.memberId, { chatId: args.chatId });
  },
});

export const getMemberByPhone = internalMutation({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("members")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();
  },
});

export const getFamilyContext = internalMutation({
  args: { familyId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("familyContext")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .first();
  },
});

export const getRecentConversations = internalMutation({
  args: { phone: v.string(), limit: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conversations")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .order("desc")
      .take(args.limit);
  },
});

export const getFamilyLessons = internalMutation({
  args: { familyId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("lessons")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .collect();
  },
});

export const getPendingApprovals = internalMutation({
  args: { familyId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("approvals")
      .withIndex("by_family_status", (q) =>
        q.eq("familyId", args.familyId).eq("status", "pending"),
      )
      .collect();
  },
});
