import { query } from "./_generated/server";

export const getMigrationIntegrityState = query({
  args: {},
  handler: async (ctx) => {
    const [families, members, archives] = await Promise.all([
      ctx.db.query("families").collect(),
      ctx.db.query("members").collect(),
      ctx.db.query("timelineEvents").collect(),
    ]);

    const archiveEvents = archives.filter((event) => event.type === "conversation_archive");

    const familyMarkdownById = new Map<string, { markdown: string; updatedAt: string }>();
    for (const family of families) {
      const latestProjection = await ctx.db
        .query("familyProjections")
        .withIndex("by_family_latest", (q) => q.eq("familyId", family.familyId))
        .order("desc")
        .first();
      const materialized = await ctx.db
        .query("familyContextMaterialized")
        .withIndex("by_family", (q) => q.eq("familyId", family.familyId))
        .first();

      familyMarkdownById.set(family.familyId, {
        markdown: latestProjection?.markdown ?? materialized?.contextText ?? "",
        updatedAt: latestProjection?.renderedAt ?? family.updatedAt,
      });
    }

    return {
      counts: {
        families: families.length,
        members: members.length,
        conversations: archiveEvents.length,
      },
      families: families.map((family) => ({
        familyId: family.familyId,
        markdown: familyMarkdownById.get(family.familyId)?.markdown ?? "",
        updatedAt: familyMarkdownById.get(family.familyId)?.updatedAt ?? family.updatedAt,
      })),
      members: members.map((member) => ({
        familyId: member.familyId,
        memberId: member.memberId,
        phone: member.phone,
        chatId: member.chatId ?? null,
        memberMarkdown: member.memberMarkdown ?? "",
        active: member.active,
      })),
      summaries: archiveEvents.map((event) => ({
        phone: typeof event.metadata?.phone === "string" ? event.metadata.phone : "unknown",
        month: typeof event.metadata?.month === "string" ? event.metadata.month : "unknown",
        watermarkLines:
          typeof event.metadata?.watermarkLines === "number" ? event.metadata.watermarkLines : 0,
      })),
    };
  },
});
