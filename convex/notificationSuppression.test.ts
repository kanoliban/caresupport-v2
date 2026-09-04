/**
 * Integration coverage for the bug this change fixes: a caregiver replied
 * "Stop" to the daily brief, the agent said it had stopped, and the 8:00 AM
 * cron sent the identical brief for three more mornings.
 *
 * The reply path and the scheduled path were never connected. These tests
 * assert the connection, not just the helpers.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { dailyDigestDedupeKey, fingerprintContent } from "./lib/notificationDedupe";

const modules = import.meta.glob("./**/*.ts");

async function createActiveCareCaseWithMorningInsulin(
  t: ReturnType<typeof convexTest>,
): Promise<{ careCaseId: Id<"careCases">; userId: Id<"users"> }> {
  const { careCaseId, userId } = await t.mutation(
    internal.mutations.createOnboardingUserAndCareCase,
    { phone: "+16515557300", chatId: "chat-stop-bug" },
  );
  await t.mutation(internal.mutations.updateUserProfile, {
    userId,
    name: "Rob",
    status: "active",
  });
  await t.mutation(internal.mutations.updateCareCaseProfile, {
    careCaseId,
    careRecipientName: "Rob",
    timezone: "America/Chicago",
    status: "active",
  });
  await t.run(async (ctx) => {
    await ctx.db.insert("scheduleItems", {
      careCaseId,
      type: "reminder",
      title: "Insulin",
      time: "08:00",
      recurrence: "daily",
      status: "scheduled",
    });
    // The digest only goes to care cases with recent inbound activity.
    await ctx.db.insert("messages", {
      careCaseId,
      userId,
      actorType: "user",
      direction: "inbound",
      body: "thanks",
      timestamp: Date.now(),
    });
  });
  return { careCaseId, userId };
}

function stubLinqSend(messageId: string) {
  process.env.LINQ_API_TOKEN = "token";
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      status: 201,
      text: () => Promise.resolve(JSON.stringify({ message: { id: messageId } })),
    }),
  );
}

describe("stop intent reaches the scheduled sender", () => {
  const originalToken = process.env.LINQ_API_TOKEN;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.LINQ_API_TOKEN = originalToken;
  });

  it("sends the brief while nothing is suppressed", async () => {
    // #given an active care case with a recurring 8 AM insulin reminder
    const t = convexTest(schema, modules);
    const { careCaseId } = await createActiveCareCaseWithMorningInsulin(t);
    stubLinqSend("msg-digest-1");

    // #when the daily cron runs
    const result = await t.action(internal.reminders.sendDailyDigest, {
      careCaseId,
    });

    // #then the brief goes out
    expect(result).toEqual({ sent: true });
  });

  it("does not send once a stop has been recorded", async () => {
    // #given the caregiver replied "Stop" and a suppression was written
    const t = convexTest(schema, modules);
    const { careCaseId, userId } = await createActiveCareCaseWithMorningInsulin(t);
    await t.mutation(internal.notifications.suppressChannel, {
      careCaseId,
      userId,
      channel: "all",
      requestText: "Stop",
      scopeHint: "unscoped",
    });
    stubLinqSend("msg-digest-2");

    // #when the next morning's cron runs
    const result = await t.action(internal.reminders.sendDailyDigest, {
      careCaseId,
    });

    // #then nothing is sent — this is the failure the incident reported
    expect(result).toEqual({ sent: false, reason: "suppressed" });
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("leaves an audit trail for the skipped send", async () => {
    const t = convexTest(schema, modules);
    const { careCaseId, userId } = await createActiveCareCaseWithMorningInsulin(t);
    await t.mutation(internal.notifications.suppressChannel, {
      careCaseId,
      userId,
      channel: "all",
    });
    stubLinqSend("msg-digest-3");

    await t.action(internal.reminders.sendDailyDigest, { careCaseId });

    const skipped = await t.run(async (ctx) =>
      ctx.db
        .query("auditLogs")
        .filter((q) => q.eq(q.field("event"), "notification_skipped"))
        .collect(),
    );
    expect(skipped).toHaveLength(1);
    expect(skipped[0].details.channel).toBe("daily_digest");
    expect(skipped[0].details.reason).toBe("suppressed");
  });

  it("resumes sending after the suppression is released", async () => {
    const t = convexTest(schema, modules);
    const { careCaseId, userId } = await createActiveCareCaseWithMorningInsulin(t);
    await t.mutation(internal.notifications.suppressChannel, {
      careCaseId,
      userId,
      channel: "all",
    });
    const released = await t.mutation(internal.notifications.releaseSuppressions, {
      careCaseId,
    });
    stubLinqSend("msg-digest-4");

    const result = await t.action(internal.reminders.sendDailyDigest, {
      careCaseId,
    });

    expect(released).toEqual({ released: 1 });
    expect(result).toEqual({ sent: true });
  });

  it("blocks a schedule-item reminder too, not just the daily brief", async () => {
    const t = convexTest(schema, modules);
    const { careCaseId, userId } = await createActiveCareCaseWithMorningInsulin(t);
    const scheduleItemId = await t.run(async (ctx) =>
      ctx.db.insert("scheduleItems", {
        careCaseId,
        type: "appointment",
        title: "Nephrology",
        date: "2026-09-10",
        time: "14:00",
        status: "scheduled",
      }),
    );
    await t.mutation(internal.notifications.suppressChannel, {
      careCaseId,
      userId,
      channel: "all",
    });

    const result = await t.action(internal.reminders.sendScheduleItemReminder, {
      scheduleItemId,
      careCaseId,
      userId,
      chatId: "chat-stop-bug",
      expectedStartMs: Date.parse("2026-09-10T19:00:00Z"),
      title: "Nephrology",
    });

    expect(result).toEqual({ sent: false, reason: "suppressed" });
  });
});

