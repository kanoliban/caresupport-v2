import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { internal } from "../_generated/api";
import { migrateScheduleRow } from "./scheduleBackfill";

const modules = import.meta.glob("../**/*.ts");

// Helper: build a creation timestamp from an ISO date for readable tests.
function ts(iso: string): number {
  return new Date(`${iso}T12:00:00Z`).getTime();
}

describe("migrateScheduleRow", () => {
  describe("ISO date with wrong year (training-data prior)", () => {
    it("bumps 2025-YY-DD to 2026 when creation was in 2026", () => {
      // #given Rob's eye-injection row created May 2026 with date 2025-06-09
      const result = migrateScheduleRow({
        date: "2025-06-09",
        _creationTime: ts("2026-05-04"),
      });

      // #then the year is bumped to 2026
      expect(result).toEqual({
        action: "patch",
        patch: { date: "2026-06-09" },
      });
    });

    it("leaves a real 2025 date alone when creation was in 2025", () => {
      // #given an actual historical row from 2025
      const result = migrateScheduleRow({
        date: "2025-04-17",
        _creationTime: ts("2025-04-10"),
      });

      // #then it's left alone — not a year-prior bug
      expect(result).toEqual({ action: "skip" });
    });

    it("leaves correctly-yeared ISO dates alone", () => {
      const result = migrateScheduleRow({
        date: "2026-06-10",
        _creationTime: ts("2026-05-04"),
      });

      expect(result).toEqual({ action: "skip" });
    });
  });

  describe("relative date words", () => {
    it("resolves 'today' against creation time", () => {
      // #given Sean's row from 2026-05-13
      const result = migrateScheduleRow({
        date: "today",
        _creationTime: ts("2026-05-13"),
      });

      // #then 'today' becomes that ISO date
      expect(result).toEqual({
        action: "patch",
        patch: { date: "2026-05-13" },
      });
    });

    it("resolves 'tomorrow' as creation + 1 day", () => {
      const result = migrateScheduleRow({
        date: "tomorrow",
        _creationTime: ts("2026-05-13"),
      });

      expect(result).toEqual({
        action: "patch",
        patch: { date: "2026-05-14" },
      });
    });
  });

  describe("day names", () => {
    it("resolves a future weekday to next occurrence on or after creation", () => {
      // #given creation on Sunday 2026-05-10, target Monday
      const result = migrateScheduleRow({
        date: "Monday",
        _creationTime: ts("2026-05-10"),
      });

      // #then it resolves to 2026-05-11 (the next Monday)
      expect(result).toEqual({
        action: "patch",
        patch: { date: "2026-05-11" },
      });
    });

    it("resolves a day-name same as creation day to that same day", () => {
      // #given creation on Monday 2026-05-11, target Monday
      const result = migrateScheduleRow({
        date: "Monday",
        _creationTime: ts("2026-05-11"),
      });

      // #then it stays as 2026-05-11 (the user meant 'this Monday', i.e. creation day)
      expect(result).toEqual({
        action: "patch",
        patch: { date: "2026-05-11" },
      });
    });

    it("wraps around for a past day-name to next week", () => {
      // #given creation on Friday 2026-05-15, target Monday
      const result = migrateScheduleRow({
        date: "Monday",
        _creationTime: ts("2026-05-15"),
      });

      // #then it becomes the following Monday 2026-05-18
      expect(result).toEqual({
        action: "patch",
        patch: { date: "2026-05-18" },
      });
    });
  });

  describe("recurrence words in the date field", () => {
    it("moves 'daily' from date to recurrence and clears date", () => {
      const result = migrateScheduleRow({
        date: "daily",
        _creationTime: ts("2026-05-01"),
      });

      expect(result).toEqual({
        action: "patch",
        patch: { date: undefined, recurrence: "daily" },
      });
    });

    it("moves 'recurring Friday' to weekly:fri and clears date", () => {
      const result = migrateScheduleRow({
        date: "recurring Friday",
        _creationTime: ts("2026-05-01"),
      });

      expect(result).toEqual({
        action: "patch",
        patch: { date: undefined, recurrence: "weekly:fri" },
      });
    });

    it("does not overwrite an existing recurrence value", () => {
      // #given the row already has a recurrence set (rare but possible)
      const result = migrateScheduleRow({
        date: "daily",
        recurrence: "weekly:mon",
        _creationTime: ts("2026-05-01"),
      });

      // #then only date is cleared; existing recurrence is preserved
      expect(result).toEqual({
        action: "patch",
        patch: { date: undefined },
      });
    });
  });

  describe("idempotency", () => {
    it("returns skip for an already-migrated row", () => {
      // #given a row that was previously migrated to a valid ISO date
      const result = migrateScheduleRow({
        date: "2026-06-09",
        _creationTime: ts("2026-05-04"),
      });

      // #then it's left alone — running the migration twice is safe
      expect(result).toEqual({ action: "skip" });
    });

    it("returns skip for an empty date", () => {
      // #given a row with no date at all (Haley's Kirsten reminder)
      const result = migrateScheduleRow({
        date: "",
        _creationTime: ts("2026-05-03"),
      });

      // #then it's left for the cron / agent to fill in later
      expect(result).toEqual({ action: "skip" });
    });

    it("returns skip for undefined date", () => {
      const result = migrateScheduleRow({
        _creationTime: ts("2026-05-03"),
      });
      expect(result).toEqual({ action: "skip" });
    });
  });

  describe("unparseable values", () => {
    it("warns on a garbage date string", () => {
      const result = migrateScheduleRow({
        date: "next week sometime",
        _creationTime: ts("2026-05-01"),
      });

      expect(result.action).toBe("warn");
      if (result.action === "warn") {
        expect(result.reason).toContain("next week sometime");
      }
    });

    it("warns on recurring with unparseable day", () => {
      const result = migrateScheduleRow({
        date: "recurring blursday",
        _creationTime: ts("2026-05-01"),
      });

      expect(result.action).toBe("warn");
      if (result.action === "warn") {
        expect(result.reason).toContain("Unparseable recurring day");
      }
    });
  });
});

