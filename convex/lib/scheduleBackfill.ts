const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];
const WEEKDAY_SHORT = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export interface MigrateInput {
  date?: string;
  recurrence?: string;
  notes?: string;
  title?: string;
  _creationTime: number;
}

export interface MigrationPatch {
  date?: string;
  recurrence?: string;
}

export type MigrateResult =
  | { action: "skip" }
  | { action: "patch"; patch: MigrationPatch }
  | { action: "warn"; reason: string };

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dayNameToNum(name: string): number | null {
  const idx = WEEKDAYS.indexOf(name.toLowerCase());
  return idx === -1 ? null : idx;
}

function findNextWeekday(fromDateMs: number, targetDayNum: number): Date {
  const from = new Date(fromDateMs);
  const fromDayNum = from.getUTCDay();
  const diff = (targetDayNum - fromDayNum + 7) % 7;
  const target = new Date(from);
  target.setUTCDate(from.getUTCDate() + diff);
  return target;
}

export function migrateScheduleRow(input: MigrateInput): MigrateResult {
  const rawDate = input.date?.trim() ?? "";

  if (ISO_DATE.test(rawDate)) {
    const year = parseInt(rawDate.slice(0, 4), 10);
    const creationYear = new Date(input._creationTime).getUTCFullYear();
    if (year === 2025 && creationYear === 2026) {
      return {
        action: "patch",
        patch: { date: `2026-${rawDate.slice(5)}` },
      };
    }
    return { action: "skip" };
  }

  if (!rawDate) {
    return { action: "skip" };
  }

  const lower = rawDate.toLowerCase();

  if (lower === "today") {
    return {
      action: "patch",
      patch: { date: toIsoDate(new Date(input._creationTime)) },
    };
  }

  if (lower === "tomorrow") {
    const d = new Date(input._creationTime);
    d.setUTCDate(d.getUTCDate() + 1);
    return { action: "patch", patch: { date: toIsoDate(d) } };
  }

  if (lower === "daily") {
    const patch: MigrationPatch = { date: undefined };
    if (!input.recurrence) patch.recurrence = "daily";
    return { action: "patch", patch };
  }

  const recurringMatch = lower.match(/^recurring\s+(\w+)/);
  if (recurringMatch) {
    const dayNum = dayNameToNum(recurringMatch[1]);
    if (dayNum === null) {
      return {
        action: "warn",
        reason: `Unparseable recurring day: "${rawDate}"`,
      };
    }
    const patch: MigrationPatch = { date: undefined };
    if (!input.recurrence) patch.recurrence = `weekly:${WEEKDAY_SHORT[dayNum]}`;
    return { action: "patch", patch };
  }

  const dayNum = dayNameToNum(lower);
  if (dayNum !== null) {
    const next = findNextWeekday(input._creationTime, dayNum);
    return { action: "patch", patch: { date: toIsoDate(next) } };
  }

  return { action: "warn", reason: `Unparseable date: "${rawDate}"` };
}
