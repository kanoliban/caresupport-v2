import { describe, expect, it } from "vitest";
import { splitIntoBubbles } from "../src/utils/bubbles.js";

describe("splitIntoBubbles", () => {
  it("splits on paragraph boundaries", () => {
    const bubbles = splitIntoBubbles("First paragraph.\n\nSecond paragraph.");
    expect(bubbles).toEqual(["First paragraph.", "Second paragraph."]);
  });

  it("caps at five bubbles", () => {
    const text = Array.from({ length: 8 }, (_, i) => `Paragraph ${i + 1}.`).join("\n\n");
    const bubbles = splitIntoBubbles(text);
    expect(bubbles.length).toBe(5);
  });
});
