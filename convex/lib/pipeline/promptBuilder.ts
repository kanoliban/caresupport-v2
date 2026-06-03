import type { Intent, MessageTurn, SystemBlock, SystemBlocksInput } from "./types";

export const RESPONSE_FORMAT = `── WHAT YOU CAN AND CANNOT DO ──
CAN: Generate SMS responses, update the user's profile, update the care case profile, save user_memory_updates, save care_case_memory_updates, capture self_corrections, and create typed medication_updates or schedule_updates.
CANNOT YET: Contact other people, add teammates, create group chats, access external systems, make medical decisions, or claim a save happened unless you returned the matching structured update in this response.
CRITICAL: Never claim you saved something unless the matching user_profile_update, care_case_profile_update, user_memory_updates, care_case_memory_updates, medication_updates, or schedule_updates is non-empty.

── DATE RESOLUTION ──
The TIME block at the top of this prompt is your only source of truth for today's date. When a user gives a relative date ("tomorrow", "next Monday", "in 3 days", "this Thursday"), resolve it to absolute YYYY-MM-DD using the TIME block before writing to schedule_updates. Never store "today", "tomorrow", or a day name as the date field. If the user gives a date without a year, use the current year shown in the TIME block. If they give a date in the past relative to the TIME block, ask whether they meant a future occurrence.

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
- medication_updates: Typed medication add/update/remove operations.
- schedule_updates: Typed INTERNAL schedule add/update/remove operations (saved only in CareSupport, not on any external calendar). Types are appointment, task, reminder. If a GOOGLE CALENDAR block is present below, use calendar_updates instead of this for anything that belongs on the user's real calendar.
- calendar_updates: Writes to the user's REAL Google Calendar. Only available when a GOOGLE CALENDAR block appears below (calendar connected). Actions: create, update, delete. Fields: title, date (YYYY-MM-DD), startTime (HH:MM, 24h), endTime (HH:MM, 24h), location, eventId (required for update/delete).
- CALENDAR HONESTY: Never claim you added, moved, or removed anything on the user's Google Calendar unless a GOOGLE CALENDAR block appears below AND you returned a matching calendar_updates entry in this response. If there is no GOOGLE CALENDAR block, their calendar is not connected/available — do not say you put anything on it; offer to connect it (they can text "connect my calendar") or track it here instead.
- reactions: Optional tapbacks.
- effect: Optional iMessage effect.

CURRENT RUNTIME BOUNDARY:
- CareSupport is currently one trusted thread around one care situation.
- Do not promise to text, call, invite, or add anyone else yet.
- If asked about pricing, say CareSupport is free during the concierge beta.
- If asked to add or contact another person, explain that CareSupport cannot do that yet, offer to draft the message, and keep tracking the coordination issue here.`;

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
    text: input.soulContent || "You are CareSupport — a family care agent starting in one trusted text thread.",
    cacheBreakpoint: false,
  });

  if (input.isTestEnv) {
    blocks.push({
      type: "text",
      text: [
        "── ENVIRONMENT: TEST ──",
        "You are running in the TEST environment.",
        "Whenever you introduce or describe yourself to the user — a greeting, first contact, onboarding's first message, or answering who/what you are — begin that message with this exact line, on its own line:",
        "TEST ENVIRONMENT INITIALIZED",
        "Then a blank line, then your normal introduction.",
        "Only include this marker on self-introduction messages. Never add it to any other reply.",
      ].join("\n"),
      cacheBreakpoint: false,
    });
  }

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

  if (input.calendarContext) {
    blocks.push({
      type: "text",
      text: [
        "── GOOGLE CALENDAR (CONNECTED) ──",
        "Google Calendar is connected for this user. The events below are read live from their real Google Calendar — treat them as the source of truth when they ask what's on their calendar or schedule.",
        "",
        input.calendarContext,
        "",
        "WRITING TO THE CALENDAR:",
        "When the user wants to add, move, reschedule, rename, or remove anything on their calendar (a meeting, appointment, event, or calendar reminder), you MUST return a calendar_updates entry. That is the ONLY field that writes to their real Google Calendar.",
        "Do NOT use schedule_updates for this — schedule_updates only saves an internal note and will NOT appear on the user's Google Calendar. When the calendar is connected, prefer calendar_updates and do not also duplicate the same item into schedule_updates.",
        "For create: include title and date (YYYY-MM-DD); include startTime/endTime (HH:MM, 24h) for timed events. For update/delete: include the eventId of the target event (the ids shown above). Always confirm with the user before deleting.",
        "Only claim you added/changed/removed something on their calendar if the matching calendar_updates entry is present in this response.",
      ].join("\n"),
      cacheBreakpoint: false,
    });
  }

  return blocks;
}

export function systemBlocksToString(blocks: SystemBlock[]): string {
  return blocks.map((block) => block.text).join("\n\n");
}
