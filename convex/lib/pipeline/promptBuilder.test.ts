import { describe, expect, it } from "vitest";
import {
  buildMessages,
  buildSystemBlocks,
  channelGuidance,
  extractFamilySections,
  INTENT_FAMILY_MODE,
  systemBlocksToString,
} from "./promptBuilder";
import type { SystemBlocksInput } from "./types";

const STUB_MEMBER = {
  name: "Rob",
  phone: "+16515551234",
  role: "coordinator",
  accessLevel: "full",
  relationship: "care recipient",
};

function makeInput(overrides: Partial<SystemBlocksInput> = {}): SystemBlocksInput {
  return {
    soulContent: "You are CareSupport.",
    routingContent: "",
    capabilitiesContent: "",
    skillsContent: "",
    lessonsContent: "",
    member: STUB_MEMBER,
    memberContext: "",
    familyContext: "",
    intent: "GENERAL",
    service: "SMS",
    toolsActive: false,
    ...overrides,
  };
}

describe("buildMessages", () => {
  it("returns just the new user message when history is empty", () => {
    const msgs = buildMessages("Hello", "");
    expect(msgs).toEqual([{ role: "user", content: "Hello" }]);
  });

  it("parses INBOUND/OUTBOUND log entries into user/assistant turns", () => {
    const history =
      "[2026-02-26 03:55:32 UTC] [INBOUND] Hi there\n" +
      "[2026-02-26 03:55:45 UTC] [OUTBOUND] Hello! How can I help?";
    const msgs = buildMessages("New message", history);
    expect(msgs).toHaveLength(3);
    expect(msgs[0]).toEqual({ role: "user", content: "Hi there" });
    expect(msgs[1]).toEqual({ role: "assistant", content: "Hello! How can I help?" });
    expect(msgs[2]).toEqual({ role: "user", content: "New message" });
  });

  it("joins multi-line messages back together", () => {
    const history =
      "[2026-02-26 03:55:32 UTC] [INBOUND] Line one\n" +
      "Line two\n" +
      "Line three\n" +
      "[2026-02-26 03:56:00 UTC] [OUTBOUND] Response";
    const msgs = buildMessages("Follow up", history);
    expect(msgs[0].content).toBe("Line one\nLine two\nLine three");
  });

  it("collapses consecutive same-role messages", () => {
    const history =
      "[2026-02-26 03:55:32 UTC] [INBOUND] First\n" +
      "[2026-02-26 03:55:33 UTC] [INBOUND] Second";
    const msgs = buildMessages("Third", history);
    expect(msgs[0].content).toBe("First\nSecond");
    expect(msgs[0].role).toBe("user");
  });

  it("treats '[No conversation history]' as empty", () => {
    const msgs = buildMessages("Hello", "[No conversation history]");
    expect(msgs).toEqual([{ role: "user", content: "Hello" }]);
  });
});

describe("extractFamilySections", () => {
  const familyMd = [
    "# Family: Kanoliban",
    "Some preamble text about the family.",
    "",
    "## Care Recipient",
    "Rob, age 45",
    "",
    "## Active Medications",
    "- Lisinopril 10mg",
    "",
    "## Care Team",
    "- Marta (daughter)",
    "- Sarah (pro caregiver)",
    "",
    "## Financial",
    "Insurance info here",
  ].join("\n");

  it("extracts specific sections by header name", () => {
    const result = extractFamilySections(familyMd, new Set(["Care Recipient", "Active Medications"]));
    expect(result).toContain("## Care Recipient");
    expect(result).toContain("Rob, age 45");
    expect(result).toContain("## Active Medications");
    expect(result).toContain("Lisinopril 10mg");
    expect(result).not.toContain("Care Team");
    expect(result).not.toContain("Financial");
  });

  it("preserves preamble (text before first ##)", () => {
    const result = extractFamilySections(familyMd, new Set(["Care Recipient"]));
    expect(result).toContain("Family: Kanoliban");
  });

  it("returns empty string for empty input", () => {
    expect(extractFamilySections("", new Set(["Care Recipient"]))).toBe("");
  });

  it("returns empty string when no sections match", () => {
    const result = extractFamilySections(familyMd, new Set(["Nonexistent Section"]));
    expect(result).toContain("Family: Kanoliban");
    expect(result).not.toContain("##");
  });
});

