import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyLinqSignature } from "../src/utils/signature.js";

function hmac(secret: string, payload: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

describe("verifyLinqSignature", () => {
  const secret = "test-secret";
  const body = JSON.stringify({ event_id: "evt-1", hello: "world" });
  const timestamp = "1700000000";

  it("returns true when webhook secret is not configured", () => {
    expect(verifyLinqSignature(body, undefined, undefined)).toBe(true);
  });

  it("accepts legacy raw-body signature", () => {
    const sig = `sha256=${hmac(secret, body)}`;
    expect(verifyLinqSignature(body, sig, secret)).toBe(true);
  });

  it("accepts timestamped webhook signature", () => {
    const sig = hmac(secret, `${timestamp}.${body}`);
    expect(verifyLinqSignature(body, sig, secret, timestamp)).toBe(true);
  });

  it("accepts v1 tokenized signature header", () => {
    const sig = hmac(secret, `${timestamp}.${body}`);
    const header = `t=${timestamp},v1=${sig}`;
    expect(verifyLinqSignature(body, header, secret, timestamp)).toBe(true);
  });

  it("rejects invalid signatures", () => {
    expect(verifyLinqSignature(body, "sha256=deadbeef", secret)).toBe(false);
  });
});
