// 2026-06-17: Unit coverage for chat runtime helpers, including empty-response fallback behavior.
import { describe, expect, it } from "vitest";
import type { Id } from "./_generated/dataModel";
import {
  approvalResolutionResponse,
  buildCareContactReplyMessage,
  ensureFinalSmsResponse,
  ensureExplicitUserMemoryUpdate,
  formatConversationLog,
  inferExplicitUserMemoryUpdate,
  isTestChat,
  isUnsupportedCoordinationRequest,
  isValidTimeZone,
  parseLesson,
  runtimeFailureFallback,
  shouldFireCoordinationBoundaryOverride,
  stripAssistantSpeakerPrefix,
  stripMarkdown,
  summarizeRuntimeError,
} from "./handler";

describe("isTestChat", () => {
  it("flags synthetic web-UI chat ids", () => {
    expect(isTestChat("test:+15550100199")).toBe(true);
  });

  it("does not flag real Linq chat ids", () => {
    expect(isTestChat("imsg-chat-abc123")).toBe(false);
    expect(isTestChat("")).toBe(false);
  });
});

describe("isValidTimeZone", () => {
  it("accepts valid IANA zones", () => {
    expect(isValidTimeZone("America/New_York")).toBe(true);
    expect(isValidTimeZone("Europe/London")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
  });

  it("rejects garbage and empty values", () => {
    expect(isValidTimeZone("Not/AZone")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
    expect(isValidTimeZone(undefined)).toBe(false);
  });
});

describe("parseLesson", () => {
  it("extracts a behavioral prefix", () => {
    const result = parseLesson("[behavioral] Keep replies shorter");
    expect(result).toEqual({
      category: "behavioral",
      cleanText: "Keep replies shorter",
    });
  });

  it("defaults to behavioral when no prefix is present", () => {
    const result = parseLesson("Remember this");
    expect(result).toEqual({
      category: "behavioral",
      cleanText: "Remember this",
    });
  });
});

describe("formatConversationLog", () => {
  it("returns a placeholder when there is no history", () => {
    expect(formatConversationLog([])).toBe("[No conversation history]");
  });

  it("formats inbound and outbound records with attribution", () => {
    const result = formatConversationLog([
      {
        direction: "inbound",
        body: "Hello there",
        timestamp: new Date("2026-04-13T10:00:00Z").getTime(),
        displayName: "Alex",
      },
      {
        direction: "outbound",
        body: "What should I track first?",
        timestamp: new Date("2026-04-13T10:00:05Z").getTime(),
        displayName: "Alex",
      },
    ]);

    expect(result).toContain("[INBOUND from Alex]");
    expect(result).toContain("[OUTBOUND to Alex]");
  });
});

describe("stripMarkdown", () => {
  it("removes markdown prefixes but keeps content", () => {
    const input = [
      "## Schedule update",
      "- **Appointment:** Tomorrow at 10",
      "1. Bring paperwork",
    ].join("\n");

    expect(stripMarkdown(input)).toBe(
      ["Schedule update", "Appointment: Tomorrow at 10", "Bring paperwork"].join("\n"),
    );
  });
});

describe("stripAssistantSpeakerPrefix", () => {
  it("removes leaked user labels from assistant replies", () => {
    expect(stripAssistantSpeakerPrefix("[Liban]: Hello there")).toBe("Hello there");
  });

  it("leaves ordinary text unchanged", () => {
    expect(stripAssistantSpeakerPrefix("Hello there")).toBe("Hello there");
  });
});

describe("inferExplicitUserMemoryUpdate", () => {
  it("infers communication preferences from explicit save requests", () => {
    expect(
      inferExplicitUserMemoryUpdate(
        "Please save this to my profile: I prefer reminder texts after 8 PM.",
      ),
    ).toEqual({
      category: "communication_preference",
      content: "I prefer reminder texts after 8 PM.",
    });
  });

  it("uses profile for non-communication facts", () => {
    expect(
      inferExplicitUserMemoryUpdate(
        "For future reference, I work nights on Tuesdays and Thursdays.",
      ),
    ).toEqual({
      category: "profile",
      content: "I work nights on Tuesdays and Thursdays.",
    });
  });
});

describe("ensureExplicitUserMemoryUpdate", () => {
  it("adds a missing explicit profile save", () => {
    const updates = ensureExplicitUserMemoryUpdate(
      [],
      "Please save this to my profile: I prefer evening texts.",
      "",
    );

    expect(updates).toContainEqual({
      category: "communication_preference",
      content: "I prefer evening texts.",
    });
  });

  it("does not duplicate an existing memory entry", () => {
    const updates = ensureExplicitUserMemoryUpdate(
      [{ category: "communication_preference", content: "I prefer evening texts." }],
      "Please save this to my profile: I prefer evening texts.",
      "",
    );

    expect(updates).toHaveLength(1);
  });

  it("does not re-add content already present in context", () => {
    const updates = ensureExplicitUserMemoryUpdate(
      [],
      "Please save this to my profile: I prefer evening texts.",
      "## Communication Preferences\n- I prefer evening texts.",
    );

    expect(updates).toEqual([]);
  });
});

describe("isUnsupportedCoordinationRequest", () => {
  it("detects add-another-person requests", () => {
    expect(isUnsupportedCoordinationRequest("Please add my sister Maya to this plan.")).toBe(true);
  });

  it("does not flag ordinary care-management requests", () => {
    expect(isUnsupportedCoordinationRequest("Please remind me about Sam's appointment tomorrow.")).toBe(false);
  });
});

describe("shouldFireCoordinationBoundaryOverride", () => {
  const boundaryReply = {
    direction: "outbound" as const,
    body: "I can't add them or message them for you yet.",
  };
  const ordinaryOutbound = {
    direction: "outbound" as const,
    body: "Got it — saved Sam's appointment for tomorrow.",
  };

  it("fires on the first boundary hit when recent outbound is clean", () => {
    // #given the user asks to add someone for the first time
    // #when no recent outbound contains the boundary marker
    const recent = [
      { direction: "inbound" as const, body: "Hi" },
      ordinaryOutbound,
    ];

    // #then the override fires
    expect(
      shouldFireCoordinationBoundaryOverride("Add my sister Maya to this plan", recent),
    ).toBe(true);
  });

  it("does not fire when the boundary was already explained in recent outbound", () => {
    // #given the boundary was already explained in the last few outbound messages
    const recent = [
      { direction: "inbound" as const, body: "Add my brother" },
      boundaryReply,
      { direction: "inbound" as const, body: "Yes, draft something" },
      { direction: "outbound" as const, body: "Here's a draft you can send..." },
    ];

    // #when the user asks again with similar phrasing
    // #then the override does NOT fire — LLM handles naturally
    expect(
      shouldFireCoordinationBoundaryOverride("Text my sister too", recent),
    ).toBe(false);
  });

  it("does not fire on messages that are not unsupported coordination requests", () => {
    // #given a clean history
    const recent = [ordinaryOutbound];

    // #when the message is ordinary care content
    // #then the override does NOT fire
    expect(
      shouldFireCoordinationBoundaryOverride(
        "Sam takes Lipitor at bedtime",
        recent,
      ),
    ).toBe(false);
  });

  it("only inspects the last 5 messages for the boundary marker", () => {
    // #given the boundary was explained 6+ messages ago (out of the window)
    const oldBoundary = { ...boundaryReply };
    const padding = Array.from({ length: 5 }, () => ordinaryOutbound);
    const recent = [oldBoundary, ...padding];

    // #when the user makes a fresh unsupported coordination request
    // #then the override fires again because the recent window is clean
    expect(
      shouldFireCoordinationBoundaryOverride("Add my aunt to the plan", recent),
    ).toBe(true);
  });
});

describe("approvalResolutionResponse", () => {
  const outreachAttemptId = "attempt-1" as Id<"outreachAttempts">;

  it("confirms when approved outreach was sent", () => {
    const response = approvalResolutionResponse({
      action: "approved",
      id: outreachAttemptId,
      contactName: "Angela",
      messageBody: "Can you cover Wednesday?",
    }, {
      sent: true,
      contactName: "Angela",
      chatId: "chat-1",
      messageId: "msg-1",
    });

    expect(response).toContain("Done. I asked Angela");
    expect(response).toContain("let you know when they reply");
  });

  it("does not claim execution when approved outreach fails to send", () => {
    const response = approvalResolutionResponse({
      action: "approved",
      id: outreachAttemptId,
      contactName: "Angela",
      messageBody: "Can you cover Wednesday?",
    }, {
      sent: false,
      reason: "linq_env_missing",
      contactName: "Angela",
    });

    expect(response).toContain("could not send");
    expect(response).toContain("Linq sending credentials");
    expect(response).toContain("I have not messaged them");
  });

  it("asks for clarification on ambiguous approval", () => {
    const response = approvalResolutionResponse({
      action: "ambiguous",
      contactNames: ["Angela", "Marcus"],
      matchedCount: 2,
    });

    expect(response).toContain("Angela, Marcus");
    expect(response).toContain("Which one");
  });

  it("blocks unsafe outreach without claiming execution", () => {
    const response = approvalResolutionResponse({
      action: "blocked",
      contactName: "Angela",
      reason: "no_phone",
    });

    expect(response).toContain("no phone number saved");
    expect(response).toContain("I have not messaged them");
  });
});

describe("summarizeRuntimeError", () => {
  it("preserves provider metadata while trimming the message", () => {
    const error = new Error(`${"x".repeat(520)}`);
    Object.assign(error, {
      status: 400,
      type: "invalid_request_error",
      code: "bad_request",
    });

    const result = summarizeRuntimeError(error);

    expect(result).toMatchObject({
      name: "Error",
      status: 400,
      type: "invalid_request_error",
      code: "bad_request",
    });
    expect(result.message).toHaveLength(503);
    expect(result.message.endsWith("...")).toBe(true);
  });

  it("redacts obvious credentials from error messages", () => {
    const result = summarizeRuntimeError(
      new Error("Anthropic failed with sk-ant-secret123 and Bearer token-secret"),
    );

    expect(result.message).toContain("[redacted]");
    expect(result.message).not.toContain("sk-ant-secret123");
    expect(result.message).not.toContain("token-secret");
  });

  it("summarizes non-Error provider objects", () => {
    const result = summarizeRuntimeError({
      name: "APIError",
      message: "model unavailable",
      status: "529",
      type: "overloaded_error",
    });

    expect(result).toEqual({
      name: "APIError",
      message: "model unavailable",
      status: 529,
      type: "overloaded_error",
    });
  });
});

describe("runtimeFailureFallback", () => {
  it("does not ask the user to resend when the runtime is down", () => {
    const result = runtimeFailureFallback("Liban");

    expect(result).toContain("system issue on my side");
    expect(result).toContain("I have your message");
    expect(result).not.toContain("send it again");
  });
});

describe("ensureFinalSmsResponse", () => {
  it("keeps a non-empty model response after trimming whitespace", () => {
    expect(
      ensureFinalSmsResponse("  Got it — I updated that.  ", {
        replyDisplayName: "Liban",
      }),
    ).toBe("Got it — I updated that.");
  });

  it("falls back when the model returns an empty sms response", () => {
    const result = ensureFinalSmsResponse("   ", {
      replyDisplayName: "Liban",
    });

    expect(result).toContain("system issue on my side");
    expect(result).toContain("I have your message");
  });

  it("confirms a successful calendar write when the model response is empty", () => {
    expect(
      ensureFinalSmsResponse("", {
        replyDisplayName: "Liban",
        calendarWriteSucceeded: true,
      }),
    ).toBe("Done — I updated your Google Calendar.");
  });
});

describe("buildCareContactReplyMessage", () => {
  it("frames a caregiver reply without treating them as the primary coordinator", () => {
    const message = buildCareContactReplyMessage("Yes, Mondays 9 to 5 works.", {
      careContactName: "Angela",
      contactRelationship: "caregiver",
      contactRole: "weekday coverage",
      contactAvailabilityNotes: "Usually available weekdays",
      coordinationEventTitle: "Monday coverage",
      outreachPurpose: "Ask about Monday coverage",
      outreachMessageBody: "Hi Angela, can you cover Monday 9 to 5 for Rob?",
    });

    expect(message).toContain("Incoming speaker: care contact Angela");
    expect(message).toContain("Related coordination event: Monday coverage");
    expect(message).toContain("Original CareSupport message to this contact");
    expect(message).toContain("Do not treat this speaker as the primary coordinator");
    expect(message).toContain("Use care_contact_updates");
    expect(message).toContain("Yes, Mondays 9 to 5 works.");
  });
});