describe("channelGuidance", () => {
  it("returns SMS guidance text for 'SMS'", () => {
    const result = channelGuidance("SMS");
    expect(result).toContain("CHANNEL: SMS");
    expect(result).toContain("320 characters");
  });

  it("returns empty string for non-SMS services", () => {
    expect(channelGuidance("iMessage")).toBe("");
    expect(channelGuidance("web")).toBe("");
  });
});

describe("buildSystemBlocks", () => {
  it("returns array with cache breakpoint on member block", () => {
    const blocks = buildSystemBlocks(makeInput());
    const breakpoints = blocks.filter((b) => b.cacheBreakpoint);
    expect(breakpoints).toHaveLength(1);
    expect(breakpoints[0].text).toContain("YOU ARE TEXTING WITH: Rob");
  });

  it("includes SOUL content as first block", () => {
    const blocks = buildSystemBlocks(makeInput({ soulContent: "Custom soul" }));
    expect(blocks[0].text).toBe("Custom soul");
  });

  it("falls back to default soul when empty", () => {
    const blocks = buildSystemBlocks(makeInput({ soulContent: "" }));
    expect(blocks[0].text).toContain("CareSupport");
  });

  it("includes routing/capabilities/skills when provided", () => {
    const blocks = buildSystemBlocks(
      makeInput({
        routingContent: "Route rules",
        capabilitiesContent: "Can do X",
        skillsContent: "Skill Y",
      }),
    );
    const routingBlock = blocks.find((b) => b.text.includes("ROUTING"));
    expect(routingBlock).toBeDefined();
    expect(routingBlock!.text).toContain("Route rules");
    expect(routingBlock!.text).toContain("CAPABILITIES");
    expect(routingBlock!.text).toContain("SKILLS");
  });

  it("EMERGENCY intent loads full family context", () => {
    const familyContext = "## Care Recipient\nRob\n\n## Financial\nInsurance";
    const blocks = buildSystemBlocks(makeInput({ intent: "EMERGENCY", familyContext }));
    const familyBlock = blocks.find((b) => b.text.includes("FAMILY FILE"));
    expect(familyBlock).toBeDefined();
    expect(familyBlock!.text).toContain("Financial");
  });

  it("GENERAL intent loads slim family context (first 500 chars)", () => {
    const longContext = "A".repeat(600);
    const blocks = buildSystemBlocks(makeInput({ intent: "GENERAL", familyContext: longContext }));
    const familyBlock = blocks.find((b) => b.text.includes("FAMILY FILE"));
    expect(familyBlock).toBeDefined();
    expect(familyBlock!.text.length).toBeLessThan(600);
  });

  it("toolsActive mode skips family context pre-loading", () => {
    const blocks = buildSystemBlocks(
      makeInput({ toolsActive: true, familyContext: "## Care Team\nMembers" }),
    );
    const familyBlock = blocks.find((b) => b.text.includes("FAMILY FILE"));
    expect(familyBlock).toBeUndefined();
  });

  it("includes member context when provided", () => {
    const blocks = buildSystemBlocks(makeInput({ memberContext: "Prefers morning texts" }));
    const memberBlock = blocks.find((b) => b.cacheBreakpoint);
    expect(memberBlock!.text).toContain("WHAT YOU KNOW ABOUT ROB");
    expect(memberBlock!.text).toContain("Prefers morning texts");
  });
});

describe("systemBlocksToString", () => {
  it("joins all block texts with double newline", () => {
    const result = systemBlocksToString([
      { type: "text", text: "Block 1", cacheBreakpoint: false },
      { type: "text", text: "Block 2", cacheBreakpoint: true },
    ]);
    expect(result).toBe("Block 1\n\nBlock 2");
  });
});

describe("INTENT_FAMILY_MODE mapping", () => {
  it("maps EMERGENCY and ESCALATION to family_full", () => {
    expect(INTENT_FAMILY_MODE.EMERGENCY).toBe("family_full");
    expect(INTENT_FAMILY_MODE.ESCALATION).toBe("family_full");
  });

  it("maps MEDICATION_CHANGE to family_meds", () => {
    expect(INTENT_FAMILY_MODE.MEDICATION_CHANGE).toBe("family_meds");
  });

  it("maps GENERAL to family_slim", () => {
    expect(INTENT_FAMILY_MODE.GENERAL).toBe("family_slim");
  });
});
