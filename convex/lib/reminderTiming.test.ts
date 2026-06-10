import { describe, expect, it } from "vitest";
import { computeReminderFireAt, zonedDateTimeToUtcMs } from "./reminderTiming";

const MIN = 60 * 1000;
const NOW = 1_000_000_000_000;

describe("zonedDateTimeToUtcMs", () => {
  it("converts a Denver wall-clock time to the right UTC instant", () => {
    // #given 3:00 PM on 2026-06-06 in Denver (MDT, UTC-6 in summer)
    const ms = zonedDateTimeToUtcMs("2026-06-06", "15:00", "America/Denver");

    // #then it equals 21:00 UTC
    expect(ms).toBe(Date.parse("2026-06-06T21:00:00Z"));
  });

  it("treats a UTC zone as a direct mapping", () => {
    const ms = zonedDateTimeToUtcMs("2026-06-06", "09:30", "UTC");
    expect(ms).toBe(Date.parse("2026-06-06T09:30:00Z"));
  });

  it("returns null for missing or malformed input", () => {
    expect(zonedDateTimeToUtcMs(undefined, "15:00", "UTC")).toBeNull();
    expect(zonedDateTimeToUtcMs("2026-06-06", undefined, "UTC")).toBeNull();
    expect(zonedDateTimeToUtcMs("not-a-date", "15:00", "UTC")).toBeNull();
  });
});

describe("computeReminderFireAt", () => {
  it("test env fires 1 minute before (5-min-out event)", () => {
    const start = NOW + 5 * MIN;
    expect(computeReminderFireAt(start, NOW, true)).toBe(start - 1 * MIN);
  });

  it("prod: far-future event fires 30 minutes before", () => {
    const start = NOW + 24 * 60 * MIN; // tomorrow-ish
    expect(computeReminderFireAt(start, NOW, false)).toBe(start - 30 * MIN);
  });

  it("prod: 25-min-out event fires 15 minutes before", () => {
    const start = NOW + 25 * MIN;
    expect(computeReminderFireAt(start, NOW, false)).toBe(start - 15 * MIN);
  });

  it("prod: 10-min-out event fires 5 minutes before", () => {
    const start = NOW + 10 * MIN;
    expect(computeReminderFireAt(start, NOW, false)).toBe(start - 5 * MIN);
  });

  it("prod: 4-min-out event fires 1 minute before", () => {
    const start = NOW + 4 * MIN;
    expect(computeReminderFireAt(start, NOW, false)).toBe(start - 1 * MIN);
  });

  it("skips events under 2 minutes away", () => {
    expect(computeReminderFireAt(NOW + 90 * 1000, NOW, false)).toBeNull();
    expect(computeReminderFireAt(NOW + 90 * 1000, NOW, true)).toBeNull();
  });

  it("skips events already in the past", () => {
    expect(computeReminderFireAt(NOW - 5 * MIN, NOW, false)).toBeNull();
  });

  it("clamps to near-now when lead exceeds remaining time (boundary)", () => {
    // 45 min out → 30 min lead → fires at +15 min (still future, not clamped)
    const start = NOW + 45 * MIN;
    expect(computeReminderFireAt(start, NOW, false)).toBe(start - 30 * MIN);
  });
});
