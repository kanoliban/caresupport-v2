const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_24H = /^\d{2}:\d{2}$/;
const RECURRENCE =
  /^(daily|weekly:(mon|tue|wed|thu|fri|sat|sun)(,(mon|tue|wed|thu|fri|sat|sun))*|monthly:(\d{1,2}))$/;

export function validateIsoDate(value: string | undefined): string | undefined {
  if (value === undefined || value === "") return undefined;
  if (!ISO_DATE.test(value)) {
    throw new Error(`Invalid date format: "${value}". Expected YYYY-MM-DD.`);
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`Invalid calendar date: "${value}".`);
  }
  return value;
}

export function validateTime24h(value: string | undefined): string | undefined {
  if (value === undefined || value === "") return undefined;
  if (!TIME_24H.test(value)) {
    throw new Error(`Invalid time format: "${value}". Expected HH:MM (24-hour).`);
  }
  const [h, m] = value.split(":").map(Number);
  if (h > 23 || m > 59) {
    throw new Error(`Invalid time value: "${value}". Hours 0-23, minutes 0-59.`);
  }
  return value;
}

export function validateRecurrence(value: string | undefined): string | undefined {
  if (value === undefined || value === "") return undefined;
  if (!RECURRENCE.test(value)) {
    throw new Error(
      `Invalid recurrence: "${value}". Expected "daily", "weekly:<days>", or "monthly:<day>".`,
    );
  }
  const monthly = value.match(/^monthly:(\d{1,2})$/);
  if (monthly) {
    const day = Number(monthly[1]);
    if (day < 1 || day > 31) {
      throw new Error(`Invalid monthly recurrence day: "${value}". Day must be 1-31.`);
    }
  }
  return value;
}
