import { describe, it, expect } from "vitest";
import {
  parseMarkdownTableRows,
  parseTimelineLogLine,
  parseConversationLogLine,
  parseLessonLine,
} from "../scripts/seed-from-files.js";

describe("parseMarkdownTableRows", () => {
  it("parses medication table", () => {
    const content = `## Active Medications

| Medication | Dose | Schedule | Prescriber | Pharmacy | Last Confirmed | Status | Refill Due |
|---|---|---|---|---|---|---|---|
| Metformin | 500mg | 2x daily | Dr. Negash | Walgreens | 2026-02-20 | active | 2026-03-07 |
| Aspirin | 81mg | 1x daily | Dr. Negash | Walgreens | 2026-02-20 | active | OTC |

### Notes
- Some note`;

    const rows = parseMarkdownTableRows(content, "## Active Medications");
    expect(rows).toHaveLength(2);
    expect(rows[0][0]).toBe("Metformin");
    expect(rows[0][1]).toBe("500mg");
    expect(rows[0][7]).toBe("2026-03-07");
    expect(rows[1][0]).toBe("Aspirin");
    expect(rows[1][7]).toBe("OTC");
  });

  it("stops at non-table content", () => {
    const content = `### Rides
| Day | AM | PM | Notes |
|---|---|---|---|
| Mon | Solan | Liban | |
| Tue | Liban | Yada | |

### Care Tasks
| Day | Time | Task |
|---|---|---|
| Mon | 8 AM | Meds |`;

    const rows = parseMarkdownTableRows(content, "### Rides");
    expect(rows).toHaveLength(2);
    expect(rows[0][0]).toBe("Mon");
    expect(rows[1][1]).toBe("Liban");
  });

  it("returns empty for missing section", () => {
    const content = "## Some Other Section\nno tables here";
    const rows = parseMarkdownTableRows(content, "## Active Medications");
    expect(rows).toHaveLength(0);
  });
});

describe("parseTimelineLogLine", () => {
  it("parses standard timeline entry", () => {
    const line =
      '[2026-03-01 00:00:49 UTC] [INBOUND] [Liban] What happened, it looked like you just cut off?';
    const result = parseTimelineLogLine(line);
    expect(result).not.toBeNull();
    expect(result!.direction).toBe("inbound");
    expect(result!.memberName).toBe("Liban");
    expect(result!.body).toBe(
      "What happened, it looked like you just cut off?",
    );
    expect(result!.timestamp).toBe(
      new Date("2026-03-01T00:00:49Z").getTime(),
    );
  });

  it("parses outbound with full name", () => {
    const line =
      "[2026-02-26 04:00:10 UTC] [OUTBOUND] [Roman Tefera] Hi Roman, I'm CareSupport.";
    const result = parseTimelineLogLine(line);
    expect(result).not.toBeNull();
    expect(result!.direction).toBe("outbound");
    expect(result!.memberName).toBe("Roman Tefera");
  });

  it("returns null for non-matching line", () => {
    expect(parseTimelineLogLine("not a log line")).toBeNull();
    expect(parseTimelineLogLine("")).toBeNull();
  });
});

describe("parseConversationLogLine", () => {
  it("parses standard conversation entry", () => {
    const line =
      "[2026-03-01 00:00:49 UTC] [INBOUND] What happened?";
    const result = parseConversationLogLine(line);
    expect(result).not.toBeNull();
    expect(result!.direction).toBe("inbound");
    expect(result!.body).toBe("What happened?");
    expect(result!.timestamp).toBe(
      new Date("2026-03-01T00:00:49Z").getTime(),
    );
  });

  it("parses outbound", () => {
    const line =
      "[2026-03-01 00:00:54 UTC] [OUTBOUND] I don't see a previous message.";
    const result = parseConversationLogLine(line);
    expect(result).not.toBeNull();
    expect(result!.direction).toBe("outbound");
  });

  it("returns null for non-matching line", () => {
    expect(parseConversationLogLine("random text")).toBeNull();
  });
});

describe("parseLessonLine", () => {
  it("parses standard lesson", () => {
    const line =
      "- [2026-02-26] Liban is Degitu's grandson, not the other way around.";
    const result = parseLessonLine(line);
    expect(result).not.toBeNull();
    expect(result!.date).toBe("2026-02-26");
    expect(result!.text).toBe(
      "Liban is Degitu's grandson, not the other way around.",
    );
  });

  it("returns null for non-lesson lines", () => {
    expect(parseLessonLine("# Lessons")).toBeNull();
    expect(parseLessonLine("<!-- comment -->")).toBeNull();
    expect(parseLessonLine("")).toBeNull();
  });
});
