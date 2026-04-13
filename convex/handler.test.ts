import { describe, expect, it } from "vitest";
import {
  ensureExplicitUserMemoryUpdate,
  formatConversationLog,
  inferExplicitUserMemoryUpdate,
  isSoloExpansionRequest,
  parseLesson,
  stripMarkdown,
} from "./handler";

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

describe("isSoloExpansionRequest", () => {
  it("detects add-another-person requests", () => {
    expect(isSoloExpansionRequest("Please add my sister Maya to this plan.")).toBe(true);
  });

  it("does not flag ordinary care-management requests", () => {
    expect(isSoloExpansionRequest("Please remind me about Sam's appointment tomorrow.")).toBe(false);
  });
});
