import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { buildWelcomeOpener } from "./welcome";

const modules = import.meta.glob("./**/*.ts");

const ENV_KEYS = [
  "DOORMAN_ENABLED",
  "LINQ_API_TOKEN",
  "LINQ_PHONE_NUMBER",
] as const;

let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  process.env.DOORMAN_ENABLED = "true";
  process.env.LINQ_API_TOKEN = "token";
  process.env.LINQ_PHONE_NUMBER = "+15550000000";
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      status: 201,
      text: () =>
        Promise.resolve(JSON.stringify({ chat: { id: "chat-1" } })),
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

describe("buildWelcomeOpener", () => {
  it("greets by first name when the signup has one", () => {
    const opener = buildWelcomeOpener("Jeanette Yates");
    expect(opener).toContain("Hi Jeanette —");
    expect(opener).toContain("caresupport.com");
  });

  it("greets plainly without a name", () => {
    expect(buildWelcomeOpener(undefined)).toContain("Hi — it's CareSupport");
  });
});

describe("autoWelcome", () => {
  it("texts a signup who never texted in, exactly once", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.waitlist.submitSignup, {
      email: "quiet@example.com",
      phone: "6465551234",
    });

    await t.finishAllScheduledFunctions(vi.runAllTimers);

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    const signup = await t.run(async (ctx) =>
      ctx.db
        .query("waitlistSignups")
        .withIndex("by_email", (q) => q.eq("email", "quiet@example.com"))
        .unique(),
    );
    expect(signup?.welcomedAt).toBeDefined();

    const stranger = await t.run(async (ctx) =>
      ctx.db
        .query("strangers")
        .withIndex("by_phone", (q) => q.eq("phone", "+16465551234"))
        .unique(),
    );
    expect(stranger?.status).toBe("screening");
    expect(stranger?.transcript[0]?.role).toBe("assistant");
    expect(stranger?.transcript[0]?.content).toContain("caresupport.com");
  });

  it("skips a signup who became a user before the timer fired", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.waitlist.submitSignup, {
      email: "fast@example.com",
      phone: "6465555678",
    });
    await t.mutation(internal.mutations.createOnboardingUserAndCareCase, {
      phone: "+16465555678",
      chatId: "chat-fast",
    });

    await t.finishAllScheduledFunctions(vi.runAllTimers);

    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
    const signup = await t.run(async (ctx) =>
      ctx.db
        .query("waitlistSignups")
        .withIndex("by_email", (q) => q.eq("email", "fast@example.com"))
        .unique(),
    );
    expect(signup?.welcomedAt).toBeUndefined();
  });

  it("skips a signup already mid-conversation with the doorman", async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();
    await t.mutation(api.waitlist.submitSignup, {
      email: "talking@example.com",
      phone: "6465559012",
    });
    await t.run(async (ctx) => {
      await ctx.db.insert("strangers", {
        phone: "+16465559012",
        status: "screening",
        transcript: [{ role: "user", content: "Hi CareSupport", at: now }],
        inboundTimestamps: [now],
        repliesToday: 0,
        replyCountResetAt: now,
        firstContactAt: now,
        lastContactAt: now,
      });
    });

    const result = await t.action(internal.welcome.autoWelcome, {
      email: "talking@example.com",
    });

    expect(result).toEqual({ sent: false, reason: "guard" });
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("never welcomes the same signup twice", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.waitlist.submitSignup, {
      email: "repeat@example.com",
      phone: "6465553456",
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const again = await t.action(internal.welcome.autoWelcome, {
      email: "repeat@example.com",
    });

    expect(again).toEqual({ sent: false, reason: "guard" });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the doorman is disabled (dev deployments)", async () => {
    const t = convexTest(schema, modules);
    delete process.env.DOORMAN_ENABLED;

    const result = await t.action(internal.welcome.autoWelcome, {
      email: "anyone@example.com",
    });

    expect(result).toEqual({ sent: false, reason: "doorman_disabled" });
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
});
