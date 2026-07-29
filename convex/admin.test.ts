import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

describe("listActiveCareCasesForDigest", () => {
  it("includes a care case with a recent inbound message and a chatId", async () => {
    // #given a care case with an active user who messaged today
    const t = convexTest(schema, modules);
    const { careCaseId, userId } = await t.mutation(
      internal.mutations.createOnboardingUserAndCareCase,
      { phone: "+16515551001", chatId: "chat-active-1" },
    );
    await t.mutation(internal.mutations.logMessage, {
      careCaseId,
      userId,
      senderPhone: "+16515551001",
      actorType: "user",
      direction: "inbound",
      body: "hello",
      timestamp: Date.now() - 60_000,
    });

    // #when the cron asks for digest-eligible care cases
    const result = await t.query(
      internal.admin.listActiveCareCasesForDigest,
      {},
    );

    // #then this case is included
    expect(result).toHaveLength(1);
    expect(result[0].careCaseId).toBe(careCaseId);
    expect(result[0].chatId).toBe("chat-active-1");
    expect(result[0].userName).toBe("New User");
  });

  it("excludes a care case whose last inbound was more than 14 days ago (dormant)", async () => {
    // #given a stale care case
    const t = convexTest(schema, modules);
    const { careCaseId, userId } = await t.mutation(
      internal.mutations.createOnboardingUserAndCareCase,
      { phone: "+16515551002", chatId: "chat-dormant" },
    );
    await t.mutation(internal.mutations.logMessage, {
      careCaseId,
      userId,
      senderPhone: "+16515551002",
      actorType: "user",
      direction: "inbound",
      body: "old message",
      timestamp: Date.now() - 20 * 24 * 60 * 60 * 1000,
    });

    // #when the cron asks
    const result = await t.query(
      internal.admin.listActiveCareCasesForDigest,
      {},
    );

    // #then nothing is included
    expect(result).toHaveLength(0);
  });

  it("excludes a care case with no chatId (cannot send)", async () => {
    // #given a user that never linked a chat
    const t = convexTest(schema, modules);
    const careCaseId = await t.run(async (ctx) => {
      const cc = await ctx.db.insert("careCases", {
        title: "No Chat",
        status: "active",
        timezone: "UTC",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      const user = await ctx.db.insert("users", {
        phone: "+16515551003",
        name: "Phantom",
        careCaseId: cc,
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.insert("messages", {
        careCaseId: cc,
        userId: user,
        senderPhone: "+16515551003",
        actorType: "user",
        direction: "inbound",
        body: "hi",
        timestamp: Date.now() - 60_000,
      });
      return cc;
    });

    // #when the cron asks
    const result = await t.query(
      internal.admin.listActiveCareCasesForDigest,
      {},
    );

    // #then this care case is excluded — no chatId means we can't reach them
    expect(
      result.find((r: { careCaseId: Id<"careCases"> }) => r.careCaseId === careCaseId),
    ).toBeUndefined();
  });

  it("excludes archived care cases regardless of recency", async () => {
    // #given an archived case with a recent inbound
    const t = convexTest(schema, modules);
    const { careCaseId, userId } = await t.mutation(
      internal.mutations.createOnboardingUserAndCareCase,
      { phone: "+16515551004", chatId: "chat-archived" },
    );
    await t.mutation(internal.mutations.logMessage, {
      careCaseId,
      userId,
      senderPhone: "+16515551004",
      actorType: "user",
      direction: "inbound",
      body: "still active recently",
      timestamp: Date.now() - 60_000,
    });
    await t.mutation(internal.mutations.updateCareCaseProfile, {
      careCaseId,
      status: "archived",
    });

    // #when the cron asks
    const result = await t.query(
      internal.admin.listActiveCareCasesForDigest,
      {},
    );

    // #then archived case is filtered out
    expect(result).toHaveLength(0);
  });
});

describe("getCareCaseDigestData", () => {
  it("returns scheduled items for the care case and recent scheduled_digest audits", async () => {
    // #given a care case with two schedule items, one cancelled
    const t = convexTest(schema, modules);
    const { careCaseId, userId } = await t.mutation(
      internal.mutations.createOnboardingUserAndCareCase,
      { phone: "+16515551005", chatId: "chat-digest-data" },
    );
    const now = Date.now();
    await t.run(async (ctx) => {
      await ctx.db.insert("scheduleItems", {
        careCaseId,
        type: "appointment",
        title: "Vet visit",
        date: "2026-05-15",
        status: "scheduled",
      });
      await ctx.db.insert("scheduleItems", {
        careCaseId,
        type: "task",
        title: "Cancelled task",
        date: "2026-05-15",
        status: "cancelled",
      });
      await ctx.db.insert("auditLogs", {
        careCaseId,
        userId,
        event: "response_sent",
        details: { triggerMessage: "scheduled_digest" },
        timestamp: now - 60_000,
      });
      await ctx.db.insert("auditLogs", {
        careCaseId,
        userId,
        event: "response_sent",
        details: { triggerMessage: "regular message" },
        timestamp: now - 60_000,
      });
    });

    // #when the cron fetches digest data
    const result = await t.query(
      internal.admin.getCareCaseDigestData,
      { careCaseId, todayLocalIso: "2026-05-15", sinceMs: now - 5 * 60_000 },
    );

    // #then only the scheduled (non-cancelled) item is returned
    expect(
      result.scheduleItems.filter((s: Doc<"scheduleItems">) => s.status === "scheduled"),
    ).toHaveLength(1);
    expect(
      result.scheduleItems.find((s: Doc<"scheduleItems">) => s.title === "Vet visit"),
    ).toBeDefined();

    // #and only digest-trigger audits are returned (not regular messages)
    expect(result.recentDigestAudits).toHaveLength(1);
  });
});

describe("resetUserByPhone", () => {
  it("deletes the user, care case, all case-scoped rows, and signup state", async () => {
    // #given a user with messages, memories, a stranger row, and a signup
    const t = convexTest(schema, modules);
    const phone = "+16515552001";
    const { careCaseId, userId } = await t.mutation(
      internal.mutations.createOnboardingUserAndCareCase,
      { phone, chatId: "chat-reset-target" },
    );
    await t.mutation(internal.mutations.logMessage, {
      careCaseId,
      userId,
      senderPhone: phone,
      actorType: "user",
      direction: "inbound",
      body: "hello",
      timestamp: Date.now(),
    });
    await t.run(async (ctx) => {
      await ctx.db.insert("memoryEntries", {
        careCaseId,
        userId,
        scope: "care_case",
        category: "care_note",
        content: "test memory",
        active: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.insert("strangers", {
        phone,
        status: "graduated",
        transcript: [],
        inboundTimestamps: [],
        repliesToday: 0,
        replyCountResetAt: Date.now(),
        firstContactAt: Date.now(),
        lastContactAt: Date.now(),
        graduatedUserId: userId,
      });
      await ctx.db.insert("waitlistSignups", {
        email: "reset-me@example.com",
        phone,
        source: "landing-2026-05",
        submittedAt: Date.now(),
        convertedUserId: userId,
      });
    });

    // #when the founder resets the account
    const result = await t.action(internal.admin.resetUserByPhone, {
      phone,
      confirm: "DELETE",
    });

    // #then every trace of the account is gone
    expect(result.deleted.users).toBe(1);
    expect(result.deleted.careCases).toBe(1);
    const leftovers = await t.run(async (ctx) => ({
      user: await ctx.db
        .query("users")
        .withIndex("by_phone", (q) => q.eq("phone", phone))
        .first(),
      careCase: await ctx.db.get(careCaseId),
      messages: await ctx.db
        .query("messages")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", careCaseId))
        .collect(),
      memories: await ctx.db
        .query("memoryEntries")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", careCaseId))
        .collect(),
      stranger: await ctx.db
        .query("strangers")
        .withIndex("by_phone", (q) => q.eq("phone", phone))
        .first(),
      signup: await ctx.db
        .query("waitlistSignups")
        .withIndex("by_phone", (q) => q.eq("phone", phone))
        .first(),
    }));
    expect(leftovers).toEqual({
      user: null,
      careCase: null,
      messages: [],
      memories: [],
      stranger: null,
      signup: null,
    });
  });

  it("leaves other users untouched", async () => {
    // #given two users
    const t = convexTest(schema, modules);
    await t.mutation(internal.mutations.createOnboardingUserAndCareCase, {
      phone: "+16515552002",
      chatId: "chat-reset-a",
    });
    const other = await t.mutation(
      internal.mutations.createOnboardingUserAndCareCase,
      { phone: "+16515552003", chatId: "chat-keep-b" },
    );

    // #when one is reset
    await t.action(internal.admin.resetUserByPhone, {
      phone: "+16515552002",
      confirm: "DELETE",
    });

    // #then the other survives with its care case
    const kept = await t.run(async (ctx) => ({
      user: await ctx.db.get(other.userId),
      careCase: await ctx.db.get(other.careCaseId),
    }));
    expect(kept.user).not.toBeNull();
    expect(kept.careCase).not.toBeNull();
  });

  it("is a no-op for an unknown phone", async () => {
    const t = convexTest(schema, modules);
    const result = await t.action(internal.admin.resetUserByPhone, {
      phone: "+19999999999",
      confirm: "DELETE",
    });
    expect(result.deleted).toEqual({});
  });
});
