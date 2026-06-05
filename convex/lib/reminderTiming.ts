const MIN = 60 * 1000;

/**
 * Decide when to fire a "heads up" reminder for a calendar event.
 *
 * Returns the absolute timestamp (ms) to fire at, or null if the event is too
 * close/already past to be worth a reminder.
 *
 * Lead time scales with how far out the event is:
 *  - test env: always 1 minute before (so a 5-min-out event reminds at T-1min)
 *  - >= 45 min out: 30 minutes before
 *  - >= 20 min out: 15 minutes before
 *  - >=  7 min out:  5 minutes before
 *  - >=  2 min out:  1 minute before
 *  - <   2 min out:  skip (it's basically now)
 *
 * If the computed fire time has already passed (lead exceeds the time left), we
 * clamp it to fire almost immediately rather than dropping the reminder.
 */
export function computeReminderFireAt(
  startMs: number,
  nowMs: number,
  isTestEnv: boolean,
): number | null {
  const until = startMs - nowMs;
  if (until < 2 * MIN) return null;

  let leadMs: number;
  if (isTestEnv) {
    leadMs = 1 * MIN;
  } else if (until >= 45 * MIN) {
    leadMs = 30 * MIN;
  } else if (until >= 20 * MIN) {
    leadMs = 15 * MIN;
  } else if (until >= 7 * MIN) {
    leadMs = 5 * MIN;
  } else {
    leadMs = 1 * MIN;
  }

  const fireAt = startMs - leadMs;
  // If the lead pushes us into the past (only possible for the longer prod
  // leads on a borderline event), fire right away instead of skipping.
  return fireAt <= nowMs ? nowMs + 5 * 1000 : fireAt;
}
