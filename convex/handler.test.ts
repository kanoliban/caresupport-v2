import { describe, expect, it } from "vitest";
import {
  applySoloBetaProductBoundary,
  parseCategory,
  formatConversationLog,
  inferExplicitMemberProfileUpdate,
  isSoloBetaMultiplayerRequest,
  stripMarkdown,
} from "./handler";

// ─── parseCategory ──────────────────────────────────────────────────────

describe("parseCategory", () => {
  it("extracts behavioral prefix", () => {
    // #given
    const text = "[behavioral] Don't ask about medications";
    // #when
    const result = parseCategory(text);
    // #then
    expect(result.category).toBe("behavioral");
    expect(result.cleanText).toBe("Don't ask about medications");
  });

  it("extracts factual prefix (case-insensitive)", () => {
    // #given
    const text = "[Factual] Rob's preferred pharmacy is CVS";
    // #when
    const result = parseCategory(text);
    // #then
    expect(result.category).toBe("factual");
    expect(result.cleanText).toBe("Rob's preferred pharmacy is CVS");
  });

  it("extracts operational prefix", () => {
    // #given
    const text = "[operational] Always check schedule before suggesting times";
    // #when
    const result = parseCategory(text);
    // #then
    expect(result.category).toBe("operational");
    expect(result.cleanText).toBe("Always check schedule before suggesting times");
  });

  it("defaults to behavioral when no prefix", () => {
    // #given
    const text = "Remember to be gentle about this topic";
    // #when
    const result = parseCategory(text);
    // #then
    expect(result.category).toBe("behavioral");
    expect(result.cleanText).toBe("Remember to be gentle about this topic");
  });

  it("ignores invalid category prefix", () => {
    // #given
    const text = "[medical] Some note";
    // #when
    const result = parseCategory(text);
    // #then
    expect(result.category).toBe("behavioral");
    expect(result.cleanText).toBe("[medical] Some note");
  });

  it("handles empty string", () => {
    // #given / #when
    const result = parseCategory("");
    // #then
    expect(result.category).toBe("behavioral");
    expect(result.cleanText).toBe("");
  });
});

// ─── formatConversationLog ──────────────────────────────────────────────

describe("formatConversationLog", () => {
  it("returns placeholder for empty records", () => {
    // #given / #when
    const result = formatConversationLog([]);
    // #then
    expect(result).toBe("[No conversation history]");
  });

  it("formats single inbound record with member attribution", () => {
    // #given
    const records = [
      {
        direction: "inbound" as const,
        body: "Hello there",
        timestamp: new Date("2025-03-01T14:30:00Z").getTime(),
        memberName: "Liban",
      },
    ];
    // #when
    const result = formatConversationLog(records);
    // #then
    expect(result).toContain("[INBOUND from Liban]");
    expect(result).toContain("Hello there");
    expect(result).toContain("2025-03-01 14:30:00 UTC");
  });

  it("formats multiple records with attribution in order", () => {
    // #given
    const records = [
      {
        direction: "inbound" as const,
        body: "First message",
        timestamp: new Date("2025-03-01T10:00:00Z").getTime(),
        memberName: "Liban",
      },
      {
        direction: "outbound" as const,
        body: "Response here",
        timestamp: new Date("2025-03-01T10:01:00Z").getTime(),
        memberName: "Solan",
      },
    ];
    // #when
    const result = formatConversationLog(records);
    // #then
    const lines = result.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("[INBOUND from Liban]");
    expect(lines[0]).toContain("First message");
    expect(lines[1]).toContain("[OUTBOUND to Solan]");
    expect(lines[1]).toContain("Response here");
  });

  it("falls back to phone when memberName missing", () => {
    // #given
    const records = [
      {
        direction: "inbound" as const,
        body: "Hello",
        timestamp: Date.now(),
        senderPhone: "+16514109390",
      },
    ];
    // #when
    const result = formatConversationLog(records);
    // #then
    expect(result).toContain("[INBOUND from +16514109390]");
  });

  it("formats timestamp as ISO-style UTC", () => {
    // #given
    const records = [
      {
        direction: "outbound" as const,
        body: "test",
        timestamp: new Date("2025-12-25T23:59:59Z").getTime(),
      },
    ];
    // #when
    const result = formatConversationLog(records);
    // #then
    expect(result).toMatch(/\[2025-12-25 23:59:59 UTC\]/);
  });
});

