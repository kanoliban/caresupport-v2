import type { ProcessResult } from "../contracts/processResult.js";

export interface ReplayCase {
  caseId: string;
  sourceFile: string;
  phone: string;
  receivedAt: string;
  inboundText: string;
  expectedOutboundText: string;
}

export interface ReplayCaseResult {
  caseId: string;
  expected: string;
  actual: string;
  passed: boolean;
  distance: number;
  lexicalDistance: number;
  lexicalPassed: boolean;
  reasons: string[];
  result: ProcessResult;
}

export interface ReplaySummary {
  total: number;
  passed: number;
  parityScore: number;
  lexicalPassed: number;
  lexicalParityScore: number;
  promiseWithoutAction: number;
  failures: ReplayCaseResult[];
}
