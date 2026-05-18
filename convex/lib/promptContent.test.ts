import { describe, expect, it } from "vitest";
import { CAPABILITIES_CONTENT, SKILLS_CONTENT, SOUL_CONTENT } from "./promptContent";

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

  it("tells the model not to save inferred emotional summaries as durable memory", () => {
    expect(SKILLS_CONTENT).toContain(
      "Do not save inferred emotional summaries or support instructions as durable memory by default.",
    );
  });

  it("demotes saving from a default behavior to a conditional one in YOUR JOB", () => {
    // #given the SOUL_CONTENT "YOUR JOB" section
    // #then saving is conditional, not the default close-out
    expect(SOUL_CONTENT).toContain(
      "Understand what the user needs THIS turn",
    );
    expect(SOUL_CONTENT).toContain(
      "Save durable facts ONLY when",
    );
    expect(SOUL_CONTENT).toContain(
      "Do not propose saving brainstormed ideas",
    );
  });

  it("defines explicit conversation modes for the model to pick from", () => {
    // #given SKILLS_CONTENT
    // #then it lists each mode with a distinct close-out
    expect(SKILLS_CONTENT).toContain("## Conversation modes");
    expect(SKILLS_CONTENT).toContain("INFO mode");
    expect(SKILLS_CONTENT).toContain("QUERY mode");
    expect(SKILLS_CONTENT).toContain("IDEAS mode");
    expect(SKILLS_CONTENT).toContain("REFLECTION mode");
    expect(SKILLS_CONTENT).toContain("CORRECTION mode");
    expect(SKILLS_CONTENT).toContain(
      "Close with \"want more, or pick one to try?\"",
    );
  });

  it("places conversation modes before durable-memory operational detail", () => {
    // #given the order of sections in SKILLS_CONTENT
    // #then conversation modes appear earlier than durable memory
    const modesIdx = SKILLS_CONTENT.indexOf("## Conversation modes");
    const memoryIdx = SKILLS_CONTENT.indexOf("## Durable memory");
    expect(modesIdx).toBeGreaterThan(-1);
    expect(memoryIdx).toBeGreaterThan(modesIdx);
  });
});