// ─── stripMarkdown ──────────────────────────────────────────────────────

describe("stripMarkdown", () => {
  it("removes markdown formatting markers without stripping content", () => {
    // #given
    const text = [
      "## Schedule update",
      "- **Morning meds:** Give __ibuprofen__ after breakfast.",
      "1. *Call* the clinic if the pain gets worse.",
      "2. Reply with questions.",
    ].join("\n");

    // #when
    const result = stripMarkdown(text);

    // #then
    expect(result).toBe(
      [
        "Schedule update",
        "Morning meds: Give ibuprofen after breakfast.",
        "Call the clinic if the pain gets worse.",
        "Reply with questions.",
      ].join("\n"),
    );
  });

  it("leaves unmatched or literal asterisks intact", () => {
    // #given
    const text = "The copied note ends with can't* and should stay that way.";

    // #when
    const result = stripMarkdown(text);

    // #then
    expect(result).toBe(text);
  });
});

// ─── inferExplicitMemberProfileUpdate ───────────────────────────────────

describe("inferExplicitMemberProfileUpdate", () => {
  it("extracts an explicit save-to-profile preference into communication preferences", () => {
    const update = inferExplicitMemberProfileUpdate(
      "Please save this to my profile for future messages: I prefer text updates after 8 PM and very short bullet-style messages.",
    );

    expect(update).toEqual({
      section: "Communication Preferences",
      operation: "append",
      content: "- I prefer text updates after 8 PM and very short bullet-style messages.",
      oldContent: "",
    });
  });

  it("treats future-reference personal details as personal context", () => {
    const update = inferExplicitMemberProfileUpdate(
      "For future reference, I work nights on Tuesdays and Thursdays.",
    );

    expect(update).toEqual({
      section: "Personal Context",
      operation: "append",
      content: "- I work nights on Tuesdays and Thursdays.",
      oldContent: "",
    });
  });

  it("ignores non-preference questions", () => {
    const update = inferExplicitMemberProfileUpdate(
      "For future reference, what time is the appointment?",
    );

    expect(update).toBeNull();
  });
});

// ─── isSoloBetaMultiplayerRequest ───────────────────────────────────────

describe("isSoloBetaMultiplayerRequest", () => {
  it("flags outreach requests in solo beta", () => {
    expect(
      isSoloBetaMultiplayerRequest({
        senderPhone: "+16517037981",
        intent: "GENERAL",
        parsed: {
          smsResponse: "",
          internalNotes: "",
          needsOutreach: [{ name: "Solan", message: "Can you help?" }],
          familyFileUpdates: [],
          selfCorrections: [],
          memberUpdates: [],
          routingUpdates: [],
          reactions: [],
          effect: null,
        },
      }),
    ).toBe(true);
  });

  it("allows routing update when it only updates the current user's own name", () => {
    expect(
      isSoloBetaMultiplayerRequest({
        senderPhone: "+16517037981",
        intent: "ONBOARDING",
        parsed: {
          smsResponse: "",
          internalNotes: "",
          needsOutreach: [],
          familyFileUpdates: [],
          selfCorrections: [],
          memberUpdates: [],
          routingUpdates: [
            {
              action: "update",
              phone: "+1 (651) 703-7981",
              name: "Liban Kano",
              role: "",
              relationship: "",
              accessLevel: "",
            },
          ],
          reactions: [],
          effect: null,
        },
      }),
    ).toBe(false);
  });

  it("flags add-member routing updates in solo beta", () => {
    expect(
      isSoloBetaMultiplayerRequest({
        senderPhone: "+16517037981",
        intent: "ONBOARDING",
        parsed: {
          smsResponse: "",
          internalNotes: "",
          needsOutreach: [],
          familyFileUpdates: [],
          selfCorrections: [],
          memberUpdates: [],
          routingUpdates: [
            {
              action: "add",
              phone: "+16515550000",
              name: "Solan",
              role: "family_caregiver",
              relationship: "brother",
              accessLevel: "schedule+meds",
            },
          ],
          reactions: [],
          effect: null,
        },
      }),
    ).toBe(true);
  });
});

