import { findSectionHeader } from "./sections";

export interface ContextUpdateInstruction {
  section: string;
  operation: string;
  content: string;
  oldContent?: string;
}

export interface MemberContextSeed {
  name: string;
  phone?: string;
  role: string;
  relationship?: string;
  accessLevel: string;
}

export function applySectionUpdates(
  context: string,
  updates: ContextUpdateInstruction[],
): string {
  let nextContext = context;

  for (const update of updates) {
    if (update.operation === "append") {
      const header = findSectionHeader(nextContext, update.section);
      const sectionHeader = header ? `## ${header}` : null;
      if (!sectionHeader) {
        continue;
      }
      const idx = nextContext.indexOf(sectionHeader);
      if (idx >= 0) {
        const nextSection = nextContext.indexOf("\n## ", idx + 1);
        const insertAt = nextSection >= 0 ? nextSection : nextContext.length;
        nextContext =
          nextContext.slice(0, insertAt) +
          "\n" +
          update.content +
          nextContext.slice(insertAt);
      }
      continue;
    }

    if (update.operation === "prepend") {
      const header = findSectionHeader(nextContext, update.section);
      const sectionHeader = header ? `## ${header}` : null;
      if (!sectionHeader) {
        continue;
      }
      const idx = nextContext.indexOf(sectionHeader);
      if (idx >= 0) {
        const headerBreak = nextContext.indexOf("\n", idx);
        const afterHeader =
          headerBreak >= 0 ? headerBreak + 1 : nextContext.length;
        const separator = afterHeader === nextContext.length ? "\n" : "";
        nextContext =
          nextContext.slice(0, afterHeader) +
          separator +
          update.content +
          "\n" +
          nextContext.slice(afterHeader);
      }
      continue;
    }

    if (update.operation === "replace" && update.oldContent) {
      nextContext = nextContext.replace(update.oldContent, update.content);
      continue;
    }

    if (update.operation === "resolve_issue" && update.oldContent) {
      nextContext = nextContext.replace(update.oldContent, "");
    }
  }

  return nextContext.trim();
}

export function buildDefaultMemberContext(seed: MemberContextSeed): string {
  const lines = [
    `# ${seed.name} — Member Profile`,
    "",
    "## Identity",
    `- Name: ${seed.name}`,
    `- Phone: ${seed.phone ?? ""}`,
    `- Role: ${seed.role}`,
    `- Relationship to care recipient: ${seed.relationship ?? ""}`,
    `- Access level: ${seed.accessLevel}`,
    "",
    "## Communication Preferences",
    "",
    "## Care Responsibilities",
    "",
    "## Personal Context",
    "",
    "## Interaction History",
  ];

  return lines.join("\n");
}
