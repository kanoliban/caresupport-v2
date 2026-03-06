import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  splitIntoBubbles,
  verifyWebhookSignature,
  extractSenderPhone,
  extractMessageText,
  extractChatId,
  extractService,
  extractMessageId,
  extractReplyTo,
  extractFailureReason,
  extractReactionData,
  extractParticipantData,
  sendMessage,
  createChat,
  startTyping,
  stopTyping,
  sendMediaMessage,
  sendVoiceMemo,
  sendReaction,
  shareContactCard,
  addParticipant,
  removeParticipant,
  updateChat,
  sendMessageSequence,
} from "./linqClient";
import { createHmac } from "crypto";

// ─── splitIntoBubbles ────────────────────────────────────────────────────

describe("splitIntoBubbles", () => {
  it("returns empty array for empty string", () => {
    expect(splitIntoBubbles("")).toEqual([]);
    expect(splitIntoBubbles("   ")).toEqual([]);
  });

  it("returns single bubble for short text", () => {
    expect(splitIntoBubbles("Hello there")).toEqual(["Hello there"]);
  });

  it("splits on paragraph breaks", () => {
    const text = "First paragraph.\n\nSecond paragraph.";
    expect(splitIntoBubbles(text)).toEqual([
      "First paragraph.",
      "Second paragraph.",
    ]);
  });

  it("splits oversized paragraphs on sentence boundaries", () => {
    const long = Array(10).fill("This is a sentence that is reasonably long.").join(" ");
    const bubbles = splitIntoBubbles(long, 200);
    for (const b of bubbles) {
      expect(b.length).toBeLessThanOrEqual(250);
    }
    expect(bubbles.length).toBeGreaterThan(1);
  });

  it("merges tiny trailing fragments into previous bubble", () => {
    const text = "A long sentence that is definitely over the minimum length. OK.";
    const bubbles = splitIntoBubbles(text, 500, 40);
    expect(bubbles).toEqual([text]);
  });

  it("caps at 3 bubbles, merging remainder into last", () => {
    const text = Array(8)
      .fill(0)
      .map((_, i) => `Paragraph ${i + 1}.`)
      .join("\n\n");
    const bubbles = splitIntoBubbles(text);
    expect(bubbles.length).toBe(3);
    expect(bubbles[2]).toContain("Paragraph 3");
    expect(bubbles[2]).toContain("Paragraph 8");
  });

  it("returns original text when no split points found", () => {
    const noSentences = "one long string without any sentence ending punctuation";
    expect(splitIntoBubbles(noSentences)).toEqual([noSentences]);
  });
});

// ─── verifyWebhookSignature ──────────────────────────────────────────────

describe("verifyWebhookSignature", () => {
  const secret = "test-signing-secret";

  function sign(payload: string, timestamp: string): string {
    return createHmac("sha256", secret)
      .update(`${timestamp}.${payload}`)
      .digest("hex");
  }

  it("returns true for valid signature", async () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const payload = '{"event":"message.received"}';
    const sig = sign(payload, ts);
    expect(await verifyWebhookSignature(payload, ts, sig, secret)).toBe(true);
  });

  it("returns false for invalid signature", async () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const payload = '{"event":"message.received"}';
    expect(await verifyWebhookSignature(payload, ts, "bad-signature", secret)).toBe(false);
  });

  it("rejects replay attacks (timestamp > 5 min old)", async () => {
    const oldTs = String(Math.floor(Date.now() / 1000) - 400);
    const payload = '{"test":true}';
    const sig = sign(payload, oldTs);
    expect(await verifyWebhookSignature(payload, oldTs, sig, secret)).toBe(false);
  });

  it("returns true when no signing secret is configured", async () => {
    expect(await verifyWebhookSignature("any", "123", "any", "")).toBe(true);
  });

  it("returns false for non-numeric timestamp", async () => {
    expect(await verifyWebhookSignature("payload", "not-a-number", "sig", secret)).toBe(false);
  });
});

