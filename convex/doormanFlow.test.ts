import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { internal } from "./_generated/api";
import { callAnthropic } from "./lib/anthropicClient";

vi.mock("./lib/anthropicClient");

const modules = import.meta.glob("./**/*.ts");

const ENV_KEYS = [
  "DOORMAN_ENABLED",
  "APP_ENV",
  "ANTHROPIC_API_KEY",
  "OPENROUTER_API_KEY",
  "LINQ_API_TOKEN",
  "LINQ_PHONE_NUMBER",
  "SENTINEL_ALERT_PHONE",
] as const;

let savedEnv: Record<string, string | undefined>;

function makeDoormanJson(input: {
  verdict: string;
  sms_response?: string;
  name?: string;
}) {
  return {
    text: JSON.stringify({
      sms_response: input.sms_response ?? "Reply from the doorman.",
      verdict: input.verdict,
      ...(input.name ? { name: input.name } : {}),
    }),
    thinking: "",
    model: "claude-haiku-4-5",
    inputTokens: 100,
    outputTokens: 50,
  };
}

async function seedWelcomedSignup(
  t: ReturnType<typeof convexTest>,
  input: { phone: string; email: string; fullName?: string; chatId: string },
) {
  await t.run(async (ctx) => {
    const hourAgo = Date.now() - 60 * 60 * 1000;
    await ctx.db.insert("waitlistSignups", {
      email: input.email,
      phone: input.phone,
      fullName: input.fullName,
      source: "landing-2026-05",
      submittedAt: hourAgo,
      welcomedAt: hourAgo,
    });
    await ctx.db.insert("strangers", {
      phone: input.phone,
      chatId: input.chatId,
      status: "screening",
      transcript: [
        {
          role: "assistant",
          content: "Hi — it's CareSupport. What's the care situation?",
          at: hourAgo,
        },
      ],
      inboundTimestamps: [],
      repliesToday: 0,
      replyCountResetAt: hourAgo,
      firstContactAt: hourAgo,
      lastContactAt: hourAgo,
    });
  });
}

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  process.env.DOORMAN_ENABLED = "true";
  process.env.ANTHROPIC_API_KEY = "test-key";
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.APP_ENV;
  delete process.env.LINQ_API_TOKEN;
  vi.useFakeTimers();
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = savedEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("doorman flag verdict (the jeanette scenario)", () => {
  it("flags a warm non-care human to the founder instead of dismissing", async () => {
    const t = convexTest(schema, modules);
    const phone = "+19045550001";
    await seedWelcomedSignup(t, {
      phone,
      email: "jeanette@example.com",
      chatId: "chat-jeanette",
    });
    vi.mocked(callAnthropic).mockResolvedValue(
      makeDoormanJson({
        verdict: "flag",
        sms_response: "The team will see this and follow up with you.",
        name: "Jeanette",
      }),
    );

    const result = await t.action(internal.handler.handleMessage, {
      senderPhone: phone,
      messageBody:
        "I'm a former caregiver who helps caregivers understand care technology — wanted to learn more!",
      chatId: "chat-jeanette",
      service: "imessage",
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    expect(result.success).toBe(true);
    const stranger = await t.run(async (ctx) =>
      ctx.db
        .query("strangers")
        .withIndex("by_phone", (q) => q.eq("phone", phone))
        .unique(),
    );
    expect(stranger?.status).toBe("flagged");
    expect(stranger?.transcript.at(-1)?.role).toBe("assistant");

    const alerts = await t.run(async (ctx) =>
      ctx.db.query("sentinelAlerts").collect(),
    );
    const flagAlerts = alerts.filter((a) => a.alertType === "doorman_flag");
    expect(flagAlerts).toHaveLength(1);
    expect(flagAlerts[0].details).toContain(phone);
    expect(flagAlerts[0].details).toContain("Jeanette");
  });

  it("does not re-alert the founder when a flagged person keeps chatting", async () => {
    const t = convexTest(schema, modules);
    const phone = "+19045550002";
    await seedWelcomedSignup(t, {
      phone,
      email: "advocate@example.com",
      chatId: "chat-advocate",
    });
    vi.mocked(callAnthropic).mockResolvedValue(
      makeDoormanJson({ verdict: "flag", sms_response: "The team will see this." }),
    );

    await t.action(internal.handler.handleMessage, {
      senderPhone: phone,
      messageBody: "Please pass my info along!",
      chatId: "chat-advocate",
      service: "imessage",
    });
    await t.action(internal.handler.handleMessage, {
      senderPhone: phone,
      messageBody: "Here's my website too: https://example.com",
      chatId: "chat-advocate",
      service: "imessage",
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const alerts = await t.run(async (ctx) =>
      ctx.db.query("sentinelAlerts").collect(),
    );
    expect(alerts.filter((a) => a.alertType === "doorman_flag")).toHaveLength(1);
    const stranger = await t.run(async (ctx) =>
      ctx.db
        .query("strangers")
        .withIndex("by_phone", (q) => q.eq("phone", phone))
        .unique(),
    );
    expect(stranger?.status).toBe("flagged");
  });
});

describe("doorman graduation (the edobanach scenario)", () => {
  it("graduates a waitlist signup on clear intent and marks them converted", async () => {
    const t = convexTest(schema, modules);
    const phone = "+16465550003";
    await t.run(async (ctx) => {
      await ctx.db.insert("waitlistSignups", {
        email: "ed@example.com",
        phone,
        fullName: "Ed Obanach",
        source: "landing-2026-05",
        submittedAt: Date.now() - 60 * 60 * 1000,
      });
    });
    vi.mocked(callAnthropic).mockResolvedValue(
      makeDoormanJson({
        verdict: "graduate",
        sms_response: "Opening your care thread now — tell me what's going on.",
        name: "Ed",
      }),
    );

    const result = await t.action(internal.handler.handleMessage, {
      senderPhone: phone,
      messageBody:
        "Hi CareSupport — I'd like to get started. My father was just discharged and needs PT at home.",
      chatId: "chat-ed",
      service: "imessage",
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    expect(result.success).toBe(true);
    const user = await t.run(async (ctx) =>
      ctx.db
        .query("users")
        .withIndex("by_phone", (q) => q.eq("phone", phone))
        .first(),
    );
    expect(user).not.toBeNull();
    expect(user?.name).toBe("Ed");

    const signup = await t.run(async (ctx) =>
      ctx.db
        .query("waitlistSignups")
        .withIndex("by_phone", (q) => q.eq("phone", phone))
        .first(),
    );
    expect(signup?.convertedUserId).toEqual(user?._id);

    const stranger = await t.run(async (ctx) =>
      ctx.db
        .query("strangers")
        .withIndex("by_phone", (q) => q.eq("phone", phone))
        .unique(),
    );
    expect(stranger?.status).toBe("graduated");
  });

  it("tells the model when the number matches a waitlist signup", async () => {
    const t = convexTest(schema, modules);
    const phone = "+16465550004";
    await t.run(async (ctx) => {
      await ctx.db.insert("waitlistSignups", {
        email: "expected@example.com",
        phone,
        fullName: "Sky Robertson",
        source: "landing-2026-05",
        submittedAt: Date.now() - 60 * 60 * 1000,
      });
    });
    vi.mocked(callAnthropic).mockResolvedValue(
      makeDoormanJson({ verdict: "continue", sms_response: "Hey!" }),
    );

    await t.action(internal.handler.handleMessage, {
      senderPhone: phone,
      messageBody: "Hello",
      chatId: "chat-sky",
      service: "imessage",
    });

    const call = vi.mocked(callAnthropic).mock.calls[0][0];
    expect(call.systemBlocks).toHaveLength(2);
    expect(call.systemBlocks[1].text).toContain("EXPECTED GUEST");
    expect(call.systemBlocks[1].text).toContain("Sky Robertson");
    expect(call.systemBlocks[0].cacheBreakpoint).toBe(true);
  });

  it("sends no waitlist block for a true stranger", async () => {
    const t = convexTest(schema, modules);
    vi.mocked(callAnthropic).mockResolvedValue(
      makeDoormanJson({ verdict: "continue", sms_response: "Hi there!" }),
    );

    await t.action(internal.handler.handleMessage, {
      senderPhone: "+15555550005",
      messageBody: "Hello",
      chatId: "chat-unknown",
      service: "imessage",
    });

    const call = vi.mocked(callAnthropic).mock.calls[0][0];
    expect(call.systemBlocks).toHaveLength(1);
  });
});
