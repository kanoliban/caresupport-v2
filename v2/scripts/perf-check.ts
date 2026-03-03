import fs from "node:fs";
import path from "node:path";
import { buildReplayCasesFromLogFile } from "../src/replay/logParser.js";
import { config } from "../src/config.js";
import { CareSupportProcessor } from "../src/pipeline/processInbound.js";
import { ClaudeOrchestrator } from "../src/agent/orchestrator.js";
import { ConvexGateway } from "../src/convex/client.js";
import { LinqClient } from "../src/linq/client.js";
import { postModelGuard } from "../src/enforcement/policies.js";
import type { ProcessStageTimings } from "../src/pipeline/processInbound.js";

interface PerfRecord {
  caseId: string;
  latencyMs: number;
  ok: boolean;
  promiseWithoutAction: boolean;
  stageTimings?: ProcessStageTimings;
  error?: string;
}

interface LatencyStats {
  mean: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
}

interface PerfSummary {
  generatedAt: string;
  mode: "live" | "deterministic";
  total: number;
  success: number;
  failed: number;
  errorRate: number;
  promiseWithoutAction: number;
  latencyMs: {
    mean: number;
    p50: number;
    p95: number;
    p99: number;
    max: number;
  };
  stageLatencyMs: Partial<Record<keyof ProcessStageTimings, LatencyStats>>;
  concurrency: number;
  limit: number;
  start: number;
  thresholds: {
    p95Ms: number;
    errorRate: number;
  };
  pass: boolean;
  failures: Array<{ caseId: string; error?: string; latencyMs: number }>;
}

class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