// ─── Payload extraction helpers ──────────────────────────────────────────

describe("extractSenderPhone", () => {
  it("extracts from top-level sender_handle", () => {
    expect(
      extractSenderPhone({ sender_handle: { handle: "+16515551234" } }),
    ).toBe("+16515551234");
  });

  it("extracts from nested message.from_handle", () => {
    expect(
      extractSenderPhone({
        message: { from_handle: { handle: "+16515559999" } },
      }),
    ).toBe("+16515559999");
  });

  it("returns empty string when no handle found", () => {
    expect(extractSenderPhone({})).toBe("");
  });
});

describe("extractMessageText", () => {
  it("extracts text from parts array", () => {
    expect(
      extractMessageText({
        parts: [
          { type: "text", value: "Hello" },
          { type: "media", url: "http://img.png" },
          { type: "text", value: "world" },
        ],
      }),
    ).toBe("Hello world");
  });

  it("extracts from nested message.parts", () => {
    expect(
      extractMessageText({
        message: { parts: [{ type: "text", value: "Nested" }] },
      }),
    ).toBe("Nested");
  });

  it("returns empty string for no text parts", () => {
    expect(extractMessageText({ parts: [{ type: "media", url: "x" }] })).toBe(
      "",
    );
  });
});

describe("extractChatId", () => {
  it("extracts from top-level chat_id", () => {
    expect(extractChatId({ chat_id: "abc-123" })).toBe("abc-123");
  });

  it("extracts from nested chat.id", () => {
    expect(extractChatId({ chat: { id: "xyz-789" } })).toBe("xyz-789");
  });

  it("returns empty string when missing", () => {
    expect(extractChatId({})).toBe("");
  });
});

describe("extractService", () => {
  it("extracts from top-level service", () => {
    expect(extractService({ service: "iMessage" })).toBe("iMessage");
  });

  it("extracts from nested message.service", () => {
    expect(extractService({ message: { service: "SMS" } })).toBe("SMS");
  });

  it("defaults to 'unknown'", () => {
    expect(extractService({})).toBe("unknown");
  });
});

// ─── API functions (mocked fetch) ────────────────────────────────────────

describe("sendMessage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends message and returns success result", async () => {
    // #given
    const mockResponse = {
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            message: { id: "msg-1", service: "iMessage" },
          }),
        ),
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    // #when
    const result = await sendMessage("chat-1", "Hello", "tok");

    // #then
    expect(result.success).toBe(true);
    expect(result.messageId).toBe("msg-1");
    expect(result.service).toBe("iMessage");
  });

  it("returns error for non-2xx status", async () => {
    // #given
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('{"error":"server error"}'),
      }),
    );

    // #when
    const result = await sendMessage("chat-1", "Hello", "tok");

    // #then
    expect(result.success).toBe(false);
    expect(result.error).toEqual({ error: "server error" });
  });
});

describe("createChat", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates chat and returns chatId", async () => {
    // #given
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              chat: {
                id: "new-chat",
                message: { id: "msg-1", service: "SMS" },
              },
            }),
          ),
      }),
    );

    // #when
    const result = await createChat("+16515551234", "Hi", "+16515550000", "tok");

    // #then
    expect(result.success).toBe(true);
    expect(result.chatId).toBe("new-chat");
    expect(result.service).toBe("SMS");
  });
});

describe("startTyping", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns success when API returns 204", async () => {
    // #given
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ status: 204, text: () => Promise.resolve("") }),
    );

    // #when
    const result = await startTyping("chat-1", "tok");

    // #then
    expect(result.success).toBe(true);
  });
});

