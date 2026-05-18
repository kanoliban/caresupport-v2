import { describe, expect, it } from "vitest";
import {
  composeDigestMessage,
  formatTimeForDisplay,
  localDateIso,
  recurrenceMatchesToday,
} from "./digestComposer";

describe("composeDigestMessage", () => {
  it("renders a clean digest for a single item", () => {
    // #given a user with one scheduled item today
    // #when the digest is composed
    const message = composeDigestMessage({
      userName: "Sean",
      items: [{ title: "Music playlist for Jim", time: "10:00" }],
    });

    // #then it greets, lists, and closes — three short paragraphs
    expect(message).toBe(
      "Good morning, Sean.\n\nToday: Music playlist for Jim at 10 AM.\n\nText me if anything changes.",
    );
  });

  it("joins multiple items with semicolons", () => {
    const message = composeDigestMessage({
      userName: "Rob",
      items: [
        { title: "Dr. Parke", time: "07:20", location: "Centennial Lakes" },
        { title: "Pick up Vivian shift" },
      ],
    });

    expect(message).toContain(
      "Today: Dr. Parke at 7:20 AM (Centennial Lakes); Pick up Vivian shift.",
    );
  });

  it("throws when called with zero items so caller skips empty sends", () => {
    // #given nothing scheduled today
    // #then composer refuses to render — caller must skip
    expect(() =>
      composeDigestMessage({ userName: "Sean", items: [] }),
    ).toThrow("zero items");
  });
});

describe("formatTimeForDisplay", () => {
  it("formats 24h time as 12h", () => {
    expect(formatTimeForDisplay("07:20")).toBe("7:20 AM");
    expect(formatTimeForDisplay("12:00")).toBe("12 PM");
    expect(formatTimeForDisplay("15:30")).toBe("3:30 PM");
    expect(formatTimeForDisplay("00:00")).toBe("12 AM");
  });

  it("hides :00 minutes for clean display", () => {
    expect(formatTimeForDisplay("09:00")).toBe("9 AM");
    expect(formatTimeForDisplay("20:00")).toBe("8 PM");
  });

  it("returns the input unchanged for unparseable times", () => {
    expect(formatTimeForDisplay("bad")).toBe("bad");
  });
});

describe("recurrenceMatchesToday", () => {
  it("matches 'daily' on any date", () => {
    expect(recurrenceMatchesToday("daily", "2026-05-15")).toBe(true);
    expect(recurrenceMatchesToday("daily", "2026-12-31")).toBe(true);
  });

  it("matches weekly:<day> only on matching weekdays", () => {
    // 2026-05-15 is a Friday
    expect(recurrenceMatchesToday("weekly:fri", "2026-05-15")).toBe(true);
    expect(recurrenceMatchesToday("weekly:mon", "2026-05-15")).toBe(false);
  });

  it("matches weekly:<a,b,c> when today is any listed day", () => {
    // 2026-05-15 = Friday
    expect(recurrenceMatchesToday("weekly:mon,wed,fri", "2026-05-15")).toBe(true);
    expect(recurrenceMatchesToday("weekly:tue,thu,sat", "2026-05-15")).toBe(false);
  });

  it("matches monthly:<day> when today's day-of-month matches", () => {
    expect(recurrenceMatchesToday("monthly:15", "2026-05-15")).toBe(true);
    expect(recurrenceMatchesToday("monthly:15", "2026-05-16")).toBe(false);
  });

  it("returns false on unknown recurrence formats", () => {
    expect(recurrenceMatchesToday("yearly", "2026-05-15")).toBe(false);
    expect(recurrenceMatchesToday("weekly:funday", "2026-05-15")).toBe(false);
  });
});

describe("localDateIso", () => {
  it("returns ISO date in the given timezone", () => {
    // #given midnight UTC on May 15
    const midnightUtc = new Date("2026-05-15T00:00:00Z").getTime();

    // #then America/Chicago (UTC-5 or UTC-6) sees May 14 still
    const chicago = localDateIso(midnightUtc, "America/Chicago");
    expect(chicago).toBe("2026-05-14");

    // #then UTC sees May 15
    expect(localDateIso(midnightUtc, "UTC")).toBe("2026-05-15");
  });

  it("falls back to UTC ISO on invalid timezone", () => {
    const ts = new Date("2026-05-15T12:00:00Z").getTime();
    expect(localDateIso(ts, "Not/A_Real_Zone")).toBe("2026-05-15");
  });
});
