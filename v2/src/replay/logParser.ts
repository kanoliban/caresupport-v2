import fs from "node:fs";
import path from "node:path";
import type { ReplayCase } from "./types.js";

const ENTRY_START_RE = /^\[(?<ts>[^\]]+)\] \[(?<direction>INBOUND|OUTBOUND)\] /;

interface ParsedEntry {
  timestamp: string;
  direction: "INBOUND" | "OUTBOUND";
  text: string;
}

export function parseConversationLog(content: string): ParsedEntry[] {
  const lines = content.split(/\r?\n/);
  const entries: ParsedEntry[] = [];

  for (const line of lines) {
    const match = ENTRY_START_RE.exec(line);
    if (match?.groups?.direction) {
      const direction = match.groups.direction as ParsedEntry["direction"];
      const timestamp = match.groups.ts ?? "";
      const text = line.replace(ENTRY_START_RE, "").trim();
      entries.push({ timestamp, direction, text });
      continue;
    }

    if (entries.length > 0 && line.trim().length > 0) {
      entries[entries.length - 1].text += `\n${line.trim()}`;
    }
  }

  return entries;
}

export function buildReplayCasesFromLogFile(filePath: string): ReplayCase[] {
  const content = fs.readFileSync(filePath, "utf8");
  const entries = parseConversationLog(content);
  const phone = path.basename(path.dirname(filePath));
  const cases: ReplayCase[] = [];

  let seq = 1;
  for (let i = 0; i < entries.length - 1; i += 1) {
    const current = entries[i];
    const next = entries[i + 1];
    if (current.direction !== "INBOUND") continue;
    if (next.direction !== "OUTBOUND") continue;

    cases.push({
      caseId: `${phone}-${seq}`,
      sourceFile: filePath,
      phone,
      receivedAt: current.timestamp,
      inboundText: current.text,
      expectedOutboundText: next.text,
    });
    seq += 1;
  }

  return cases;
}
