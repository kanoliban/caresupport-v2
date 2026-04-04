const SECTION_KEY_MAP: Record<string, string> = {
  members: "members",
  "family members": "members",
  "care recipient": "care_recipient",
  care_recipient: "care_recipient",
  schedule: "schedule",
  medications: "medications",
  "active medications": "medications",
  appointments: "appointments",
  availability: "availability",
  "active issues": "active_issues",
  recent_events: "recent_events",
  "recent events": "recent_events",
  patterns: "patterns",
  insurance: "insurance",
  "care preferences": "care_preferences",
  care_preferences: "care_preferences",
  "care team": "care_team",
  care_team: "care_team",
  notes: "notes",
  "what you know": "what_you_know",
  what_you_know: "what_you_know",
  "care situation": "care_situation",
  care_situation: "care_situation",
};

export function toSectionKey(section: string): string {
  const normalized = section
    .trim()
    .replace(/^#+\s*/, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();

  return SECTION_KEY_MAP[normalized] ?? normalized.replace(/ /g, "_");
}

export function findSectionHeader(
  context: string,
  requestedSection: string,
): string | null {
  const requestedKey = toSectionKey(requestedSection);

  for (const match of context.matchAll(/^##\s+(.+)$/gm)) {
    const header = match[1]?.trim();
    if (header && toSectionKey(header) === requestedKey) {
      return header;
    }
  }

  return null;
}
