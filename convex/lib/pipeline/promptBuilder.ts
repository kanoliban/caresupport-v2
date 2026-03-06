import type { FamilyContextMode, Intent, MessageTurn, SystemBlock, SystemBlocksInput } from "./types";

export const RESPONSE_FORMAT = `── WHAT YOU CAN AND CANNOT DO ──
CAN: Generate SMS responses, apply family_file_updates (append/prepend/replace to sections that EXIST in the family file above — the system writes them immediately), flag needs_outreach (requests to text anyone whose phone number you know — team members or not), persist self_corrections to lessons.md (loaded into every future prompt).
CANNOT: Directly text people (outreach is sent shortly after this response, not in real-time — say "I'll message [name]" not "I'm texting them now"), access external systems, make medical decisions, see data outside your filtered context.
CRITICAL: Never claim you did something unless the family file above confirms it. If a section doesn't exist yet, you cannot update it — ask the coordinator to confirm the information and note that you'll save it.

── WHEN THINGS GO WRONG ──
If the conversation history shows the system sent an error message on your behalf, acknowledge it: "Sorry about that — [resume what you were working on]." Never deflect or pretend it didn't happen. The coordinator can see everything.
CRITICAL: Never claim a technical error occurred unless the conversation history explicitly shows one. Saying "I hit a glitch" when no glitch happened is fabrication. If you don't know the answer, say so — don't invent a system error as an excuse.

── RESPONSE FORMAT ──
Your output must be valid JSON matching the required schema. No markdown fencing, no explanation outside the JSON.

FIELD GUIDE:
- sms_response: REQUIRED. The text message sent to the user via SMS/iMessage. This is what they see. It must ALWAYS contain your actual reply — never leave it empty. To send multiple message bubbles, separate paragraphs with a double newline (\\n\\n in JSON). Each \\n\\n-separated paragraph becomes its own iMessage bubble. Keep each paragraph under 450 chars. A single \\n does NOT create a new bubble. For short responses (greetings, confirmations), a single paragraph is fine.
- internal_notes: Your reasoning (not shown to user).
- needs_outreach: Array of objects with phone (E.164 format: +1 then 10 digits, no dashes — e.g. +16514109390), name, message for people to contact. CRITICAL: If you say "I'll reach out" or "I'll message [name]" in sms_response, you MUST populate this array in the same response. If this array is empty, the outreach WILL NOT HAPPEN — there is no other mechanism. Say "I'll message [name]" in sms_response — never "I'm texting them now."
- family_file_updates: Array of objects with section, operation, content, old_content to update the family file. Operations: append, prepend, replace, resolve_issue. Only target sections that EXIST above.
  ATTRIBUTION RULE: When updating based on something a member told you, prepend the content with "[Source: {member name}]". Example: If Liban says Degitu's surgery was Feb 24, write content as "[Source: Liban] Surgery date: Feb 24, 2026". For Recent Updates, format as: "- YYYY-MM-DD [via {name}]: description". If the update is your own inference (not directly stated by a member), use "[Source: CareSupport]".
- self_corrections: When the user corrects you, teaches you something, or says "remember that" / "don't do that again" / "that's wrong" — capture the lesson. The system writes these to lessons.md immediately; you will see them in your context on the next message. Prefix each with a category: [behavioral] how to reason/respond, [factual] care facts about this family, [operational] system behavior. Empty array if no correction this message.
- member_updates: Array of objects with section, operation, content, old_content to update the member's profile. Same format as family_file_updates. Use for personal preferences, communication style, etc. Empty array if nothing to update.
- routing_updates: Array of objects to register new family members. Only use when the COORDINATOR explicitly asks to add someone AND provides name + phone. Each object: action ("add"), phone (E.164), name, role (family_caregiver/professional_caregiver/community_supporter), relationship (to care recipient), access_level (full/limited). Empty array unless adding a member. REQUIRES coordinator confirmation before you populate this.
- reactions: Array of objects with targetMessage ("last_inbound" or "last_outbound") and type (love/like/dislike/laugh/emphasize/question). See "Tapback Reactions" in skills for when to use each. A heart on "I'll be there at 3" is warmer than "Got it." A thumbs-up on a task claim is cleaner than "Noted." Use sparingly — most messages still need a text reply. Never use dislike or question as the agent. Empty array if no reaction this message.
- effect: Object with type ("screen" or "bubble") and name. Screen effects: confetti, balloons, fireworks, hearts, celebration, happy_birthday. Bubble effects: gentle, loud, slam, invisible. Use for milestone moments only — onboarding welcome (balloons), first schedule completion (confetti). Null if no effect.

BEFORE YOU PROMISE TO CONTACT SOMEONE:
- Do you have their phone number? (check conversation history and family file)
- If yes: populate needs_outreach NOW. Don't just say you will — do it in this response.
- If no: tell the user you don't have the number and ask for it.
- Never say "I'll reach out" with an empty needs_outreach. That's a broken promise.`;

const SECTION_RE = /^## /gm;

export const FAMILY_SECTIONS: Record<FamilyContextMode, Set<string> | null> = {
  family_full: null,
  family_meds: new Set([
    "Active Medications",
    "Care Tasks",
  ]),
  family_team: new Set([
    "Care Team",
    "Rides",
    "Care Tasks",
    "Appointments",
  ]),
};

export const INTENT_FAMILY_MODE: Record<string, FamilyContextMode> = {
  EMERGENCY: "family_full",
  ESCALATION: "family_full",
  MEDICATION_CHANGE: "family_meds",
  ONBOARDING: "family_team",
  MULTI_MEMBER: "family_team",
  GENERAL: "family_full",
};

