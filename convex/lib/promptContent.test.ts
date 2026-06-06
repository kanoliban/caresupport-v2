import { describe, expect, it } from "vitest";
import {
  CAPABILITIES_CONTENT,
  MODEL_CONSTITUTION_CONTENT,
  ROUTING_CONTENT,
  SKILLS_CONTENT,
  SOUL_CONTENT,
} from "./promptContent";

describe("SOUL_CONTENT", () => {
  it("does not reference inactive v1 lookup tools", () => {
    expect(SOUL_CONTENT).not.toContain("search_context");
    expect(SOUL_CONTENT).not.toContain("read_member");
    expect(SOUL_CONTENT).not.toContain("check_schedule");
  });

  it("frames the product as a family care agent in the first-thread runtime", () => {
    expect(SOUL_CONTENT).toContain("family care assistant starting in one trusted text thread");
    expect(CAPABILITIES_CONTENT).toContain("one trusted user, one care situation, one thread");
    expect(CAPABILITIES_CONTENT).toContain("CareSupport is free during the concierge beta");
  });

  it("makes the model emotionally and cognitively intelligent without forcing every turn into care tracking", () => {
    expect(SOUL_CONTENT).toContain("Respond to that need first");
    expect(SOUL_CONTENT).toContain("ordinary conversation");
    expect(SOUL_CONTENT).toContain("emotionally and cognitively intelligent");
    expect(SOUL_CONTENT).toContain("Do not force every message into a care workflow");
  });

  it("defines the CareSupport model as graph, state machine, and record", () => {
    expect(MODEL_CONSTITUTION_CONTENT).toContain("CareSupport Model Constitution");
    expect(MODEL_CONSTITUTION_CONTENT).toContain("Relationship graph");
    expect(MODEL_CONSTITUTION_CONTENT).toContain("Coordination state machine");
    expect(MODEL_CONSTITUTION_CONTENT).toContain("Time-sequenced operational record");
    expect(MODEL_CONSTITUTION_CONTENT).toContain(
      "A Rob-like care network is the launch stress test",
    );
  });

  it("keeps permission and truthfulness in the runtime doctrine", () => {
    expect(MODEL_CONSTITUTION_CONTENT).toContain(
      "runtime code owns permission, execution, routing, persistence, audit, and truthfulness",
    );
    expect(MODEL_CONSTITUTION_CONTENT).toContain(
      "Never contact another person unless the primary coordinator approved",
    );
    expect(MODEL_CONSTITUTION_CONTENT).toContain(
      "Never claim a save, contact, confirmation, schedule, or completed action",
    );
    expect(MODEL_CONSTITUTION_CONTENT).toContain(
      "Treat careClaims as what CareSupport heard or inferred, not as confirmed truth",
    );
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

  it("sets a high bar for 988 / crisis-line referrals", () => {
    // #given the SOUL_CONTENT CRISIS SENSITIVITY block
    // #then 988 is gated on explicit harm intent, not single ambiguous words
    expect(SOUL_CONTENT).toContain("CRISIS SENSITIVITY:");
    expect(SOUL_CONTENT).toContain(
      "ONLY when the user states explicit, first-person intent to hurt themselves",
    );
    expect(SOUL_CONTENT).toContain("\"cutters\"");
    expect(SOUL_CONTENT).toContain("ask ONE calibrating question");
  });

  it("allows normal conversation without saving unrelated content as care context", () => {
    // #given the SKILLS_CONTENT conversational range block
    // #then it allows non-care conversation while blocking unrelated structured saves
    expect(SKILLS_CONTENT).toContain("## Conversational range and scope");
    expect(SKILLS_CONTENT).toContain("respond naturally to the current need");
    expect(SKILLS_CONTENT).toContain(
      "Do not force every message into tracking",
    );
    expect(SKILLS_CONTENT).toContain(
      "do not pretend it is care context",
    );
  });

  it("teaches the model to draft messages the user can copy-paste", () => {
    // #given SKILLS_CONTENT
    // #then it includes guidance for drafting third-party messages
    expect(SKILLS_CONTENT).toContain("## Drafting messages for the user to send");
    expect(SKILLS_CONTENT).toContain("write the draft inline in your reply");
    expect(SKILLS_CONTENT).toContain("do NOT wrap the draft in quote marks");
    expect(SKILLS_CONTENT).toContain("Want me to adjust the tone or length?");
    expect(SKILLS_CONTENT).toContain("You never send the message yourself");
  });

  it("keeps third-party coordination as a current runtime boundary, not a product non-goal", () => {
    expect(SKILLS_CONTENT).toContain("## Current coordination boundary");
    expect(SKILLS_CONTENT).toContain("use care_contact_updates");
    expect(SKILLS_CONTENT).toContain(
      "outreach_requests are proposed until approved",
    );
    expect(SKILLS_CONTENT).toContain("Do not imply multiplayer coordination is outside CareSupport's purpose");
  });

  it("defines approval as specific, not blanket permission", () => {
    expect(SKILLS_CONTENT).toContain("## Primary coordinator approval");
    expect(SKILLS_CONTENT).toContain(
      "one exact outreach message to one exact contact",
    );
    expect(SKILLS_CONTENT).toContain("It does NOT mean global permission");
    expect(SKILLS_CONTENT).toContain("caregiver account creation");
  });

  it("defines caregiver micro-onboarding as one-to-one text, not app signup", () => {
    expect(SKILLS_CONTENT).toContain("## Caregiver micro-onboarding");
    expect(SKILLS_CONTENT).toContain("Caregivers do not need the app");
    expect(SKILLS_CONTENT).toContain("identify CareSupport");
    expect(SKILLS_CONTENT).toContain("ask whether this is a good number to text");
  });

  it("teaches care contact reply handling without false confirmations", () => {
    expect(SKILLS_CONTENT).toContain("## Care contact replies");
    expect(SKILLS_CONTENT).toContain("do not treat them as the primary coordinator");
    expect(SKILLS_CONTENT).toContain("Partial availability is not confirmation");
    expect(SKILLS_CONTENT).toContain("wrong number, stop texting, unsubscribe");
  });

  it("instructs the model to extract all onboarding slots from one message when possible", () => {
    // #given the SKILLS_CONTENT Onboarding block
    // #then it tells the model to extract multiple slots at once
    expect(SKILLS_CONTENT).toContain(
      "EXTRACT ALL THREE FROM A SINGLE MESSAGE WHEN POSSIBLE",
    );
    expect(SKILLS_CONTENT).toContain(
      "Do not re-ask for slots the user already gave",
    );
  });

  it("tells the model to flip care case status to active once onboarding slots are filled", () => {
    // #given the prompt contents
    // #then both ROUTING and SKILLS reflect the slot→active transition
    expect(SKILLS_CONTENT).toContain(
      'set care_case_profile_update.status = "active"',
    );
    expect(SKILLS_CONTENT).toContain(
      "do not ask onboarding-style questions again",
    );
  });

  it("excludes the 'New User' placeholder from being treated as a real name in routing", () => {
    // #given the ROUTING_CONTENT
    // #then the placeholder is explicitly called out so the agent doesn't think onboarding is done
    expect(ROUTING_CONTENT).toContain('the user\'s name (not "New User" placeholder)');
  });
});