describe("sendMessageSequence", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends multiple bubbles sequentially with dynamic pacing", async () => {
    // #given
    vi.useFakeTimers();
    const calls: string[] = [];
    const timeoutSpy = vi.spyOn(globalThis, "setTimeout");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, opts: { method: string }) => {
        calls.push(`${opts.method} ${url}`);
        if (url.includes("/typing")) {
          return Promise.resolve({ status: 204, text: () => Promise.resolve("") });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () =>
            Promise.resolve(
              JSON.stringify({ message: { id: "m", service: "iMessage" } }),
            ),
        });
      }),
    );

    // #when
    const resultsPromise = sendMessageSequence(
      "chat-1",
      ["Hello", "World", "x".repeat(1_000)],
      "tok",
    );
    await vi.runAllTimersAsync();
    const results = await resultsPromise;

    // #then
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.success)).toBe(true);
    expect(calls.some((c) => c.includes("/typing"))).toBe(true);
    expect(timeoutSpy).toHaveBeenCalledTimes(2);
    expect(timeoutSpy).toHaveBeenNthCalledWith(
      1,
      expect.any(Function),
      1_220,
    );
    expect(timeoutSpy).toHaveBeenNthCalledWith(
      2,
      expect.any(Function),
      3_000,
    );
  });
});

// ─── extractMessageId ────────────────────────────────────────────────────

describe("extractMessageId", () => {
  it("extracts from nested message.id", () => {
    expect(extractMessageId({ message: { id: "msg-123" } })).toBe("msg-123");
  });

  it("extracts from top-level message_id", () => {
    expect(extractMessageId({ message_id: "msg-456" })).toBe("msg-456");
  });

  it("extracts from top-level id", () => {
    expect(extractMessageId({ id: "msg-789" })).toBe("msg-789");
  });

  it("prefers message.id over top-level id", () => {
    expect(
      extractMessageId({ message: { id: "nested" }, id: "top" }),
    ).toBe("nested");
  });

  it("returns empty string when missing", () => {
    expect(extractMessageId({})).toBe("");
  });
});

// ─── extractReplyTo ──────────────────────────────────────────────────────

describe("extractReplyTo", () => {
  it("extracts from top-level reply_to", () => {
    expect(
      extractReplyTo({
        reply_to: { message_id: "msg-123", part_index: 2 },
      }),
    ).toEqual({ messageId: "msg-123", partIndex: 2 });
  });

  it("extracts from nested message.reply_to", () => {
    expect(
      extractReplyTo({
        message: { reply_to: { message_id: "msg-456", part_index: 1 } },
      }),
    ).toEqual({ messageId: "msg-456", partIndex: 1 });
  });

  it("defaults partIndex to 0 when missing", () => {
    expect(
      extractReplyTo({
        reply_to: { message_id: "msg-789" },
      }),
    ).toEqual({ messageId: "msg-789", partIndex: 0 });
  });

  it("returns null when reply_to is missing or invalid", () => {
    expect(extractReplyTo({})).toBeNull();
    expect(extractReplyTo({ reply_to: { part_index: 1 } })).toBeNull();
  });
});

// ─── extractFailureReason ────────────────────────────────────────────────

describe("extractFailureReason", () => {
  it("extracts from top-level error string", () => {
    expect(extractFailureReason({ error: "delivery failed" })).toBe(
      "delivery failed",
    );
  });

  it("extracts from top-level reason string", () => {
    expect(extractFailureReason({ reason: "number blocked" })).toBe(
      "number blocked",
    );
  });

  it("extracts from nested message.error", () => {
    expect(
      extractFailureReason({ message: { error: "timeout" } }),
    ).toBe("timeout");
  });

  it("returns 'unknown' when no reason found", () => {
    expect(extractFailureReason({})).toBe("unknown");
  });

  it("ignores non-string error values", () => {
    expect(extractFailureReason({ error: { code: 500 } })).toBe("unknown");
  });
});

// ─── extractReactionData ────────────────────────────────────────────────