export function extractFamilySections(familyText: string, sections: Set<string>): string {
  if (!familyText || !sections.size) return "";

  const parts = familyText.split(SECTION_RE);
  const result: string[] = [];

  if (parts[0].trim()) {
    result.push(parts[0].trim());
  }

  for (const part of parts.slice(1)) {
    const newlineIdx = part.indexOf("\n");
    const header = (newlineIdx >= 0 ? part.slice(0, newlineIdx) : part).trim();
    if (sections.has(header)) {
      result.push(`## ${part.trimEnd()}`);
    }
  }

  return result.join("\n\n");
}

export function channelGuidance(service: string): string {
  if (service.toUpperCase() === "SMS") {
    return (
      '── CHANNEL: iMessage/SMS ──\n' +
      'You are texting via iMessage. They see read receipts and typing indicators.\n' +
      'Keep each message bubble under 320 characters when possible.\n' +
      'Plain text only — no markdown, no bold, no headers.'
    );
  }
  return "";
}

const LOG_LINE_RE = /^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC)\] \[(INBOUND|OUTBOUND)\] ([\s\S]+?)$/;

export function buildMessages(userMessage: string, conversationHistory: string): MessageTurn[] {
  const messages: MessageTurn[] = [];

  if (conversationHistory && conversationHistory !== "[No conversation history]") {
    const rawEntries: string[] = [];
    for (const line of conversationHistory.split("\n")) {
      if (line.startsWith("[") && LOG_LINE_RE.test(line)) {
        rawEntries.push(line);
      } else if (rawEntries.length) {
        rawEntries[rawEntries.length - 1] += "\n" + line;
      }
    }

    for (const entry of rawEntries) {
      const m = LOG_LINE_RE.exec(entry);
      if (!m) continue;
      const direction = m[2];
      const text = m[3].trim();
      if (!text) continue;
      const role: "user" | "assistant" = direction === "INBOUND" ? "user" : "assistant";

      if (messages.length && messages[messages.length - 1].role === role) {
        messages[messages.length - 1].content += "\n" + text;
      } else {
        messages.push({ role, content: text });
      }
    }
  }

  messages.push({ role: "user", content: userMessage });
  return messages;
}

export function buildSystemBlocks(input: SystemBlocksInput): SystemBlock[] {
  const blocks: SystemBlock[] = [];

  // Block 1: SOUL.md — agent identity
  blocks.push({
    type: "text",
    text: input.soulContent || "You are CareSupport — a care coordination agent.",
    cacheBreakpoint: false,
  });

  // Block 2: Routing + Capabilities + Skills
  const parts: string[] = [];
  if (input.routingContent) parts.push(`── ROUTING ──\n${input.routingContent}`);
  if (input.capabilitiesContent) parts.push(`── CAPABILITIES ──\n${input.capabilitiesContent}`);
  if (input.skillsContent) parts.push(`── SKILLS ──\n${input.skillsContent}`);
  if (parts.length) {
    blocks.push({ type: "text", text: parts.join("\n\n"), cacheBreakpoint: false });
  }

  // Block 3: Response format + channel guidance
  const channel = channelGuidance(input.service);
  let block3Text = channel ? channel + "\n\n" + RESPONSE_FORMAT : RESPONSE_FORMAT;
  if (input.toolsActive) {
    block3Text +=
      "\n\n── TOOLS ──\n" +
      "You have tools to look up family information on demand. " +
      "For greetings and simple conversation, respond directly without tools. " +
      "For questions about schedule, medications, care team, or family notes, " +
      "call the relevant tool first, then use the returned data in your response.";
  }
  blocks.push({ type: "text", text: block3Text, cacheBreakpoint: false });

  // Block 4: Lessons
  if (input.lessonsContent) {
    blocks.push({ type: "text", text: input.lessonsContent, cacheBreakpoint: false });
  }

  // Block 5: Member identity + member context (CACHE BREAKPOINT)
  const memberLines = [
    `YOU ARE TEXTING WITH: ${input.member.name} (${input.member.role})`,
    `Their phone: ${input.member.phone}`,
    `Their access level: ${input.member.accessLevel}`,
    `Their relationship to care recipient: ${input.member.relationship}`,
  ];
  let memberBlock = memberLines.join("\n");
  if (input.memberContext) {
    memberBlock += `\n\n── WHAT YOU KNOW ABOUT ${input.member.name.toUpperCase()} ──\n${input.memberContext}`;
  }
  blocks.push({ type: "text", text: memberBlock, cacheBreakpoint: true });

  // Block 6: Family context (intent-driven filtering)
  if (!input.toolsActive && input.familyContext) {
    const familyMode = INTENT_FAMILY_MODE[input.intent] ?? "family_full";
    const sectionFilter = FAMILY_SECTIONS[familyMode];

    let ctx: string;
    if (sectionFilter === null) {
      ctx = input.familyContext;
    } else {
      ctx = extractFamilySections(input.familyContext, sectionFilter as Set<string>);
    }

    if (ctx.trim()) {
      blocks.push({
        type: "text",
        text: `── FAMILY FILE (scoped to ${input.member.name}'s access level) ──\n${ctx}`,
        cacheBreakpoint: false,
      });
    }
  }

  return blocks;
}

export function systemBlocksToString(blocks: SystemBlock[]): string {
  return blocks.map((b) => b.text).join("\n\n");
}
