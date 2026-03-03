import fs from "node:fs";
import path from "node:path";
import { buildReplayCasesFromLogFile } from "../src/replay/logParser.js";
import { runReplay } from "../src/replay/engine.js";
import type { ProcessResult } from "../src/contracts/processResult.js";
import type { ReplayCase } from "../src/replay/types.js";
import { CareSupportProcessor } from "../src/pipeline/processInbound.js";
import { ClaudeOrchestrator } from "../src/agent/orchestrator.js";
import { ConvexGateway } from "../src/convex/client.js";
import { LinqClient } from "../src/linq/client.js";
import { config } from "../src/config.js";

function findConversationLogs(root: string): string[] {
  const files: string[] = [];
  for (const phone of fs.readdirSync(root)) {
    const phoneDir = path.join(root, phone);
    if (!fs.statSync(phoneDir).isDirectory()) continue;
    for (const file of fs.readdirSync(phoneDir)) {
      if (!file.endsWith(".log")) continue;
      files.push(path.join(phoneDir, file));
    }
  }
  return files;
}

function deterministicRuleResult(input: string): ProcessResult {
  const lower = input.toLowerCase();
  const sms = lower.includes("med")
    ? "I will review the medication context and coordinate with the care team."
    : lower.includes("appointment")
      ? "I will coordinate appointment timing and confirm with available caregivers."
      : "I got your message and will coordinate the next step with the care team.";

  return {
    sms_response: sms,
    needs_outreach: [],
    family_updates: [],
    member_updates: [],
    routing_updates: [],
    audit: {
      model: "deterministic-rule-runner",
      intent: "GENERAL",
      decisions: ["replay-rule"],
      warnings: [],
    },
  };
}

async function main(): Promise<void> {
  const cliArgs = process.argv.slice(2);
  const liveRequested = cliArgs.includes("--live");
  const costAck = cliArgs.find((arg) => arg.startsWith("--cost-ack="))?.split("=")[1];
  const explicit = cliArgs.find((arg) => !arg.startsWith("--"));
  const limitArg = cliArgs.find((arg) => arg.startsWith("--limit="));
  const startArg = cliArgs.find((arg) => arg.startsWith("--start="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : undefined;
  const start = startArg ? Number(startArg.split("=")[1]) : 0;
  const liveDisabled = (process.env.CARESUPPORT_DISABLE_LIVE ?? "1") !== "0";
  const maxLiveCases = Math.max(1, Number(process.env.CARESUPPORT_LIVE_MAX_CASES ?? "20"));

  if (liveRequested) {
    if (liveDisabled) {
      throw new Error(
        "Live replay is disabled (CARESUPPORT_DISABLE_LIVE=1). Set CARESUPPORT_DISABLE_LIVE=0 to unlock.",
      );
    }
    if (costAck !== "I_UNDERSTAND_SPEND") {
      throw new Error(
        "Live replay requires explicit spend acknowledgement: --cost-ack=I_UNDERSTAND_SPEND",
      );
    }
    if (!limitArg || !Number.isFinite(limit)) {
      throw new Error("Live replay requires explicit --limit=<n>.");
    }
    if ((limit ?? 0) > maxLiveCases) {
      throw new Error(`Live replay limit ${limit ?? 0} exceeds CARESUPPORT_LIVE_MAX_CASES=${maxLiveCases}.`);
    }
  }

  const candidateRoots = explicit
    ? [path.resolve(explicit)]
    : [path.resolve("fork/workspace/conversations"), path.resolve("../fork/workspace/conversations")];
  const conversationsRoot = candidateRoots.find((c) => fs.existsSync(c));
  if (!conversationsRoot) {
    throw new Error(`Could not locate conversations root. Tried: ${candidateRoots.join(", ")}`);
  }
  const mode = liveRequested ? "live" : "deterministic";

  const logFiles = findConversationLogs(conversationsRoot);
  const allReplayCases = logFiles.flatMap((logFile) => buildReplayCasesFromLogFile(logFile));
  const replayCases =
    limit && Number.isFinite(limit)
      ? allReplayCases.slice(Math.max(0, start), Math.max(0, start) + Math.max(0, limit))
      : allReplayCases.slice(Math.max(0, start));

  const runner =
    mode === "live"
        ? {
          runCase: async (replayCase: ReplayCase): Promise<ProcessResult> => {
            if (!config.convexUrl) {
              throw new Error("CONVEX_URL is required for --live replay mode.");
            }
            const processor = new CareSupportProcessor(
              new ClaudeOrchestrator(),
              new ConvexGateway(config.convexUrl),
              new LinqClient(),
            );

            const response = await processor.process(
              {
                chat_id: `replay-${replayCase.phone}`,
                from: replayCase.phone,
                service: "SMS",
                message_id: `replay-${replayCase.caseId}`,
                parts: [{ type: "text", value: replayCase.inboundText }],
                received_at: replayCase.receivedAt || new Date().toISOString(),
              },
              { dryRun: true },
            );
            return response.result;
          },
        }
      : {
          runCase: async (replayCase: ReplayCase): Promise<ProcessResult> =>
            deterministicRuleResult(replayCase.inboundText),
        };

  const summary = await runReplay(replayCases, runner, {
    progressEvery: mode === "live" ? 5 : 25,
  });

  const outPath = path.resolve("fixtures/replay-summary.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        mode,
        ...summary,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  console.log(`Replay mode: ${mode}`);
  console.log(`Start offset: ${start}`);
  console.log(`Limit: ${limit ?? "none"}`);
  console.log(`Total available cases: ${allReplayCases.length}`);
  console.log(`Cases: ${summary.total}`);
  console.log(`Passed: ${summary.passed}`);
  console.log(`Outcome parity score: ${(summary.parityScore * 100).toFixed(2)}%`);
  console.log(`Lexical parity score: ${(summary.lexicalParityScore * 100).toFixed(2)}%`);
  console.log(`Promise-without-action: ${summary.promiseWithoutAction}`);
  console.log(`Summary written: ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
