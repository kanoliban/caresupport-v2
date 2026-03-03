import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";

function stableChecksum(text: string): string {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return `fnv32-${(hash >>> 0).toString(16)}`;
}

async function renderProjection(ctx: any, familyId: string, renderSource: string) {
  const now = new Date().toISOString();
  const family = await ctx.db
    .query("families")
    .withIndex("by_family_id", (q: any) => q.eq("familyId", familyId))
    .first();

  if (!family) {
    throw new Error(`Family not found: ${familyId}`);
  }

  const [members, medications, scheduleItems, timeline] = await Promise.all([
    ctx.db.query("members").withIndex("by_family", (q: any) => q.eq("familyId", familyId)).collect(),
    ctx.db.query("medications").withIndex("by_family", (q: any) => q.eq("familyId", familyId)).collect(),
    ctx.db.query("scheduleItems").withIndex("by_family", (q: any) => q.eq("familyId", familyId)).collect(),
    ctx.db
      .query("timelineEvents")
      .withIndex("by_family_occurred_at", (q: any) => q.eq("familyId", familyId))
      .order("desc")
      .take(50),
  ]);

  const lines: string[] = [];
  lines.push(`# ${family.familyName}`);
  lines.push("");
  lines.push("## Care Recipient");
  lines.push(`- ${family.careRecipient}`);
  lines.push("");
  lines.push("## Care Team");
  for (const member of members) {
    lines.push(`- ${member.name} — ${member.role}, ${member.accessLevel}`);
  }
  if (members.length === 0) lines.push("- [No care team members]");
  lines.push("");
  lines.push("## This Week");
  for (const item of scheduleItems) {
    lines.push(`- ${item.title} (${item.status}) @ ${item.startsAt}`);
  }
  if (scheduleItems.length === 0) lines.push("- [No schedule items]");
  lines.push("");
  lines.push("## Active Medications");
  for (const medication of medications.filter((m: any) => m.active)) {
    lines.push(`- ${medication.name}: ${medication.dosage} (${medication.scheduleRule})`);
  }
  if (medications.filter((m: any) => m.active).length === 0) lines.push("- [No active medications]");
  lines.push("");
  lines.push("## Timeline");
  for (const event of timeline.reverse()) {
    lines.push(`- [${event.occurredAt}] ${event.type}: ${event.content}`);
  }
  if (timeline.length === 0) lines.push("- [No timeline events]");
  lines.push("");
  lines.push("## Notes");
  lines.push(family.notes?.trim() || "[No notes]");

  const markdown = lines.join("\n");
  const latestProjection = await ctx.db
    .query("familyProjections")
    .withIndex("by_family_latest", (q: any) => q.eq("familyId", familyId))
    .order("desc")
    .first();
  const nextVersion = (latestProjection?.version ?? 0) + 1;

  await ctx.db.insert("familyProjections", {
    familyId,
    version: nextVersion,
    markdown,
    sectionsChecksum: stableChecksum(markdown),
    renderedAt: now,
    renderSource,
  });

  await ctx.db.patch(family._id, {
    currentProjectionVersion: nextVersion,
    updatedAt: now,
  });

  const materialized = await ctx.db
    .query("familyContextMaterialized")
    .withIndex("by_family", (q: any) => q.eq("familyId", familyId))
    .first();
  if (materialized) {
    await ctx.db.patch(materialized._id, {
      contextText: markdown,
      updatedAt: now,
    });
  } else {
    await ctx.db.insert("familyContextMaterialized", {
      familyId,
      contextText: markdown,
      recentConversationText: "",
      updatedAt: now,
    });
  }

  return { familyId, version: nextVersion, markdown };
}

export const renderFamilyMarkdownProjection = action({
  args: {
    familyId: v.string(),
    renderSource: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return renderProjection(ctx, args.familyId, args.renderSource ?? "manual");
  },
});

export const renderFamilyMarkdownProjectionInternal = internalAction({
  args: {
    familyId: v.string(),
    renderSource: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return renderProjection(ctx, args.familyId, args.renderSource ?? "internal");
  },
});
