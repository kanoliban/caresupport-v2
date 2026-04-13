import { describe, expect, it } from "vitest";
import { extractJson, normalizeResponse } from "./responseParser";

describe("extractJson", () => {
  it("parses clean JSON directly", () => {
    const input = JSON.stringify({
      sms_response: "Hello!",
      internal_notes: "Greeting",
      user_profile_update: null,
      care_case_profile_update: null,
      user_memory_updates: [],
      care_case_memory_updates: [],
      self_corrections: [],
      reactions: [],
      effect: null,
    });
    const result = extractJson(input);
    expect(result.smsResponse).toBe("Hello!");
    expect(result.internalNotes).toBe("Greeting");
  });

  it("normalizes structured memory updates", () => {
    const result = extractJson(
      JSON.stringify({
        sms_response: "Saved it.",
        internal_notes: "Stored preference",
        user_profile_update: null,
        care_case_profile_update: null,
        user_memory_updates: [
          { category: "communication_preference", content: "Prefers evening texts." },
        ],
        care_case_memory_updates: [
          { category: "care_note", content: "Sam uses a cane." },
        ],
        self_corrections: [],
        reactions: [],
        effect: null,
      }),
    );

    expect(result.userMemoryUpdates).toHaveLength(1);
    expect(result.careCaseMemoryUpdates).toHaveLength(1);
  });

  it("falls back to plain text when the model responds conversationally", () => {
    const input = "Sure — I saved that.";
    const result = extractJson(input);
    expect(result.smsResponse).toBe(input);
  });
});

describe("normalizeResponse", () => {
  it("maps snake_case keys to camelCase", () => {
    const result = normalizeResponse({
      sms_response: "Hello",
      internal_notes: "Note",
      user_profile_update: { name: "Alex" },
      care_case_profile_update: null,
      user_memory_updates: [],
      care_case_memory_updates: [],
      self_corrections: ["[behavioral] Keep it short"],
      reactions: [],
      effect: null,
    });

    expect(result.smsResponse).toBe("Hello");
    expect(result.userProfileUpdate?.name).toBe("Alex");
    expect(result.selfCorrections).toEqual(["[behavioral] Keep it short"]);
  });
});
