import { describe, expect, it } from "vitest";
import { isTestChatEnabled } from "./testChat";

describe("isTestChatEnabled", () => {
  it("is disabled in production", () => {
    expect(isTestChatEnabled("production")).toBe(false);
  });

  it("is enabled in the test env", () => {
    expect(isTestChatEnabled("test")).toBe(true);
  });

  it("is enabled when APP_ENV is unset (local dev)", () => {
    expect(isTestChatEnabled(undefined)).toBe(true);
  });
});