describe("backfillScheduleDates mutation", () => {
  it("reports updated and skipped counts and applies patches in non-dry-run mode", async () => {
    // #given a care case with three schedule items: one bad, one good, one with relative date
    const t = convexTest(schema, modules);
    const { careCaseId } = await t.mutation(
      internal.mutations.createOnboardingUserAndCareCase,
      { phone: "+16515551234", chatId: "chat-backfill-1" },
    );

    // Seed rows directly (bypass mutation validation since we want bad data on purpose)
    await t.run(async (ctx) => {
      await ctx.db.insert("scheduleItems", {
        careCaseId,
        type: "reminder",
        title: "Wrong year",
        date: "2025-06-09",
        status: "scheduled",
      });
      await ctx.db.insert("scheduleItems", {
        careCaseId,
        type: "appointment",
        title: "Good ISO",
        date: "2026-06-15",
        status: "scheduled",
      });
      await ctx.db.insert("scheduleItems", {
        careCaseId,
        type: "task",
        title: "Garbage date",
        date: "next week sometime",
        status: "scheduled",
      });
    });

    // #when backfill runs in non-dry-run mode
    const report = await t.mutation(internal.admin.backfillScheduleDates, {
      dryRun: false,
    });

    // #then counts are accurate
    expect(report.total).toBe(3);
    expect(report.updated).toBe(1); // wrong year bumped to 2026
    expect(report.skipped).toBe(1); // already-valid ISO
    expect(report.warnings).toHaveLength(1); // garbage date

    // #then the patch is actually applied
    const updatedRow = await t.run(async (ctx) => {
      return await ctx.db
        .query("scheduleItems")
        .filter((q) => q.eq(q.field("title"), "Wrong year"))
        .first();
    });
    expect(updatedRow?.date).toBe("2026-06-09");
  });

  it("is idempotent — second run produces zero updates", async () => {
    // #given a care case with one bad-year row
    const t = convexTest(schema, modules);
    const { careCaseId } = await t.mutation(
      internal.mutations.createOnboardingUserAndCareCase,
      { phone: "+16515551235", chatId: "chat-backfill-2" },
    );
    await t.run(async (ctx) => {
      await ctx.db.insert("scheduleItems", {
        careCaseId,
        type: "reminder",
        title: "Wrong year",
        date: "2025-06-09",
        status: "scheduled",
      });
    });

    // #when backfill runs twice
    await t.mutation(internal.admin.backfillScheduleDates, { dryRun: false });
    const secondReport = await t.mutation(
      internal.admin.backfillScheduleDates,
      { dryRun: false },
    );

    // #then the second run finds nothing to update
    expect(secondReport.updated).toBe(0);
    expect(secondReport.skipped).toBe(1);
    expect(secondReport.warnings).toHaveLength(0);
  });

  it("does not write when dryRun=true", async () => {
    // #given a care case with one bad-year row
    const t = convexTest(schema, modules);
    const { careCaseId } = await t.mutation(
      internal.mutations.createOnboardingUserAndCareCase,
      { phone: "+16515551236", chatId: "chat-backfill-3" },
    );
    await t.run(async (ctx) => {
      await ctx.db.insert("scheduleItems", {
        careCaseId,
        type: "reminder",
        title: "Wrong year",
        date: "2025-06-09",
        status: "scheduled",
      });
    });

    // #when dryRun is true
    const report = await t.mutation(internal.admin.backfillScheduleDates, {
      dryRun: true,
    });

    // #then the report still shows the would-be update but the row is unchanged
    expect(report.updated).toBe(1);
    const row = await t.run(async (ctx) => {
      return await ctx.db
        .query("scheduleItems")
        .filter((q) => q.eq(q.field("title"), "Wrong year"))
        .first();
    });
    expect(row?.date).toBe("2025-06-09");
  });
});
