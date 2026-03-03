import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { config } from "../src/config.js";
import { ConvexGateway } from "../src/convex/client.js";

type SnapshotRecord =
  | { kind: "family"; familyId: string; payload: { routing?: { members?: Record<string, unknown> } } }
  | { kind: "member"; familyId: string; memberId: string }
  | { kind: "conversation"; phone: string; month: string };

interface SnapshotChecksumFile {
  generatedAt: string;
  workspaceRoot: string;
  counts: {
    families: number;
    members: number;
    conversations: number;
  };
  checksums: Record<string, string>;
}

interface IntegrityState {
  counts: {
    families: number;
    members: number;
    conversations: number;
  };
  families: Array<{
    familyId: string;
    markdown: string;
    updatedAt: string;
  }>;
  members: Array<{
    familyId: string;
    memberId: string;
    phone: string;
    chatId: string | null;
    memberMarkdown: string;
    active: boolean;
  }>;
  summaries: Array<{
    phone: string;
    month: string;
    watermarkLines: number;
  }>;
}

function sha256(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function loadSnapshotRecords(snapshotPath: string): SnapshotRecord[] {
  const lines = fs
    .readFileSync(snapshotPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.map((line) => JSON.parse(line) as SnapshotRecord);
}

async function main(): Promise<void> {
  const snapshotPath = path.resolve(config.snapshotOut);
  const checksumPath = path.resolve(config.snapshotChecksumOut);
  const outputPath = path.resolve("fixtures/import-integrity-summary.json");

  if (!fs.existsSync(snapshotPath)) {
    throw new Error(`Snapshot file not found at ${snapshotPath}. Run npm run snapshot first.`);
  }
  if (!fs.existsSync(checksumPath)) {
    throw new Error(`Checksum file not found at ${checksumPath}. Run npm run snapshot first.`);
  }
  if (!config.convexUrl) {
    throw new Error("CONVEX_URL is required to verify import integrity.");
  }

  const snapshotRecords = loadSnapshotRecords(snapshotPath);
  const checksumFile = JSON.parse(fs.readFileSync(checksumPath, "utf8")) as SnapshotChecksumFile;

  const familyRecords = snapshotRecords.filter(
    (record): record is Extract<SnapshotRecord, { kind: "family" }> => record.kind === "family",
  );
  const memberRecords = snapshotRecords.filter(
    (record): record is Extract<SnapshotRecord, { kind: "member" }> => record.kind === "member",
  );
  const conversationRecords = snapshotRecords.filter(
    (record): record is Extract<SnapshotRecord, { kind: "conversation" }> => record.kind === "conversation",
  );

  const expectedRoutingMembers = familyRecords.flatMap((record) =>
    Object.keys(record.payload.routing?.members ?? {}).map((phone) => ({
      familyId: record.familyId,
      phone,
    })),
  );

  const convex = new ConvexGateway(config.convexUrl);
  const state = await convex.query<IntegrityState>("ops_v2.js:getMigrationIntegrityState", {});

  const familyById = new Map(state.families.map((family) => [family.familyId, family]));
  const memberByFamilyMember = new Map(state.members.map((member) => [`${member.familyId}:${member.memberId}`, member]));
  const memberByFamilyPhone = new Set(state.members.map((member) => `${member.familyId}:${member.phone}`));

  const missingFamilies = familyRecords
    .map((record) => record.familyId)
    .filter((familyId) => !familyById.has(familyId));

  const familyChecksumMismatches = familyRecords
    .map((record) => {
      const key = `family:${record.familyId}`;
      const expected = checksumFile.checksums[key];
      const actualDoc = familyById.get(record.familyId);
      const actual = actualDoc ? sha256(actualDoc.markdown) : null;
      return expected === actual
        ? null
        : {
            key,
            expected,
            actual,
          };
    })
    .filter((entry): entry is { key: string; expected: string; actual: string | null } => entry !== null);

  const memberChecksumMismatches = memberRecords
    .map((record) => {
      const key = `member:${record.familyId}:${record.memberId}`;
      const expected = checksumFile.checksums[key];
      const actualDoc = memberByFamilyMember.get(`${record.familyId}:${record.memberId}`);
      const actual = actualDoc ? sha256(actualDoc.memberMarkdown) : null;
      return expected === actual
        ? null
        : {
            key,
            expected,
            actual,
          };
    })
    .filter((entry): entry is { key: string; expected: string; actual: string | null } => entry !== null);

  const missingRoutingMembers = expectedRoutingMembers.filter(
    ({ familyId, phone }) => !memberByFamilyPhone.has(`${familyId}:${phone}`),
  );

  const conversationCompleteness =
    conversationRecords.length === 0 ? 1 : state.counts.conversations / conversationRecords.length;
  const conversationOverage = Math.max(0, state.counts.conversations - conversationRecords.length);

  const summary = {
    generatedAt: new Date().toISOString(),
    expected: {
      counts: checksumFile.counts,
      routingMembers: expectedRoutingMembers.length,
    },
    actual: {
      counts: state.counts,
    },
    checks: {
      familyCountMatch: state.counts.families === checksumFile.counts.families,
      memberCountAtLeastSnapshot: state.counts.members >= checksumFile.counts.members,
      conversationCompleteness,
      conversationOverage,
      missingFamilies,
      missingRoutingMembers: missingRoutingMembers.slice(0, 25),
      familyChecksumMismatches: familyChecksumMismatches.slice(0, 25),
      memberChecksumMismatches: memberChecksumMismatches.slice(0, 25),
    },
  };

  const pass =
    summary.checks.familyCountMatch &&
    summary.checks.memberCountAtLeastSnapshot &&
    summary.checks.conversationCompleteness >= 0.999 &&
    summary.checks.conversationOverage === 0 &&
    summary.checks.missingFamilies.length === 0 &&
    summary.checks.missingRoutingMembers.length === 0 &&
    summary.checks.familyChecksumMismatches.length === 0 &&
    summary.checks.memberChecksumMismatches.length === 0;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        ...summary,
        pass,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  console.log(`Import integrity summary written: ${outputPath}`);
  console.log(`Pass: ${pass}`);
  console.log(`Conversation completeness: ${(summary.checks.conversationCompleteness * 100).toFixed(2)}%`);
  console.log(`Conversation overage: ${summary.checks.conversationOverage}`);

  process.exit(pass ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
