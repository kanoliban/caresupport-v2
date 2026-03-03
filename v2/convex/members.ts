import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const resolveActor = query({
  args: {
    chatId: v.string(),
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.runQuery("members_v2:resolveActor", args);
  },
});

export const applyMemberUpdates = mutation({
  args: {
    familyId: v.string(),
    actor: v.object({ memberId: v.string(), memberName: v.string(), role: v.string() }),
    updates: v.array(
      v.object({
        member_id: v.string(),
        section: v.string(),
        operation: v.union(v.literal("append"), v.literal("prepend"), v.literal("replace"), v.literal("resolve_issue")),
        content: v.string(),
        old_content: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    return ctx.runMutation("members_v2:applyMemberUpdates", args);
  },
});

export const applyRoutingUpdates = mutation({
  args: {
    familyId: v.string(),
    actor: v.object({ memberId: v.string(), memberName: v.string(), role: v.string() }),
    updates: v.array(
      v.object({
        action: v.union(v.literal("add"), v.literal("update"), v.literal("deactivate")),
        phone: v.string(),
        name: v.string(),
        role: v.union(v.literal("family_caregiver"), v.literal("professional_caregiver"), v.literal("community_supporter")),
        relationship: v.string(),
        access_level: v.union(v.literal("full"), v.literal("limited")),
      }),
    ),
  },
  handler: async (ctx, args) => {
    return ctx.runMutation("members_v2:applyRoutingUpdates", args);
  },
});
