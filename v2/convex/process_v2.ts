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
  handler: async (_ctx, args) => {
    return {
      accepted: true,
      messageId: args.message_id,
      note: "Use runtime webhook processor for orchestration.",
    };
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
    const queued = await ctx.runMutation("process_v2:queueOutreachJobs", {
      familyId: args.familyId,
      sourceMessageId: args.sourceMessageId,
      tasks: args.tasks,
      createdAt: new Date().toISOString(),
    });

    return { queued };
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
    for (const task of args.tasks) {
      await ctx.db.insert("outreachJobs", {
        familyId: args.familyId,
        sourceMessageId: args.sourceMessageId,
        phone: task.phone,
        name: task.name,
        message: task.message,
        status: "queued",
        attemptCount: 0,
        createdAt: args.createdAt,
        updatedAt: args.createdAt,
      });
    }

    return args.tasks.length;
  },
});
