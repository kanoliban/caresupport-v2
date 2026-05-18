import { internalMutation, internalQuery } from "./_generated/server";
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

    const [user, messages, memoryEntries] = await Promise.all([
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
    ]);

    return {
      careCase,
      user,
      recentMessages: messages.reverse(),
      memoryEntries,
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
