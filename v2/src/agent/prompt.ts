import type { FamilyContext, ProcessingInput } from "../types/domain.js";
import { config } from "../config.js";

function clip(text: string | undefined, maxChars: number, label: string): string {
  const value = text ?? "";
  if (value.length <= maxChars) return value || "[none]";
  return `${value.slice(0, maxChars)}\n[${label} truncated at ${maxChars} chars]`;
}

export function buildAgentPrompt(input: ProcessingInput, context: FamilyContext): string {
  const familyMarkdown = clip(context.markdown, config.promptFamilyMaxChars, "family_markdown");
  const recentConversation = clip(context.recentConversation, config.promptConversationMaxChars, "recent_conversation");
  const memberProfile = clip(context.memberMarkdown, config.promptMemberMaxChars, "member_profile");

  return [
    "You are CareSupport 2.0.",
    "Return ONLY JSON matching the required schema.",
    "Never promise outreach unless needs_outreach contains at least one task.",
    "Respect access levels and avoid restricted PHI disclosures.",
    "",
    `Actor: ${input.actor.memberName} (${input.actor.role}, access=${input.actor.accessLevel})`,
    `Family: ${context.familyName} (${context.familyId})`,
    `Service: ${input.service}`,
    `Inbound text: ${input.text}`,
    "",
    "Family markdown context:",
    familyMarkdown,
    "",
    "Recent conversation:",
    recentConversation,
    "",
    "Member profile:",
    memberProfile,
  ].join("\n");
}
