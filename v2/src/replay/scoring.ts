import type { ProcessResult } from "../contracts/processResult.js";
import type { ReplayCaseResult, ReplaySummary } from "./types.js";

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function simpleDistance(a: string, b: string): number {
  if (a === b) return 0;
  const aa = normalize(a);
  const bb = normalize(b);
  if (aa === bb) return 0;

  const setA = new Set(aa.split(" "));
  const setB = new Set(bb.split(" "));
  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size || 1;
  return 1 - intersection / union;
}

const ACCESS_DENIED_RE =
  /(can(?:not|'t)|unable|not allowed|restricted|denied).{0,50}(share|provide|disclose|give|access|info|details|permission)|do(?:\s*|n't)\s+have\s+(?:permission|access)|outside\s+.*access|limited\s+access.*(cannot|can't|do(?:\s*|n't)\s+have\s+permission)/i;
const SCHEDULE_RE = /schedule|monday|tuesday|wednesday|thursday|friday|pickup|drop|driver|ride|coverage|covering/i;
const MEDICATION_RE = /med(?:ication)?s?|pill|dose|allerg/i;
const CONFIRM_RE = /got it|you're covering|i(?:\s*|')ll add|noting you|confirmed|you're down|perfect|locked in/i;
const CLARIFY_RE = /\?|what|which|who|when|anything else|clarify|do you need/i;

interface Signals {
  outreachPromise: boolean;
  accessDenied: boolean;
  schedule: boolean;
  medication: boolean;
  confirmation: boolean;
  clarify: boolean;
}

function hasImpliedRelayIntent(expected: string, actual: string): boolean {
  const knownNames = ["haley", "solan", "yada", "roman", "amanti", "liban", "kano"];
  const expectedLower = expected.toLowerCase();
  const actualLower = actual.toLowerCase();
  const hasSharedName = knownNames.some((name) => expectedLower.includes(name) && actualLower.includes(name));
  if (!hasSharedName) return false;
  return /\blet\b.{0,20}\bknow\b|\bpass\b|\brelay\b/.test(actualLower);
}

function hasOutreachPromise(text: string): boolean {
  const normalized = normalize(text);
  const promiseRe = /\b(i(?:\s*|')ll|we(?:\s*|')ll)\s+(message|reach out|contact|text|send)\b/g;
  const negationRe = /\b(without|did(?:\s*|n't)|do(?:\s*|n't)|not|never|problem|failure|saying|claimed|claiming)\b/;

  let match = promiseRe.exec(normalized);
  while (match) {
    const start = match.index;
    const context = normalized.slice(Math.max(0, start - 40), Math.min(normalized.length, start + 40));
    if (!negationRe.test(context)) {
      return true;
    }
    match = promiseRe.exec(normalized);
  }
  return false;
}

function extractSignals(text: string): Signals {
  const normalized = normalize(text);
  return {
    outreachPromise: hasOutreachPromise(normalized),
    accessDenied: ACCESS_DENIED_RE.test(normalized),
    schedule: SCHEDULE_RE.test(normalized),
    medication: MEDICATION_RE.test(normalized),
    confirmation: CONFIRM_RE.test(normalized),
    clarify: CLARIFY_RE.test(normalized),
  };
}

function hasPromiseWithoutAction(actual: string, result: ProcessResult): boolean {
  return hasOutreachPromise(actual) && result.needs_outreach.length === 0;
}

export function evaluateCase(
  expected: string,
  actual: string,
  result: ProcessResult,
): { passed: boolean; distance: number; lexicalDistance: number; lexicalPassed: boolean; reasons: string[] } {
  const lexicalDistance = simpleDistance(expected, actual);
  const expectedSignals = extractSignals(expected);
  const auditText = [...(result.audit.decisions ?? []), ...(result.audit.warnings ?? [])].join(" ");
  const actualSignals = extractSignals(actual);
  const auditSignals = extractSignals(auditText);
  const reasons: string[] = [];
  const checks: boolean[] = [];
  const warningText = (result.audit.warnings ?? []).join(" ").toLowerCase();
  const accessContextRe = /med|medication|phi|privacy|restricted|access level|schedule\+meds/i;
  const outreachDeferralRe = /missing|unknown|unclear|ambiguous|number|contact|clarify|confirm/i;

  if (expectedSignals.accessDenied && accessContextRe.test(expected)) {
    const ok = actualSignals.accessDenied || auditSignals.accessDenied;
    checks.push(ok);
    if (!ok) reasons.push("expected_access_denial_missing");
  }

  if (expectedSignals.outreachPromise) {
    const ok = result.needs_outreach.length > 0 || actualSignals.outreachPromise || hasImpliedRelayIntent(expected, actual);
    if (!ok) {
      const deferredSafely = actualSignals.clarify || outreachDeferralRe.test(warningText) || outreachDeferralRe.test(actual);
      checks.push(deferredSafely);
      if (!deferredSafely) reasons.push("expected_outreach_missing");
    } else {
      checks.push(true);
    }
  }

  if (hasPromiseWithoutAction(actual, result)) {
    checks.push(false);
    reasons.push("promise_without_action");
  }

  if (checks.length === 0) {
    const ok = actual.trim().length > 0;
    checks.push(ok);
    if (!ok) reasons.push("empty_response");
  }

  const failedChecks = checks.filter((check) => !check).length;
  const distance = failedChecks / checks.length;
  return {
    passed: failedChecks === 0,
    distance,
    lexicalDistance,
    lexicalPassed: lexicalDistance <= 0.12,
    reasons,
  };
}

export function summarize(results: ReplayCaseResult[]): ReplaySummary {
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const parityScore = total === 0 ? 0 : passed / total;
  const lexicalPassed = results.filter((r) => r.lexicalPassed).length;
  const lexicalParityScore = total === 0 ? 0 : lexicalPassed / total;
  const promiseWithoutAction = results.filter(
    (r) => hasOutreachPromise(r.actual) && r.result.needs_outreach.length === 0,
  ).length;

  return {
    total,
    passed,
    parityScore,
    lexicalPassed,
    lexicalParityScore,
    promiseWithoutAction,
    failures: results.filter((r) => !r.passed),
  };
}
