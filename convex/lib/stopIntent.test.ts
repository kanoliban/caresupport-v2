import { describe, expect, it } from "vitest";
import {
  detectResumeIntent,
  detectStopIntent,
  doesReplyClaimNotificationStop,
} from "./stopIntent";

describe("detectStopIntent", () => {
  it("catches a bare Stop — the reply that started this bug", () => {
    // #given the caregiver replies to the daily brief with one word
    for (const message of ["Stop", "STOP", "stop.", "  stop  ", "Stop!"]) {
      // #then it registers as an opt-out
      expect(detectStopIntent(message), message).not.toBeNull();
    }
  });

  it("catches the phrase forms", () => {
    const messages = [
      "please stop texting me",
      "stop sending these",
      "no more messages please",
      "don't text me anymore",
      "unsubscribe",
      "cancel these reminders",
      "turn off the notifications",
      "take me off this",
      "quit messaging me",
    ];
    for (const message of messages) {
      expect(detectStopIntent(message), message).not.toBeNull();
    }
  });

  it("does not mute the thread when 'stop' is about care, not messaging", () => {
    // #given care instructions that happen to contain the word "stop"
    const messages = [
      "the doctor said to stop her metformin",
      "can you stop by at 3",
      "we need to stop the insulin until Tuesday",
      "did they stop the physical therapy?",
      "I had to stop at the pharmacy on the way",
    ];
    // #then none of them silence an insulin thread
    for (const message of messages) {
      expect(detectStopIntent(message), message).toBeNull();
    }
  });

  it("records when the sender named something narrower than everything", () => {
    expect(detectStopIntent("stop the morning brief")?.scopeHint).toBe(
      "narrower_scope_mentioned",
    );
    expect(detectStopIntent("stop")?.scopeHint).toBe("unscoped");
  });

  it("keeps the original text for the audit trail", () => {
    expect(detectStopIntent("Please stop texting me")?.matchedText).toBe(
      "Please stop texting me",
    );
  });

  it("ignores empty input", () => {
    expect(detectStopIntent("   ")).toBeNull();
  });
});

describe("detectResumeIntent", () => {
  it("recognizes the standard opt-back-in keywords", () => {
    for (const message of ["START", "start", "unstop", "resume", "Start again"]) {
      expect(detectResumeIntent(message), message).toBe(true);
    }
  });

  it("recognizes phrase forms", () => {
    expect(detectResumeIntent("please start the reminders again")).toBe(true);
    expect(detectResumeIntent("turn the texts back on")).toBe(true);
  });

  it("does not treat ordinary conversation as a resume", () => {
    expect(detectResumeIntent("she starts dialysis on Tuesday")).toBe(false);
    expect(detectResumeIntent("thanks")).toBe(false);
  });
});

describe("doesReplyClaimNotificationStop", () => {
  it("flags the exact confabulation from the incident", () => {
    expect(
      doesReplyClaimNotificationStop("Got it, stopping the repeated messages"),
    ).toBe(true);
  });

  it("flags other forms of the same claim", () => {
    const claims = [
      "I've turned off the daily reminders.",
      "I'll stop the morning texts.",
      "No more notifications from me.",
      "You won't receive those alerts again.",
      "I paused the reminders for you.",
    ];
    for (const claim of claims) {
      expect(doesReplyClaimNotificationStop(claim), claim).toBe(true);
    }
  });

  it("does not flag an offer or a question", () => {
    const offers = [
      "Want me to stop the daily brief?",
      "Should I turn off those reminders?",
      "Let me know if you want me to pause the texts.",
    ];
    for (const offer of offers) {
      expect(doesReplyClaimNotificationStop(offer), offer).toBe(false);
    }
  });

  it("does not flag unrelated replies", () => {
    expect(
      doesReplyClaimNotificationStop("I added her 8 AM insulin to the schedule."),
    ).toBe(false);
  });
});
