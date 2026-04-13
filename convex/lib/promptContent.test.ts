import { describe, expect, it } from "vitest";
import { CAPABILITIES_CONTENT, SOUL_CONTENT } from "./promptContent";

describe("SOUL_CONTENT", () => {
  it("does not reference inactive v1 lookup tools", () => {
    expect(SOUL_CONTENT).not.toContain("search_context");
    expect(SOUL_CONTENT).not.toContain("read_member");
    expect(SOUL_CONTENT).not.toContain("check_schedule");
  });

  it("frames the product as a solo care planning assistant", () => {
    expect(SOUL_CONTENT).toContain("one person manage one loved one's care");
    expect(CAPABILITIES_CONTENT).toContain("one user, one loved one, one thread");
    expect(CAPABILITIES_CONTENT).toContain("CareSupport is free during the concierge beta");
  });
});
