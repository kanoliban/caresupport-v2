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
    expect(result[1]).toEqual({ role: "assistant", content: "Hello" });
    expect(result[2]).toEqual({ role: "user", content: "What next?" });
  });

  it("strips stale speaker labels from stored assistant messages", () => {
    const history =
      "[2026-04-13 10:00:00 UTC] [OUTBOUND to Alex] [Alex]: Hello again";
    const result = buildMessages("What next?", history);

    expect(result[0]).toEqual({ role: "assistant", content: "Hello again" });
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

    expect(breakpoints).toHaveLength(2);
    expect(breakpoints[0].text).toContain("RESPONSE FORMAT");
    expect(breakpoints[1].text).toContain("YOU ARE TEXTING WITH: Alex");
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
    expect(blocks[1].text).toContain("── TIME ──");
    expect(blocks[1].text).toContain("Today is 2026-05-15 (Friday).");
    expect(blocks[1].text).toContain("Current time: 09:14 UTC.");
    expect(blocks[1].text).toContain("Care recipient timezone: America/Chicago.");
    expect(blocks[1].cacheBreakpoint).toBe(false);
  });

  it("falls back to UTC when timezone is empty", () => {
    // #given an input with no timezone
    const input = makeInput({ timezone: "" });

    // #when system blocks are built
    const blocks = buildSystemBlocks(input);

    // #then the TIME block falls back to UTC for the recipient timezone
    expect(blocks[1].text).toContain("Care recipient timezone: UTC.");
  });

  it("asks for location on first scheduling when timezone is unconfirmed", () => {
    // #given the timezone has not been confirmed by the user
    const input = makeInput({ timezoneConfirmed: false });

    // #when system blocks are built
    const blocks = buildSystemBlocks(input);

    // #then the TIME block instructs asking which city/area they're in
    expect(blocks[1].text).toContain("which city or area they're in");
    expect(blocks[1].text).toContain("Ask this only once");
  });

  it("omits the location prompt once the timezone is confirmed", () => {
    // #given a confirmed timezone
    const input = makeInput({ timezoneConfirmed: true });

    // #when system blocks are built
    const blocks = buildSystemBlocks(input);

    // #then the TIME block does not ask for location
    expect(blocks[1].text).not.toContain("which city or area they're in");
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
    expect(responseFormatBlock?.text).toContain(
      "treat the older assistant messages as stale",
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
    expect(responseFormatBlock?.text).toContain("cannot do that yet");
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
