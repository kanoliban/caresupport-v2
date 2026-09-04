import { describe, expect, it } from "vitest";
import {
  dailyDigestDedupeKey,
  fingerprintContent,
  scheduleReminderDedupeKey,
} from "./notificationDedupe";

describe("fingerprintContent", () => {
  it("matches for identical content — the case that repeated for three days", () => {
    const brief = "Good morning, Rob.\n\nToday: Insulin at 8 AM.\n\nText me if anything changes.";
    expect(fingerprintContent(brief)).toBe(fingerprintContent(brief));
  });

  it("ignores incidental whitespace differences", () => {
    expect(fingerprintContent("Today:  insulin at 8 AM ")).toBe(
      fingerprintContent("Today: insulin at 8 AM"),
    );
  });

  it("differs when the brief actually changes", () => {
    expect(fingerprintContent("Today: Insulin at 8 AM.")).not.toBe(
      fingerprintContent("Today: Insulin at 8 AM; PT at 2 PM."),
    );
  });

  it("is stable across calls and fixed-width", () => {
    const fingerprint = fingerprintContent("anything");
    expect(fingerprint).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe("dedupe keys", () => {
  it("gives one key per care case per local day", () => {
    expect(dailyDigestDedupeKey("case_1", "2026-09-04")).toBe(
      dailyDigestDedupeKey("case_1", "2026-09-04"),
    );
    expect(dailyDigestDedupeKey("case_1", "2026-09-04")).not.toBe(
      dailyDigestDedupeKey("case_1", "2026-09-05"),
    );
    expect(dailyDigestDedupeKey("case_1", "2026-09-04")).not.toBe(
      dailyDigestDedupeKey("case_2", "2026-09-04"),
    );
  });

  it("gives a schedule reminder a new key when the item is moved", () => {
    expect(scheduleReminderDedupeKey("item_1", 1000)).not.toBe(
      scheduleReminderDedupeKey("item_1", 2000),
    );
  });
});
