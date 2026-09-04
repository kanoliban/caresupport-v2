import { describe, expect, it } from "vitest";
import { checkMedicationWriteGrounding } from "./careWriteGuards";

const coordinatorTurn = { isCareContactReply: false };

describe("checkMedicationWriteGrounding", () => {
  it("blocks a dose the user never reported", () => {
    // #given the user said "Stop" and the model asked "did the dose change too?"
    // #when the model writes an answer nobody gave
    const verdict = checkMedicationWriteGrounding(
      { action: "update", name: "insulin", dose: "14 units" },
      { ...coordinatorTurn, humanText: "Stop" },
    );

    // #then the phantom change never reaches the patient record
    expect(verdict).toEqual({
      allowed: false,
      reason: "medication_name_not_in_human_text",
    });
  });

  it("blocks a dose change when only the name was mentioned", () => {
    const verdict = checkMedicationWriteGrounding(
      { action: "update", name: "insulin", dose: "14 units" },
      { ...coordinatorTurn, humanText: "did she get her insulin this morning?" },
    );

    expect(verdict).toEqual({
      allowed: false,
      reason: "dose_not_in_human_text",
    });
  });

  it("allows a change the user actually stated", () => {
    const verdict = checkMedicationWriteGrounding(
      { action: "update", name: "insulin", dose: "14 units" },
      {
        ...coordinatorTurn,
        humanText: "the clinic moved her insulin up to 14 units",
      },
    );

    expect(verdict).toEqual({ allowed: true });
  });

  it("allows a multi-turn add where the dose came in a later message", () => {
    // #given "add her Lantus" then "10 units at bedtime", both human-authored
    const verdict = checkMedicationWriteGrounding(
      { action: "add", name: "Lantus insulin glargine", dose: "10 units" },
      {
        ...coordinatorTurn,
        humanText: "10 units at bedtime add her Lantus to the list",
      },
    );

    expect(verdict).toEqual({ allowed: true });
  });

  it("allows non-numeric doses through the numeric check", () => {
    const verdict = checkMedicationWriteGrounding(
      { action: "update", name: "metformin", dose: "as directed" },
      { ...coordinatorTurn, humanText: "take the metformin as directed now" },
    );

    expect(verdict).toEqual({ allowed: true });
  });

  it("blocks a schedule time nobody named", () => {
    const verdict = checkMedicationWriteGrounding(
      { action: "update", name: "metformin", schedule: "08:00 daily" },
      { ...coordinatorTurn, humanText: "she is back on metformin" },
    );

    expect(verdict).toEqual({
      allowed: false,
      reason: "schedule_not_in_human_text",
    });
  });

  it("never lets a care contact's reply touch the medication record", () => {
    // #given a caregiver answering a shift-coverage text
    const verdict = checkMedicationWriteGrounding(
      { action: "update", name: "insulin", dose: "10 units" },
      {
        humanText: "I gave her the insulin, 10 units, before I left",
        isCareContactReply: true,
      },
    );

    // #then the write is refused regardless of how well it is grounded
    expect(verdict).toEqual({
      allowed: false,
      reason: "care_contact_reply_turn",
    });
  });

  it("rejects a nameless medication write", () => {
    const verdict = checkMedicationWriteGrounding(
      { action: "add", name: "  " },
      { ...coordinatorTurn, humanText: "add it please" },
    );

    expect(verdict).toEqual({
      allowed: false,
      reason: "missing_medication_name",
    });
  });

  it("requires the whole name for short ones with no safe partial match", () => {
    expect(
      checkMedicationWriteGrounding(
        { action: "add", name: "B12" },
        { ...coordinatorTurn, humanText: "she needs a supplement" },
      ),
    ).toEqual({
      allowed: false,
      reason: "medication_name_not_in_human_text",
    });

    expect(
      checkMedicationWriteGrounding(
        { action: "add", name: "B12" },
        { ...coordinatorTurn, humanText: "start her on B12" },
      ),
    ).toEqual({ allowed: true });
  });
});
