export interface FamilyMarkdownProjectionInput {
  familyName: string;
  careRecipient: string;
  members: Array<{ name: string; role: string; access_level: string; phone?: string }>;
  notes?: string;
  schedule?: string[];
  medications?: string[];
  timeline?: string[];
}

export function renderFamilyMarkdown(input: FamilyMarkdownProjectionInput): string {
  const lines: string[] = [];
  lines.push(`# ${input.familyName}`);
  lines.push("");
  lines.push("## Care Recipient");
  lines.push(`- ${input.careRecipient}`);
  lines.push("");

  lines.push("## Care Team");
  for (const member of input.members) {
    const phonePart = member.phone ? ` (${member.phone})` : "";
    lines.push(`- ${member.name} — ${member.role}, ${member.access_level}${phonePart}`);
  }
  lines.push("");

  lines.push("## This Week");
  for (const item of input.schedule ?? []) {
    lines.push(`- ${item}`);
  }
  if (!input.schedule || input.schedule.length === 0) {
    lines.push("- [No schedule items]");
  }
  lines.push("");

  lines.push("## Active Medications");
  for (const med of input.medications ?? []) {
    lines.push(`- ${med}`);
  }
  if (!input.medications || input.medications.length === 0) {
    lines.push("- [No medications listed]");
  }
  lines.push("");

  lines.push("## Timeline");
  for (const event of input.timeline ?? []) {
    lines.push(`- ${event}`);
  }
  if (!input.timeline || input.timeline.length === 0) {
    lines.push("- [No timeline events]");
  }
  lines.push("");

  lines.push("## Notes");
  lines.push(input.notes?.trim() || "[No notes]");
  lines.push("");

  return lines.join("\n");
}
