import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getRecentConversation = query({
  args: {
    memberId: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    return ctx.runQuery("conversations_v2:getRecentConversation", args);
  },
});

export const getDeliveryStatus = query({
  args: {
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.runQuery("conversations_v2:getDeliveryStatus", args);
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
    return ctx.runMutation("conversations_v2:appendInbound", args);
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
    return ctx.runMutation("conversations_v2:appendOutbound", args);
  },
});
