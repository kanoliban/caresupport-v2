import { describe, expect, it } from "vitest";
import { SOUL_CONTENT } from "./promptContent";

describe("SOUL_CONTENT", () => {
  it("does not reference inactive v1 lookup tools", () => {
    expect(SOUL_CONTENT).not.toContain("search_context");
    expect(SOUL_CONTENT).not.toContain("read_member");
    expect(SOUL_CONTENT).not.toContain("check_schedule");
  });

  it("tells the agent to rely on assembled context instead of lookups", () => {
    expect(SOUL_CONTENT).toContain("primary source of truth");
    expect(SOUL_CONTENT).toContain("member-specific context");
    expect(SOUL_CONTENT).toContain("don't have it yet");
  });
});
