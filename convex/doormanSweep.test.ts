import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { internal } from "./_generated/api";
import { callAnthropic } from "./lib/anthropicClient";

vi.mock("./lib/anthropicClient");

const modules = import.meta.glob("./**/*.ts");

const DAY_MS = 24 * 60 * 60 * 1000;

const ENV_KEYS = [
  "DOORMAN_ENABLED",
  "ANTHROPIC_API_KEY",
  "OPENROUTER_API_KEY",
  "LINQ_API_TOKEN",
  "LINQ_PHONE_NUMBER",
  "SENTINEL_ALERT_PHONE",
] as const;

let savedEnv: Record<string, string | undefined>;

function nudgeResponse(text: string) {
  return {
    text: JSON.stringify({ sms_response: text, verdict: "continue" }),
    thinking: "",
    model: "claude-haiku-4-5",
    inputTokens: 100,
    outputTokens: 50,
  };
}

async function seedScreeningStranger(
  t: ReturnType<typeof convexTest>,
  input: { phone: string; chatId?: string; lastContactAt: number },
) {
  await t.run(async (ctx) => {
    await ctx.db.insert("strangers", {
      phone: input.phone,
      chatId: input.chatId,
      status: "screening",
      transcript: [
        { role: "user", content: "Hi CareSupport", at: input.lastContactAt },
        {
          role: "assistant",
          content: "Hey! What's the care situation?",
          at: input.lastContactAt,
        },
      ],
      inboundTimestamps: [input.lastContactAt],
      repliesToday: 1,
      replyCountResetAt: input.lastContactAt,
      firstContactAt: input.lastContactAt,
      lastContactAt: input.lastContactAt,
    });
  });
}

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  process.env.DOORMAN_ENABLED = "true";
  process.env.ANTHROPIC_API_KEY = "test-key";
  process.env.LINQ_API_TOKEN = "token";
  process.env.LINQ_PHONE_NUMBER = "+15550000000";
  delete process.env.OPENROUTER_API_KEY;
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      status: 201,
      text: () => Promise.resolve(JSON.stringify({ message: { id: "msg-1" } })),
    }),
  );
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = savedEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("doorman lobby sweep", () => {
  it("nudges a stalled screening conversation once and digests the lobby", async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();
    await seedScreeningStranger(t, {
      phone: "+14805550001",
      chatId: "chat-stalled",
      lastContactAt: now - 2 * DAY_MS,
    });
    await seedScreeningStranger(t, {
      phone: "+14805550002",
      lastContactAt: now - 20 * DAY_MS,
    });
    vi.mocked(callAnthropic).mockResolvedValue(
      nudgeResponse("Still here whenever you're ready — no rush."),
    );

    const result = await t.action(internal.doormanSweep.run, { now });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    if ("skipped" in result) throw new Error("sweep unexpectedly skipped");
    expect(result.nudged).toBe(1);
    expect(result.beyondWindow).toBe(1);

    const nudgedStranger = await t.run(async (ctx) =>
      ctx.db
        .query("strangers")
        .withIndex("by_phone", (q) => q.eq("phone", "+14805550001"))
        .unique(),
    );
    expect(nudgedStranger?.nudgedAt).toBeDefined();
    expect(nudgedStranger?.transcript.at(-1)?.content).toBe(
      "Still here whenever you're ready — no rush.",
    );

    const tooOldStranger = await t.run(async (ctx) =>
      ctx.db
        .query("strangers")
        .withIndex("by_phone", (q) => q.eq("phone", "+14805550002"))
        .unique(),
    );
    expect(tooOldStranger?.nudgedAt).toBeUndefined();

    const alerts = await t.run(async (ctx) =>
      ctx.db.query("sentinelAlerts").collect(),
    );
    const digests = alerts.filter((a) => a.alertType === "doorman_digest");
    expect(digests).toHaveLength(1);
    expect(digests[0].details).toContain("nudged 1");
    expect(digests[0].details).toContain(">14d");
  });

  it("never nudges the same stranger twice", async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();
    await seedScreeningStranger(t, {
      phone: "+14805550003",
      chatId: "chat-once",
      lastContactAt: now - 2 * DAY_MS,
    });
    vi.mocked(callAnthropic).mockResolvedValue(nudgeResponse("Checking in!"));

    const first = await t.action(internal.doormanSweep.run, { now });
    const second = await t.action(internal.doormanSweep.run, {
      now: now + 2 * DAY_MS,
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    if ("skipped" in first || "skipped" in second) {
      throw new Error("sweep unexpectedly skipped");
    }
    expect(first.nudged).toBe(1);
    expect(second.nudged).toBe(0);
    expect(vi.mocked(callAnthropic)).toHaveBeenCalledTimes(1);
  });

  it("no-ops entirely when the doorman is disabled", async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();
    await seedScreeningStranger(t, {
      phone: "+14805550004",
      lastContactAt: now - 2 * DAY_MS,
    });
    delete process.env.DOORMAN_ENABLED;

    const result = await t.action(internal.doormanSweep.run, { now });

    expect(result).toEqual({ skipped: "doorman_disabled" });
    expect(vi.mocked(callAnthropic)).not.toHaveBeenCalled();
  });
});
