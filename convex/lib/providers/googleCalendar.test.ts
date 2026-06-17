// 2026-06-17: Unit coverage for Google Calendar helpers, including OAuth scopes, account discovery, and duplicate event detection.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildOAuthUrl,
  buildRecurrenceRule,
  fetchPrimaryCalendarProfile,
  findLikelyDuplicateCalendarEvent,
  isLikelyDuplicateCalendarEvent,
  toSeriesEventId,
} from "./googleCalendar";

afterEach(() => {
  vi.restoreAllMocks();
});

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

describe("buildOAuthUrl", () => {
  it("requests calendar and account identity scopes", () => {
    const url = new URL(buildOAuthUrl("client", "https://example.com/callback", "user-1"));
    const scope = url.searchParams.get("scope") ?? "";

    expect(scope).toContain("https://www.googleapis.com/auth/calendar");
    expect(scope).toContain("https://www.googleapis.com/auth/userinfo.email");
    expect(scope).toContain("https://www.googleapis.com/auth/userinfo.profile");
  });
});

describe("fetchPrimaryCalendarProfile", () => {
  it("derives the linked email from the primary calendar id", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: "liban@example.com", summary: "Liban Kano" }),
    })));

    await expect(fetchPrimaryCalendarProfile("token")).resolves.toEqual({
      email: "liban@example.com",
      name: "Liban Kano",
    });
  });

  it("returns null when the primary calendar cannot be read", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })));

    await expect(fetchPrimaryCalendarProfile("token")).resolves.toBeNull();
  });
});

describe("calendar duplicate matching", () => {
  const existing = {
    id: "event-1",
    summary: "Degitu - Mayo Clinic Appointment",
    location: "Mayo Clinic",
    start: { dateTime: "2026-06-25T15:00:00-05:00", timeZone: "America/Chicago" },
    end: { dateTime: "2026-06-25T15:00:00-05:00", timeZone: "America/Chicago" },
  };

  it("matches the same appointment on the same date and time", () => {
    expect(
      isLikelyDuplicateCalendarEvent(existing, {
        title: "Mayo Clinic appointment",
        date: "2026-06-25",
        startTime: "15:00",
      }),
    ).toBe(true);
  });

  it("does not match the same appointment at a different explicit time", () => {
    expect(
      isLikelyDuplicateCalendarEvent(existing, {
        title: "Mayo Clinic appointment",
        date: "2026-06-25",
        startTime: "16:00",
      }),
    ).toBe(false);
  });

  it("finds the duplicate event from a list", () => {
    expect(
      findLikelyDuplicateCalendarEvent([existing], {
        title: "Mayo Clinic appointment",
        date: "2026-06-25",
        startTime: "15:00",
      })?.id,
    ).toBe("event-1");
  });
});
