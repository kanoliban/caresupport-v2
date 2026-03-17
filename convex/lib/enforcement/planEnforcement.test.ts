import { describe, it, expect } from "vitest";
import { canAddMember, getEffectiveTier, getPlanLimits } from "./planEnforcement";

describe("planEnforcement", () => {
  describe("getEffectiveTier", () => {
    it("returns free for undefined", () => {
      expect(getEffectiveTier(undefined)).toBe("free");
    });

    it("returns free for unknown string", () => {
      expect(getEffectiveTier("premium")).toBe("free");
    });

    it("returns family for family", () => {
      expect(getEffectiveTier("family")).toBe("family");
    });
  });

  describe("getPlanLimits", () => {
    it("free tier has 2 member limit (1:1:1)", () => {
      expect(getPlanLimits("free").maxMembers).toBe(2);
    });

    it("family tier has no member limit", () => {
      expect(getPlanLimits("family").maxMembers).toBeNull();
    });
  });

  describe("canAddMember", () => {
    it("allows adding to free tier under limit", () => {
      expect(canAddMember("free", 1)).toEqual({ allowed: true, upgradeRequired: false });
    });

    it("blocks adding 3rd member on free tier (1:1:1)", () => {
      expect(canAddMember("free", 2)).toEqual({ allowed: false, upgradeRequired: true });
    });

    it("blocks adding to free tier over limit", () => {
      expect(canAddMember("free", 5)).toEqual({ allowed: false, upgradeRequired: true });
    });

    it("allows adding to family tier at any count", () => {
      expect(canAddMember("family", 100)).toEqual({ allowed: true, upgradeRequired: false });
    });
  });
});
