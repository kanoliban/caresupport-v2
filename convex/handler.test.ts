import { describe, expect, it } from "vitest";
import { parseCategory, formatConversationLog } from "./handler";

// ─── parseCategory ──────────────────────────────────────────────────────

describe("parseCategory", () => {
  it("extracts behavioral prefix", () => {
    // #given
    const text = "[behavioral] Don't ask about medications";
    // #when
    const result = parseCategory(text);
    // #then
    expect(result.category).toBe("behavioral");
    expect(result.cleanText).toBe("Don't ask about medications");
  });

  it("extracts factual prefix (case-insensitive)", () => {
    // #given
    const text = "[Factual] Rob's preferred pharmacy is CVS";
    // #when
    const result = parseCategory(text);
    // #then
    expect(result.category).toBe("factual");
    expect(result.cleanText).toBe("Rob's preferred pharmacy is CVS");
  });

  it("extracts operational prefix", () => {
    // #given
    const text = "[operational] Always check schedule before suggesting times";
    // #when
    const result = parseCategory(text);
    // #then
    expect(result.category).toBe("operational");
    expect(result.cleanText).toBe("Always check schedule before suggesting times");
  });

  it("defaults to behavioral when no prefix", () => {
    // #given
    const text = "Remember to be gentle about this topic";
    // #when
    const result = parseCategory(text);
    // #then
    expect(result.category).toBe("behavioral");
    expect(result.cleanText).toBe("Remember to be gentle about this topic");
  });

  it("ignores invalid category prefix", () => {
    // #given
    const text = "[medical] Some note";
    // #when
    const result = parseCategory(text);
    // #then
    expect(result.category).toBe("behavioral");
    expect(result.cleanText).toBe("[medical] Some note");
  });

  it("handles empty string", () => {
    // #given / #when
    const result = parseCategory("");
    // #then
    expect(result.category).toBe("behavioral");
    expect(result.cleanText).toBe("");
  });
});

// ─── formatConversationLog ──────────────────────────────────────────────

describe("formatConversationLog", () => {
  it("returns placeholder for empty records", () => {
    // #given / #when
    const result = formatConversationLog([]);
    // #then
    expect(result).toBe("[No conversation history]");
  });

  it("formats single inbound record", () => {
    // #given
    const records = [
      {
        direction: "inbound" as const,
        body: "Hello there",
        timestamp: new Date("2025-03-01T14:30:00Z").getTime(),
      },
    ];
    // #when
    const result = formatConversationLog(records);
    // #then
    expect(result).toContain("[INBOUND]");
    expect(result).toContain("Hello there");
    expect(result).toContain("2025-03-01 14:30:00 UTC");
  });

  it("formats multiple records in order", () => {
    // #given
    const records = [
      {
        direction: "inbound" as const,
        body: "First message",
        timestamp: new Date("2025-03-01T10:00:00Z").getTime(),
      },
      {
        direction: "outbound" as const,
        body: "Response here",
        timestamp: new Date("2025-03-01T10:01:00Z").getTime(),
      },
    ];
    // #when
    const result = formatConversationLog(records);
    // #then
    const lines = result.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("[INBOUND]");
    expect(lines[0]).toContain("First message");
    expect(lines[1]).toContain("[OUTBOUND]");
    expect(lines[1]).toContain("Response here");
  });

  it("formats timestamp as ISO-style UTC", () => {
    // #given
    const records = [
      {
        direction: "outbound" as const,
        body: "test",
        timestamp: new Date("2025-12-25T23:59:59Z").getTime(),
      },
    ];
    // #when
    const result = formatConversationLog(records);
    // #then
    expect(result).toMatch(/\[2025-12-25 23:59:59 UTC\]/);
  });
});
