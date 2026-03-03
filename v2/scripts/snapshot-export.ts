import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { config } from "../src/config.js";

type SnapshotRecord =
  | { kind: "family"; familyId: string; payload: Record<string, unknown> }
  | { kind: "member"; familyId: string; memberId: string; payload: Record<string, unknown> }
  | { kind: "conversation"; phone: string; month: string; payload: { log: string } };

function sha256(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function readIfExists(filePath: string): string {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function parseJsonSafe(filePath: string): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

function main(): void {
  const explicit = process.argv[2];
  const candidateRoots = explicit
    ? [path.resolve(explicit)]
    : [path.resolve("fork/workspace"), path.resolve("../fork/workspace")];
  const workspaceRoot = candidateRoots.find((c) => fs.existsSync(c));
  if (!workspaceRoot) {
    throw new Error(`Could not locate workspace root. Tried: ${candidateRoots.join(", ")}`);
  }
  const familiesRoot = path.join(workspaceRoot, "families");
  const conversationsRoot = path.join(workspaceRoot, "conversations");

  const records: SnapshotRecord[] = [];
  const checksums: Record<string, string> = {};
  const counts = { families: 0, members: 0, conversations: 0 };

  for (const familyId of fs.readdirSync(familiesRoot)) {
    const familyDir = path.join(familiesRoot, familyId);
    if (!fs.statSync(familyDir).isDirectory()) continue;

    const familyMarkdown = readIfExists(path.join(familyDir, "family.md"));
    const scheduleMarkdown = readIfExists(path.join(familyDir, "schedule.md"));
    const medicationsMarkdown = readIfExists(path.join(familyDir, "medications.md"));
    const lessonsMarkdown = readIfExists(path.join(familyDir, "lessons.md"));
    const routing = parseJsonSafe(path.join(familyDir, "routing.json"));

    records.push({
      kind: "family",
      familyId,
      payload: {
        familyMarkdown,
        scheduleMarkdown,
        medicationsMarkdown,
        lessonsMarkdown,
        routing,
      },
    });
    checksums[`family:${familyId}`] = sha256(familyMarkdown + scheduleMarkdown + medicationsMarkdown + lessonsMarkdown);
    counts.families += 1;

    const membersDir = path.join(familyDir, "members");
    if (fs.existsSync(membersDir)) {
      for (const memberFile of fs.readdirSync(membersDir)) {
        if (!memberFile.endsWith(".md")) continue;
        const memberId = memberFile.replace(/\.md$/, "");
        const content = readIfExists(path.join(membersDir, memberFile));
        records.push({
          kind: "member",
          familyId,
          memberId,
          payload: { markdown: content },
        });
        checksums[`member:${familyId}:${memberId}`] = sha256(content);
        counts.members += 1;
      }
    }
  }

  for (const phone of fs.readdirSync(conversationsRoot)) {
    const phoneDir = path.join(conversationsRoot, phone);
    if (!fs.statSync(phoneDir).isDirectory()) continue;
    for (const file of fs.readdirSync(phoneDir)) {
      if (!file.endsWith(".log")) continue;
      const log = readIfExists(path.join(phoneDir, file));
      records.push({ kind: "conversation", phone, month: file.replace(/\.log$/, ""), payload: { log } });
      checksums[`conversation:${phone}:${file}`] = sha256(log);
      counts.conversations += 1;
    }
  }

  const outPath = path.resolve(config.snapshotOut);
  const checksumPath = path.resolve(config.snapshotChecksumOut);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, records.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
  fs.writeFileSync(
    checksumPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        workspaceRoot,
        counts,
        checksums,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  console.log(`Snapshot exported: ${outPath}`);
  console.log(`Checksum report:  ${checksumPath}`);
  console.log(`Counts: families=${counts.families}, members=${counts.members}, conversations=${counts.conversations}`);
}

main();
