import { normalizeMemoryCategory } from "../memory";
import type {
  AgentResponse,
  CareContactType,
  CoordinationEventStatus,
  CoordinationEventType,
  CoordinationUrgency,
} from "./types";

const EMPTY_ARRAYS: Omit<
  AgentResponse,
  "smsResponse" | "internalNotes" | "userProfileUpdate" | "careCaseProfileUpdate"
> = {
  userMemoryUpdates: [],
  careCaseMemoryUpdates: [],
  selfCorrections: [],
  reactions: [],
  effect: null,
  careContactUpdates: [],
  coordinationEventUpdates: [],
  outreachRequests: [],
};

const SNAKE_TO_CAMEL: Record<string, string> = {
  sms_response: "smsResponse",
  internal_notes: "internalNotes",
  user_profile_update: "userProfileUpdate",
  care_case_profile_update: "careCaseProfileUpdate",
  user_memory_updates: "userMemoryUpdates",
  care_case_memory_updates: "careCaseMemoryUpdates",
  self_corrections: "selfCorrections",
  medication_updates: "medicationUpdates",
  schedule_updates: "scheduleUpdates",
  care_contact_updates: "careContactUpdates",
  coordination_event_updates: "coordinationEventUpdates",
  outreach_requests: "outreachRequests",
  target_message: "targetMessage",
};

const ACTIONS = new Set(["add", "update", "remove"]);
const CONTACT_TYPES = new Set([
  "family",
  "professional_caregiver",
  "agency",
  "clinician",
  "other",
]);
const COORDINATION_EVENT_TYPES = new Set([
  "coverage_gap",
  "schedule_change",
  "handoff",
  "task_followup",
  "appointment",
  "medication",
  "outreach",
  "other",
]);
const COORDINATION_EVENT_STATUSES = new Set([
  "open",
  "waiting",
  "resolved",
  "cancelled",
]);
const COORDINATION_URGENCIES = new Set(["low", "normal", "high", "urgent"]);

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

function stringField(
  record: Record<string, unknown>,
  camelKey: string,
  snakeKey?: string,
): string | undefined {
  const raw = record[camelKey] ?? (snakeKey ? record[snakeKey] : undefined);
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

function numberField(
  record: Record<string, unknown>,
  camelKey: string,
  snakeKey?: string,
): number | undefined {
  const raw = record[camelKey] ?? (snakeKey ? record[snakeKey] : undefined);
  return typeof raw === "number" && Number.isFinite(raw) ? raw : undefined;
}

function booleanField(
  record: Record<string, unknown>,
  camelKey: string,
  snakeKey?: string,
): boolean | undefined {
  const raw = record[camelKey] ?? (snakeKey ? record[snakeKey] : undefined);
  return typeof raw === "boolean" ? raw : undefined;
}

function stringArrayField(
  record: Record<string, unknown>,
  camelKey: string,
  snakeKey?: string,
): string[] | undefined {
  const raw = record[camelKey] ?? (snakeKey ? record[snakeKey] : undefined);
  if (!Array.isArray(raw)) return undefined;
  const values = raw
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return values.length > 0 ? values : undefined;
}

function enumField<T extends string>(
  record: Record<string, unknown>,
  camelKey: string,
  allowed: Set<string>,
  snakeKey?: string,
): T | undefined {
  const raw = stringField(record, camelKey, snakeKey);
  return raw && allowed.has(raw) ? (raw as T) : undefined;
}

function normalizeCareContactUpdates(value: unknown): AgentResponse["careContactUpdates"] {
  if (!Array.isArray(value)) return [];
  const updates: NonNullable<AgentResponse["careContactUpdates"]> = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const action = enumField<"add" | "update" | "remove">(record, "action", ACTIONS);
    const name = stringField(record, "name");
    const phone = stringField(record, "phone");
    if (!action || (!name && !phone)) continue;

    updates.push({
      action,
      name,
      phone,
      relationship: stringField(record, "relationship"),
      contactType: enumField<CareContactType>(
        record,
        "contactType",
        CONTACT_TYPES,
        "contact_type",
      ),
      agencyName: stringField(record, "agencyName", "agency_name"),
      role: stringField(record, "role"),
      availabilityNotes: stringField(
        record,
        "availabilityNotes",
        "availability_notes",
      ),
      contactPriority: numberField(record, "contactPriority", "contact_priority"),
      canReceiveTexts: booleanField(record, "canReceiveTexts", "can_receive_texts"),
      consentToContact: booleanField(
        record,
        "consentToContact",
        "consent_to_contact",
      ),
      active: booleanField(record, "active"),
      notes: stringField(record, "notes"),
    });
  }

  return updates;
}

function normalizeCoordinationEventUpdates(
  value: unknown,
): AgentResponse["coordinationEventUpdates"] {
  if (!Array.isArray(value)) return [];
  const updates: NonNullable<AgentResponse["coordinationEventUpdates"]> = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const action = enumField<"add" | "update" | "remove">(record, "action", ACTIONS);
    const title = stringField(record, "title");
    if (!action || !title) continue;

    updates.push({
      action,
      title,
      type: enumField<CoordinationEventType>(
        record,
        "type",
        COORDINATION_EVENT_TYPES,
      ),
      status: enumField<CoordinationEventStatus>(
        record,
        "status",
        COORDINATION_EVENT_STATUSES,
      ),
      urgency: enumField<CoordinationUrgency>(
        record,
        "urgency",
        COORDINATION_URGENCIES,
      ),
      description: stringField(record, "description"),
      startsAt: numberField(record, "startsAt", "starts_at"),
      endsAt: numberField(record, "endsAt", "ends_at"),
      originalAssigneeName: stringField(
        record,
        "originalAssigneeName",
        "original_assignee_name",
      ),
      confirmedContactNames: stringArrayField(
        record,
        "confirmedContactNames",
        "confirmed_contact_names",
      ),
      pendingContactNames: stringArrayField(
        record,
        "pendingContactNames",
        "pending_contact_names",
      ),
      declinedContactNames: stringArrayField(
        record,
        "declinedContactNames",
        "declined_contact_names",
      ),
      fallbackContactNames: stringArrayField(
        record,
        "fallbackContactNames",
        "fallback_contact_names",
      ),
      nextActionAt: numberField(record, "nextActionAt", "next_action_at"),
      escalationAt: numberField(record, "escalationAt", "escalation_at"),
      resolution: stringField(record, "resolution"),
    });
  }

  return updates;
}

function normalizeOutreachRequests(value: unknown): AgentResponse["outreachRequests"] {
  if (!Array.isArray(value)) return [];
  const requests: NonNullable<AgentResponse["outreachRequests"]> = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const contactName = stringField(record, "contactName", "contact_name");
    const purpose = stringField(record, "purpose");
    const message = stringField(record, "message");
    if (!contactName || !purpose || !message) continue;

    requests.push({
      contactName,
      purpose,
      message,
      coordinationEventTitle: stringField(
        record,
        "coordinationEventTitle",
        "coordination_event_title",
      ),
    });
  }

  return requests;
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
    outreachRequests: normalizeOutreachRequests(result.outreachRequests),
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
