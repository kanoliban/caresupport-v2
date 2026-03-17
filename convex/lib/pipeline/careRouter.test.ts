import { describe, expect, it } from "vitest";
import { fallbackChain, MODELS, route, TIER_ORDER } from "./careRouter";

describe("route — emergency patterns", () => {
  it("routes '911' to critical/EMERGENCY", () => {
    const r = route("Call 911 right now");
    expect(r.tier).toBe("critical");
    expect(r.intent).toBe("EMERGENCY");
    expect(r.model).toBe(MODELS.critical);
  });

  it("routes chest pain to critical/EMERGENCY", () => {
    const r = route("He's having chest pain");
    expect(r.intent).toBe("EMERGENCY");
  });

  it("routes 'Dad fell' to critical/EMERGENCY", () => {
    const r = route("Dad fell in the kitchen");
    expect(r.intent).toBe("EMERGENCY");
  });

  it("does NOT route 'fell asleep' as emergency", () => {
    const r = route("He fell asleep on the couch");
    expect(r.intent).not.toBe("EMERGENCY");
  });

  it("does NOT route 'fell behind' as emergency", () => {
    const r = route("She fell behind on her schedule");
    expect(r.intent).not.toBe("EMERGENCY");
  });

  it("routes seizure to critical/EMERGENCY", () => {
    const r = route("She's having a seizure");
    expect(r.intent).toBe("EMERGENCY");
  });
});

describe("route — escalation patterns", () => {
  it("routes missed medication to critical/ESCALATION", () => {
    const r = route("He missed his medication this morning");
    expect(r.tier).toBe("critical");
    expect(r.intent).toBe("ESCALATION");
  });

  it("routes 'no one is here' to critical/ESCALATION", () => {
    const r = route("No one is here for the afternoon shift");
    expect(r.intent).toBe("ESCALATION");
  });

  it("routes 'didn't show up' to critical/ESCALATION", () => {
    const r = route("The caregiver didn't show up");
    expect(r.intent).toBe("ESCALATION");
  });
});

describe("route — reason tier", () => {
  it("routes medication change to reason/MEDICATION_CHANGE", () => {
    const r = route("Change his blood pressure medication dose");
    expect(r.tier).toBe("reason");
    expect(r.intent).toBe("MEDICATION_CHANGE");
  });

  it("routes new caregiver to reason/ONBOARDING", () => {
    const r = route("New caregiver starting Monday");
    expect(r.tier).toBe("reason");
    expect(r.intent).toBe("ONBOARDING");
  });

  it("routes multi-member coordination to reason/MULTI_MEMBER", () => {
    const r = route("Tell everyone about the schedule change");
    expect(r.tier).toBe("reason");
    expect(r.intent).toBe("MULTI_MEMBER");
  });
});

describe("route — default", () => {
  it("routes greetings to fast/GENERAL", () => {
    const r = route("Good morning");
    expect(r.tier).toBe("fast");
    expect(r.intent).toBe("GENERAL");
    expect(r.model).toBe(MODELS.fast);
  });

  it("routes simple questions to fast/GENERAL", () => {
    const r = route("What time is the appointment?");
    expect(r.intent).toBe("GENERAL");
  });
});

describe("route — priority ordering", () => {
  it("EMERGENCY wins when both emergency and escalation keywords present", () => {
    const r = route("He fell and missed his medication");
    expect(r.intent).toBe("EMERGENCY");
  });
});

describe("fallbackChain", () => {
  it("fast (Sonnet) → [Sonnet, Opus]", () => {
    expect(fallbackChain(MODELS.fast)).toEqual([
      MODELS.fast,
      MODELS.critical,
    ]);
  });

  it("Sonnet → [Sonnet, Opus]", () => {
    expect(fallbackChain(MODELS.reason)).toEqual([
      MODELS.reason,
      MODELS.critical,
    ]);
  });

  it("Opus → [Opus]", () => {
    expect(fallbackChain(MODELS.critical)).toEqual([MODELS.critical]);
  });

  it("unknown model → just that model", () => {
    expect(fallbackChain("unknown-model")).toEqual(["unknown-model"]);
  });
});

describe("constants", () => {
  it("TIER_ORDER has 3 tiers in ascending priority", () => {
    expect(TIER_ORDER).toEqual(["fast", "reason", "critical"]);
  });

  it("every tier has a model mapping", () => {
    for (const tier of TIER_ORDER) {
      expect(MODELS[tier]).toBeDefined();
      expect(typeof MODELS[tier]).toBe("string");
    }
  });
});
