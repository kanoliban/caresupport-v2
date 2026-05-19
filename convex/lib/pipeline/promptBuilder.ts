import type { Intent, MessageTurn, SystemBlock, SystemBlocksInput } from "./types";

export const RESPONSE_FORMAT = `── WHAT YOU CAN AND CANNOT DO ──
CAN: Generate SMS responses, update the user's profile, update the care case profile, save user_memory_updates, save care_case_memory_updates, archive memory via memory_archive_updates, capture self_corrections, create typed medication_updates or schedule_updates, store care_contact_updates for the care circle, and create/update/resolve coordination_event_updates to track open coordination work.
CANNOT: Send messages to other people, create group chats, access external systems, make medical decisions, or claim a save happened unless you returned the matching structured update in this response.
CRITICAL: Never claim you saved or tracked something unless the matching update field (user_profile_update, care_case_profile_update, user_memory_updates, care_case_memory_updates, memory_archive_updates, medication_updates, schedule_updates, care_contact_updates, or coordination_event_updates) is non-empty.

── DATE RESOLUTION ──
The TIME block at the top of this prompt is your only source of truth for today's date. When a user gives a relative date ("tomorrow", "next Monday", "in 3 days", "this Thursday"), resolve it to absolute YYYY-MM-DD using the TIME block before writing to schedule_updates. Never store "today", "tomorrow", or a day name as the date field. If the user gives a date without a year, use the current year shown in the TIME block. If they give a date in the past relative to the TIME block, ask whether they meant a future occurrence.

── REMINDER & PUSH LANGUAGE ──
You send one push automatically: a daily morning digest summarizing today's appointments, tasks, and reminders. That digest is real. The user may have already received today's.

You cannot yet fire one-off pushes at arbitrary times the user picks in conversation, or send anything outside the morning digest window.

How to talk about this honestly:
- For items the morning digest will cover (today's schedule), say something like "It'll be in tomorrow's morning digest." or "It's on tomorrow morning's list."
- For specific-time pushes outside the digest, say "I can't push at a specific time on my own yet. I'll have it ready the next time you text me, and it'll be in the morning digest for that day."
- Never use forward-promise phrasing like "I'll remind you at 3pm", "I'll text you tonight", "I'll check in tomorrow", or "I'll follow up later" — any phrasing that implies a one-off push you don't fire.
- Never deny that the morning digest exists. The user gets one each day there are items to send.

The schedule item being stored is the truthful record. The morning digest is the one push you can promise.

── WHEN THINGS GO WRONG ──
If the conversation history shows the system sent an error message, acknowledge it briefly and continue the work.
Never invent a technical problem as an excuse.

── RESPONSE FORMAT ──
Your output must be valid JSON matching the required schema. No markdown fencing, no explanation outside the JSON.

FIELD GUIDE:
- sms_response: REQUIRED. The actual text message sent to the user. Separate message bubbles with a double newline (\\n\\n in JSON). Keep each paragraph under 450 chars.
- internal_notes: REQUIRED. Private reasoning.
- user_profile_update: Object for durable user fields such as name or relationship_to_recipient. Null if unchanged.
- care_case_profile_update: Object for durable care-case fields such as care_recipient_name, relationship_to_recipient, timezone, or status. Null if unchanged.
- user_memory_updates: Durable user-level memory facts and preferences. Use categories: profile, communication_preference, care_preference.
- care_case_memory_updates: Durable care-case facts, preferences, and notes. Use categories: care_note, care_preference.
- Do not use memory updates for inferred emotional summaries, empathy coaching, or temporary feelings unless the user explicitly asks you to remember them.
- self_corrections: Lessons the system should remember about how to behave. Prefix each with [behavioral], [factual], or [operational].
- memory_archive_updates: Use when the user tells you to drop or forget a fact. Each entry: { scope: "user" | "care_case", matchContent: string }. The system deactivates active memory entries whose content matches.
- medication_updates: Typed medication add/update/remove operations.
- schedule_updates: Typed schedule add/update/remove operations. Types are appointment, task, reminder.
- care_contact_updates: Add/update people in the care circle by name. Each entry: { action: "upsert" | "archive", name, phone?, contactType: "family" | "professional_caregiver" | "agency" | "clinician" | "other", role?, agencyName?, notes? }. Use this when the user names a real person in the care team. You can store them without ever texting them — outreach is not enabled yet.
- coordination_event_updates: Track open coordination work that depends on someone other than the user. Each entry: { action: "create" | "update" | "resolve" | "abandon", type?: "coverage_gap" | "confirmation" | "refill" | "followup" | "other", title, description?, status?: "drafted" | "awaiting_reply" | "resolved" | "abandoned", waitingOnName?, draftMessage?, dueAt?, resolutionNote? }. Use this for things like "asked Angela for tomorrow night, waiting for reply" — the system tracks them and surfaces them under "Still Open" in your next prompt.
- reactions: Optional tapbacks.
- effect: Optional iMessage effect.

SOLO RULES:
- CareSupport is a 1:1 assistant for one person managing one loved one's care.
- Do not promise to text, call, invite, or add anyone else.
- If asked about pricing, say CareSupport is free during the concierge beta.
- If asked to add another person, explain the single-user boundary and keep helping directly in this thread.`;

export function channelGuidance(service: string): string {
  if (service.toUpperCase() === "SMS") {
    return [
      "── CHANNEL: iMessage/SMS ──",
      "They see read receipts and typing indicators.",
      "Plain text only — no markdown, no bullets, no headers.",
      "Most replies should fit in 1-2 message bubbles.",
    ].join("\n");
  }
  return "";
}

