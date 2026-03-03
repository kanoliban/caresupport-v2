import fs from "node:fs";
import path from "node:path";

interface GateResult {
  gate: string;
  status: "PASS" | "FAIL" | "WARN";
  detail: string;
}

function readJsonIfExists<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function main(): void {
  const importIntegrity = readJsonIfExists<{
    pass: boolean;
    expected: { counts: { families: number; members: number; conversations: number }; routingMembers: number };
    actual: { counts: { families: number; members: number; conversations: number } };
    checks: {
      familyCountMatch: boolean;
      memberCountAtLeastSnapshot: boolean;
      conversationCompleteness: number;
      conversationOverage: number;
      missingFamilies: string[];
      missingRoutingMembers: Array<{ familyId: string; phone: string }>;
      familyChecksumMismatches: Array<{ key: string; expected: string; actual: string | null }>;
      memberChecksumMismatches: Array<{ key: string; expected: string; actual: string | null }>;
    };
  }>(path.resolve("fixtures/import-integrity-summary.json"));
  const safety = readJsonIfExists<{
    passed: boolean;
    durationMs: number;
    testFiles: string[];
  }>(path.resolve("fixtures/safety-summary.json"));
  const replay = readJsonIfExists<{
    mode?: "deterministic" | "live";
    parityScore: number;
    lexicalParityScore?: number;
    lexicalPassed?: number;
    promiseWithoutAction: number;
    total: number;
  }>(
    path.resolve("fixtures/replay-summary.json"),
  );
  const perf = readJsonIfExists<{
    mode: "deterministic" | "live";
    total: number;
    errorRate: number;
    promiseWithoutAction: number;
    latencyMs: { p95: number };
    thresholds: { p95Ms: number; errorRate: number };
  }>(path.resolve("fixtures/perf-summary.json"));
  const rollback = readJsonIfExists<{
    mode: "tabletop" | "live";
    pass: boolean;
    estimatedFailbackSeconds: number;
  }>(path.resolve("fixtures/rollback-drill-summary.json"));

  const gates: GateResult[] = [];

  if (importIntegrity) {
    const ok = importIntegrity.pass;
    gates.push({
      gate: "Gate 1: Schema + import integrity",
      status: ok ? "PASS" : "FAIL",
      detail:
        `families expected/actual=${importIntegrity.expected.counts.families}/${importIntegrity.actual.counts.families}, ` +
        `members expected>=actual=${importIntegrity.expected.counts.members}/${importIntegrity.actual.counts.members}, ` +
        `conversation_completeness=${(importIntegrity.checks.conversationCompleteness * 100).toFixed(2)}%, ` +
        `conversation_overage=${importIntegrity.checks.conversationOverage}, ` +
        `missing_routing_members=${importIntegrity.checks.missingRoutingMembers.length}, ` +
        `family_checksum_mismatches=${importIntegrity.checks.familyChecksumMismatches.length}, ` +
        `member_checksum_mismatches=${importIntegrity.checks.memberChecksumMismatches.length}`,
    });
  } else {
    gates.push({
      gate: "Gate 1: Schema + import integrity",
      status: "FAIL",
      detail: "Missing fixtures/import-integrity-summary.json (run npm run verify-import).",
    });
  }

  if (replay) {
    const parityPass = replay.parityScore >= 0.995;
    const outreachPass = replay.promiseWithoutAction === 0;
    gates.push({
      gate: "Gate 3: Behavioral parity",
      status:
        replay.mode === "live" || replay.mode === undefined
          ? parityPass && outreachPass
            ? "PASS"
            : "FAIL"
          : "WARN",
      detail:
        replay.mode === "live" || replay.mode === undefined
          ? `mode=live, outcome_parity=${(replay.parityScore * 100).toFixed(2)}%, lexical_parity=${(((replay.lexicalParityScore ?? 0) * 100)).toFixed(2)}%, promise_without_action=${replay.promiseWithoutAction}, cases=${replay.total}`
          : `mode=${replay.mode}, outcome_parity=${(replay.parityScore * 100).toFixed(2)}% (informational only). Run replay with --live for release gate.`,
    });
  } else {
    gates.push({
      gate: "Gate 3: Behavioral parity",
      status: "FAIL",
      detail: "Missing fixtures/replay-summary.json (run npm run replay).",
    });
  }

  if (safety) {
    gates.push({
      gate: "Gate 2: Safety parity",
      status: safety.passed ? "PASS" : "FAIL",
      detail: `passed=${safety.passed}, duration=${safety.durationMs}ms, tests=${safety.testFiles.join(",")}`,
    });
  } else {
    gates.push({
      gate: "Gate 2: Safety parity",
      status: "FAIL",
      detail: "Missing fixtures/safety-summary.json (run npm run safety-check).",
    });
  }

  if (perf) {
    const thresholdPass = perf.latencyMs.p95 < perf.thresholds.p95Ms && perf.errorRate < perf.thresholds.errorRate;
    gates.push({
      gate: "Gate 4: Performance + reliability",
      status: perf.mode === "live" ? (thresholdPass && perf.promiseWithoutAction === 0 ? "PASS" : "FAIL") : "WARN",
      detail:
        perf.mode === "live"
          ? `mode=live, p95=${perf.latencyMs.p95}ms (<${perf.thresholds.p95Ms}), error_rate=${(perf.errorRate * 100).toFixed(2)}% (<${(perf.thresholds.errorRate * 100).toFixed(2)}%), promise_without_action=${perf.promiseWithoutAction}, samples=${perf.total}`
          : `mode=${perf.mode}, p95=${perf.latencyMs.p95}ms, error_rate=${(perf.errorRate * 100).toFixed(2)}% (informational only). Run perf-check with --live for release gate.`,
    });
  } else {
    gates.push({
      gate: "Gate 4: Performance + reliability",
      status: "FAIL",
      detail: "Missing fixtures/perf-summary.json (run npm run perf-check).",
    });
  }

  if (rollback) {
    gates.push({
      gate: "Gate 5: Rollback drill",
      status: rollback.mode === "live" ? (rollback.pass ? "PASS" : "FAIL") : "WARN",
      detail:
        rollback.mode === "live"
          ? `mode=live, pass=${rollback.pass}, estimated_failback=${rollback.estimatedFailbackSeconds}s`
          : `mode=${rollback.mode}, estimated_failback=${rollback.estimatedFailbackSeconds}s (tabletop only). Run rollback-drill --live for release gate.`,
    });
  } else {
    gates.push({
      gate: "Gate 5: Rollback drill",
      status: "FAIL",
      detail: "Missing fixtures/rollback-drill-summary.json (run npm run rollback-drill).",
    });
  }

  const hasFailure = gates.some((g) => g.status === "FAIL");

  console.log("Daily V2 Gate Check");
  console.log("===================");
  for (const gate of gates) {
    console.log(`- [${gate.status}] ${gate.gate}: ${gate.detail}`);
  }

  if (hasFailure) {
    process.exitCode = 1;
  }
}

main();
