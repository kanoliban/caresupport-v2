/**
 * Schedule titles are model-authored, so a time change can accidentally make
 * the title look new (for example, "Ebise insulin" -> "Ebise insulin at 4pm").
 * Keep the stable part of the title as the identity used for reconciliation.
 */
const CLOCK_TIME_IN_TITLE =
  /\b(?:at|around|by)?\s*(?:[01]?\d|2[0-3])(?::[0-5]\d)?\s*(?:a\.?\s*m\.?|p\.?\s*m\.?)\b/gi;
const TWENTY_FOUR_HOUR_TIME_IN_TITLE =
  /\b(?:at|around|by)?\s*(?:[01]\d|2[0-3]):[0-5]\d\b/gi;
const SCHEDULE_NOISE =
  /\b(?:remind(?:er| me)?|alert|notification|daily|every day|each day|recurring|repeating)\b/gi;

export interface ScheduleIdentityItem {
  title: string;
  _creationTime?: number;
}

export function normalizeScheduleTitle(title: string): string {
  const normalized = title
    .normalize("NFKC")
    .replace(CLOCK_TIME_IN_TITLE, " ")
    .replace(TWENTY_FOUR_HOUR_TIME_IN_TITLE, " ")
    .replace(SCHEDULE_NOISE, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();

  // A title containing only a clock/noise token is still safer to identify by
  // its original normalized text than by an empty key.
  return normalized || title.normalize("NFKC").trim().toLocaleLowerCase();
}

export function scheduleTitlesMatch(left: string, right: string): boolean {
  return normalizeScheduleTitle(left) === normalizeScheduleTitle(right);
}

/**
 * Keep the newest active representation for each stable schedule identity.
 * `_creationTime` is the only ordering signal available on legacy rows, and
 * the newest row is the one most likely to contain the user's correction.
 */
export function selectLatestScheduleItems<T extends ScheduleIdentityItem>(
  items: T[],
): T[] {
  const latestByIdentity = new Map<string, T>();

  for (const item of items) {
    const identity = normalizeScheduleTitle(item.title);
    const current = latestByIdentity.get(identity);
    if (
      !current ||
      (item._creationTime ?? 0) >= (current._creationTime ?? 0)
    ) {
      latestByIdentity.set(identity, item);
    }
  }

  return [...latestByIdentity.values()];
}
