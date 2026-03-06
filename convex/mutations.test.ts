import { describe, it, expect } from "vitest";
import { normalizePhone } from "./mutations";

describe("normalizePhone", () => {
  it("strips dashes and parens from 10-digit US number", () => {
    expect(normalizePhone("518-698-4328")).toBe("+15186984328");
    expect(normalizePhone("(518) 698-4328")).toBe("+15186984328");
  });

  it("handles raw 10 digits", () => {
    expect(normalizePhone("5186984328")).toBe("+15186984328");
  });

  it("handles 11 digits starting with 1", () => {
    expect(normalizePhone("15186984328")).toBe("+15186984328");
  });

  it("preserves already-formatted E.164", () => {
    expect(normalizePhone("+15186984328")).toBe("+15186984328");
  });

  it("strips formatting from E.164 with spaces", () => {
    expect(normalizePhone("+1 (518) 698-4328")).toBe("+15186984328");
  });

  it("returns null for too-short numbers", () => {
    expect(normalizePhone("698-4328")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(normalizePhone("")).toBeNull();
  });
});
