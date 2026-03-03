import { action, mutation } from "./_generated/server";
import { v } from "convex/values";

function normalizeMemberIdFromPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length > 0 ? `phone-${digits}` : `phone-${Date.now()}`;
}

function normalizeAccessLevel(accessLevel: string | undefined): "full" | "limited" {
  return accessLevel === "full" ? "full" : "limited";
}

function normalizeFamilyStatus(status: string | undefined): "active" | "paused" | "archived" {
  if (status === "paused" || status === "archived") return status;
  return "active";
}

function parseBulletLines(markdown: string): string[] {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
}

function stableChecksum(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return `c32-${(hash >>> 0).toString(16)}`;
}

export const ingestSnapshotRecord = mutation({
  args: {
    record: v.object({
      kind: v.union(v.literal("family"), v.literal("member"), v.literal("conversation")),
      familyId: v.optional(v.string()),
      memberId: v.optional(v.string()),
      phone: v.optional(v.string()),
      month: v.optional(v.string()),
      payload: v.any(),
    }),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    if (args.record.kind === "family") {
      const familyId = args.record.familyId!;
      const payload = args.record.payload as {
        familyMarkdown?: string;
        scheduleMarkdown?: string;
        medicationsMarkdown?: string;
        lessonsMarkdown?: string;
        routing?: {
          family_name?: string;
          care_recipient?: string;
          status?: string;
          notes?: string;
          members?: Record<
            string,
            {
              name?: string;
              role?: string;
              access_level?: string;
              relationship?: string;
              active?: boolean;
              chat_id?: string;
            }
          >;
        };
      };

      const familyMarkdown = payload.familyMarkdown ?? "";
      const scheduleMarkdown = payload.scheduleMarkdown ?? "";
      const medicationsMarkdown = payload.medicationsMarkdown ?? "";
      const lessonsMarkdown = payload.lessonsMarkdown ?? "";
      const markdownProjection = `${familyMarkdown}${scheduleMarkdown}${medicationsMarkdown}${lessonsMarkdown}`;

      const existingFamily = await ctx.db
        .query("families")
        .withIndex("by_family_id", (q) => q.eq("familyId", familyId))
        .first();

      if (existingFamily) {
        await ctx.db.patch(existingFamily._id, {
          familyName: payload.routing?.family_name ?? existingFamily.familyName,
          careRecipient: payload.routing?.care_recipient ?? existingFamily.careRecipient,
          status: normalizeFamilyStatus(payload.routing?.status),
          timezone: existingFamily.timezone,
          notes: payload.routing?.notes,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("families", {
          familyId,
          familyName: payload.routing?.family_name ?? familyId,
          careRecipient: payload.routing?.care_recipient ?? "Unknown",
          status: normalizeFamilyStatus(payload.routing?.status),
          timezone: "America/Chicago",
          notes: payload.routing?.notes,
          currentProjectionVersion: 0,
          createdAt: now,
          updatedAt: now,
        });
      }

      const existingMaterialized = await ctx.db
        .query("familyContextMaterialized")
        .withIndex("by_family", (q) => q.eq("familyId", familyId))
        .first();
      if (existingMaterialized) {
        await ctx.db.patch(existingMaterialized._id, {
          contextText: markdownProjection.length > 0 ? markdownProjection : familyMarkdown,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("familyContextMaterialized", {
          familyId,
          contextText: markdownProjection.length > 0 ? markdownProjection : familyMarkdown,
          recentConversationText: "",
          updatedAt: now,
        });
      }

      const latestProjection = await ctx.db
        .query("familyProjections")
        .withIndex("by_family_latest", (q) => q.eq("familyId", familyId))
        .order("desc")
        .first();
      const nextProjectionVersion = (latestProjection?.version ?? 0) + 1;
      await ctx.db.insert("familyProjections", {
        familyId,
        version: nextProjectionVersion,
        markdown: markdownProjection.length > 0 ? markdownProjection : familyMarkdown,
        sectionsChecksum: stableChecksum(markdownProjection.length > 0 ? markdownProjection : familyMarkdown),
        renderedAt: now,
        renderSource: "snapshot_import",
      });

      const familyAfterProjection = await ctx.db
        .query("families")
        .withIndex("by_family_id", (q) => q.eq("familyId", familyId))
        .first();
      if (familyAfterProjection) {
        await ctx.db.patch(familyAfterProjection._id, {
          currentProjectionVersion: nextProjectionVersion,
          updatedAt: now,
        });
      }

      const existingSchedule = await ctx.db
        .query("scheduleItems")
        .withIndex("by_family", (q) => q.eq("familyId", familyId))
        .collect();
      for (const scheduleItem of existingSchedule) {
        await ctx.db.delete(scheduleItem._id);
      }
      const scheduleLines = parseBulletLines(scheduleMarkdown);
      let scheduleIndex = 0;
      for (const scheduleLine of scheduleLines) {
        scheduleIndex += 1;
        await ctx.db.insert("scheduleItems", {
          familyId,
          itemId: `import-schedule-${scheduleIndex}-${Date.now()}`,
          title: scheduleLine,
          startsAt: now,
          status: "pending",
          createdAt: now,
          updatedAt: now,
        });
      }

      const existingMeds = await ctx.db
        .query("medications")
        .withIndex("by_family", (q) => q.eq("familyId", familyId))
        .collect();
      for (const medication of existingMeds) {
        await ctx.db.delete(medication._id);
      }
      const medLines = parseBulletLines(medicationsMarkdown);
      let medIndex = 0;
      for (const medLine of medLines) {
        medIndex += 1;
        await ctx.db.insert("medications", {
          familyId,
          medicationId: `import-med-${medIndex}-${Date.now()}`,
          name: medLine,
          dosage: "unknown",
          instructions: medLine,
          scheduleRule: "unknown",
          active: true,
          createdAt: now,
          updatedAt: now,
        });
      }

      const existingLessons = await ctx.db
        .query("lessons")
        .withIndex("by_family", (q) => q.eq("familyId", familyId))
        .collect();
      for (const lesson of existingLessons) {
        await ctx.db.delete(lesson._id);
      }
      for (const lessonLine of parseBulletLines(lessonsMarkdown)) {
        await ctx.db.insert("lessons", {
          familyId,
          scope: "family",
          category: "operational",
          text: lessonLine,
          source: "snapshot_import",
          createdAt: now,
        });
      }

      for (const [phone, member] of Object.entries(payload.routing?.members ?? {})) {
        const existingByFamily = await ctx.db
          .query("members")
          .withIndex("by_family_member", (q) =>
            q.eq("familyId", familyId).eq("memberId", normalizeMemberIdFromPhone(phone)),
          )
          .first();

        const memberDoc = {
          familyId,
          memberId: normalizeMemberIdFromPhone(phone),
          name: member.name ?? phone,
          role: member.role ?? "family_caregiver",
          relationship: member.relationship ?? "family",
          accessLevel: normalizeAccessLevel(member.access_level),
          phone,
          chatId: member.chat_id,
          active: member.active ?? true,
          createdAt: now,
          updatedAt: now,
        };

        if (existingByFamily) {
          await ctx.db.patch(existingByFamily._id, memberDoc);
        } else {
          await ctx.db.insert("members", memberDoc);
        }
      }

      return;
    }

    if (args.record.kind === "member") {
      const familyId = args.record.familyId!;
      const memberId = args.record.memberId!;
      const markdown = (args.record.payload as { markdown?: string }).markdown ?? "";
      const now = new Date().toISOString();

      const existing = await ctx.db
        .query("members")
        .withIndex("by_family_member", (q) => q.eq("familyId", familyId).eq("memberId", memberId))
        .first();

      const memberDoc = {
        familyId,
        memberId,
        name: memberId.charAt(0).toUpperCase() + memberId.slice(1),
        role: existing?.role ?? "family_caregiver",
        relationship: existing?.relationship ?? "family",
        accessLevel: existing?.accessLevel ?? ("limited" as const),
        phone: existing?.phone ?? `imported:${familyId}:${memberId}`,
        chatId: existing?.chatId,
        memberMarkdown: markdown,
        active: existing?.active ?? true,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      if (existing) {
        await ctx.db.patch(existing._id, memberDoc);
      } else {
        await ctx.db.insert("members", memberDoc);
      }
      return;
    }

    if (args.record.kind === "conversation") {
      const payload = args.record.payload as { log?: string };
      const log = payload.log ?? "";
      const eventId = `conversation:${args.record.phone ?? "unknown"}:${args.record.month ?? "unknown"}`;
      const existing = await ctx.db
        .query("timelineEvents")
        .withIndex("by_event_id", (q) => q.eq("eventId", eventId))
        .first();

      const archiveDoc = {
        familyId: "imported",
        eventId,
        occurredAt: now,
        type: "conversation_archive",
        actor: {
          memberId: args.record.phone ?? "unknown",
          memberName: args.record.phone ?? "unknown",
          role: "system",
        },
        sourceMessageId: eventId,
        content: log.slice(0, 2000),
        metadata: {
          phone: args.record.phone ?? "unknown",
          month: args.record.month ?? "unknown",
          watermarkFile: `${args.record.month}.log`,
          watermarkLines: log.split(/\r?\n/).length,
        },
      };

      if (existing) {
        await ctx.db.patch(existing._id, archiveDoc);
      } else {
        await ctx.db.insert("timelineEvents", archiveDoc);
      }
    }
  },
});

export const finalizeImport = action({
  args: {
    importedAt: v.string(),
    counts: v.object({ family: v.number(), member: v.number(), conversation: v.number() }),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation("importer_v2:_recordImportRun", args);
    return { ok: true };
  },
});

export const _recordImportRun = mutation({
  args: {
    importedAt: v.string(),
    counts: v.object({ family: v.number(), member: v.number(), conversation: v.number() }),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("importRuns", {
      importedAt: args.importedAt,
      counts: args.counts,
    });
  },
});
