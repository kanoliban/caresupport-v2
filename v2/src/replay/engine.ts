import type { ProcessResult } from "../contracts/processResult.js";
import type { ReplayCase, ReplayCaseResult, ReplaySummary } from "./types.js";
import { evaluateCase, summarize } from "./scoring.js";

export interface ReplayRunner {
  runCase(replayCase: ReplayCase): Promise<ProcessResult>;
}

export interface ReplayRunOptions {
  progressEvery?: number;
  onProgress?: (completed: number, total: number, caseId: string) => void;
}

export async function runReplay(
  cases: ReplayCase[],
  runner: ReplayRunner,
  options: ReplayRunOptions = {},
): Promise<ReplaySummary> {
  const results: ReplayCaseResult[] = [];
  const progressEvery = options.progressEvery ?? 0;

  for (let i = 0; i < cases.length; i += 1) {
    const replayCase = cases[i];
    let result: ProcessResult;
    try {
      result = await runner.runCase(replayCase);
    } catch (error) {
      result = {
        sms_response: "",
        needs_outreach: [],
        family_updates: [],
        member_updates: [],
        routing_updates: [],
        audit: {
          model: "replay-runner-error",
          intent: "GENERAL",
          decisions: ["runner_exception"],
          warnings: [error instanceof Error ? error.message : String(error)],
        },
      };
    }

    const verdict = evaluateCase(replayCase.expectedOutboundText, result.sms_response, result);

    results.push({
      caseId: replayCase.caseId,
      expected: replayCase.expectedOutboundText,
      actual: result.sms_response,
      passed: verdict.passed,
      distance: verdict.distance,
      lexicalDistance: verdict.lexicalDistance,
      lexicalPassed: verdict.lexicalPassed,
      reasons: verdict.reasons,
      result,
    });

    const completed = i + 1;
    if (options.onProgress) {
      options.onProgress(completed, cases.length, replayCase.caseId);
    } else if (progressEvery > 0 && completed % progressEvery === 0) {
      console.log(`[replay] completed ${completed}/${cases.length} (latest=${replayCase.caseId})`);
    }
  }

  return summarize(results);
}
