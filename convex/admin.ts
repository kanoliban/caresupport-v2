import { internalMutation, internalQuery } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { migrateScheduleRow } from "./lib/scheduleBackfill";

export const listCareCases = internalQuery({
  args: {},
  handler: async (ctx) => {
    const careCases = await ctx.db.query("careCases").collect();

    return Promise.all(
      careCases.map(async (careCase) => {
        const [user, lastMessage] = await Promise.all([
          ctx.db
            .query("users")
            .withIndex("by_care_case", (q) => q.eq("careCaseId", careCase._id))
            .first(),
          ctx.db
            .query("messages")
            .withIndex("by_care_case_timestamp", (q) => q.eq("careCaseId", careCase._id))
            .order("desc")
            .first(),
        ]);

        return {
          id: careCase._id,
          title: careCase.title,
          status: careCase.status,
          userName: user?.name ?? null,
          lastMessageAt: lastMessage?.timestamp ?? null,
          createdAt: careCase.createdAt,
        };
      }),
    );
  },
});

export const getCareCaseDetail = internalQuery({
  args: { careCaseId: v.id("careCases") },
  handler: async (ctx, args) => {
    const careCase = await ctx.db.get(args.careCaseId);
    if (!careCase) return null;

    const [
      user,
      messages,
      memoryEntries,
      careContacts,
      coordinationEvents,
      outreachAttempts,
    ] = await Promise.all([
      ctx.db
        .query("users")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
        .first(),
      ctx.db
        .query("messages")
        .withIndex("by_care_case_timestamp", (q) => q.eq("careCaseId", args.careCaseId))
        .order("desc")
        .take(50),
      ctx.db
        .query("memoryEntries")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
        .collect(),
      ctx.db
        .query("careContacts")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
        .collect(),
      ctx.db
        .query("coordinationEvents")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
        .collect(),
      ctx.db
        .query("outreachAttempts")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
        .collect(),
    ]);

    return {
      careCase,
      user,
      recentMessages: messages.reverse(),
      memoryEntries,
      careContacts,
      coordinationEvents,
      outreachAttempts,
    };
  },
});

export const clearAppData = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tables = [
      "messages",
      "medications",
      "scheduleItems",
      "memoryEntries",
      "outreachAttempts",
      "coordinationEvents",
      "careContacts",
      "auditLogs",
      "users",
      "careCases",
    ] as const;

    const deleted: Record<string, number> = {};

    for (const table of tables) {
      const rows = await ctx.db.query(table).collect();
      deleted[table] = rows.length;
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
    }

    return deleted;
  },
});

export const tableCounts = internalQuery({
  args: {},
  handler: async (ctx) => {
    const tables = [
      "careCases",
      "users",
      "messages",
      "medications",
      "scheduleItems",
      "memoryEntries",
      "careContacts",
      "coordinationEvents",
      "outreachAttempts",
      "auditLogs",
    ] as const;

    const counts: Record<string, number> = {};
    for (const table of tables) {
      const rows = await ctx.db.query(table).collect();
      counts[table] = rows.length;
    }
    return counts;
  },
});

export const backfillScheduleDates = internalMutation({
  args: { dryRun: v.boolean() },
  handler: async (ctx, { dryRun }) => {
    const rows = await ctx.db.query("scheduleItems").collect();

    const report = {
      total: rows.length,
      updated: 0,
      skipped: 0,
      warnings: [] as Array<{ id: string; oldValue: string; reason: string }>,
    };

    for (const row of rows) {
      const result = migrateScheduleRow({
        date: row.date,
        recurrence: row.recurrence,
        notes: row.notes,
        title: row.title,
        _creationTime: row._creationTime,
      });

      if (result.action === "skip") {
        report.skipped += 1;
        continue;
      }

      if (result.action === "warn") {
        report.warnings.push({
          id: row._id,
          oldValue: row.date ?? "",
          reason: result.reason,
        });
        continue;
      }

      report.updated += 1;
      if (!dryRun) {
        await ctx.db.patch(row._id, result.patch);
      }
    }

    return report;
  },
});

export const listActiveCareCasesForDigest = internalQuery({
  args: {},
  handler: async (ctx) => {
    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const careCases = await ctx.db.query("careCases").collect();

    const results: Array<{
      careCaseId: Id<"careCases">;
      timezone: string;
      userId: Id<"users">;
      userName: string;
      chatId: string | null;
    }> = [];

    for (const careCase of careCases) {
      if (careCase.status === "archived") continue;

      const user = await ctx.db
        .query("users")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", careCase._id))
        .first();
      if (!user) continue;
      if (!user.chatId) continue;

      const lastInbound = await ctx.db
        .query("messages")
        .withIndex("by_care_case_timestamp", (q) =>
          q.eq("careCaseId", careCase._id),
        )
        .order("desc")
        .filter((q) => q.eq(q.field("direction"), "inbound"))
        .first();

      if (!lastInbound || lastInbound.timestamp < fourteenDaysAgo) continue;

      results.push({
        careCaseId: careCase._id,
        timezone: careCase.timezone || "UTC",
        userId: user._id,
        userName: user.name,
        chatId: user.chatId,
      });
    }

    return results;
  },
});

export const getCareCaseDigestData = internalQuery({
  args: {
    careCaseId: v.id("careCases"),
    todayLocalIso: v.string(),
    sinceMs: v.number(),
  },
  handler: async (ctx, args) => {
    const [scheduleItems, recentDigestAudits] = await Promise.all([
      ctx.db
        .query("scheduleItems")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
        .filter((q) => q.eq(q.field("status"), "scheduled"))
        .collect(),
      ctx.db
        .query("auditLogs")
        .withIndex("by_care_case_timestamp", (q) =>
          q.eq("careCaseId", args.careCaseId),
        )
        .filter((q) =>
          q.and(
            q.gte(q.field("timestamp"), args.sinceMs),
            q.eq(q.field("event"), "response_sent"),
          ),
        )
        .collect(),
    ]);

    return {
      scheduleItems,
      recentDigestAudits: recentDigestAudits.filter(
        (audit) => audit.details.triggerMessage === "scheduled_digest",
      ),
    };
  },
});

export const getSystemHealth = internalQuery({
  args: {},
  handler: async (ctx) => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

    const recentMessages = await ctx.db
      .query("messages")
      .filter((q) => q.gte(q.field("timestamp"), dayAgo))
      .collect();

    const failures = await ctx.db
      .query("auditLogs")
      .filter((q) =>
        q.and(
          q.gte(q.field("timestamp"), dayAgo),
          q.or(
            q.eq(q.field("event"), "message_failed"),
            q.eq(q.field("event"), "response_blocked"),
          ),
        ),
      )
      .collect();

    return {
      messages24h: recentMessages.length,
      inbound24h: recentMessages.filter((m) => m.direction === "inbound").length,
      outbound24h: recentMessages.filter((m) => m.direction === "outbound").length,
      failures24h: failures.length,
    };
  },
});
