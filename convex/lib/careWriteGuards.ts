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

/**
 * Clock times, as minutes since midnight, so "8am" and "08:00" compare equal
 * while "08:00" and "08:30" do not. Matches only expressions that are
 * unambiguously times — a bare "14" in "14 units" is a quantity, not 2 PM.
 */
const TIME_PATTERN = /(\d{1,2}):(\d{2})\s*(am|pm)?|(\d{1,2})\s*(am|pm)\b/gi;

function extractTimes(text: string): number[] {
  const times: number[] = [];
  const pattern = new RegExp(TIME_PATTERN.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const hasMinutes = match[1] !== undefined;
    let hour = Number(hasMinutes ? match[1] : match[4]);
    const minute = hasMinutes ? Number(match[2]) : 0;
    const meridiem = (hasMinutes ? match[3] : match[5])?.toLowerCase();
    if (hour > 23 || minute > 59) continue;
    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
    times.push(hour * 60 + minute);
  }
  return times;
}

/** Quantities, once clock times have been taken out of the running. */
function extractQuantities(text: string): number[] {
  const withoutTimes = text.replace(new RegExp(TIME_PATTERN.source, "gi"), " ");
  return (withoutTimes.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
}

/**
 * True when every number the model wrote also appears in human text, compared
 * as whole values rather than as substrings.
 *
 * Substring matching would let a model-authored "5 mg" pass against a human's
 * "25 mg", and matching on *any* number would let a multi-part value through on
 * one coincidence — in exactly the hallucination case this guard exists to
 * catch. Every component has to be accounted for.
 *
 * A value with no numbers at all ("as directed", "twice daily") carries no
 * numeric claim and is left to the name check.
 */
function numbersAppearInHumanText(value: string, humanText: string): boolean {
  const humanTimes = new Set(extractTimes(humanText));
  if (!extractTimes(value).every((time) => humanTimes.has(time))) {
    return false;
  }

  const humanQuantities = new Set(extractQuantities(humanText));
  return extractQuantities(value).every((quantity) =>
    humanQuantities.has(quantity),
  );
}

/**
 * True when the medication's name shows up in what a human wrote. Multi-word
 * brand/generic names ("Lantus insulin glargine") match on any meaningful
 * whole word, so "up her Lantus" grounds a write against the full name.
 */
function nameAppearsInHumanText(name: string, normalizedHumanText: string): boolean {
  const normalizedName = normalize(name);
  if (!normalizedName) return false;
  // A multi-word name may appear verbatim as a phrase.
  if (normalizedHumanText.includes(normalizedName)) return true;

  const tokens = normalizedName.split(" ").filter((token) => token.length >= 4);
  if (tokens.length === 0) {
    // Short names ("D3", "B12") have no safe partial match — require the whole
    // thing, which the phrase check above already tested.
    return false;
  }
  const humanWords = new Set(normalizedHumanText.split(" "));
  return tokens.some((token) => humanWords.has(token));
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

  // Names compare against normalized text; numbers compare against the raw
  // text, which still has the colons that make a clock time readable.
  const normalizedHumanText = normalize(context.humanText);
  if (!nameAppearsInHumanText(update.name, normalizedHumanText)) {
    return { allowed: false, reason: "medication_name_not_in_human_text" };
  }

  if (update.dose && !numbersAppearInHumanText(update.dose, context.humanText)) {
    return { allowed: false, reason: "dose_not_in_human_text" };
  }

  if (
    update.schedule &&
    !numbersAppearInHumanText(update.schedule, context.humanText)
  ) {
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
