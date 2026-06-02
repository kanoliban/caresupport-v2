import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SystemBlock } from "./pipeline/types";

const SYSTEM_BLOCKS: SystemBlock[] = [
  { type: "text", text: "You are CareSupport.", cacheBreakpoint: false },
  { type: "text", text: "Identity block.", cacheBreakpoint: true },
];

const MESSAGES: Array<{ role: "user" | "assistant"; content: string }> = [
  { role: "user", content: "Hello" },
];

const API_KEY = "test-api-key";

function makeSuccessResponse(overrides?: {
  text?: string;
  thinking?: string;
  model?: string;
}) {
  const content = [];
  if (overrides?.thinking) {
    content.push({ type: "thinking" as const, thinking: overrides.thinking });
  }
  content.push({ type: "text" as const, text: overrides?.text ?? '{"sms_response":"Hi"}' });
  return {
    content,
    model: overrides?.model ?? "claude-haiku-4-5",
    usage: { input_tokens: 100, output_tokens: 50 },
  };
}

describe("callAnthropic", () => {
  let mockStream: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    mockStream = vi.fn();
  });

  async function callWithMock(
    streamImpl: (...args: unknown[]) => unknown,
    model?: string,
  ) {
    mockStream.mockImplementation((...args: unknown[]) => {
      const result = streamImpl(...args);
      if (result && typeof result === "object" && "then" in result) {
        return { finalMessage: () => result };
      }
      throw result;
    });
    vi.doMock("@anthropic-ai/sdk", () => {
      class MockAnthropic {
        messages = { stream: mockStream };
        static APIError = class extends Error {
          status: number;
          constructor(status: number, message: string) {
            super(message);
            this.status = status;
          }
        };
      }
      return { default: MockAnthropic };
    });
    const { callAnthropic } = await import("./anthropicClient");
    return callAnthropic({
      systemBlocks: SYSTEM_BLOCKS,
      messages: MESSAGES,
      model,
      apiKey: API_KEY,
    });
  }

  it("returns text and usage on success", async () => {
    // #given/#when
    const result = await callWithMock(() => Promise.resolve(makeSuccessResponse()));

    // #then
    expect(result.text).toBe('{"sms_response":"Hi"}');
    expect(result.model).toBe("claude-haiku-4-5");
    expect(result.inputTokens).toBe(100);
    expect(result.outputTokens).toBe(50);
  });

  it("extracts thinking blocks", async () => {
    // #given/#when
    const result = await callWithMock(() =>
      Promise.resolve(
        makeSuccessResponse({
          thinking: "Let me think about this...",
          text: '{"sms_response":"Thought response"}',
        }),
      ),
    );

    // #then
    expect(result.thinking).toBe("Let me think about this...");
    expect(result.text).toBe('{"sms_response":"Thought response"}');
  });

  it("falls back to next model on 429", async () => {
    // #given
    let callCount = 0;
    const result = await callWithMock(
      () => {
        callCount++;
        if (callCount === 1) {
          const err = new Error("rate limited") as Error & { status: number };
          err.name = "APIError";
          err.status = 429;
          // Simulate the SDK's APIError
          Object.defineProperty(err, "constructor", {
            value: { name: "APIError" },
          });
          throw err;
        }
        return Promise.resolve(
          makeSuccessResponse({ model: "claude-sonnet-4-5-20250514" }),
        );
      },
    );

    // #then
    expect(callCount).toBe(2);
    expect(result.model).toBe("claude-sonnet-4-5-20250514");
  });

  it("throws immediately on timeout (AbortError)", async () => {
    // #given/#when/#then
    await expect(
      callWithMock(() => {
        throw new DOMException("The operation was aborted", "AbortError");
      }),
    ).rejects.toThrow("aborted");
  });

  it("throws non-retryable errors immediately", async () => {
    // #given/#when/#then
    await expect(
      callWithMock(() => {
        throw new Error("authentication failed");
      }),
    ).rejects.toThrow("authentication failed");
    expect(mockStream).toHaveBeenCalledTimes(1);
  });

  it("sends cache_control on breakpoint blocks", async () => {
    // #given
    await callWithMock(
      (...args: unknown[]) => {
        const body = args[0] as Record<string, unknown>;
        const system = body.system as Array<Record<string, unknown>>;
        expect(system[0]).not.toHaveProperty("cache_control");
        expect(system[1]).toHaveProperty("cache_control", {
          type: "ephemeral",
        });
        return Promise.resolve(makeSuccessResponse());
      },
    );
  });

  it("omits thinking for Haiku, includes structured output schema", async () => {
    // #given — default model is Haiku
    await callWithMock(
      (...args: unknown[]) => {
        const body = args[0] as Record<string, unknown>;
        expect(body.thinking).toBeUndefined();
        const oc = body.output_config as Record<string, unknown>;
        expect(oc.effort).toBeUndefined();
        expect(oc.format).toHaveProperty("type", "json_schema");
        const format = oc.format as {
          schema?: { properties?: Record<string, unknown> };
        };
        expect(format.schema?.properties).toHaveProperty("care_contact_updates");
        expect(format.schema?.properties).toHaveProperty("coordination_event_updates");
        expect(format.schema?.properties).toHaveProperty("outreach_requests");
        return Promise.resolve(makeSuccessResponse());
      },
    );
  });

  it("sends effort and schema (no thinking) for Sonnet", async () => {
    // #given
    await callWithMock(
      (...args: unknown[]) => {
        const body = args[0] as Record<string, unknown>;
        expect(body.thinking).toBeUndefined();
        const oc = body.output_config as Record<string, unknown>;
        expect(oc.effort).toBe("medium");
        expect(oc.format).toHaveProperty("type", "json_schema");
        return Promise.resolve(
          makeSuccessResponse({ model: "claude-sonnet-4-6" }),
        );
      },
      "claude-sonnet-4-6",
    );
  });

  it("sends high effort and schema (no thinking) for Opus", async () => {
    // #given
    await callWithMock(
      (...args: unknown[]) => {
        const body = args[0] as Record<string, unknown>;
        expect(body.thinking).toBeUndefined();
        const oc = body.output_config as Record<string, unknown>;
        expect(oc.effort).toBe("high");
        expect(oc.format).toHaveProperty("type", "json_schema");
        return Promise.resolve(
          makeSuccessResponse({ model: "claude-opus-4-6" }),
        );
      },
      "claude-opus-4-6",
    );
  });
});
