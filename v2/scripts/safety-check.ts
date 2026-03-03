import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

interface SafetySummary {
  generatedAt: string;
  passed: boolean;
  command: string;
  exitCode: number | null;
  durationMs: number;
  testFiles: string[];
  stderrTail: string;
}

function main(): void {
  const testFiles = [
    "tests/enforcement.test.ts",
    "tests/contracts.test.ts",
    "tests/process-inbound-idempotency.test.ts",
  ];
  const commandParts = ["npm", "run", "test", "--", ...testFiles];
  const started = Date.now();
  const result = spawnSync(commandParts[0], commandParts.slice(1), {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
  });
  const durationMs = Date.now() - started;
  const stderr = `${result.stderr ?? ""}\n${result.stdout ?? ""}`.trim();

  const summary: SafetySummary = {
    generatedAt: new Date().toISOString(),
    passed: result.status === 0,
    command: commandParts.join(" "),
    exitCode: result.status,
    durationMs,
    testFiles,
    stderrTail: stderr.slice(-2000),
  };

  const outPath = path.resolve("fixtures/safety-summary.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2) + "\n", "utf8");

  console.log(`Safety summary written: ${outPath}`);
  console.log(`Safety passed: ${summary.passed}`);
  console.log(`Duration: ${durationMs}ms`);

  if (result.status !== 0) {
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    process.exit(result.status ?? 1);
  }
}

main();
