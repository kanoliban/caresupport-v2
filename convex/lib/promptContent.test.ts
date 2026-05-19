import { describe, expect, it } from "vitest";
import {
  CAPABILITIES_CONTENT,
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

  it("frames the product as a family care assistant currently in a solo wedge", () => {
    // #given the SOUL_CONTENT identity opener
    // #then it names the family-care-assistant identity
    expect(SOUL_CONTENT).toContain("family care assistant");
    // #and acknowledges the current solo conversation as the first relationship
    expect(SOUL_CONTENT).toContain("one person managing one loved one's care");
    expect(SOUL_CONTENT).toContain("first relationship");
    // #and the operational rules still hold
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

  it("forbids promising future actions the system cannot deliver but acknowledges the daily digest", () => {
    // #given the SOUL TRUTHFULNESS section
    // #then it still rejects fake forward-promises
    expect(SOUL_CONTENT).toContain(
      "Never promise a future action you cannot guarantee.",
    );

    // #and it acknowledges the one push that actually fires
    expect(SOUL_CONTENT).toContain("daily morning digest");

    // #but still names the limit on arbitrary timed pushes
    expect(SOUL_CONTENT).toContain(
      "cannot fire arbitrary one-off pushes",
    );

    // #and it no longer carries the blanket denial of timed reminders
    expect(SOUL_CONTENT).not.toContain(
      "You cannot send timed reminders, push notifications, or follow-up messages on your own",
    );
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

  it("rejects tracking clearly out-of-scope content as care items", () => {
    // #given the SKILLS_CONTENT Scope check block
    // #then it explicitly redirects firearms/hobbies/work content
    expect(SKILLS_CONTENT).toContain("## Scope check");
    expect(SKILLS_CONTENT).toContain("firearms");
    expect(SKILLS_CONTENT).toContain(
      "do NOT offer to \"track\" it as a care item",
    );
    expect(SKILLS_CONTENT).toContain(
      "Do not save scheduleItems, medications, or memory entries",
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

  it("teaches the knowledge-disclosure phrasings with an in-flow invocation rule, not a dashboard", () => {
    // #given SKILLS_CONTENT Knowledge disclosure section
    expect(SKILLS_CONTENT).toContain("## Knowledge disclosure");

    // #then the seven action-time phrasings are taught
    expect(SKILLS_CONTENT).toContain('"I have…"');
    expect(SKILLS_CONTENT).toContain('"I know…"');
    expect(SKILLS_CONTENT).toContain('"I don\'t have…"');
    expect(SKILLS_CONTENT).toContain('"I\'m assuming…"');
    expect(SKILLS_CONTENT).toContain('"Correct me if…"');
    expect(SKILLS_CONTENT).toContain('"Here\'s what I\'m using…"');
    expect(SKILLS_CONTENT).toContain('"Still open…"');

    // #and the invocation rule says NOT to recite on every turn
    expect(SKILLS_CONTENT).toContain("do NOT recite on every turn");
  });

  it("answers meta commands without exposing memory as a database", () => {
    // #given SKILLS_CONTENT Meta commands section
    expect(SKILLS_CONTENT).toContain("## Meta commands");

    // #then the canonical meta questions are named
    expect(SKILLS_CONTENT).toContain("what do you know?");
    expect(SKILLS_CONTENT).toContain("what are you tracking?");
    expect(SKILLS_CONTENT).toContain("what do you need from me?");
    expect(SKILLS_CONTENT).toContain('"why did you do X?"');

    // #and the answer style is "calm operational picture, not transparency for its own sake"
    expect(SKILLS_CONTENT).toContain("calm operational picture");
    expect(SKILLS_CONTENT).toContain("NOT a dump of every memory");
  });
});
