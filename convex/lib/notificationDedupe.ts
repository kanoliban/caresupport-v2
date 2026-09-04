/**
 * Dedupe keys and content fingerprints for outbound scheduled notifications.
 *
 * Before this module the daily brief had neither: the only guard was a scan of
 * recent auditLogs for a row whose details.triggerMessage happened to read
 * "scheduled_digest". That is a same-day heuristic derived from log text, not a
 * key, and it says nothing about whether the content ever changed — which is
 * how the same brief went out three mornings running.
 */

/**
 * FNV-1a, 32-bit. Not a security hash; it only has to be stable across
 * deployments so today's body can be compared with yesterday's.
 */
export function fingerprintContent(body: string): string {
  const normalized = body.trim().replace(/\s+/g, " ");
  let hash = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i += 1) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/**
 * At-most-once key for the daily brief: one send per care case per local
 * calendar day, whatever re-runs, retries or manual invocations occur.
 */
export function dailyDigestDedupeKey(
  careCaseId: string,
  localDateIso: string,
): string {
  return `daily_digest:${careCaseId}:${localDateIso}`;
}

/**
 * At-most-once key for a pre-event reminder: one send per schedule item per
 * scheduled start. A rescheduled item gets a new start and so a new key.
 */
export function scheduleReminderDedupeKey(
  scheduleItemId: string,
  expectedStartMs: number,
): string {
  return `schedule_reminder:${scheduleItemId}:${expectedStartMs}`;
}

/** Streak at which an unchanged notification is worth a human's attention. */
export const UNCHANGED_STREAK_ALERT_THRESHOLD = 3;
