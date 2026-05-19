import { normalizeMemoryCategory } from "../memory";
import type { AgentResponse } from "./types";

const EMPTY_ARRAYS: Omit<
  AgentResponse,
  "smsResponse" | "internalNotes" | "userProfileUpdate" | "careCaseProfileUpdate"
> = {
  userMemoryUpdates: [],
  careCaseMemoryUpdates: [],
  memoryArchiveUpdates: [],
  selfCorrections: [],
  reactions: [],
  effect: null,
};

const SNAKE_TO_CAMEL: Record<string, string> = {
  sms_response: "smsResponse",
  internal_notes: "internalNotes",
  user_profile_update: "userProfileUpdate",
  care_case_profile_update: "careCaseProfileUpdate",
  user_memory_updates: "userMemoryUpdates",
  care_case_memory_updates: "careCaseMemoryUpdates",
  memory_archive_updates: "memoryArchiveUpdates",
  self_corrections: "selfCorrections",
  medication_updates: "medicationUpdates",
  schedule_updates: "scheduleUpdates",
  care_contact_updates: "careContactUpdates",
  coordination_event_updates: "coordinationEventUpdates",
  target_message: "targetMessage",
};

function normalizeMemoryUpdates(value: unknown) {
  if (!Array.isArray(value)) return [];
  const updates: AgentResponse["userMemoryUpdates"] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const content = String(record.content ?? "").trim();
    if (!content) continue;

    updates.push({
      category: normalizeMemoryCategory(
        typeof record.category === "string" ? record.category : undefined,
      ),
      content,
      source:
        typeof record.source === "string" && record.source.trim()
          ? record.source.trim()
          : undefined,
    });
  }
  return updates;
}

function normalizeMemoryArchiveUpdates(
  value: unknown,
): AgentResponse["memoryArchiveUpdates"] {
  if (!Array.isArray(value)) return [];
  const updates: AgentResponse["memoryArchiveUpdates"] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const rawMatch =
      (record.matchContent as unknown) ?? (record.match_content as unknown);
    const matchContent = typeof rawMatch === "string" ? rawMatch.trim() : "";
    if (!matchContent) continue;

    const rawScope = typeof record.scope === "string" ? record.scope : "";
    const scope: "user" | "care_case" =
      rawScope === "user" ? "user" : "care_case";

    updates.push({ scope, matchContent });
  }
  return updates;
}

const VALID_CARE_CONTACT_TYPES = new Set([
  "family",
  "professional_caregiver",
  "agency",
  "clinician",
  "other",
]);

function normalizeCareContactUpdates(
  value: unknown,
): AgentResponse["careContactUpdates"] {
  if (!Array.isArray(value)) return undefined;
  const updates: NonNullable<AgentResponse["careContactUpdates"]> = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;

    const name = typeof record.name === "string" ? record.name.trim() : "";
    if (!name) continue;

    const action = record.action === "archive" ? "archive" : "upsert";
    const rawContactType =
      (record.contactType as unknown) ?? (record.contact_type as unknown);
    const contactType = VALID_CARE_CONTACT_TYPES.has(
      typeof rawContactType === "string" ? rawContactType : "",
    )
      ? (rawContactType as
          | "family"
          | "professional_caregiver"
          | "agency"
          | "clinician"
          | "other")
      : "other";

    const phone =
      typeof record.phone === "string" && record.phone.trim()
        ? record.phone.trim()
        : undefined;
    const role =
      typeof record.role === "string" && record.role.trim()
        ? record.role.trim()
        : undefined;
    const rawAgency =
      (record.agencyName as unknown) ?? (record.agency_name as unknown);
    const agencyName =
      typeof rawAgency === "string" && rawAgency.trim()
        ? rawAgency.trim()
        : undefined;
    const notes =
      typeof record.notes === "string" && record.notes.trim()
        ? record.notes.trim()
        : undefined;

    updates.push({ action, name, phone, contactType, role, agencyName, notes });
  }
  return updates;
}

const VALID_COORDINATION_TYPES = new Set([
  "coverage_gap",
  "confirmation",
  "refill",
  "followup",
  "other",
]);

const VALID_COORDINATION_STATUSES = new Set([
  "drafted",
  "awaiting_reply",
  "resolved",
  "abandoned",
]);

const VALID_COORDINATION_ACTIONS = new Set([
  "create",
  "update",
  "resolve",
  "abandon",
]);