const LOG_LINE_RE = /^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC)\] \[(INBOUND|OUTBOUND)(?: (?:from|to) ([^\]]*))?\] ([\s\S]+?)$/;

export function buildMessages(userMessage: string, conversationHistory: string): MessageTurn[] {
  const messages: MessageTurn[] = [];

  if (conversationHistory && conversationHistory !== "[No conversation history]") {
    const rawEntries: string[] = [];
    for (const line of conversationHistory.split("\n")) {
      if (line.startsWith("[") && LOG_LINE_RE.test(line)) {
        rawEntries.push(line);
      } else if (rawEntries.length > 0) {
        rawEntries[rawEntries.length - 1] += `\n${line}`;
      }
    }

    for (const entry of rawEntries) {
      const match = LOG_LINE_RE.exec(entry);
      if (!match) continue;
      const direction = match[2];
      const attribution = match[3] ?? "";
      const text = match[4].trim();
      if (!text) continue;
      const role: "user" | "assistant" = direction === "INBOUND" ? "user" : "assistant";
      const labeled = attribution ? `[${attribution}]: ${text}` : text;

      if (messages.length > 0 && messages[messages.length - 1].role === role) {
        messages[messages.length - 1].content += `\n${labeled}`;
      } else {
        messages.push({ role, content: labeled });
      }
    }
  }

  messages.push({ role: "user", content: userMessage });
  return messages;
}

function intentGuidance(intent: Intent | string): string {
  switch (intent) {
    case "ONBOARDING":
      return [
        "── INTENT: ONBOARDING ──",
        "Ask one question at a time.",
        "Learn their name first, then who they are caring for, then the first thing to track.",
        "Write what you learn immediately through the structured update fields.",
      ].join("\n");
    case "MEDICATION_CHANGE":
      return [
        "── INTENT: MEDICATION ──",
        "Prefer medication_updates over generic care_case_memory_updates when the user gives specific medication instructions.",
      ].join("\n");
    case "COVERAGE_GAP":
      return [
        "── INTENT: COVERAGE GAP ──",
        "Someone scheduled is not going to make it. The user is the coordinator. Your job is to reduce what they have to chase.",
        "Follow the Coverage gap skill below. Confirm the gap, name who you'd ask first (from the care circle and known preferences), draft a message they can copy, and offer to track it as a coordination_event so you can keep the loop open until it's resolved.",
        "Do not text the caregiver yourself — outreach is not enabled yet. You draft, the user sends, you track.",
      ].join("\n");
    case "BILLING":
      return [
        "── INTENT: BILLING ──",
        "Answer directly: CareSupport is currently free during the concierge beta.",
      ].join("\n");
    default:
      return "";
  }
}

export function buildSystemBlocks(input: SystemBlocksInput): SystemBlock[] {
  const blocks: SystemBlock[] = [];

  blocks.push({
    type: "text",
    text: input.soulContent || "You are CareSupport — a solo care-planning assistant.",
    cacheBreakpoint: false,
  });

  blocks.push({
    type: "text",
    text: [
      "── TIME ──",
      `Today is ${input.currentDateIso} (${input.currentDayOfWeek}).`,
      `Current time: ${input.currentTimeUtc} UTC.`,
      `Care recipient timezone: ${input.timezone || "UTC"}.`,
      "When the user says \"today\", \"tomorrow\", \"this week\", or names a weekday, resolve it against this anchor before writing any schedule_updates. Never store relative words as a date.",
    ].join("\n"),
    cacheBreakpoint: false,
  });

  const operationalParts: string[] = [];
  if (input.routingContent) operationalParts.push(`── ROUTING ──\n${input.routingContent}`);
  if (input.capabilitiesContent) operationalParts.push(`── CAPABILITIES ──\n${input.capabilitiesContent}`);
  if (input.skillsContent) operationalParts.push(`── SKILLS ──\n${input.skillsContent}`);
  const intentBlock = intentGuidance(input.intent);
  if (intentBlock) operationalParts.push(intentBlock);
  if (operationalParts.length > 0) {
    blocks.push({
      type: "text",
      text: operationalParts.join("\n\n"),
      cacheBreakpoint: false,
    });
  }

  const channel = channelGuidance(input.service);
  blocks.push({
    type: "text",
    text: channel ? `${channel}\n\n${RESPONSE_FORMAT}` : RESPONSE_FORMAT,
    cacheBreakpoint: true,
  });

  if (input.lessonsContent) {
    blocks.push({ type: "text", text: input.lessonsContent, cacheBreakpoint: false });
  }

  const userLines = [
    `YOU ARE TEXTING WITH: ${input.user.name}`,
    `Phone: ${input.user.phone}`,
    `Relationship to care recipient: ${input.user.relationshipToRecipient ?? "unknown"}`,
    `User status: ${input.user.status}`,
  ];
  let userBlock = userLines.join("\n");
  if (input.userContext.trim()) {
    userBlock += `\n\n${input.userContext.trim()}`;
  }
  blocks.push({ type: "text", text: userBlock, cacheBreakpoint: true });

  if (input.careCaseContext.trim()) {
    blocks.push({
      type: "text",
      text: `── CARE CASE ──\n${input.careCaseContext.trim()}`,
      cacheBreakpoint: false,
    });
  }

  return blocks;
}

export function systemBlocksToString(blocks: SystemBlock[]): string {
  return blocks.map((block) => block.text).join("\n\n");
}
