import { describe, expect, it } from "vitest";
import { getEffectiveProductMode, isSoloBetaMode } from "./productMode";

describe("getEffectiveProductMode", () => {
  it("defaults missing product mode to solo beta", () => {
    expect(getEffectiveProductMode(undefined)).toBe("solo_beta");
  });

  it("keeps explicit family coordination mode", () => {
    expect(getEffectiveProductMode("family_coordination")).toBe(
      "family_coordination",
    );
  });

  it("treats unknown values as solo beta for safer runtime behavior", () => {
    expect(getEffectiveProductMode("legacy_mode")).toBe("solo_beta");
  });
});

describe("isSoloBetaMode", () => {
  it("returns true when product mode is missing", () => {
    expect(isSoloBetaMode(undefined)).toBe(true);
  });

  it("returns false for explicit family coordination mode", () => {
    expect(isSoloBetaMode("family_coordination")).toBe(false);
  });
});