function normalizeCoordinationEventUpdates(
  value: unknown,
): AgentResponse["coordinationEventUpdates"] {
  if (!Array.isArray(value)) return undefined;
  const updates: NonNullable<AgentResponse["coordinationEventUpdates"]> = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;

    const title = typeof record.title === "string" ? record.title.trim() : "";
    if (!title) continue;

    const rawAction = typeof record.action === "string" ? record.action : "";
    const action = VALID_COORDINATION_ACTIONS.has(rawAction)
      ? (rawAction as "create" | "update" | "resolve" | "abandon")
      : "create";

    const rawType = typeof record.type === "string" ? record.type : "";
    const type = VALID_COORDINATION_TYPES.has(rawType)
      ? (rawType as
          | "coverage_gap"
          | "confirmation"
          | "refill"
          | "followup"
          | "other")
      : undefined;

    const rawStatus = typeof record.status === "string" ? record.status : "";
    const status = VALID_COORDINATION_STATUSES.has(rawStatus)
      ? (rawStatus as
          | "drafted"
          | "awaiting_reply"
          | "resolved"
          | "abandoned")
      : undefined;

    const description =
      typeof record.description === "string" && record.description.trim()
        ? record.description.trim()
        : undefined;
    const rawWaitingOn =
      (record.waitingOnName as unknown) ?? (record.waiting_on_name as unknown);
    const waitingOnName =
      typeof rawWaitingOn === "string" && rawWaitingOn.trim()
        ? rawWaitingOn.trim()
        : undefined;
    const rawDraft =
      (record.draftMessage as unknown) ?? (record.draft_message as unknown);
    const draftMessage =
      typeof rawDraft === "string" && rawDraft.trim()
        ? rawDraft.trim()
        : undefined;
    const rawDueAt = (record.dueAt as unknown) ?? (record.due_at as unknown);
    const dueAt = typeof rawDueAt === "number" ? rawDueAt : undefined;
    const rawResolution =
      (record.resolutionNote as unknown) ?? (record.resolution_note as unknown);
    const resolutionNote =
      typeof rawResolution === "string" && rawResolution.trim()
        ? rawResolution.trim()
        : undefined;

    updates.push({
      action,
      type,
      title,
      description,
      status,
      waitingOnName,
      draftMessage,
      dueAt,
      resolutionNote,
    });
  }
  return updates;
}

export function normalizeResponse(parsed: Record<string, unknown>): AgentResponse {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed)) {
    result[SNAKE_TO_CAMEL[key] ?? key] = value;
  }

  return {
    smsResponse: String(result.smsResponse ?? ""),
    internalNotes: String(result.internalNotes ?? ""),
    userProfileUpdate:
      result.userProfileUpdate && typeof result.userProfileUpdate === "object"
        ? (result.userProfileUpdate as AgentResponse["userProfileUpdate"])
        : null,
    careCaseProfileUpdate:
      result.careCaseProfileUpdate && typeof result.careCaseProfileUpdate === "object"
        ? (result.careCaseProfileUpdate as AgentResponse["careCaseProfileUpdate"])
        : null,
    userMemoryUpdates: normalizeMemoryUpdates(result.userMemoryUpdates),
    careCaseMemoryUpdates: normalizeMemoryUpdates(result.careCaseMemoryUpdates),
    memoryArchiveUpdates: normalizeMemoryArchiveUpdates(result.memoryArchiveUpdates),
    selfCorrections: Array.isArray(result.selfCorrections) ? result.selfCorrections : [],
    reactions: Array.isArray(result.reactions) ? result.reactions : [],
    effect:
      result.effect && typeof result.effect === "object"
        ? (result.effect as AgentResponse["effect"])
        : null,
    medicationUpdates: Array.isArray(result.medicationUpdates)
      ? (result.medicationUpdates as AgentResponse["medicationUpdates"])
      : undefined,
    scheduleUpdates: Array.isArray(result.scheduleUpdates)
      ? (result.scheduleUpdates as AgentResponse["scheduleUpdates"])
      : undefined,
    careContactUpdates: normalizeCareContactUpdates(result.careContactUpdates),
    coordinationEventUpdates: normalizeCoordinationEventUpdates(
      result.coordinationEventUpdates,
    ),
  };
}

export function extractJson(raw: string | null | undefined): AgentResponse {
  if (!raw) {
    throw new SyntaxError("Empty model response");
  }

  const text = raw.trim();

  try {
    return normalizeResponse(JSON.parse(text));
  } catch {
    // continue
  }

  if (text.startsWith("```")) {
    const stripped = text
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "");
    try {
      return normalizeResponse(JSON.parse(stripped.trim()));
    } catch {
      // continue
    }
  }

  const start = text.indexOf("{");
  if (start >= 0) {
    const end = text.lastIndexOf("}");
    if (end > start) {
      try {
        return normalizeResponse(JSON.parse(text.slice(start, end + 1)));
      } catch {
        // continue
      }
    }
  }

  const smsMatch = /"sms_response"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(text);
  if (smsMatch) {
    return {
      smsResponse: smsMatch[1],
      internalNotes: "Extracted from malformed response",
      userProfileUpdate: null,
      careCaseProfileUpdate: null,
      ...EMPTY_ARRAYS,
    };
  }

  if (!text.startsWith("{")) {
    return {
      smsResponse: text,
      internalNotes: "Model responded with plain text instead of JSON",
      userProfileUpdate: null,
      careCaseProfileUpdate: null,
      ...EMPTY_ARRAYS,
    };
  }

  throw new SyntaxError(`No valid JSON found in response: ${text.slice(0, 200)}`);
}
