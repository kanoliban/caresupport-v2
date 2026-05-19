import { describe, expect, it } from "vitest";
import {
  formatLessonsBlock,
  isNearDuplicateMemoryContent,
  normalizeMemoryCategory,
  shouldPersistMemoryUpdate,
  uniqueMemoryUpdates,
} from "./memory";

describe("formatLessonsBlock", () => {
  it("returns an empty string when there are no lessons", () => {
    expect(formatLessonsBlock([])).toBe("");
  });

  it("emits a visible header so the model treats lessons as memory, not house rules", () => {
    const result = formatLessonsBlock([
      "[behavioral] Ask Angela before Marcus for evening coverage",
      "[factual] Baclofen refill is from CVS, not Walgreens",
    ]);

    expect(result.startsWith("── THINGS YOU'VE LEARNED ABOUT THIS FAMILY ──")).toBe(true);
    expect(result).toContain(
      "- [behavioral] Ask Angela before Marcus for evening coverage",
    );
    expect(result).toContain("- [factual] Baclofen refill is from CVS, not Walgreens");
  });
});

describe("normalizeMemoryCategory", () => {
  it("passes through valid categories", () => {
    for (const category of [
      "profile",
      "communication_preference",
      "care_preference",
      "care_note",
      "lesson",
    ] as const) {
      expect(normalizeMemoryCategory(category)).toBe(category);
    }
  });

  it("falls back to care_note for unknown or missing categories", () => {
    expect(normalizeMemoryCategory(undefined)).toBe("care_note");
    expect(normalizeMemoryCategory("garbage")).toBe("care_note");
  });
});

describe("uniqueMemoryUpdates", () => {
  it("dedupes by normalized category + content", () => {
    const result = uniqueMemoryUpdates([
      { category: "care_note", content: "Sam uses a cane." },
      { category: "care_note", content: "  sam uses a cane.  " },
      { category: "care_preference", content: "Sam uses a cane." },
    ]);

    // First two collapse (same category + case-insensitive content).
    // Third stays — different category.
    expect(result).toHaveLength(2);
  });
});

describe("isNearDuplicateMemoryContent", () => {
  it("matches case-insensitively", () => {
    expect(
      isNearDuplicateMemoryContent("Marcus works nights", "marcus works nights"),
    ).toBe(true);
  });

  it("matches substrings", () => {
    expect(
      isNearDuplicateMemoryContent(
        "Marcus works nights and should not be asked first for evenings",
        "Marcus works nights",
      ),
    ).toBe(true);
  });

  it("does not match unrelated content", () => {
    expect(
      isNearDuplicateMemoryContent(
        "Angela usually covers evenings",
        "Refill baclofen on Friday",
      ),
    ).toBe(false);
  });
});

describe("shouldPersistMemoryUpdate", () => {
  it("rejects inferred emotional-support care_notes", () => {
    expect(
      shouldPersistMemoryUpdate(
        {
          category: "care_note",
          content: "User expressed feeling overwhelmed and isolated",
        },
        [],
      ),
    ).toBe(false);
  });

  it("rejects duplicates of existing active entries", () => {
    expect(
      shouldPersistMemoryUpdate(
        { category: "care_note", content: "Sam uses a cane." },
        [
          {
            scope: "care_case",
            category: "care_note",
            content: "Sam uses a cane.",
            active: true,
          },
        ],
      ),
    ).toBe(false);
  });

  it("accepts genuinely new care facts", () => {
    expect(
      shouldPersistMemoryUpdate(
        { category: "care_note", content: "Sam's PT is on Tuesdays at 10am" },
        [],
      ),
    ).toBe(true);
  });
});
