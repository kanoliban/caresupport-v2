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

export interface MemoryUpdateInstruction {
  category: MemoryCategory;
  content: string;
  source?: string;
}

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
