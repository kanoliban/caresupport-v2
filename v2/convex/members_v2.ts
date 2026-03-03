import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function normalizeRole(
  role: "family_caregiver" | "professional_caregiver" | "community_supporter",
): string {
  return role;
}

function normalizeAccessLevel(accessLevel: "full" | "limited"): "full" | "limited" {
  return accessLevel;
}

export const resolveActor = query({
  args: {
    chatId: v.string(),
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    const byChat = await ctx.db
      .query("members")
      .withIndex("by_chat_id", (q) => q.eq("chatId", args.chatId))
      .first();

    const member =
      byChat ||
      (await ctx.db
        .query("members")
        .withIndex("by_phone", (q) => q.eq("phone", args.phone))
        .first());

    if (!member) return null;

    return {
      familyId: member.familyId,
      memberId: member.memberId,
      memberName: member.name,
      role: member.role,
      accessLevel: member.accessLevel,
      phone: member.phone,
      chatId: member.chatId,
    };
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
    const now = new Date().toISOString();
    let applied = 0;

    for (const update of args.updates) {
      const member = await ctx.db
        .query("members")
        .withIndex("by_family_member", (q) => q.eq("familyId", args.familyId).eq("memberId", update.member_id))
        .first();

      if (!member) continue;

      const patch = `\n\n## ${update.section}\n${update.content}`;
      await ctx.db.patch(member._id, {
        memberMarkdown: `${member.memberMarkdown ?? ""}${patch}`,
        updatedAt: now,
      });

      await ctx.db.insert("timelineEvents", {
        familyId: args.familyId,
        eventId: uniqueId("timeline-member-update"),
        occurredAt: now,
        type: "member_update",
        actor: args.actor,
        content: `[${update.member_id}] ${update.section}: ${update.content}`,
        metadata: {
          member_id: update.member_id,
          operation: update.operation,
          old_content: update.old_content,
        },
      });
      applied += 1;
    }

    await ctx.scheduler.runAfter(0, (internal as any).projections_v2.renderFamilyMarkdownProjectionInternal, {
      familyId: args.familyId,
      renderSource: "applyMemberUpdates",
    });

    return { applied };
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
    const now = new Date().toISOString();
    let applied = 0;

    for (const update of args.updates) {
      const matches = await ctx.db
        .query("members")
        .withIndex("by_phone", (q) => q.eq("phone", update.phone))
        .collect();
      const existing = matches.find((member) => member.familyId === args.familyId);

      if (update.action === "deactivate") {
        if (existing) {
          await ctx.db.patch(existing._id, { active: false, updatedAt: now });
          applied += 1;
        }
        continue;
      }

      if (existing) {
        await ctx.db.patch(existing._id, {
          name: update.name,
          role: normalizeRole(update.role),
          relationship: update.relationship,
          accessLevel: normalizeAccessLevel(update.access_level),
          active: true,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("members", {
          familyId: args.familyId,
          memberId: uniqueId(
            update.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "") || "member",
          ),
          name: update.name,
          role: normalizeRole(update.role),
          relationship: update.relationship,
          accessLevel: normalizeAccessLevel(update.access_level),
          phone: update.phone,
          active: true,
          createdAt: now,
          updatedAt: now,
        });
      }

      await ctx.db.insert("timelineEvents", {
        familyId: args.familyId,
        eventId: uniqueId("timeline-routing-update"),
        occurredAt: now,
        type: "routing_update",
        actor: args.actor,
        content: `${update.action}:${update.phone}:${update.name}`,
        metadata: update,
      });
      applied += 1;
    }

    await ctx.scheduler.runAfter(0, (internal as any).projections_v2.renderFamilyMarkdownProjectionInternal, {
      familyId: args.familyId,
      renderSource: "applyRoutingUpdates",
    });

    return { applied };
  },
});
