import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const record = mutation({
  args: {
    familyId: v.string(),
    sourceMessageId: v.string(),
    actor: v.object({ memberId: v.string(), memberName: v.string(), role: v.string() }),
    audit: v.object({
      model: v.string(),
      intent: v.string(),
      decisions: v.array(v.string()),
      warnings: v.array(v.string()),
      token_usage: v.optional(v.object({ input: v.number(), output: v.number() })),
    }),
    outcome: v.any(),
  },
  handler: async (ctx, args) => {
    return ctx.runMutation("audit_v2:record", args);
  },
});
