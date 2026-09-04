/**
 * Stop-intent detection for inbound care-thread messages.
 *
 * Deliberately mechanical rather than model-driven. The agent saying "got it,
 * I'll stop" is a sentence, not a state change: before this module the reply
 * and the runtime effect came from two disconnected paths, so the agent could
 * promise silence and the 8:00 AM cron would still fire. Detection lives here
 * so the same code path that produces the confirmation also writes the
 * suppression row.
 */

export type NotificationChannel =
  | "all"
  | "daily_digest"
  | "schedule_reminder"
  | "coordination_status";

export interface StopIntent {
  /** The literal inbound text that triggered the match, kept for the audit trail. */
  matchedText: string;
  /**
   * Whether the sender named something narrower than the whole channel
   * ("stop the morning brief") instead of asking for silence outright.
   *
   * We suppress everything either way — a stop is always honored immediately —
   * but recording the hint means a future scope policy can be built on what
   * people actually said rather than on a guess.
   */
  scopeHint: "unscoped" | "narrower_scope_mentioned";
}

/**
 * Whole-message opt-out keywords.
 *
 * `cancel`, `end` and `quit` are conventional SMS opt-out keywords but are
 * omitted here on purpose: in a care-coordination thread a bare "cancel" much
 * more often means "cancel that appointment" than "never text me again", and
 * mistakenly muting an insulin thread is worse than missing one opt-out
 * phrasing. They are still honored in explicit phrase form below
 * ("cancel these texts").
 */
const STOP_KEYWORDS = new Set([
  "stop",
  "stopall",
  "stop all",
  "stop please",
  "please stop",
  "unsubscribe",
  "optout",
  "opt out",
  "opt-out",
]);

const RESUME_KEYWORDS = new Set([
  "start",
  "unstop",
  "resume",
  "restart",
  "start again",
  "turn it back on",
  "turn them back on",
]);

/** Nouns that make a "stop ..." phrase about messaging rather than about care. */
const MESSAGING_NOUN =
  "text|texts|texting|message|messages|messaging|msg|msgs|reminder|reminders|brief|briefs|briefing|briefings|notification|notifications|alert|alerts|update|updates|digest|digests|ping|pings";

const STOP_PHRASE_RE = new RegExp(
  [
    // "stop the daily texts", "cancel these reminders", "quit messaging me"
    String.raw`\b(stop|quit|cancel|end)\b[^.?!\n]{0,24}\b(${MESSAGING_NOUN})\b`,
    // "stop sending", "stop texting", "quit messaging"
    String.raw`\b(stop|quit)\s+(sending|texting|messaging)\b`,
    // "no more texts"
    String.raw`\bno more\b[^.?!\n]{0,24}\b(${MESSAGING_NOUN})\b`,
    // "don't text me", "do not message me"
    String.raw`\b(don'?t|do not|please don'?t)\s+(text|message|msg|ping)\b`,
    // "turn off the reminders"
    String.raw`\bturn off\b[^.?!\n]{0,24}\b(${MESSAGING_NOUN})\b`,
    String.raw`\b(unsubscribe|opt me out|remove me|take me off)\b`,
    String.raw`\bleave me alone\b`,
  ].join("|"),
  "i",
);

/**
 * Words that name a narrower target than "everything". Presence of one means
 * the sender may have wanted a partial mute; it does not change what we do
 * right now (we still mute everything), only what we record.
 */
const NARROWER_SCOPE_RE =
  /\b(daily|morning|8 ?am|8:00|brief|briefing|digest|schedule|appointment|reminder|reminders|these|this one|that one)\b/i;

export function normalizeInboundText(message: string): string {
  return message
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .trim()
    .replace(/^[\s"'(\[]+/, "")
    .replace(/[\s"')\].!?,;:*_\-]+$/, "")
    .replace(/\s+/g, " ");
}

/**
 * Returns a StopIntent when the sender asked to be left alone, or null.
 *
 * Bare keywords must be the entire message: "we should stop her insulin" and
 * "can you stop by at 3" are care instructions, not opt-outs, and muting the
 * thread on either would be a serious failure.
 */
export function detectStopIntent(message: string): StopIntent | null {
  const normalized = normalizeInboundText(message);
  if (!normalized) return null;

  const matched =
    STOP_KEYWORDS.has(normalized) || STOP_PHRASE_RE.test(normalized);
  if (!matched) return null;

  return {
    matchedText: message.trim().slice(0, 500),
    scopeHint: NARROWER_SCOPE_RE.test(normalized)
      ? "narrower_scope_mentioned"
      : "unscoped",
  };
}

/**
 * Returns true when the sender asked for notifications back.
 *
 * Only consult this while a suppression is actually active — a bare "start" is
 * ambiguous in open conversation, but unambiguous from someone we have muted.
 */
export function detectResumeIntent(message: string): boolean {
  const normalized = normalizeInboundText(message);
  if (!normalized) return false;
  if (RESUME_KEYWORDS.has(normalized)) return true;

  return new RegExp(
    [
      // "start the reminders again", "resume my texts"
      String.raw`\b(start|resume|restart|turn back on)\b[^.?!\n]{0,24}\b(${MESSAGING_NOUN})\b`,
      // "turn the texts back on"
      String.raw`\bturn\b[^.?!\n]{0,24}\b(${MESSAGING_NOUN})\b[^.?!\n]{0,12}\bback on\b`,
    ].join("|"),
    "i",
  ).test(normalized);
}

/**
 * Mechanical honesty guard, mirroring doesReplyClaimCalendarWrite and
 * doesReplyClaimOutreachExecution in handler.ts: true when the drafted reply
 * tells the user their messages have been stopped.
 *
 * If nothing was actually suppressed this turn, the claim is a confabulation
 * and the caller rewrites the reply.
 */
export function doesReplyClaimNotificationStop(text: string): boolean {
  // Offers and questions ("want me to stop those?") are not claims.
  if (
    /\b(want me to|should i|do you want|would you like|let me know if|if you'?d? ?(?:like|want))\b/i.test(
      text,
    )
  ) {
    return false;
  }

  return new RegExp(
    [
      String.raw`\b(stopped|stopping|paused|pausing|muted|muting|turned off|turning off|cancell?ed|shut off)\b[^.?!\n]{0,40}\b(${MESSAGING_NOUN})\b`,
      String.raw`\bi(?:'ll| will)?\s+(stop|pause|mute|turn off)\b[^.?!\n]{0,40}\b(${MESSAGING_NOUN})\b`,
      String.raw`\b(no more|you won'?t (?:get|receive|hear))\b[^.?!\n]{0,40}\b(${MESSAGING_NOUN})\b`,
      String.raw`\bwon'?t send\b[^.?!\n]{0,40}\b(${MESSAGING_NOUN})\b`,
    ].join("|"),
    "i",
  ).test(text);
}

export function stopConfirmationResponse(displayName: string): string {
  return [
    `Done, ${displayName} — I've turned off the scheduled messages, starting now. No morning brief tomorrow.`,
    "You can still text me any time and I'll answer. Reply START when you want the scheduled ones back.",
  ].join("\n\n");
}

export function resumeConfirmationResponse(displayName: string): string {
  return `You're back on, ${displayName} — I'll send the scheduled messages again starting with the next one.`;
}

/**
 * Replacement copy for a reply that claimed a stop the runtime never performed.
 */
export const UNSUPPORTED_STOP_CLAIM_RESPONSE =
  'I should be straight with you: I have not turned anything off, so the scheduled messages are still on. Reply STOP and I\'ll mute them immediately.';
