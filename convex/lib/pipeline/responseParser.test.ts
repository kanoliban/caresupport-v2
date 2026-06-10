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

  it("normalizes calendar updates with camelCase fields", () => {
    const result = normalizeResponse({
      sms_response: "Added it.",
      calendar_updates: [
        {
          action: "create",
          title: "Meeting with Liban",
          date: "2026-06-03",
          startTime: "20:08",
          endTime: "21:08",
          location: "Office",
        },
      ],
    });

    expect(result.calendarUpdates).toHaveLength(1);
    expect(result.calendarUpdates?.[0]).toMatchObject({
      action: "create",
      title: "Meeting with Liban",
      date: "2026-06-03",
      startTime: "20:08",
      endTime: "21:08",
      location: "Office",
    });
  });

  it("accepts snake_case time and event id fields on calendar updates", () => {
    const result = normalizeResponse({
      sms_response: "Updated.",
      calendar_updates: [
        {
          action: "update",
          event_id: "evt_123",
          start_time: "09:00",
          end_time: "10:00",
        },
      ],
    });

    expect(result.calendarUpdates?.[0]).toMatchObject({
      action: "update",
      eventId: "evt_123",
      startTime: "09:00",
      endTime: "10:00",
    });
  });

  it("drops calendar updates with an unknown action", () => {
    const result = normalizeResponse({
      sms_response: "Hmm.",
      calendar_updates: [{ action: "frobnicate", title: "x" }],
    });

    expect(result.calendarUpdates).toEqual([]);
  });
});
