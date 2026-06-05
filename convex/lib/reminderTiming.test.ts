import { describe, expect, it } from "vitest";
import { computeReminderFireAt } from "./reminderTiming";

const MIN = 60 * 1000;
const NOW = 1_000_000_000_000;

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
