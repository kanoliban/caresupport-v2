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
  sentTo: v.optional(v.object({ phone: v.string(), name: v.string() })),
  purpose: v.optional(v.string()),
  phiDisclosed: v.optional(v.boolean()),
  sourceMessageId: v.optional(v.string()),
  failureReason: v.optional(v.string()),
  deliveryStatus: v.optional(v.string()),
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

export const logMessage = internalMutation({
  args: {
    familyId: v.id("families"),
    senderPhone: v.optional(v.string()),
    direction: directionValidator,
    memberName: v.optional(v.string()),
    body: v.string(),
    timestamp: v.number(),
    linqMessageId: v.optional(v.string()),
    chatId: v.optional(v.id("chats")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", args);
  },
});

export const logAudit = internalMutation({
  args: {
    familyId: v.optional(v.id("families")),
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
    familyId: v.optional(v.id("families")),
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
    familyId: v.id("families"),
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
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    const family = await ctx.db.get(args.familyId);
    if (!family) return null;
    return { context: family.context ?? "[No family context]" };
  },
});

export const getRecentMessages = internalMutation({
  args: { phone: v.string(), limit: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_sender_phone", (q) => q.eq("senderPhone", args.phone))
      .order("desc")
      .take(args.limit);
  },
});

export const getFamilyLessons = internalMutation({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("lessons")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .collect();
  },
});

export const getPendingApprovals = internalMutation({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("approvals")
      .withIndex("by_family_status", (q) =>
        q.eq("familyId", args.familyId).eq("status", "pending"),
      )
      .collect();
  },
});

export const getMessageByLinqId = internalMutation({
  args: { linqMessageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_linq_message_id", (q) =>
        q.eq("linqMessageId", args.linqMessageId),
      )
      .first();
  },
});

export const updateMessageStatus = internalMutation({
  args: {
    messageId: v.id("messages"),
    deliveryStatus: v.union(
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("read"),
      v.literal("failed"),
    ),
    deliveredAt: v.optional(v.number()),
    readAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { messageId, ...patch } = args;
    await ctx.db.patch(messageId, patch);
  },
});

export const applyContextUpdates = internalMutation({
  args: {
    familyId: v.id("families"),
    updates: v.array(updateValidator),
  },
  handler: async (ctx, args) => {
    const family = await ctx.db.get(args.familyId);
    if (!family) return;

    let context = family.context ?? "";
    for (const upd of args.updates) {
      if (upd.operation === "append") {
        const sectionHeader = `## ${upd.section}`;
        const idx = context.indexOf(sectionHeader);
        if (idx >= 0) {
          const nextSection = context.indexOf("\n## ", idx + 1);
          const insertAt = nextSection >= 0 ? nextSection : context.length;
          context = context.slice(0, insertAt) + "\n" + upd.content + context.slice(insertAt);
        }
      } else if (upd.operation === "prepend") {
        const sectionHeader = `## ${upd.section}`;
        const idx = context.indexOf(sectionHeader);
        if (idx >= 0) {
          const afterHeader = context.indexOf("\n", idx) + 1;
          context = context.slice(0, afterHeader) + upd.content + "\n" + context.slice(afterHeader);
        }
      } else if (upd.operation === "replace" && upd.oldContent) {
        context = context.replace(upd.oldContent, upd.content);
      } else if (upd.operation === "resolve_issue" && upd.oldContent) {
        context = context.replace(upd.oldContent, "");
      }
    }
    await ctx.db.patch(args.familyId, { context: context.trim() });
  },
});
