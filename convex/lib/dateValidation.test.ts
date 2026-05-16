import { describe, expect, it } from "vitest";
import {
  validateIsoDate,
  validateRecurrence,
  validateTime24h,
} from "./dateValidation";

describe("validateIsoDate", () => {
  it("accepts a valid ISO date", () => {
    // #given a properly formatted date
    // #when the validator runs
    // #then the same string comes back
    expect(validateIsoDate("2026-05-15")).toBe("2026-05-15");
  });

  it("treats empty string as undefined", () => {
    // #given an empty string (common from agent JSON null-to-string coercion)
    // #then validator returns undefined, not an error
    expect(validateIsoDate("")).toBeUndefined();
  });

  it("returns undefined for undefined input", () => {
    expect(validateIsoDate(undefined)).toBeUndefined();
  });

  it("throws on relative date words", () => {
    // #given the model wrote "today" as a literal
    // #then the mutation boundary catches it
    expect(() => validateIsoDate("today")).toThrow('Invalid date format: "today"');
  });

  it("throws on day names", () => {
    expect(() => validateIsoDate("Monday")).toThrow('Invalid date format: "Monday"');
  });

  it("throws on US-style dates", () => {
    expect(() => validateIsoDate("05/15/2026")).toThrow("Invalid date format");
  });

  it("throws on impossible calendar dates", () => {
    // #given a syntactically valid but real-world impossible date
    // #then the validator rejects it at the calendar-check stage
    expect(() => validateIsoDate("2025-13-45")).toThrow("Invalid calendar date");
  });

  it("throws on Feb 30", () => {
    // #given a date that matches the format but doesn't exist
    expect(() => validateIsoDate("2026-02-30")).toThrow("Invalid calendar date");
  });
});

describe("validateTime24h", () => {
  it("accepts 24-hour HH:MM", () => {
    expect(validateTime24h("14:30")).toBe("14:30");
    expect(validateTime24h("00:00")).toBe("00:00");
    expect(validateTime24h("23:59")).toBe("23:59");
  });

  it("treats empty string as undefined", () => {
    expect(validateTime24h("")).toBeUndefined();
  });

  it("throws on 12-hour with am/pm", () => {
    expect(() => validateTime24h("2pm")).toThrow("Invalid time format");
    expect(() => validateTime24h("4:00 PM")).toThrow("Invalid time format");
  });

  it("throws on out-of-range hours", () => {
    expect(() => validateTime24h("25:00")).toThrow("Invalid time value");
  });

  it("throws on out-of-range minutes", () => {
    expect(() => validateTime24h("12:60")).toThrow("Invalid time value");
  });
});

describe("validateRecurrence", () => {
  it("accepts simple daily", () => {
    expect(validateRecurrence("daily")).toBe("daily");
  });

  it("accepts single-day weekly", () => {
    expect(validateRecurrence("weekly:mon")).toBe("weekly:mon");
    expect(validateRecurrence("weekly:fri")).toBe("weekly:fri");
  });

  it("accepts multi-day weekly", () => {
    expect(validateRecurrence("weekly:mon,wed,fri")).toBe("weekly:mon,wed,fri");
  });

  it("accepts monthly with valid day", () => {
    expect(validateRecurrence("monthly:1")).toBe("monthly:1");
    expect(validateRecurrence("monthly:31")).toBe("monthly:31");
  });

  it("treats empty string as undefined", () => {
    expect(validateRecurrence("")).toBeUndefined();
  });

  it("rejects natural-language recurrence", () => {
    // #given the production-observed "recurring Friday" value
    // #then it's rejected at the boundary
    expect(() => validateRecurrence("recurring Friday")).toThrow(
      "Invalid recurrence",
    );
  });

  it("rejects monthly day out of range", () => {
    expect(() => validateRecurrence("monthly:32")).toThrow(
      "Invalid monthly recurrence day",
    );
    expect(() => validateRecurrence("monthly:0")).toThrow(
      "Invalid monthly recurrence day",
    );
  });

  it("rejects unknown weekday", () => {
    expect(() => validateRecurrence("weekly:funday")).toThrow("Invalid recurrence");
  });
});
