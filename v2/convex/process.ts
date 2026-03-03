import { action, mutation } from "./_generated/server";
import { v } from "convex/values";

export const processInboundMessage = action({
  args: {
    chat_id: v.string(),
    from: v.string(),
    service: v.string(),
    message_id: v.string(),
    parts: v.array(v.object({ type: v.string(), value: v.optional(v.string()) })),
    received_at: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.runAction("process_v2:processInboundMessage", args);
  },
});

export const dispatchOutreach = action({
  args: {
    familyId: v.string(),
    sourceMessageId: v.string(),
    tasks: v.array(
      v.object({
        phone: v.string(),
        name: v.string(),
        message: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    return ctx.runAction("process_v2:dispatchOutreach", args);
  },
});

export const queueOutreachJobs = mutation({
  args: {
    familyId: v.string(),
    sourceMessageId: v.string(),
    tasks: v.array(
      v.object({
        phone: v.string(),
        name: v.string(),
        message: v.string(),
      }),
    ),
    createdAt: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.runMutation("process_v2:queueOutreachJobs", args);
  },
});
