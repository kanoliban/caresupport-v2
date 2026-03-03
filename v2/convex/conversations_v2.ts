import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function upsertMaterializedConversation(
  ctx: any,
  familyId: string,
  memberId: string,
  updatedAt: string,
): Promise<void> {
  const entries = await ctx.db
    .query("conversations")
    .withIndex("by_member", (q) => q.eq("memberId", memberId))
    .order("desc")
    .take(50);
  const recent = entries
    .reverse()
    .map((entry) => `[${entry.createdAt}] [${entry.direction}] ${entry.text}`)
    .join("\n");

  const existing = await ctx.db
    .query("familyContextMaterialized")
    .withIndex("by_family", (q) => q.eq("familyId", familyId))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      recentConversationText: recent,
      updatedAt,
    });
  } else {
    await ctx.db.insert("familyContextMaterialized", {
      familyId,
      contextText: "",
      recentConversationText: recent,
      updatedAt,
    });
  }
}

export const getRecentConversation = query({
  args: {
    memberId: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("conversations")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .order("desc")
      .take(args.limit);

    return entries
      .reverse()
      .map((entry) => `[${entry.createdAt}] [${entry.direction}] ${entry.text}`)
      .join("\n");
  },
});

export const getDeliveryStatus = query({
  args: {
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    const inbound = await ctx.db
      .query("conversations")
      .withIndex("by_message_id", (q) => q.eq("messageId", args.messageId))
      .first();
    const outbound = await ctx.db
      .query("conversations")
      .withIndex("by_message_id", (q) => q.eq("messageId", `${args.messageId}-out`))
      .first();

    return {
      inboundExists: Boolean(inbound),
      outboundExists: Boolean(outbound),
      outboundText: outbound?.text ?? null,
      familyId: inbound?.familyId ?? outbound?.familyId ?? null,
      memberId: inbound?.memberId ?? outbound?.memberId ?? null,
    };
  },
});

export const appendInbound = mutation({
  args: {
    familyId: v.string(),
    memberId: v.string(),
    messageId: v.string(),
    chatId: v.string(),
    phone: v.string(),
    service: v.string(),
    text: v.string(),
    receivedAt: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("conversations", {
      familyId: args.familyId,
      memberId: args.memberId,
      direction: "INBOUND",
      messageId: args.messageId,
      chatId: args.chatId,
      phone: args.phone,
      service: args.service,
      text: args.text,
      createdAt: args.receivedAt,
    });

    await upsertMaterializedConversation(ctx, args.familyId, args.memberId, args.receivedAt);
  },
});

export const appendOutbound = mutation({
  args: {
    familyId: v.string(),
    memberId: v.string(),
    sourceMessageId: v.string(),
    text: v.string(),
    createdAt: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("conversations", {
      familyId: args.familyId,
      memberId: args.memberId,
      direction: "OUTBOUND",
      messageId: `${args.sourceMessageId}-out`,
      sourceMessageId: args.sourceMessageId,
      phone: "",
      service: "SMS",
      text: args.text,
      createdAt: args.createdAt,
    });

    await upsertMaterializedConversation(ctx, args.familyId, args.memberId, args.createdAt);
  },
});
