import { describe, expect, it } from "vitest";
import { evaluateCase } from "../src/replay/scoring.js";
import type { ProcessResult } from "../src/contracts/processResult.js";

const baseResult: ProcessResult = {
  sms_response: "",
  needs_outreach: [],
  family_updates: [],
  member_updates: [],
  routing_updates: [],
  audit: {
    model: "test",
    intent: "GENERAL",
    decisions: [],
    warnings: [],
  },
};

describe("replay scoring", () => {
  it("passes semantically matching schedule clarification", () => {
    const result = evaluateCase(
      "Got it. What do you need for Monday and Tuesday — who's covering, what times, or something else?",
      "I can help with Monday/Tuesday rides. Do you want to view or change the schedule?",
      {
        ...baseResult,
        sms_response: "I can help with Monday/Tuesday rides. Do you want to view or change the schedule?",
      },
    );
    expect(result.passed).toBe(true);
    expect(result.distance).toBe(0);
  });

  it("fails outreach promises without structured outreach tasks", () => {
    const result = evaluateCase(
      "Got it. I'll reach out to the other drivers and get them assigned.",
      "I'll reach out to the other drivers now.",
      {
        ...baseResult,
        sms_response: "I'll reach out to the other drivers now.",
      },
    );
    expect(result.passed).toBe(false);
    expect(result.reasons).toContain("promise_without_action");
  });
});
