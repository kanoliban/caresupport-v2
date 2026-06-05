import { describe, expect, it } from "vitest";
import {
  ensureExplicitUserMemoryUpdate,
  formatConversationLog,
  inferExplicitUserMemoryUpdate,
  isTestChat,
  isUnsupportedCoordinationRequest,
  isValidTimeZone,
  parseLesson,
  shouldFireCoordinationBoundaryOverride,
  stripMarkdown,
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
