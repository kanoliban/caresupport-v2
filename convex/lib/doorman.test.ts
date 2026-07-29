import { describe, expect, it } from "vitest";
import {
  DOORMAN_SYSTEM_PROMPT,
  DOORMAN_VELOCITY_THRESHOLD,
  isVelocitySuspicious,
  parseDoormanResponse,
} from "./doorman";

describe("parseDoormanResponse", () => {
  it("parses a clean verdict", () => {
    const result = parseDoormanResponse(
      JSON.stringify({
        sms_response: "Hey — I'm CareSupport. What's going on with your family?",
        verdict: "continue",
      }),
    );
    expect(result.verdict).toBe("continue");
    expect(result.smsResponse).toContain("CareSupport");
    expect(result.name).toBeUndefined();
  });

  it("parses graduate with a name", () => {
    const result = parseDoormanResponse(
      '{"sms_response": "Opening your care thread now, Maria.", "verdict": "graduate", "name": "Maria"}',
    );
    expect(result.verdict).toBe("graduate");
    expect(result.name).toBe("Maria");
  });

  it("extracts JSON from a fenced block", () => {
    const result = parseDoormanResponse(
      'Sure!\n```json\n{"sms_response": "Hi", "verdict": "agent"}\n```',
    );
    expect(result.verdict).toBe("agent");
  });

  it("falls back to continue on garbage", () => {
    const result = parseDoormanResponse("not json at all");
    expect(result.verdict).toBe("continue");
    expect(result.smsResponse).toBe("");
  });

  it("defaults unknown verdicts to continue", () => {
    const result = parseDoormanResponse(
      '{"sms_response": "hm", "verdict": "banish"}',
    );
    expect(result.verdict).toBe("continue");
  });

  it("parses a flag verdict with a name", () => {
    const result = parseDoormanResponse(
      '{"sms_response": "The team will see this and follow up.", "verdict": "flag", "name": "Jeanette"}',
    );
    expect(result.verdict).toBe("flag");
    expect(result.name).toBe("Jeanette");
  });

  it("maps the retired dismiss verdict to continue", () => {
    const result = parseDoormanResponse(
      '{"sms_response": "Take care!", "verdict": "dismiss"}',
    );
    expect(result.verdict).toBe("continue");
  });
});

describe("isVelocitySuspicious", () => {
  it("flags a burst inside the window", () => {
    const now = 1_000_000;
    const stamps = Array.from(
      { length: DOORMAN_VELOCITY_THRESHOLD },
      (_, i) => now - i * 1_000,
    );
    expect(isVelocitySuspicious(stamps, now)).toBe(true);
  });

  it("ignores slow human pacing", () => {
    const now = 1_000_000;
    const stamps = [now - 5_000, now - 120_000, now - 300_000];
    expect(isVelocitySuspicious(stamps, now)).toBe(false);
  });
});

describe("doorman prompt", () => {
  it("keeps first contact toolless and honest", () => {
    expect(DOORMAN_SYSTEM_PROMPT).toContain("NO access to care records");
    expect(DOORMAN_SYSTEM_PROMPT).toContain("verdict");
  });

  it("can flag a human to the team but never dismiss one", () => {
    expect(DOORMAN_SYSTEM_PROMPT).toContain('"flag"');
    expect(DOORMAN_SYSTEM_PROMPT).not.toContain('"dismiss"');
  });

  it("graduates on clear intent without another screening question", () => {
    expect(DOORMAN_SYSTEM_PROMPT).toContain("THIS turn");
  });

  it("only promises a handoff on the flag verdict", () => {
    expect(DOORMAN_SYSTEM_PROMPT).toContain(
      "Never promise a handoff on any other verdict",
    );
  });
});