function isRetryableErrorMessage(message: string): boolean {
  return /(connection error|overloaded|timeout|econnreset|fetch failed|503|529|429)/i.test(message);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(work: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(`${label} exceeded ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function summarizeLatencies(values: number[]): LatencyStats {
  const mean =
    values.length === 0
      ? 0
      : Math.round((values.reduce((acc, value) => acc + value, 0) / values.length) * 100) / 100;
  return {
    mean,
    p50: percentile(values, 50),
    p95: percentile(values, 95),
    p99: percentile(values, 99),
    max: values.length === 0 ? 0 : Math.max(...values),
  };
}

function findConversationLogs(root: string): string[] {
  const files: string[] = [];
  for (const phone of fs.readdirSync(root)) {
    const phoneDir = path.join(root, phone);
    if (!fs.statSync(phoneDir).isDirectory()) continue;
    for (const file of fs.readdirSync(phoneDir)) {
      if (file.endsWith(".log")) files.push(path.join(phoneDir, file));
    }
  }
  return files;
}

async function runWithConcurrency<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>): Promise<void> {
  let index = 0;
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (true) {
      const current = index;
      index += 1;
      if (current >= items.length) break;
      await fn(items[current]);
    }
  });
  await Promise.all(workers);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const live = args.includes("--live");
  const costAck = args.find((a) => a.startsWith("--cost-ack="))?.split("=")[1];
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const startArg = args.find((a) => a.startsWith("--start="));
  const concurrencyArg = args.find((a) => a.startsWith("--concurrency="));
  const timeoutArg = args.find((a) => a.startsWith("--timeout-ms="));
  const explicitRoot = args.find((a) => !a.startsWith("--"));
  const limit = Math.max(1, Number(limitArg?.split("=")[1] ?? "40"));
  const start = Math.max(0, Number(startArg?.split("=")[1] ?? "0"));
  const concurrency = Math.max(1, Number(concurrencyArg?.split("=")[1] ?? "2"));
  const timeoutMs = Math.max(5000, Number(timeoutArg?.split("=")[1] ?? "45000"));
  const liveDisabled = (process.env.CARESUPPORT_DISABLE_LIVE ?? "1") !== "0";
  const maxLiveCases = Math.max(1, Number(process.env.CARESUPPORT_LIVE_MAX_CASES ?? "20"));

  if (live) {
    if (liveDisabled) {
      throw new Error(
        "Live perf is disabled (CARESUPPORT_DISABLE_LIVE=1). Set CARESUPPORT_DISABLE_LIVE=0 to unlock.",
      );
    }
    if (costAck !== "I_UNDERSTAND_SPEND") {
      throw new Error(
        "Live perf requires explicit spend acknowledgement: --cost-ack=I_UNDERSTAND_SPEND",
      );
    }
    if (!limitArg) {
      throw new Error("Live perf requires explicit --limit=<n>.");
    }
    if (limit > maxLiveCases) {
      throw new Error(`Live perf limit ${limit} exceeds CARESUPPORT_LIVE_MAX_CASES=${maxLiveCases}.`);
    }
  }

  const candidateRoots = explicitRoot
    ? [path.resolve(explicitRoot)]
    : [path.resolve("fork/workspace/conversations"), path.resolve("../fork/workspace/conversations")];
  const conversationsRoot = candidateRoots.find((c) => fs.existsSync(c));
  if (!conversationsRoot) {
    throw new Error(`Could not locate conversations root. Tried: ${candidateRoots.join(", ")}`);
  }

  const allCases = findConversationLogs(conversationsRoot).flatMap((f) => buildReplayCasesFromLogFile(f));
  const replayCases = allCases.slice(start, start + limit);
  const records: PerfRecord[] = [];

  const processor = live
    ? new CareSupportProcessor(new ClaudeOrchestrator(), new ConvexGateway(config.convexUrl ?? "https://placeholder.invalid"), new LinqClient())
    : null;

  await runWithConcurrency(replayCases, concurrency, async (replayCase) => {
    const startedAt = Date.now();
    let attempt = 0;
    while (attempt < 3) {
      attempt += 1;
      try {
        let smsResponse = "";
        let promiseWithoutAction = false;
        if (live) {
          const response = await withTimeout(
            processor!.process(
              {
                chat_id: `perf-${replayCase.phone}`,
                from: replayCase.phone,
                service: "SMS",
                message_id: `perf-${replayCase.caseId}`,
                parts: [{ type: "text", value: replayCase.inboundText }],
                received_at: replayCase.receivedAt || new Date().toISOString(),
              },
              { dryRun: true },
            ),
            timeoutMs,
            replayCase.caseId,
          );
          smsResponse = response.result.sms_response;
          promiseWithoutAction = postModelGuard(response.result).some((i) => i.code === "PROMISE_WITHOUT_ACTION");
          records.push({
            caseId: replayCase.caseId,
            latencyMs: Date.now() - startedAt,
            ok: smsResponse.trim().length > 0 && !promiseWithoutAction,
            promiseWithoutAction,
            stageTimings: response.stageTimings,
          });
          return;
        } else {
          smsResponse = replayCase.expectedOutboundText || "OK";
          records.push({
            caseId: replayCase.caseId,
            latencyMs: Date.now() - startedAt,
            ok: smsResponse.trim().length > 0 && !promiseWithoutAction,
            promiseWithoutAction,
          });
          return;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const retryable = isRetryableErrorMessage(message);
        if (attempt < 3 && retryable) {
          await sleep(attempt * 250);
          continue;
        }
        records.push({
          caseId: replayCase.caseId,
          latencyMs: Date.now() - startedAt,
          ok: false,
          promiseWithoutAction: false,
          error: message,
        });
        return;
      }
    }
  });

  const latencies = records.map((r) => r.latencyMs);
  const success = records.filter((r) => r.ok).length;
  const failed = records.length - success;
  const promiseWithoutAction = records.filter((r) => r.promiseWithoutAction).length;
  const errorRate = records.length === 0 ? 0 : failed / records.length;
  const { mean, p50, p95, p99, max } = summarizeLatencies(latencies);

  const stageKeys: Array<keyof ProcessStageTimings> = [
    "totalMs",
    "idempotencyMs",
    "resolveActorMs",
    "loadContextMs",
    "preGuardMs",
    "modelMs",
    "postGuardMs",
    "persistMs",
    "outboundMs",
    "outreachMs",
  ];
  const stageLatencyMs: Partial<Record<keyof ProcessStageTimings, LatencyStats>> = {};
  const timingRecords = records.filter((record): record is PerfRecord & { stageTimings: ProcessStageTimings } =>
    Boolean(record.stageTimings),
  );
  for (const key of stageKeys) {
    const values = timingRecords.map((record) => record.stageTimings[key]);
    if (values.length > 0) {
      stageLatencyMs[key] = summarizeLatencies(values);
    }
  }

  const thresholds = { p95Ms: 5000, errorRate: 0.005 };
  const pass = p95 < thresholds.p95Ms && errorRate < thresholds.errorRate && promiseWithoutAction === 0;

  const summary: PerfSummary = {
    generatedAt: new Date().toISOString(),
    mode: live ? "live" : "deterministic",
    total: records.length,
    success,
    failed,
    errorRate,
    promiseWithoutAction,
    latencyMs: { mean, p50, p95, p99, max },
    stageLatencyMs,
    concurrency,
    limit,
    start,
    thresholds,
    pass,
    failures: records
      .filter((r) => !r.ok)
      .slice(0, 20)
      .map((r) => ({ caseId: r.caseId, error: r.error, latencyMs: r.latencyMs })),
  };

  const outPath = path.resolve("fixtures/perf-summary.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2) + "\n", "utf8");

  console.log(`Perf summary written: ${outPath}`);
  console.log(`Mode: ${summary.mode}`);
  console.log(`Total: ${summary.total}`);
  console.log(`Error rate: ${(summary.errorRate * 100).toFixed(2)}%`);
  console.log(`p95 latency: ${summary.latencyMs.p95}ms`);
  if (summary.stageLatencyMs.modelMs) {
    console.log(`p95 model latency: ${summary.stageLatencyMs.modelMs.p95}ms`);
  }
  if (summary.stageLatencyMs.loadContextMs) {
    console.log(`p95 context latency: ${summary.stageLatencyMs.loadContextMs.p95}ms`);
  }
  console.log(`Promise-without-action: ${summary.promiseWithoutAction}`);
  console.log(`Pass: ${summary.pass}`);

  process.exit(summary.pass ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
