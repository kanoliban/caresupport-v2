/**
 * Grounding guards for model-authored writes into the care record.
 *
 * The runtime already refuses to let a reply claim an outreach or calendar
 * write that never happened (doesReplyClaimOutreachExecution,
 * doesReplyClaimCalendarWrite in handler.ts). Medication writes had no
 * equivalent: whatever the model put in medication_updates went straight into
 * the medications table, on any turn, with no audit event. That is how a dose
 * change nobody reported ends up in a patient record.
 *
 * These guards do not try to judge whether a change is clinically right. They
 * enforce one property: a human in the thread has to have actually said the
 * thing being written down.
 */

export interface MedicationWriteCandidate {
  action: "add" | "update" | "remove";
  name: string;
  dose?: string;
  schedule?: string;
  prescriber?: string;
  notes?: string;
}

export interface MedicationGuardContext {
  /** Inbound, human-authored text for this turn plus recent inbound turns. */
  humanText: string;
  /** True when this turn is a care contact replying to outreach. */
  isCareContactReply: boolean;
}

export type MedicationGuardVerdict =
  | { allowed: true }
  | { allowed: false; reason: MedicationGuardBlockReason };

export type MedicationGuardBlockReason =
  | "care_contact_reply_turn"
  | "missing_medication_name"
  | "medication_name_not_in_human_text"
  | "dose_not_in_human_text"
  | "schedule_not_in_human_text";

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function numericTokens(value: string): string[] {
  return value.match(/\d+(?:\.\d+)?/g) ?? [];
}

/**
 * True when the medication's name shows up in what a human wrote. Multi-word
 * brand/generic names ("Lantus insulin glargine") match on any meaningful
 * token, so "up her Lantus" grounds a write against the full name.
 */
function nameAppearsInHumanText(name: string, humanText: string): boolean {
  const normalizedName = normalize(name);
  if (!normalizedName) return false;
  if (humanText.includes(normalizedName)) return true;

  const tokens = normalizedName.split(" ").filter((token) => token.length >= 4);
  if (tokens.length === 0) {
    // Short names ("D3", "B12") have no safe partial match — require the whole
    // thing, which the includes() check above already tested.
    return false;
  }
  return tokens.some((token) => humanText.includes(token));
}

/**
 * A numeric value (a dose, a clock time) is grounded only if the same number
 * appears in human text. This is the specific guard against a phantom dose:
 * the model asking "did the dose change too?" and then writing down an answer
 * nobody gave.
 */
function numbersAppearInHumanText(value: string, humanText: string): boolean {
  const numbers = numericTokens(value);
  if (numbers.length === 0) {
    // Non-numeric values ("as directed", "twice daily") carry no dosage claim
    // we can check this way.
    return true;
  }
  return numbers.some((number) => humanText.includes(number));
}

export function checkMedicationWriteGrounding(
  update: MedicationWriteCandidate,
  context: MedicationGuardContext,
): MedicationGuardVerdict {
  // A caregiver answering "can you cover Tuesday?" must never be able to move
  // the care recipient's medication record, however the model reads their text.
  if (context.isCareContactReply) {
    return { allowed: false, reason: "care_contact_reply_turn" };
  }

  if (!update.name?.trim()) {
    return { allowed: false, reason: "missing_medication_name" };
  }

  const humanText = normalize(context.humanText);
  if (!nameAppearsInHumanText(update.name, humanText)) {
    return { allowed: false, reason: "medication_name_not_in_human_text" };
  }

  if (update.dose && !numbersAppearInHumanText(update.dose, humanText)) {
    return { allowed: false, reason: "dose_not_in_human_text" };
  }

  if (update.schedule && !numbersAppearInHumanText(update.schedule, humanText)) {
    return { allowed: false, reason: "schedule_not_in_human_text" };
  }

  return { allowed: true };
}

export function describeMedicationBlock(
  reason: MedicationGuardBlockReason,
): string {
  switch (reason) {
    case "care_contact_reply_turn":
      return "medication write attempted on a care contact reply turn";
    case "missing_medication_name":
      return "medication write had no name";
    case "medication_name_not_in_human_text":
      return "medication name was not present in any recent human message";
    case "dose_not_in_human_text":
      return "dose value was not present in any recent human message";
    case "schedule_not_in_human_text":
      return "schedule value was not present in any recent human message";
  }
}
