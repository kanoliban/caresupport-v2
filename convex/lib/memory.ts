export type MemoryCategory =
  | "profile"
  | "communication_preference"
  | "care_preference"
  | "care_note"
  | "lesson";

export interface MemoryEntryLike {
  scope: "user" | "care_case";
  category: MemoryCategory;
  content: string;
  active: boolean;
}

export interface UserSnapshot {
  name: string;
  phone: string;
  relationshipToRecipient?: string;
  status: "onboarding" | "active" | "paused" | "archived";
}

export interface CareCaseSnapshot {
  title: string;
  status: "onboarding" | "active" | "paused" | "archived";
  timezone: string;
  careRecipientName?: string;
  relationshipToRecipient?: string;
}

export interface MedicationSnapshot {
  name: string;
  dose: string;
  schedule: string;
  prescriber?: string;
  notes?: string;
  status: string;
}

export interface ScheduleItemSnapshot {
  type: "appointment" | "task" | "reminder";
  title: string;
  date?: string;
  time?: string;
  location?: string;
  notes?: string;
  provider?: string;
  status: string;
}

export interface CareContactSnapshot {
  _id: string;
  name: string;
  phone?: string;
  relationship?: string;
  contactType: string;
  agencyName?: string;
  role?: string;
  availabilityNotes?: string;
  contactPriority?: number;
  canReceiveTexts: boolean;
  consentToContact?: boolean;
  active: boolean;
  notes?: string;
  lastReplyStatus?: string;
}

export interface CoordinationEventSnapshot {
  type: string;
  title: string;
  status: string;
  urgency: string;
  description?: string;
  startsAt?: number;
  endsAt?: number;
  originalAssigneeContactId?: string;
  confirmedContactIds?: string[];
  pendingContactIds?: string[];
  declinedContactIds?: string[];
  fallbackOrderContactIds?: string[];
  nextActionAt?: number;
  escalationAt?: number;
  resolution?: string;
  lastReplyStatus?: string;
}

export interface MemoryUpdateInstruction {
  category: MemoryCategory;
  content: string;
  source?: string;
}

const MEMORY_TOKEN_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "for",
  "from",
  "has",
  "have",
  "her",
  "him",
  "i",
  "in",
  "is",
  "it",
  "just",
  "of",
  "on",
  "or",
  "she",
  "that",
  "the",
  "their",
  "them",
  "they",
  "to",
  "was",
  "with",
]);

export function normalizeMemoryCategory(
  raw: string | undefined,
): MemoryCategory {
  switch (raw) {
    case "profile":
    case "communication_preference":
    case "care_preference":
    case "care_note":
    case "lesson":
      return raw;
    default:
      return "care_note";
  }
}

