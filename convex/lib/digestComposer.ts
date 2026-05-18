const WEEKDAY_SHORT = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export interface DigestItem {
  title: string;
  time?: string;
  location?: string;
  provider?: string;
}

export function composeDigestMessage(input: {
  userName: string;
  items: DigestItem[];
}): string {
  if (input.items.length === 0) {
    throw new Error("composeDigestMessage called with zero items — caller should skip");
  }

  const itemLines = input.items.map((item) => {
    const parts: string[] = [item.title];
    if (item.time) parts.push(`at ${formatTimeForDisplay(item.time)}`);
    if (item.provider) parts.push(`with ${item.provider}`);
    if (item.location) parts.push(`(${item.location})`);
    return parts.join(" ");
  });

  return [
    `Good morning, ${input.userName}.`,
    `Today: ${itemLines.join("; ")}.`,
    "Text me if anything changes.",
  ].join("\n\n");
}

export function formatTimeForDisplay(time24h: string): string {
  const [h, m] = time24h.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time24h;
  const hour12 = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  const minutes = m === 0 ? "" : `:${String(m).padStart(2, "0")}`;
  return `${hour12}${minutes} ${ampm}`;
}

export function recurrenceMatchesToday(
  recurrence: string,
  todayLocalIso: string,
): boolean {
  if (recurrence === "daily") return true;

  const todayDate = new Date(`${todayLocalIso}T12:00:00Z`);
  if (Number.isNaN(todayDate.getTime())) return false;

  if (recurrence.startsWith("weekly:")) {
    const days = recurrence
      .slice("weekly:".length)
      .split(",")
      .map((day) => day.trim().toLowerCase());
    const todayShort = WEEKDAY_SHORT[todayDate.getUTCDay()];
    return days.includes(todayShort);
  }

  if (recurrence.startsWith("monthly:")) {
    const day = parseInt(recurrence.slice("monthly:".length), 10);
    return !Number.isNaN(day) && todayDate.getUTCDate() === day;
  }

  return false;
}

export function localDateIso(timestampMs: number, timezone: string): string {
  try {
    return new Date(timestampMs).toLocaleDateString("en-CA", {
      timeZone: timezone,
    });
  } catch {
    return new Date(timestampMs).toISOString().slice(0, 10);
  }
}
