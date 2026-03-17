import { describe, expect, it } from "vitest";
import { extractJson, normalizeResponse } from "./responseParser";

describe("extractJson", () => {
  it("parses clean JSON directly", () => {
    const input = JSON.stringify({
      sms_response: "Hello!",
      internal_notes: "Greeting",
      needs_outreach: [],
      family_file_updates: [],
      self_corrections: [],
      member_updates: [],
      routing_updates: [],
    });
    const result = extractJson(input);
    expect(result.smsResponse).toBe("Hello!");
    expect(result.internalNotes).toBe("Greeting");
  });

  it("strips markdown fences and parses", () => {
    const input = '```json\n{"sms_response": "Hi there"}\n```';
    const result = extractJson(input);
    expect(result.smsResponse).toBe("Hi there");
  });

  it("finds outermost { } when surrounded by text", () => {
    const input = 'Here is the response: {"sms_response": "Got it"} end';
    const result = extractJson(input);
    expect(result.smsResponse).toBe("Got it");
  });

  it("regex-extracts sms_response from malformed JSON", () => {
    const input = '{"sms_response": "Partial response", "internal_notes": broken}';
    const result = extractJson(input);
    expect(result.smsResponse).toBe("Partial response");
    expect(result.internalNotes).toBe("Extracted from malformed response");
  });

  it("wraps plain text as smsResponse", () => {
    const input = "Sure, I can help with that! Let me check the schedule.";
    const result = extractJson(input);
    expect(result.smsResponse).toBe(input);
    expect(result.internalNotes).toContain("plain text");
  });

  it("throws on empty/null input", () => {
    expect(() => extractJson(null)).toThrow("Empty model response");
    expect(() => extractJson("")).toThrow("Empty model response");
    expect(() => extractJson(undefined)).toThrow("Empty model response");
  });

  it("handles nested objects correctly", () => {
    const input = JSON.stringify({
      sms_response: "Done",
      internal_notes: "Updated",
      needs_outreach: [{ name: "Sarah", message: "Shift update" }],
      family_file_updates: [{ section: "This Week", operation: "append", content: "New entry", old_content: "" }],
      self_corrections: [],
      member_updates: [],
      routing_updates: [],
    });
    const result = extractJson(input);
    expect(result.needsOutreach).toHaveLength(1);
    expect(result.needsOutreach[0].name).toBe("Sarah");
    expect(result.needsOutreach[0].message).toBe("Shift update");
    expect(result.familyFileUpdates).toHaveLength(1);
  });

  it("handles partial JSON with valid sms_response field", () => {
    const input = '{"sms_response": "Good morning Rob!", "internal_notes": "Simple greeting", "needs_outreach": [], "family_file_updates": [], "self_corrections": [], "member_upda';
    const result = extractJson(input);
    expect(result.smsResponse).toBe("Good morning Rob!");
  });
});

describe("normalizeResponse", () => {
  it("maps snake_case keys to camelCase", () => {
    const result = normalizeResponse({
      sms_response: "Hello",
      internal_notes: "Note",
      needs_outreach: [],
      family_file_updates: [],
      self_corrections: ["fix"],
      member_updates: [],
      routing_updates: [],
    });
    expect(result.smsResponse).toBe("Hello");
    expect(result.internalNotes).toBe("Note");
    expect(result.selfCorrections).toEqual(["fix"]);
  });

  it("defaults missing fields to empty strings/arrays", () => {
    const result = normalizeResponse({});
    expect(result.smsResponse).toBe("");
    expect(result.internalNotes).toBe("");
    expect(result.needsOutreach).toEqual([]);
    expect(result.familyFileUpdates).toEqual([]);
    expect(result.selfCorrections).toEqual([]);
    expect(result.memberUpdates).toEqual([]);
    expect(result.routingUpdates).toEqual([]);
  });

  it("handles already-camelCase keys", () => {
    const result = normalizeResponse({
      smsResponse: "Hi",
      internalNotes: "Note",
    });
    expect(result.smsResponse).toBe("Hi");
    expect(result.internalNotes).toBe("Note");
  });
});