export function uniqueMemoryUpdates(
  updates: MemoryUpdateInstruction[],
): MemoryUpdateInstruction[] {
  const seen = new Set<string>();
  const result: MemoryUpdateInstruction[] = [];

  for (const update of updates) {
    const category = normalizeMemoryCategory(update.category);
    const content = update.content.trim();
    if (!content) continue;

    const key = `${category}::${content.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      category,
      content,
      source: update.source?.trim() || undefined,
    });
  }

  return result;
}

function normalizeMemoryText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeMemoryText(text: string): string[] {
  return normalizeMemoryText(text)
    .split(" ")
    .map((token) => token.trim())
    .filter(
      (token) =>
        token.length > 2 &&
        !MEMORY_TOKEN_STOPWORDS.has(token),
    );
}

function isEmotionalSupportInference(content: string): boolean {
  const normalized = normalizeMemoryText(content);

  const supportInstruction =
    /\b(be|handle)\b.*\b(warm|patient|patience|low pressure|lowpressure|gentle|extra warmth)\b/.test(
      normalized,
    ) ||
    /\bwith extra warmth\b/.test(normalized);

  const inferredEmotionalSummary =
    /\bexpressed feeling\b/.test(normalized) ||
    /\bis experiencing\b/.test(normalized) ||
    /\b(feeling|feels)\b.*\b(overwhelmed|isolated|alone|tired|exhausted)\b/.test(normalized) ||
    /\bcaregiver exhaustion\b/.test(normalized) ||
    /\bhas no one to talk to\b/.test(normalized) ||
    /\bjuggling many responsibilities\b/.test(normalized);

  return supportInstruction || inferredEmotionalSummary;
}

function hasHighTokenOverlap(a: string, b: string): boolean {
  const aTokens = new Set(tokenizeMemoryText(a));
  const bTokens = new Set(tokenizeMemoryText(b));

  if (aTokens.size === 0 || bTokens.size === 0) {
    return false;
  }

  let intersection = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) {
      intersection += 1;
    }
  }

  const smaller = Math.min(aTokens.size, bTokens.size);
  return intersection >= 4 && intersection / smaller >= 0.7;
}

export function isNearDuplicateMemoryContent(a: string, b: string): boolean {
  const normalizedA = normalizeMemoryText(a);
  const normalizedB = normalizeMemoryText(b);

  if (!normalizedA || !normalizedB) {
    return false;
  }

  if (normalizedA === normalizedB) {
    return true;
  }

  if (normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA)) {
    return true;
  }

  return hasHighTokenOverlap(normalizedA, normalizedB);
}

export function shouldPersistMemoryUpdate(
  update: MemoryUpdateInstruction,
  existingEntries: MemoryEntryLike[],
): boolean {
  const category = normalizeMemoryCategory(update.category);
  const content = update.content.trim();
  if (!content) {
    return false;
  }

  if (category === "care_note" && isEmotionalSupportInference(content)) {
    return false;
  }

  return !existingEntries.some(
    (entry) =>
      entry.active &&
      entry.category === category &&
      isNearDuplicateMemoryContent(entry.content, content),
  );
}

export function buildUserContext(
  user: UserSnapshot,
  entries: MemoryEntryLike[],
): string {
  const activeEntries = entries.filter(
    (entry) => entry.active && entry.scope === "user",
  );

  const profile = activeEntries.filter((entry) => entry.category === "profile");
  const communication = activeEntries.filter(
    (entry) => entry.category === "communication_preference",
  );
  const preferences = activeEntries.filter(
    (entry) => entry.category === "care_preference",
  );

  const lines = [
    "## User Profile",
    `- Name: ${user.name}`,
    `- Phone: ${user.phone}`,
    `- Relationship to care recipient: ${user.relationshipToRecipient ?? "unknown"}`,
    `- Status: ${user.status}`,
  ];

  if (profile.length > 0) {
    lines.push("", "## User Notes");
    for (const entry of profile) {
      lines.push(`- ${entry.content}`);
    }
  }

  if (communication.length > 0) {
    lines.push("", "## Communication Preferences");
    for (const entry of communication) {
      lines.push(`- ${entry.content}`);
    }
  }

  if (preferences.length > 0) {
    lines.push("", "## User Preferences");
    for (const entry of preferences) {
      lines.push(`- ${entry.content}`);
    }
  }

  return lines.join("\n");
}

export function buildCareCaseContext(
  careCase: CareCaseSnapshot,
  medications: MedicationSnapshot[],
  scheduleItems: ScheduleItemSnapshot[],
  entries: MemoryEntryLike[],
  careContacts: CareContactSnapshot[] = [],
  coordinationEvents: CoordinationEventSnapshot[] = [],
): { text: string; sections: string[]; lessons: string[] } {
  const sections: string[] = ["care_case_profile"];
  const lines = [
    "## Care Case",
    `- Title: ${careCase.title}`,
    `- Care recipient: ${careCase.careRecipientName ?? "unknown"}`,
    `- Relationship to user: ${careCase.relationshipToRecipient ?? "unknown"}`,
    `- Timezone: ${careCase.timezone}`,
    `- Status: ${careCase.status}`,
  ];

  const activeEntries = entries.filter(
    (entry) => entry.active && entry.scope === "care_case",
  );
  const careNotes = activeEntries.filter((entry) => entry.category === "care_note");
  const carePreferences = activeEntries.filter(
    (entry) => entry.category === "care_preference",
  );
  const lessons = activeEntries
    .filter((entry) => entry.category === "lesson")
    .map((entry) => entry.content);

  if (medications.length > 0) {
    sections.push("medications");
    lines.push("", "## Medications");
    for (const medication of medications) {
      lines.push(
        `- ${medication.name} ${medication.dose} — ${medication.schedule}${
          medication.prescriber ? ` (${medication.prescriber})` : ""
        }`,
      );
    }
  }

  if (scheduleItems.length > 0) {
    sections.push("schedule");
    lines.push("", "## Schedule");
    for (const item of scheduleItems) {
      lines.push(
        `- [${item.type}] ${item.title}${
          item.date ? ` on ${item.date}` : ""
        }${item.time ? ` at ${item.time}` : ""}${
          item.location ? ` — ${item.location}` : ""
        }`,
      );
    }
  }

  const activeContacts = [...careContacts]
    .filter((contact) => contact.active)
    .sort((a, b) => {
      const priorityA = a.contactPriority ?? Number.MAX_SAFE_INTEGER;
      const priorityB = b.contactPriority ?? Number.MAX_SAFE_INTEGER;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return a.name.localeCompare(b.name);
    });

  if (activeContacts.length > 0) {
    sections.push("care_contacts");
    lines.push("", "## Care Contacts");
    for (const contact of activeContacts) {
      const details = [
        contact.relationship,
        contact.role,
        contact.agencyName,
        contact.phone,
        contact.canReceiveTexts ? "textable" : "not textable",
        contact.consentToContact === true
          ? "outreach consent yes"
          : contact.consentToContact === false
            ? "outreach consent no"
            : "outreach consent unknown",
        contact.lastReplyStatus ? `last reply ${contact.lastReplyStatus}` : "",
      ].filter(Boolean);
      lines.push(
        `- ${contact.name} [${contact.contactType}]${
          details.length > 0 ? `: ${details.join(", ")}` : ""
        }${contact.availabilityNotes ? ` - ${contact.availabilityNotes}` : ""}`,
      );
    }
  }

  const activeCoordinationEvents = coordinationEvents.filter(
    (event) => event.status === "open" || event.status === "waiting",
  );

  if (activeCoordinationEvents.length > 0) {
    sections.push("coordination_events");
    const contactsById = new Map(activeContacts.map((contact) => [contact._id, contact.name]));
    lines.push("", "## Open Coordination Events");
    for (const event of activeCoordinationEvents) {
      const contactParts = [
        formatContactList("confirmed", event.confirmedContactIds, contactsById),
        formatContactList("pending", event.pendingContactIds, contactsById),
        formatContactList("declined", event.declinedContactIds, contactsById),
        formatContactList("fallback", event.fallbackOrderContactIds, contactsById),
      ].filter(Boolean);
      const timeParts = [
        event.startsAt ? `starts ${formatDateTime(event.startsAt)}` : "",
        event.endsAt ? `ends ${formatDateTime(event.endsAt)}` : "",
        event.nextActionAt ? `next action ${formatDateTime(event.nextActionAt)}` : "",
        event.escalationAt ? `escalate ${formatDateTime(event.escalationAt)}` : "",
        event.lastReplyStatus ? `last reply ${event.lastReplyStatus}` : "",
      ].filter(Boolean);
      lines.push(
        `- [${event.status}/${event.urgency}/${event.type}] ${event.title}${
          timeParts.length > 0 ? ` (${timeParts.join("; ")})` : ""
        }${contactParts.length > 0 ? ` - ${contactParts.join("; ")}` : ""}${
          event.description ? ` - ${event.description}` : ""
        }`,
      );
    }
  }

  if (carePreferences.length > 0) {
    sections.push("care_preferences");
    lines.push("", "## Care Preferences");
    for (const entry of carePreferences) {
      lines.push(`- ${entry.content}`);
    }
  }

  if (careNotes.length > 0) {
    sections.push("care_notes");
    lines.push("", "## Care Notes");
    for (const entry of careNotes) {
      lines.push(`- ${entry.content}`);
    }
  }

  return {
    text: lines.join("\n"),
    sections,
    lessons,
  };
}

function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

function formatContactList(
  label: string,
  ids: string[] | undefined,
  contactsById: Map<string, string>,
): string {
  if (!ids || ids.length === 0) return "";
  const names = ids.map((id) => contactsById.get(id) ?? id);
  return `${label}: ${names.join(", ")}`;
}