describe("extractReactionData", () => {
  it("extracts full reaction event data", () => {
    const result = extractReactionData({
      chat_id: "chat-1",
      message_id: "msg-1",
      from_handle: { handle: "+16515551234" },
      reaction_type: "love",
      custom_emoji: null,
      part_index: 0,
    });
    expect(result).toEqual({
      chatId: "chat-1",
      messageId: "msg-1",
      reactorPhone: "+16515551234",
      reactionType: "love",
      customEmoji: null,
      partIndex: 0,
    });
  });

  it("returns null when chat_id or message_id missing", () => {
    expect(extractReactionData({ chat_id: "chat-1" })).toBeNull();
    expect(extractReactionData({ message_id: "msg-1" })).toBeNull();
    expect(extractReactionData({})).toBeNull();
  });

  it("handles custom emoji", () => {
    const result = extractReactionData({
      chat_id: "chat-1",
      message_id: "msg-1",
      from_handle: { handle: "+16515551234" },
      reaction_type: "custom",
      custom_emoji: "🚀",
    });
    expect(result?.customEmoji).toBe("🚀");
  });
});

// ─── extractParticipantData ─────────────────────────────────────────────

describe("extractParticipantData", () => {
  it("extracts participant from participant.handle", () => {
    const result = extractParticipantData({
      chat_id: "chat-1",
      participant: { handle: "+16515559999" },
    });
    expect(result).toEqual({
      chatId: "chat-1",
      participantPhone: "+16515559999",
    });
  });

  it("falls back to top-level handle", () => {
    const result = extractParticipantData({
      chat_id: "chat-1",
      handle: "+16515558888",
    });
    expect(result).toEqual({
      chatId: "chat-1",
      participantPhone: "+16515558888",
    });
  });

  it("returns null when chat_id missing", () => {
    expect(extractParticipantData({ handle: "+16515551234" })).toBeNull();
  });
});

// ─── stopTyping ─────────────────────────────────────────────────────────

describe("stopTyping", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns success when API returns 204", async () => {
    // #given
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ status: 204, text: () => Promise.resolve("") }),
    );

    // #when
    const result = await stopTyping("chat-1", "tok");

    // #then
    expect(result.success).toBe(true);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining("/chats/chat-1/typing"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});

// ─── sendMessage with effect ────────────────────────────────────────────

describe("sendMessage with effect", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends message with screen effect", async () => {
    // #given
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () =>
          Promise.resolve(JSON.stringify({ message: { id: "msg-e", service: "iMessage" } })),
      }),
    );

    // #when
    await sendMessage("chat-1", "Congrats!", "tok", { type: "screen", name: "confetti" });

    // #then
    const callBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(callBody.message.effect).toEqual({ screen_effect: "confetti" });
  });

  it("sends message with bubble effect", async () => {
    // #given
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () =>
          Promise.resolve(JSON.stringify({ message: { id: "msg-e", service: "iMessage" } })),
      }),
    );

    // #when
    await sendMessage("chat-1", "shhh", "tok", { type: "bubble", name: "gentle" });

    // #then
    const callBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(callBody.message.effect).toEqual({ bubble_effect: "gentle" });
  });

  it("sends message without effect when null", async () => {
    // #given
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () =>
          Promise.resolve(JSON.stringify({ message: { id: "msg-e", service: "iMessage" } })),
      }),
    );

    // #when
    await sendMessage("chat-1", "Hello", "tok", null);

    // #then
    const callBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(callBody.message.effect).toBeUndefined();
  });
});

// ─── sendMediaMessage ───────────────────────────────────────────────────

describe("sendMediaMessage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends text + media parts", async () => {
    // #given
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 202,
        text: () =>
          Promise.resolve(JSON.stringify({ message: { id: "msg-m", service: "iMessage" } })),
      }),
    );

    // #when
    const result = await sendMediaMessage("chat-1", "Here's the schedule", "https://cdn.example.com/sched.pdf", "tok");

    // #then
    expect(result.success).toBe(true);
    const callBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(callBody.message.parts).toHaveLength(2);
    expect(callBody.message.parts[0]).toEqual({ type: "text", value: "Here's the schedule" });
    expect(callBody.message.parts[1]).toEqual({ type: "media", url: "https://cdn.example.com/sched.pdf" });
  });

  it("sends media-only when text is empty", async () => {
    // #given
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 202,
        text: () =>
          Promise.resolve(JSON.stringify({ message: { id: "msg-m2", service: "iMessage" } })),
      }),
    );

    // #when
    await sendMediaMessage("chat-1", "", "https://cdn.example.com/photo.jpg", "tok");

    // #then
    const callBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(callBody.message.parts).toHaveLength(1);
    expect(callBody.message.parts[0].type).toBe("media");
  });
});

