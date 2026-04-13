import { describe, expect, it } from "vitest";
import { fallbackChain, MODELS, route, TIER_ORDER } from "./careRouter";

describe("route", () => {
  it("routes emergency language to critical/EMERGENCY", () => {
    const result = route("Call 911 right now");
    expect(result.tier).toBe("critical");
    expect(result.intent).toBe("EMERGENCY");
    expect(result.model).toBe(MODELS.critical);
  });

  it("routes medication change language to reason/MEDICATION_CHANGE", () => {
    const result = route("Please change his blood pressure medication dose.");
    expect(result.tier).toBe("reason");
    expect(result.intent).toBe("MEDICATION_CHANGE");
  });

  it("routes pricing questions to fast/BILLING", () => {
    const result = route("How much does CareSupport cost?");
    expect(result.tier).toBe("fast");
    expect(result.intent).toBe("BILLING");
  });

  it("defaults everything else to GENERAL", () => {
    const result = route("Good morning");
    expect(result.intent).toBe("GENERAL");
  });
});

describe("fallbackChain", () => {
  it("returns the right escalation chain", () => {
    expect(fallbackChain(MODELS.fast)).toEqual([MODELS.fast, MODELS.critical]);
    expect(fallbackChain(MODELS.critical)).toEqual([MODELS.critical]);
  });
});

describe("constants", () => {
  it("exposes the known tier ordering", () => {
    expect(TIER_ORDER).toEqual(["fast", "reason", "critical"]);
  });
});
