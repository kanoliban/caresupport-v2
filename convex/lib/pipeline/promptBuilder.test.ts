import { describe, expect, it } from "vitest";
import {
  buildMessages,
  buildSystemBlocks,
  channelGuidance,
  systemBlocksToString,
} from "./promptBuilder";
import type { SystemBlocksInput } from "./types";

function makeInput(overrides: Partial<SystemBlocksInput> = {}): SystemBlocksInput {
  return {
    soulContent: "You are CareSupport.",
    modelConstitutionContent:
      "The CareSupport model represents each care situation through a relationship graph, coordination state machine, and operational record.",
    routingContent: "",
    capabilitiesContent: "",
    skillsContent: "",
    lessonsContent: "",
    user: {
      name: "Alex",
      phone: "+16515551234",
      relationshipToRecipient: "son",
      status: "active",
    },
    userContext: "## Communication Preferences\n- Prefers short texts.",
    careCase: {
      title: "Alex caring for Sam",
      careRecipientName: "Sam",
      relationshipToRecipient: "father",
      timezone: "America/Chicago",
      status: "active",
    },
    careCaseContext: "## Care Case\n- Care recipient: Sam",
    intent: "GENERAL",
    service: "SMS",
    currentDateIso: "2026-05-15",
    currentDayOfWeek: "Friday",
    currentTimeUtc: "09:14",
    timezone: "America/Chicago",
    ...overrides,
  };
}

describe("buildMessages", () => {
  it("returns just the latest user message when history is empty", () => {
    expect(buildMessages("Hello", "")).toEqual([{ role: "user", content: "Hello" }]);
  });

  it("parses inbound and outbound conversation history", () => {
    const history =
      "[2026-04-13 10:00:00 UTC] [INBOUND from Alex] Hi\n" +
      "[2026-04-13 10:00:05 UTC] [OUTBOUND to Alex] Hello";
    const result = buildMessages("What next?", history);

    expect(result[0]).toEqual({ role: "user", content: "[Alex]: Hi" });
    expect(result[1]).toEqual({ role: "assistant", content: "[Alex]: Hello" });
    expect(result[2]).toEqual({ role: "user", content: "What next?" });
  });
});

describe("channelGuidance", () => {
  it("returns SMS guidance for SMS service", () => {
    expect(channelGuidance("SMS")).toContain("CHANNEL: iMessage/SMS");
  });
});

describe("buildSystemBlocks", () => {
  it("includes response format and user identity as cache breakpoints", () => {
    const blocks = buildSystemBlocks(makeInput());
    const breakpoints = blocks.filter((block) => block.cacheBreakpoint);

    expect(breakpoints).toHaveLength(3);
    expect(breakpoints[0].text).toContain("CARESUPPORT MODEL CONSTITUTION");
    expect(breakpoints[1].text).toContain("RESPONSE FORMAT");
    expect(breakpoints[2].text).toContain("YOU ARE TEXTING WITH: Alex");
  });

  it("loads the model constitution as its own system block before operational guidance", () => {
    const blocks = buildSystemBlocks(makeInput());
    const constitutionIndex = blocks.findIndex((block) =>
      block.text.includes("CARESUPPORT MODEL CONSTITUTION"),
    );
    const operationalIndex = blocks.findIndex((block) =>
      block.text.includes("RESPONSE FORMAT"),
    );

    expect(constitutionIndex).toBeGreaterThan(-1);
    expect(operationalIndex).toBeGreaterThan(constitutionIndex);
    expect(blocks[constitutionIndex].text).toContain("relationship graph");
    expect(blocks[constitutionIndex].text).toContain("coordination state machine");
    expect(blocks[constitutionIndex].text).toContain("operational record");
  });

  it("includes onboarding guidance when intent is onboarding", () => {
    const blocks = buildSystemBlocks(makeInput({ intent: "ONBOARDING" }));
    const onboardingBlock = blocks.find((block) =>
      block.text.includes("INTENT: ONBOARDING"),
    );

    expect(onboardingBlock).toBeDefined();
    expect(onboardingBlock?.text).toContain("Learn their name first");
  });

  it("renders the care case context block", () => {
    const blocks = buildSystemBlocks(makeInput());
    const careCaseBlock = blocks.find((block) =>
      block.text.includes("── CARE CASE ──"),
    );

    expect(careCaseBlock).toBeDefined();
    expect(careCaseBlock?.text).toContain("Care recipient: Sam");
  });

  it("emits a TIME block as the second block with the injected date", () => {
    // #given the input has a fixed date
    const input = makeInput({
      currentDateIso: "2026-05-15",
      currentDayOfWeek: "Friday",
      currentTimeUtc: "09:14",
      timezone: "America/Chicago",
    });

    // #when system blocks are built
    const blocks = buildSystemBlocks(input);

    // #then the second block is the TIME anchor
    const timeBlock = blocks.find((block) => block.text.includes("── TIME ──"));
    expect(timeBlock?.text).toContain("Today is 2026-05-15 (Friday).");
    expect(timeBlock?.text).toContain("Current time: 09:14 UTC.");
    expect(timeBlock?.text).toContain("Care recipient timezone: America/Chicago.");
    expect(timeBlock?.cacheBreakpoint).toBe(false);
  });

  it("falls back to UTC when timezone is empty", () => {
    // #given an input with no timezone
    const input = makeInput({ timezone: "" });

    // #when system blocks are built
    const blocks = buildSystemBlocks(input);

    // #then the TIME block falls back to UTC for the recipient timezone
    const timeBlock = blocks.find((block) => block.text.includes("── TIME ──"));
    expect(timeBlock?.text).toContain("Care recipient timezone: UTC.");
  });

  it("instructs the model not to store relative date words", () => {
    // #given a default input
    // #when the response format is rendered into a block
    const blocks = buildSystemBlocks(makeInput());
    const responseFormatBlock = blocks.find((block) =>
      block.text.includes("RESPONSE FORMAT"),
    );

    // #then date-resolution guidance is present
    expect(responseFormatBlock?.text).toContain("── DATE RESOLUTION ──");
    expect(responseFormatBlock?.text).toContain(
      'Never store "today", "tomorrow", or a day name as the date field',
    );
    expect(responseFormatBlock?.text).toContain(
      "Always include every top-level array field below",
    );
  });

  it("describes third-party coordination as a current runtime boundary", () => {
    const blocks = buildSystemBlocks(makeInput());
    const responseFormatBlock = blocks.find((block) =>
      block.text.includes("CURRENT RUNTIME BOUNDARY"),
    );

    expect(responseFormatBlock).toBeDefined();
    expect(responseFormatBlock?.text).toContain(
      "CareSupport is currently one trusted thread around one care situation",
    );
    expect(responseFormatBlock?.text).toContain(
      "execute approved one-to-one outreach to known contacts",
    );
    expect(responseFormatBlock?.text).toContain(
      "unless the runtime reports that the send succeeded",
    );
    expect(responseFormatBlock?.text).toContain(
      "use caregiver micro-onboarding language",
    );
  });
});

describe("systemBlocksToString", () => {
  it("joins block texts with double newlines", () => {
    expect(
      systemBlocksToString([
        { type: "text", text: "Block 1", cacheBreakpoint: false },
        { type: "text", text: "Block 2", cacheBreakpoint: true },
      ]),
    ).toBe("Block 1\n\nBlock 2");
  });
});
