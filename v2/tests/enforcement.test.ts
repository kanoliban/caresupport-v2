import { describe, expect, it } from "vitest";
import { postModelGuard } from "../src/enforcement/policies.js";

describe("postModelGuard", () => {
  it("flags promise-without-action", () => {
    const issues = postModelGuard({
      sms_response: "I'll message Roman and confirm.",
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
    });

    expect(issues.some((i) => i.code === "PROMISE_WITHOUT_ACTION")).toBe(true);
  });

  it("passes when outreach exists", () => {
    const issues = postModelGuard({
      sms_response: "I'll message Roman now.",
      needs_outreach: [{ phone: "+16515550000", name: "Roman", message: "Can you assist?" }],
      family_updates: [],
      member_updates: [],
      routing_updates: [],
      audit: {
        model: "test",
        intent: "GENERAL",
        decisions: [],
        warnings: [],
      },
    });

    expect(issues.some((i) => i.code === "PROMISE_WITHOUT_ACTION")).toBe(false);
  });
});
