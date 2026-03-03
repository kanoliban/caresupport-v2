import fs from "node:fs";
import path from "node:path";
import { config } from "../src/config.js";
import { ConvexGateway } from "../src/convex/client.js";

interface SnapshotRecord {
  kind: "family" | "member" | "conversation";
  [key: string]: unknown;
}

async function main(): Promise<void> {
  const snapshotPath = path.resolve(config.snapshotOut);
  const dryRun = process.argv.includes("--dry-run");

  if (!fs.existsSync(snapshotPath)) {
    throw new Error(`Snapshot file not found: ${snapshotPath}. Run npm run snapshot first.`);
  }

  const lines = fs
    .readFileSync(snapshotPath, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const records = lines.map((line) => JSON.parse(line) as SnapshotRecord);
  const counts = { family: 0, member: 0, conversation: 0 };

  if (dryRun) {
    for (const record of records) {
      counts[record.kind] += 1;
    }
    console.log("Dry run only; no Convex writes performed.");
    console.log(counts);
    return;
  }

  if (!config.convexUrl) {
    throw new Error("CONVEX_URL is required for import writes.");
  }

  const convex = new ConvexGateway(config.convexUrl);

  for (const record of records) {
    await convex.mutation("importer_v2.js:ingestSnapshotRecord", { record });
    counts[record.kind] += 1;
  }

  await convex.action("importer_v2.js:finalizeImport", {
    counts,
    importedAt: new Date().toISOString(),
  });

  console.log("Import completed.");
  console.log(counts);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