// ─── sendVoiceMemo ──────────────────────────────────────────────────────

describe("sendVoiceMemo", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends voice memo and returns success", async () => {
    // #given
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 202,
        text: () => Promise.resolve("{}"),
      }),
    );

    // #when
    const result = await sendVoiceMemo("chat-1", "https://cdn.example.com/memo.m4a", "+16515550000", "tok");

    // #then
    expect(result.success).toBe(true);
    const callBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(callBody.from).toBe("+16515550000");
    expect(callBody.voice_memo_url).toBe("https://cdn.example.com/memo.m4a");
  });
});

// ─── sendReaction ───────────────────────────────────────────────────────

describe("sendReaction", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends reaction and returns success", async () => {
    // #given
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ reaction: {} })),
      }),
    );

    // #when
    const result = await sendReaction("msg-1", "add", "love", "tok");

    // #then
    expect(result.success).toBe(true);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining("/messages/msg-1/reactions"),
      expect.objectContaining({ method: "POST" }),
    );
    const callBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(callBody.operation).toBe("add");
    expect(callBody.type).toBe("love");
    expect(callBody.part_index).toBe(0);
  });

  it("includes custom_emoji for custom type", async () => {
    // #given
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve("{}"),
      }),
    );

    // #when
    await sendReaction("msg-1", "add", "custom", "tok", 0, "🚀");

    // #then
    const callBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(callBody.custom_emoji).toBe("🚀");
  });
});

// ─── shareContactCard ───────────────────────────────────────────────────

describe("shareContactCard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns success on 204", async () => {
    // #given
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ status: 204, text: () => Promise.resolve("") }),
    );

    // #when
    const result = await shareContactCard("chat-1", "tok");

    // #then
    expect(result.success).toBe(true);
  });
});

// ─── addParticipant ─────────────────────────────────────────────────────

describe("addParticipant", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns success on 202", async () => {
    // #given
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ status: 202, text: () => Promise.resolve("") }),
    );

    // #when
    const result = await addParticipant("chat-1", "+16515551234", "tok");

    // #then
    expect(result.success).toBe(true);
    const callBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(callBody.handle).toBe("+16515551234");
  });
});

// ─── removeParticipant ──────────────────────────────────────────────────

describe("removeParticipant", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns success on 202", async () => {
    // #given
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ status: 202, text: () => Promise.resolve("") }),
    );

    // #when
    const result = await removeParticipant("chat-1", "+16515551234", "tok");

    // #then
    expect(result.success).toBe(true);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining("/chats/chat-1/participants"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});

// ─── updateChat ─────────────────────────────────────────────────────────

describe("updateChat", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("updates display name", async () => {
    // #given
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ id: "chat-1" })),
      }),
    );

    // #when
    const result = await updateChat("chat-1", { displayName: "Kano Care Team" }, "tok");

    // #then
    expect(result.success).toBe(true);
    const callBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(callBody.display_name).toBe("Kano Care Team");
    expect(callBody.group_chat_icon).toBeUndefined();
  });

  it("updates both display name and icon", async () => {
    // #given
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ id: "chat-1" })),
      }),
    );

    // #when
    await updateChat("chat-1", { displayName: "Team", groupChatIcon: "https://img.png" }, "tok");

    // #then
    const callBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(callBody.display_name).toBe("Team");
    expect(callBody.group_chat_icon).toBe("https://img.png");
  });
});
