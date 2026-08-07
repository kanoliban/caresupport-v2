import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

interface BeginOptions {
  userId: string;
  conversationId: string;
  agentName: string;
  input: string;
}

const end = vi.fn();
const begin = vi.fn((_options: BeginOptions) => ({ end }));
const init = vi.fn(() => true);
const flush = vi.fn(async () => {});
const isInitialized = vi.fn(() => false);

vi.mock("agnostai", () => ({ begin, init, flush, isInitialized }));

const ORG_ID = "ecc7ed31-c985-436d-b062-5ba9388f516b";

async function loadModule() {
  vi.resetModules();
  return await import("./agnost");
}

const ENV_KEYS = [
  "AGNOST_ORG_ID",
  "AGNOST_ENDPOINT",
  "AGNOST_DISABLE_CONTENT",
  "AGNOST_DEBUG",
] as const;

const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
});

describe("startTurn", () => {
  it("no-ops entirely when AGNOST_ORG_ID is unset", async () => {
    const { startTurn, CARE_AGENT_NAME } = await loadModule();

    const turn = startTurn({ agentName: CARE_AGENT_NAME, input: "hi" });
    turn.identify({ userId: "u1", conversationId: "c1" });
    await turn.finish({ success: true, response: "hello" });

    expect(init).not.toHaveBeenCalled();
    expect(begin).not.toHaveBeenCalled();
    expect(end).not.toHaveBeenCalled();
  });

  it("records nothing when the turn ends before identity is resolved", async () => {
    process.env.AGNOST_ORG_ID = ORG_ID;
    const { startTurn } = await loadModule();

    const turn = startTurn({ agentName: "doorman", input: "who is this" });
    await turn.finish({ success: false, response: "", error: "group_chat" });

    expect(begin).not.toHaveBeenCalled();
    expect(end).not.toHaveBeenCalled();
  });

  it("opens the interaction at identify and sends the turn at finish", async () => {
    process.env.AGNOST_ORG_ID = ORG_ID;
    const { startTurn, CARE_AGENT_NAME } = await loadModule();

    const turn = startTurn({
      agentName: CARE_AGENT_NAME,
      input: "mom needs a ride thursday",
      startedAt: Date.now() - 1_200,
    });
    turn.identify(
      { userId: "user_123", conversationId: "case_456" },
      { service: "imessage", careContactId: undefined },
    );
    turn.setProperties({ routedTier: "full" });

    const outcome = await turn.finish({
      success: true,
      response: "I'll ask Sarah.",
    });

    expect(init).toHaveBeenCalledWith(ORG_ID, {
      endpoint: "https://api.agnost.ai",
      debug: false,
    });
    expect(begin).toHaveBeenCalledWith({
      userId: "user_123",
      conversationId: "case_456",
      agentName: CARE_AGENT_NAME,
      input: "mom needs a ride thursday",
    });

    const [output, success, latency, properties] = end.mock.calls[0];
    expect(output).toBe("I'll ask Sarah.");
    expect(success).toBe(true);
    expect(latency).toBeGreaterThanOrEqual(1_200);
    expect(properties).toEqual({ service: "imessage", routedTier: "full" });

    expect(flush).toHaveBeenCalledTimes(1);
    expect(outcome).toEqual({ success: true, response: "I'll ask Sarah." });
  });

  it("carries the failure reason through as an error property", async () => {
    process.env.AGNOST_ORG_ID = ORG_ID;
    const { startTurn } = await loadModule();

    const turn = startTurn({ agentName: "care-coordinator", input: "hi" });
    turn.identify({ userId: "u1", conversationId: "c1" });
    await turn.finish({
      success: false,
      response: "",
      error: "anthropic 529",
    });

    const [output, success, , properties] = end.mock.calls[0];
    expect(output).toBe("");
    expect(success).toBe(false);
    expect(properties).toEqual({ error: "anthropic 529" });
  });

  it("is idempotent so a turn is never double-counted", async () => {
    process.env.AGNOST_ORG_ID = ORG_ID;
    const { startTurn } = await loadModule();

    const turn = startTurn({ agentName: "care-coordinator", input: "hi" });
    turn.identify({ userId: "u1", conversationId: "c1" });
    await turn.finish({ success: true, response: "one" });
    await turn.finish({ success: true, response: "two" });

    expect(end).toHaveBeenCalledTimes(1);
    expect(flush).toHaveBeenCalledTimes(1);
  });

  it("only opens one interaction per turn", async () => {
    process.env.AGNOST_ORG_ID = ORG_ID;
    const { startTurn } = await loadModule();

    const turn = startTurn({ agentName: "care-coordinator", input: "hi" });
    turn.identify({ userId: "u1", conversationId: "c1" });
    turn.identify({ userId: "u2", conversationId: "c2" });

    expect(begin).toHaveBeenCalledTimes(1);
    expect(begin.mock.calls[0][0]).toMatchObject({ userId: "u1" });
  });

  it("redacts message content but keeps the telemetry when asked", async () => {
    process.env.AGNOST_ORG_ID = ORG_ID;
    process.env.AGNOST_DISABLE_CONTENT = "true";
    const { startTurn } = await loadModule();

    const turn = startTurn({
      agentName: "care-coordinator",
      input: "dad's oxycodone dose changed",
    });
    turn.identify({ userId: "u1", conversationId: "c1" });
    await turn.finish({ success: true, response: "Noted — 5mg at 8pm." });

    expect(begin.mock.calls[0][0].input).toBe("[redacted]");
    const [output, success] = end.mock.calls[0];
    expect(output).toBe("[redacted]");
    expect(success).toBe(true);
  });

  it("honors a self-hosted endpoint", async () => {
    process.env.AGNOST_ORG_ID = ORG_ID;
    process.env.AGNOST_ENDPOINT = "http://localhost:8090";
    const { startTurn } = await loadModule();

    startTurn({ agentName: "care-coordinator", input: "hi" }).identify({
      userId: "u1",
      conversationId: "c1",
    });

    expect(init).toHaveBeenCalledWith(ORG_ID, {
      endpoint: "http://localhost:8090",
      debug: false,
    });
  });

  it("never lets an SDK failure escape into the care turn", async () => {
    process.env.AGNOST_ORG_ID = ORG_ID;
    begin.mockImplementationOnce(() => {
      throw new Error("agnost unreachable");
    });
    const { startTurn } = await loadModule();

    const turn = startTurn({ agentName: "care-coordinator", input: "hi" });
    expect(() => turn.identify({ userId: "u1", conversationId: "c1" })).not.toThrow();
    await expect(turn.finish({ success: true, response: "ok" })).resolves.toEqual({
      success: true,
      response: "ok",
    });
  });

  it("never lets a flush failure escape into the care turn", async () => {
    process.env.AGNOST_ORG_ID = ORG_ID;
    flush.mockRejectedValueOnce(new Error("network down"));
    const { startTurn } = await loadModule();

    const turn = startTurn({ agentName: "care-coordinator", input: "hi" });
    turn.identify({ userId: "u1", conversationId: "c1" });

    await expect(turn.finish({ success: true, response: "ok" })).resolves.toEqual({
      success: true,
      response: "ok",
    });
  });

  it("stops trying after the SDK refuses to initialize", async () => {
    process.env.AGNOST_ORG_ID = ORG_ID;
    init.mockReturnValueOnce(false);
    const { startTurn } = await loadModule();

    startTurn({ agentName: "care-coordinator", input: "one" }).identify({
      userId: "u1",
      conversationId: "c1",
    });
    startTurn({ agentName: "care-coordinator", input: "two" }).identify({
      userId: "u2",
      conversationId: "c2",
    });

    expect(init).toHaveBeenCalledTimes(1);
    expect(begin).not.toHaveBeenCalled();
  });
});
