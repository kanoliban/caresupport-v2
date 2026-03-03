import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function startsWithSection(section: string, token: string): boolean {
  return section.toLowerCase().includes(token);
}

export const getFamilyContext = query({
  args: {
    familyId: v.string(),
    memberId: v.string(),
    intent: v.string(),
  },
  handler: async (ctx, args) => {
    const family = await ctx.db
      .query("families")
      .withIndex("by_family_id", (q) => q.eq("familyId", args.familyId))
      .first();

    const member = await ctx.db
      .query("members")
      .withIndex("by_family_member", (q) => q.eq("familyId", args.familyId).eq("memberId", args.memberId))
      .first();

    const materialized = await ctx.db
      .query("familyContextMaterialized")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .first();

    const latestProjection = await ctx.db
      .query("familyProjections")
      .withIndex("by_family_latest", (q) => q.eq("familyId", args.familyId))
      .order("desc")
      .first();

    return {
      familyId: args.familyId,
      familyName: family?.familyName ?? args.familyId,
      careRecipient: family?.careRecipient ?? "Unknown",
      markdown:
        latestProjection?.markdown ??
        materialized?.contextText ??
        "[No family markdown context found]",
      memberMarkdown: member?.memberMarkdown ?? "",
      recentConversation: materialized?.recentConversationText ?? "",
      intent: args.intent,
    };
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
    const now = new Date().toISOString();
    const family = await ctx.db
      .query("families")
      .withIndex("by_family_id", (q) => q.eq("familyId", args.familyId))
      .first();

    if (!family) return { applied: 0, reason: "family_not_found" };

    let notes = family.notes ?? "";
    let applied = 0;

    for (const update of args.updates) {
      const summary = `[${update.section}] ${update.operation}: ${update.content}`;

      if (startsWithSection(update.section, "schedule")) {
        await ctx.db.insert("scheduleItems", {
          familyId: args.familyId,
          itemId: uniqueId(`schedule-${slug(update.content) || "item"}`),
          title: update.content,
          startsAt: now,
          status: "pending",
          createdAt: now,
          updatedAt: now,
        });
      } else if (startsWithSection(update.section, "med")) {
        await ctx.db.insert("medications", {
          familyId: args.familyId,
          medicationId: uniqueId(`med-${slug(update.content) || "item"}`),
          name: update.content,
          dosage: "unknown",
          instructions: update.content,
          scheduleRule: "unknown",
          active: true,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        notes = notes.trim().length > 0 ? `${notes}\n${summary}` : summary;
      }

      await ctx.db.insert("timelineEvents", {
        familyId: args.familyId,
        eventId: uniqueId("timeline-family-update"),
        occurredAt: now,
        type: "family_update",
        actor: args.actor,
        content: summary,
        metadata: {
          section: update.section,
          operation: update.operation,
          old_content: update.old_content,
        },
      });
      applied += 1;
    }

    await ctx.db.patch(family._id, {
      notes,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, (internal as any).projections_v2.renderFamilyMarkdownProjectionInternal, {
      familyId: args.familyId,
      renderSource: "applyFamilyUpdates",
    });

    return { applied };
  },
});