describe("applySoloBetaProductBoundary", () => {
  it("clears multiplayer side effects and upgrade intent in solo beta", () => {
    const result = applySoloBetaProductBoundary({
      senderPhone: "+16517037981",
      intent: "MULTI_MEMBER",
      smsResponse: "I'll message your sister and upgrade you now.",
      parsed: {
        smsResponse: "I'll message your sister and upgrade you now.",
        internalNotes: "",
        needsOutreach: [{ name: "Solan", message: "Can you help?" }],
        familyFileUpdates: [
          {
            section: "Care Team",
            operation: "append",
            content: "- Added Solan",
            oldContent: "",
          },
        ],
        selfCorrections: [],
        memberUpdates: [
          {
            section: "Communication Preferences",
            operation: "append",
            content: "- Prefers brief texts",
            oldContent: "",
          },
        ],
        routingUpdates: [
          {
            action: "add",
            phone: "+16514109390",
            name: "Solan",
            role: "family_caregiver",
            relationship: "nephew",
            accessLevel: "full",
          },
          {
            action: "update",
            phone: "+16517037981",
            name: "Liban Kano",
            role: "",
            relationship: "",
            accessLevel: "",
          },
        ],
        reactions: [{ targetMessage: "last_inbound", type: "love" }],
        effect: { type: "screen", name: "confetti" },
        upgradeRequested: true,
        medicationUpdates: [{ action: "add", name: "Lisinopril" }],
        scheduleUpdates: [{ action: "add", type: "task", title: "Drive to clinic" }],
        careTeamUpdates: [{ action: "add", name: "Solan", phone: "+16514109390" }],
      },
    });

    expect(result.blocked).toBe(true);
    expect(result.smsResponse).toContain("focused on helping you manage one loved one's care directly");
    expect(result.parsed.needsOutreach).toEqual([]);
    expect(result.parsed.familyFileUpdates).toEqual([]);
    expect(result.parsed.memberUpdates).toEqual([]);
    expect(result.parsed.routingUpdates).toEqual([
      {
        action: "update",
        phone: "+16517037981",
        name: "Liban Kano",
        role: "",
        relationship: "",
        accessLevel: "",
      },
    ]);
    expect(result.parsed.reactions).toEqual([]);
    expect(result.parsed.effect).toBeNull();
    expect(result.parsed.upgradeRequested).toBe(false);
    expect(result.parsed.medicationUpdates).toEqual([]);
    expect(result.parsed.scheduleUpdates).toEqual([]);
    expect(result.parsed.careTeamUpdates).toEqual([]);
  });

  it("passes through non-multiplayer responses unchanged", () => {
    const parsed = {
      smsResponse: "I'll save that to your care plan.",
      internalNotes: "",
      needsOutreach: [],
      familyFileUpdates: [
        {
          section: "Care Priorities",
          operation: "append",
          content: "- Track appointments",
          oldContent: "",
        },
      ],
      selfCorrections: [],
      memberUpdates: [],
      routingUpdates: [],
      reactions: [],
      effect: null,
      upgradeRequested: false,
      medicationUpdates: [],
      scheduleUpdates: [],
      careTeamUpdates: [],
    };

    const result = applySoloBetaProductBoundary({
      senderPhone: "+16517037981",
      intent: "GENERAL",
      smsResponse: parsed.smsResponse,
      parsed,
    });

    expect(result.blocked).toBe(false);
    expect(result.smsResponse).toBe(parsed.smsResponse);
    expect(result.parsed).toBe(parsed);
  });
});
