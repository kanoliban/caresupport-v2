import type { AgentResponse } from "./types";

const EMPTY_ARRAYS: Omit<AgentResponse, "smsResponse" | "internalNotes"> = {
  needsOutreach: [],
  familyFileUpdates: [],
  selfCorrections: [],
  memberUpdates: [],
  routingUpdates: [],
};

const SNAKE_TO_CAMEL: Record<string, keyof AgentResponse> = {
  sms_response: "smsResponse",
  internal_notes: "internalNotes",
  needs_outreach: "needsOutreach",
  family_file_updates: "familyFileUpdates",
  self_corrections: "selfCorrections",
  member_updates: "memberUpdates",
  routing_updates: "routingUpdates",
  old_content: "oldContent" as keyof AgentResponse,
  access_level: "accessLevel" as keyof AgentResponse,
};

export function normalizeResponse(parsed: Record<string, unknown>): AgentResponse {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed)) {
    const camelKey = SNAKE_TO_CAMEL[key] ?? key;
    result[camelKey] = value;
  }

  return {
    smsResponse: String(result.smsResponse ?? ""),
    internalNotes: String(result.internalNotes ?? ""),
    needsOutreach: Array.isArray(result.needsOutreach) ? result.needsOutreach : [],
    familyFileUpdates: Array.isArray(result.familyFileUpdates) ? result.familyFileUpdates : [],
    selfCorrections: Array.isArray(result.selfCorrections) ? result.selfCorrections : [],
    memberUpdates: Array.isArray(result.memberUpdates) ? result.memberUpdates : [],
    routingUpdates: Array.isArray(result.routingUpdates) ? result.routingUpdates : [],
  };
}

export function extractJson(raw: string | null | undefined): AgentResponse {
  if (!raw) {
    throw new SyntaxError("Empty model response");
  }

  const text = raw.trim();

  // Strategy 1: direct parse
  try {
    return normalizeResponse(JSON.parse(text));
  } catch {
    // continue to next strategy
  }

  // Strategy 2: strip markdown fences
  if (text.startsWith("```")) {
    const stripped = text
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "");
    try {
      return normalizeResponse(JSON.parse(stripped.trim()));
    } catch {
      // continue to next strategy
    }
  }

  // Strategy 3: find outermost { ... } substring
  const start = text.indexOf("{");
  if (start >= 0) {
    const end = text.lastIndexOf("}");
    if (end > start) {
      try {
        return normalizeResponse(JSON.parse(text.slice(start, end + 1)));
      } catch {
        // continue to next strategy
      }
    }
  }

  // Strategy 4: regex extract sms_response from malformed response
  const smsMatch = /"sms_response"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(text);
  if (smsMatch) {
    return {
      smsResponse: smsMatch[1],
      internalNotes: "Extracted from malformed response",
      ...EMPTY_ARRAYS,
    };
  }

  // Strategy 5: plain text fallback — model responded conversationally
  if (!text.startsWith("{")) {
    return {
      smsResponse: text,
      internalNotes: "Model responded with plain text instead of JSON",
      ...EMPTY_ARRAYS,
    };
  }

  throw new SyntaxError(`No valid JSON found in response: ${text.slice(0, 200)}`);
}
