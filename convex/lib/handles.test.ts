import { describe, expect, it } from "vitest";
import { normalizeHandle } from "./handles";

describe("normalizeHandle", () => {
  it("keeps E.164 international numbers", () => {
    expect(normalizeHandle("+447911123456")).toBe("+447911123456");
  });

  it("recovers international numbers missing the leading +", () => {
    expect(normalizeHandle("447911123456")).toBe("+447911123456");
  });

  it("normalizes formatted US numbers to E.164", () => {
    expect(normalizeHandle("+1 (651) 555-1234")).toBe("+16515551234");
    expect(normalizeHandle("(651) 555-1234")).toBe("+16515551234");
    expect(normalizeHandle("16515551234")).toBe("+16515551234");
  });

  it("accepts email handles", () => {
    expect(normalizeHandle("joe@example.com")).toBe("joe@example.com");
  });

  it("lowercases and trims email handles", () => {
    expect(normalizeHandle("JOE@Example.COM")).toBe("joe@example.com");
    expect(normalizeHandle("  joe@example.com  ")).toBe("joe@example.com");
  });

  it("rejects too-short numbers", () => {
    expect(normalizeHandle("+12")).toBeNull();
    expect(normalizeHandle("698-4328")).toBeNull();
  });

  it("rejects malformed emails", () => {
    expect(normalizeHandle("joe@")).toBeNull();
    expect(normalizeHandle("@example.com")).toBeNull();
    expect(normalizeHandle("joe@example")).toBeNull();
  });

  it("rejects non-handle text", () => {
    expect(normalizeHandle("not-a-handle")).toBeNull();
  });

  it("rejects empty input", () => {
    expect(normalizeHandle("")).toBeNull();
    expect(normalizeHandle("   ")).toBeNull();
    expect(normalizeHandle(undefined)).toBeNull();
    expect(normalizeHandle(null)).toBeNull();
  });
});
