import crypto from "node:crypto";

function safeEqualHex(leftHex: string, rightHex: string): boolean {
  if (!/^[a-fA-F0-9]+$/.test(leftHex) || !/^[a-fA-F0-9]+$/.test(rightHex)) {
    return false;
  }
  const left = Buffer.from(leftHex, "hex");
  const right = Buffer.from(rightHex, "hex");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function parseSignatureCandidates(signature: string): string[] {
  const trimmed = signature.trim();
  if (trimmed.length === 0) return [];

  const rawParts = trimmed.split(",").map((part) => part.trim());
  const candidates: string[] = [];

  for (const part of rawParts) {
    if (!part) continue;
    if (part.startsWith("sha256=")) {
      candidates.push(part.slice("sha256=".length));
      continue;
    }
    if (part.startsWith("v1=")) {
      candidates.push(part.slice("v1=".length));
      continue;
    }
    if (part.startsWith("sig=")) {
      candidates.push(part.slice("sig=".length));
      continue;
    }
    const eqIdx = part.indexOf("=");
    if (eqIdx > 0 && eqIdx < part.length - 1) {
      candidates.push(part.slice(eqIdx + 1));
      continue;
    }
    candidates.push(part);
  }

  return candidates
    .map((candidate) => candidate.trim())
    .filter((candidate) => candidate.length > 0);
}

export function verifyLinqSignature(
  rawBody: string,
  signature: string | undefined,
  secret: string | undefined,
  timestamp?: string,
): boolean {
  if (!secret) return true;
  if (!signature) return false;

  const incomingCandidates = parseSignatureCandidates(signature);
  if (incomingCandidates.length === 0) {
    return false;
  }

  const expectedCandidates = [crypto.createHmac("sha256", secret).update(rawBody).digest("hex")];
  if (timestamp && timestamp.trim().length > 0) {
    expectedCandidates.push(
      crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex"),
    );
  }

  for (const incoming of incomingCandidates) {
    for (const expected of expectedCandidates) {
      if (safeEqualHex(incoming, expected)) {
        return true;
      }
    }
  }
  return false;
}