describe("suppression state", () => {
  it("treats a blanket stop as covering every scheduled channel", async () => {
    const t = convexTest(schema, modules);
    const { careCaseId, userId } = await createActiveCareCaseWithMorningInsulin(t);
    await t.mutation(internal.notifications.suppressChannel, {
      careCaseId,
      userId,
      channel: "all",
    });

    for (const channel of ["daily_digest", "schedule_reminder", "coordination_status"] as const) {
      const state = await t.query(internal.notifications.getSuppressionState, {
        careCaseId,
        channel,
      });
      expect(state.suppressed, channel).toBe(true);
    }
  });

  it("is idempotent — a second stop refreshes rather than stacking", async () => {
    const t = convexTest(schema, modules);
    const { careCaseId, userId } = await createActiveCareCaseWithMorningInsulin(t);
    const first = await t.mutation(internal.notifications.suppressChannel, {
      careCaseId,
      userId,
      channel: "all",
      requestText: "Stop",
    });
    const second = await t.mutation(internal.notifications.suppressChannel, {
      careCaseId,
      userId,
      channel: "all",
      requestText: "stop texting me",
    });

    expect(second.alreadyActive).toBe(true);
    expect(second.suppressionId).toBe(first.suppressionId);

    const rows = await t.run(async (ctx) =>
      ctx.db.query("notificationSuppressions").collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].requestText).toBe("stop texting me");
  });

  it("keeps suppression scoped to its own care case", async () => {
    const t = convexTest(schema, modules);
    const { careCaseId, userId } = await createActiveCareCaseWithMorningInsulin(t);
    const other = await t.mutation(
      internal.mutations.createOnboardingUserAndCareCase,
      { phone: "+16515557301", chatId: "chat-other" },
    );
    await t.mutation(internal.notifications.suppressChannel, {
      careCaseId,
      userId,
      channel: "all",
    });

    const otherState = await t.query(internal.notifications.getSuppressionState, {
      careCaseId: other.careCaseId,
      channel: "daily_digest",
    });
    expect(otherState.suppressed).toBe(false);
  });
});

describe("delivery idempotency", () => {
  it("refuses a second claim on the same dedupe key", async () => {
    const t = convexTest(schema, modules);
    const { careCaseId, userId } = await createActiveCareCaseWithMorningInsulin(t);
    const claimArgs = {
      careCaseId,
      userId,
      channel: "daily_digest" as const,
      dedupeKey: dailyDigestDedupeKey(careCaseId, "2026-09-04"),
      contentFingerprint: fingerprintContent("Today: Insulin at 8 AM."),
      body: "Today: Insulin at 8 AM.",
    };

    const first = await t.mutation(internal.notifications.claimDelivery, claimArgs);
    const second = await t.mutation(internal.notifications.claimDelivery, claimArgs);

    expect(first.claimed).toBe(true);
    expect(second).toMatchObject({
      claimed: false,
      reason: "duplicate_dedupe_key",
    });
  });

  it("counts consecutive identical briefs — three days would now be visible", async () => {
    const t = convexTest(schema, modules);
    const { careCaseId, userId } = await createActiveCareCaseWithMorningInsulin(t);
    const body = "Good morning, Rob.\n\nToday: Insulin at 8 AM.";
    const streaks: number[] = [];

    for (const day of ["2026-09-04", "2026-09-05", "2026-09-06"]) {
      const claim = await t.mutation(internal.notifications.claimDelivery, {
        careCaseId,
        userId,
        channel: "daily_digest",
        dedupeKey: dailyDigestDedupeKey(careCaseId, day),
        contentFingerprint: fingerprintContent(body),
        body,
      });
      streaks.push(claim.unchangedStreak);
    }

    expect(streaks).toEqual([1, 2, 3]);
  });

  it("resets the streak when the brief actually changes", async () => {
    const t = convexTest(schema, modules);
    const { careCaseId, userId } = await createActiveCareCaseWithMorningInsulin(t);

    await t.mutation(internal.notifications.claimDelivery, {
      careCaseId,
      userId,
      channel: "daily_digest",
      dedupeKey: dailyDigestDedupeKey(careCaseId, "2026-09-04"),
      contentFingerprint: fingerprintContent("Today: Insulin at 8 AM."),
      body: "Today: Insulin at 8 AM.",
    });
    const changed = await t.mutation(internal.notifications.claimDelivery, {
      careCaseId,
      userId,
      channel: "daily_digest",
      dedupeKey: dailyDigestDedupeKey(careCaseId, "2026-09-05"),
      contentFingerprint: fingerprintContent("Today: Insulin at 8 AM; PT at 2 PM."),
      body: "Today: Insulin at 8 AM; PT at 2 PM.",
    });

    expect(changed.contentUnchanged).toBe(false);
    expect(changed.unchangedStreak).toBe(1);
  });

  it("does not resend the brief twice in one local day", async () => {
    const t = convexTest(schema, modules);
    const { careCaseId } = await createActiveCareCaseWithMorningInsulin(t);
    stubLinqSendForDedupe();

    const first = await t.action(internal.reminders.sendDailyDigest, { careCaseId });
    const second = await t.action(internal.reminders.sendDailyDigest, { careCaseId });

    expect(first).toEqual({ sent: true });
    expect(second).toEqual({ sent: false, reason: "already_sent_today" });

    vi.unstubAllGlobals();
  });
});

function stubLinqSendForDedupe() {
  process.env.LINQ_API_TOKEN = "token";
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      status: 201,
      text: () => Promise.resolve(JSON.stringify({ message: { id: "msg-dedupe" } })),
    }),
  );
}
