import { describe, expect, it } from "vitest";
import { buildRecurrenceRule, toSeriesEventId } from "./googleCalendar";

describe("buildRecurrenceRule", () => {
  it("maps keywords to RRULEs", () => {
    expect(buildRecurrenceRule("daily")).toEqual(["RRULE:FREQ=DAILY"]);
    expect(buildRecurrenceRule("weekly")).toEqual(["RRULE:FREQ=WEEKLY"]);
    expect(buildRecurrenceRule("biweekly")).toEqual([
      "RRULE:FREQ=WEEKLY;INTERVAL=2",
    ]);
    expect(buildRecurrenceRule("weekdays")).toEqual([
      "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
    ]);
    expect(buildRecurrenceRule("monthly")).toEqual(["RRULE:FREQ=MONTHLY"]);
    expect(buildRecurrenceRule("yearly")).toEqual(["RRULE:FREQ=YEARLY"]);
  });

  it("is case/whitespace tolerant", () => {
    expect(buildRecurrenceRule("  Weekly ")).toEqual(["RRULE:FREQ=WEEKLY"]);
  });

  it("returns undefined for one-off / unknown values", () => {
    expect(buildRecurrenceRule(undefined)).toBeUndefined();
    expect(buildRecurrenceRule("none")).toBeUndefined();
    expect(buildRecurrenceRule("once")).toBeUndefined();
    expect(buildRecurrenceRule("")).toBeUndefined();
  });
});

describe("toSeriesEventId", () => {
  it("strips a Google instance suffix to target the series", () => {
    expect(toSeriesEventId("abc123_20260605T193000Z")).toBe("abc123");
  });

  it("leaves a plain (non-recurring) event id untouched", () => {
    expect(toSeriesEventId("abc123")).toBe("abc123");
  });
});
