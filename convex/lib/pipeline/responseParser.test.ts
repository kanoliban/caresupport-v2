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

  it("normalizes memory_archive_updates from snake_case and skips blanks", () => {
    const result = extractJson(
      JSON.stringify({
        sms_response: "Dropped — I won't bring that up again.",
        internal_notes: "User asked to forget Marcus night-shift rule",
        user_profile_update: null,
        care_case_profile_update: null,
        user_memory_updates: [],
        care_case_memory_updates: [],
        memory_archive_updates: [
          { scope: "care_case", match_content: "Marcus works nights" },
          { scope: "care_case", match_content: "" },
          { scope: "care_case" },
        ],
        self_corrections: [],
        reactions: [],
        effect: null,
      }),
    );

    expect(result.memoryArchiveUpdates).toEqual([
      { scope: "care_case", matchContent: "Marcus works nights" },
    ]);
  });

  it("defaults missing memory_archive_updates to an empty array", () => {
    const result = extractJson(
      JSON.stringify({
        sms_response: "ok",
        internal_notes: "no archive in this turn",
        user_profile_update: null,
        care_case_profile_update: null,
        user_memory_updates: [],
        care_case_memory_updates: [],
        self_corrections: [],
        reactions: [],
        effect: null,
      }),
    );
    expect(result.memoryArchiveUpdates).toEqual([]);
  });

  it("normalizes care_contact_updates with snake_case nested keys and validates contact type", () => {
    const result = extractJson(
      JSON.stringify({
        sms_response: "Got Angela down.",
        internal_notes: "",
        user_profile_update: null,
        care_case_profile_update: null,
        user_memory_updates: [],
        care_case_memory_updates: [],
        memory_archive_updates: [],
        self_corrections: [],
        reactions: [],
        effect: null,
        care_contact_updates: [
          {
            action: "upsert",
            name: "Angela",
            phone: "+16515551234",
            contact_type: "professional_caregiver",
            agency_name: "Acme Home Care",
          },
          // junk action defaults to upsert; unknown contact_type defaults to "other"
          { action: "weird", name: "Mystery", contact_type: "wizard" },
          // blank name dropped
          { action: "upsert", name: "  ", contact_type: "family" },
        ],
      }),
    );

    expect(result.careContactUpdates).toEqual([
      {
        action: "upsert",
        name: "Angela",
        phone: "+16515551234",
        contactType: "professional_caregiver",
        role: undefined,
        agencyName: "Acme Home Care",
        notes: undefined,
      },
      {
        action: "upsert",
        name: "Mystery",
        phone: undefined,
        contactType: "other",
        role: undefined,
        agencyName: undefined,
        notes: undefined,
      },
    ]);
  });

  it("normalizes coordination_event_updates and clamps invalid action/status/type", () => {
    const result = extractJson(
      JSON.stringify({
        sms_response: "Tracking that.",
        internal_notes: "",
        user_profile_update: null,
        care_case_profile_update: null,
        user_memory_updates: [],
        care_case_memory_updates: [],
        memory_archive_updates: [],
        self_corrections: [],
        reactions: [],
        effect: null,
        coordination_event_updates: [
          {
            action: "create",
            type: "coverage_gap",
            title: "Tonight 6-10 coverage",
            status: "awaiting_reply",
            waiting_on_name: "Angela",
            draft_message: "Hey Angela, free tonight 6-10?",
            due_at: 1747600000000,
          },
          // invalid action falls back to "create"; invalid type falls back to undefined
          {
            action: "bonk",
            type: "alien",
            title: "Other thing",
          },
          // blank title dropped
          { action: "create", title: "  " },
        ],
      }),
    );

    expect(result.coordinationEventUpdates).toHaveLength(2);
    expect(result.coordinationEventUpdates?.[0]).toMatchObject({
      action: "create",
      type: "coverage_gap",
      title: "Tonight 6-10 coverage",
      status: "awaiting_reply",
      waitingOnName: "Angela",
      draftMessage: "Hey Angela, free tonight 6-10?",
      dueAt: 1747600000000,
    });
    expect(result.coordinationEventUpdates?.[1]).toMatchObject({
      action: "create",
      type: undefined,
      title: "Other thing",
    });
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
