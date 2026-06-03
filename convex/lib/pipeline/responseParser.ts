import { normalizeMemoryCategory } from "../memory";
import type { AgentResponse } from "./types";

const EMPTY_ARRAYS: Omit<
  AgentResponse,
  "smsResponse" | "internalNotes" | "userProfileUpdate" | "careCaseProfileUpdate"
> = {
  userMemoryUpdates: [],
  careCaseMemoryUpdates: [],
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
  self_corrections: "selfCorrections",
  medication_updates: "medicationUpdates",
  schedule_updates: "scheduleUpdates",
  calendar_updates: "calendarUpdates",
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

function str(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeCalendarUpdates(value: unknown): AgentResponse["calendarUpdates"] {
  if (!Array.isArray(value)) return undefined;
  const updates: NonNullable<AgentResponse["calendarUpdates"]> = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const r = entry as Record<string, unknown>;
    const rawAction = str(r.action);
    const action =
      rawAction === "create" || rawAction === "update" || rawAction === "delete"
        ? rawAction
        : undefined;
    if (!action) continue;
    updates.push({
      action,
      title: str(r.title),
      date: str(r.date),
      startTime: str(r.startTime) ?? str(r.start_time),
      endTime: str(r.endTime) ?? str(r.end_time),
      description: str(r.description),
      location: str(r.location),
      eventId: str(r.eventId) ?? str(r.event_id),
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
    calendarUpdates: normalizeCalendarUpdates(result.calendarUpdates),
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
