import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getFamilyContext = query({
  args: {
    familyId: v.string(),
    memberId: v.string(),
    intent: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.runQuery("families_v2:getFamilyContext", args);
  },
});

export const applyFamilyUpdates = mutation({
  args: {
    familyId: v.string(),
    actor: v.object({ memberId: v.string(), memberName: v.string(), role: v.string() }),
    updates: v.array(
      v.object({
        section: v.string(),
        operation: v.union(v.literal("append"), v.literal("prepend"), v.literal("replace"), v.literal("resolve_issue")),
        content: v.string(),
        old_content: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    return ctx.runMutation("families_v2:applyFamilyUpdates", args);
  },
});
