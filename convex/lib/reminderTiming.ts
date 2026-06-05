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

/** Offset (ms) of `timeZone` at the instant `utcMs`, such that local = utc + offset. */
function tzOffsetMs(timeZone: string, utcMs: number): number {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const map: Record<string, string> = {};
    for (const part of dtf.formatToParts(new Date(utcMs))) {
      map[part.type] = part.value;
    }
    const hour = map.hour === "24" ? "0" : map.hour;
    const asLocal = Date.UTC(
      Number(map.year),
      Number(map.month) - 1,
      Number(map.day),
      Number(hour),
      Number(map.minute),
      Number(map.second),
    );
    return asLocal - utcMs;
  } catch {
    return 0; // unknown zone → treat as UTC
  }
}

/**
 * Convert a wall-clock `date` (YYYY-MM-DD) and `time` (HH:MM) interpreted in
 * `timeZone` into an absolute UTC timestamp (ms). Schedule items store local
 * wall-clock time, so this is how we get the true instant an event starts.
 * Returns null if date or time is missing/malformed.
 */
export function zonedDateTimeToUtcMs(
  dateIso: string | undefined,
  timeHHMM: string | undefined,
  timeZone: string,
): number | null {
  if (!dateIso || !timeHHMM) return null;
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso);
  const tm = /^(\d{1,2}):(\d{2})$/.exec(timeHHMM);
  if (!dm || !tm) return null;
  // First treat the wall-clock numbers as if they were UTC, then correct by the
  // zone's offset at that instant.
  const guess = Date.UTC(
    Number(dm[1]),
    Number(dm[2]) - 1,
    Number(dm[3]),
    Number(tm[1]),
    Number(tm[2]),
  );
  if (Number.isNaN(guess)) return null;
  return guess - tzOffsetMs(timeZone, guess);
}
