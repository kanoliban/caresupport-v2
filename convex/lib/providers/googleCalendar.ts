// 2026-06-17: Google Calendar provider helpers; includes OAuth account metadata and duplicate event matching.
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const GOOGLE_USERINFO_API = "https://www.googleapis.com/oauth2/v2/userinfo";
export const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";
export const GOOGLE_ACCOUNT_SCOPE = "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile";

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
}

export interface GoogleAccountProfile {
  email?: string;
  name?: string;
}

export function buildOAuthUrl(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: `${CALENDAR_SCOPE} ${GOOGLE_ACCOUNT_SCOPE}`,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<TokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Token exchange failed: ${err}`);
  }
  return response.json() as Promise<TokenResponse>;
}

export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<TokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Token refresh failed: ${err}`);
  }
  return response.json() as Promise<TokenResponse>;
}

export async function fetchGoogleAccountProfile(
  accessToken: string,
): Promise<GoogleAccountProfile | null> {
  const response = await fetch(GOOGLE_USERINFO_API, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as { email?: unknown; name?: unknown };
  return {
    email: typeof data.email === "string" ? data.email : undefined,
    name: typeof data.name === "string" ? data.name : undefined,
  };
}

export async function fetchPrimaryCalendarProfile(
  accessToken: string,
): Promise<GoogleAccountProfile | null> {
  const response = await fetch(`${GOOGLE_CALENDAR_API}/users/me/calendarList/primary`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as { id?: unknown; summary?: unknown };
  const id = typeof data.id === "string" ? data.id : undefined;
  const summary = typeof data.summary === "string" ? data.summary : undefined;
  const summaryEmail = summary?.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const email = id?.includes("@") ? id : summaryEmail;
  const name = summary && summary !== email ? summary : undefined;
  if (!email && !name) {
    return null;
  }
  return { email, name };
}

export async function fetchEventsForRange(
  accessToken: string,
  timeMin: string,
  timeMax: string,
  timezone: string,
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    timeZone: timezone,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "50",
  });
  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Calendar fetch failed (${response.status}): ${err}`);
  }
  const data = (await response.json()) as { items?: CalendarEvent[] };
  return data.items ?? [];
}

export async function getCalendarEvent(
  accessToken: string,
  eventId: string,
): Promise<CalendarEvent | null> {
  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/primary/events/${eventId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  // 404/410 → the event no longer exists (deleted).
  if (response.status === 404 || response.status === 410) return null;
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Calendar get failed (${response.status}): ${err}`);
  }
  const event = (await response.json()) as CalendarEvent & { status?: string };
  // A cancelled event is effectively deleted from the user's perspective.
  if (event.status === "cancelled") return null;
  return event;
}

function normalizeCalendarText(value: string | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(appointment|appt|event|calendar|the|at|for)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function eventDate(event: CalendarEvent): string {
  return (event.start.dateTime ?? event.start.date ?? "").slice(0, 10);
}

function eventStartTime(event: CalendarEvent): string | undefined {
  const value = event.start.dateTime;
  return value ? value.slice(11, 16) : undefined;
}

export function isLikelyDuplicateCalendarEvent(
  existing: CalendarEvent,
  candidate: {
    title?: string;
    date: string;
    startTime?: string;
    location?: string;
  },
): boolean {
  if (eventDate(existing) !== candidate.date) {
    return false;
  }

  const existingTitle = normalizeCalendarText(existing.summary);
  const candidateTitle = normalizeCalendarText(candidate.title);
  const existingLocation = normalizeCalendarText(existing.location);
  const candidateLocation = normalizeCalendarText(candidate.location);
  const existingStartTime = eventStartTime(existing);

  if (candidate.startTime && existingStartTime && candidate.startTime !== existingStartTime) {
    return false;
  }

  if (existingTitle && candidateTitle) {
    if (existingTitle === candidateTitle) {
      return true;
    }
    if (existingTitle.includes(candidateTitle) || candidateTitle.includes(existingTitle)) {
      return true;
    }
  }

  if (
    candidateLocation &&
    existingLocation &&
    (existingLocation.includes(candidateLocation) || candidateLocation.includes(existingLocation))
  ) {
    return true;
  }

  const combined = `${existingTitle} ${existingLocation}`.trim();
  return Boolean(candidateTitle && combined.includes(candidateTitle));
}

export function findLikelyDuplicateCalendarEvent(
  events: CalendarEvent[],
  candidate: {
    title?: string;
    date: string;
    startTime?: string;
    location?: string;
  },
): CalendarEvent | null {
  return events.find((event) => isLikelyDuplicateCalendarEvent(event, candidate)) ?? null;
}

// Maps a simple recurrence keyword to a Google Calendar RRULE array.
// Returns undefined for a one-off event (no keyword / "none"/"once").
export function buildRecurrenceRule(keyword?: string): string[] | undefined {
  switch (keyword?.trim().toLowerCase()) {
    case "daily":
      return ["RRULE:FREQ=DAILY"];
    case "weekdays":
      return ["RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"];
    case "weekly":
      return ["RRULE:FREQ=WEEKLY"];
    case "biweekly":
      return ["RRULE:FREQ=WEEKLY;INTERVAL=2"];
    case "monthly":
      return ["RRULE:FREQ=MONTHLY"];
    case "yearly":
      return ["RRULE:FREQ=YEARLY"];
    default:
      return undefined;
  }
}

// Strips Google's instance suffix (e.g. "_20260605T193000Z") so an update or
// delete targets the whole recurring series rather than a single occurrence.
export function toSeriesEventId(eventId: string): string {
  return eventId.replace(/_\d{8}T\d{6}Z$/, "");
}

export async function createCalendarEvent(
  accessToken: string,
  event: {
    title: string;
    date: string;
    startTime?: string;
    endTime?: string;
    description?: string;
    location?: string;
    timezone: string;
    recurrence?: string[];
  },
): Promise<CalendarEvent> {
  const isAllDay = !event.startTime;
  const body: Record<string, unknown> = {
    summary: event.title,
    ...(event.description && { description: event.description }),
    ...(event.location && { location: event.location }),
    ...(event.recurrence?.length && { recurrence: event.recurrence }),
    start: isAllDay
      ? { date: event.date }
      : { dateTime: `${event.date}T${event.startTime}:00`, timeZone: event.timezone },
    end: isAllDay
      ? { date: event.date }
      : {
          dateTime: `${event.date}T${event.endTime ?? event.startTime}:00`,
          timeZone: event.timezone,
        },
  };
  const response = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Calendar event create failed: ${err}`);
  }
  return response.json() as Promise<CalendarEvent>;
}

export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  updates: {
    title?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    description?: string;
    location?: string;
    timezone: string;
    recurrence?: string[];
  },
): Promise<CalendarEvent> {
  const patch: Record<string, unknown> = {};
  if (updates.title) patch.summary = updates.title;
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.location !== undefined) patch.location = updates.location;
  if (updates.recurrence?.length) patch.recurrence = updates.recurrence;

  // If any timing field changes, fetch the current event and merge so that
  // unspecified parts are preserved. Without this, "move it to tomorrow" (date
  // only, same time) would drop the time and turn the event all-day.
  if (updates.date || updates.startTime || updates.endTime) {
    const current = await getCalendarEvent(accessToken, eventId);
    // Google returns local wall-clock with offset (e.g. 2026-06-05T19:30:00+03:00),
    // so date/time slices need no timezone math.
    const curStartIso = current?.start?.dateTime;
    const curEndIso = current?.end?.dateTime;
    const curDate = curStartIso?.slice(0, 10) ?? current?.start?.date;
    const curStartTime = curStartIso?.slice(11, 16);
    const curEndTime = curEndIso?.slice(11, 16);
    const tz = current?.start?.timeZone ?? updates.timezone;

    const newDate = updates.date ?? curDate;
    const newStartTime = updates.startTime ?? curStartTime;
    const newEndTime = updates.endTime ?? curEndTime ?? newStartTime;

    if (newDate && newStartTime) {
      patch.start = { dateTime: `${newDate}T${newStartTime}:00`, timeZone: tz };
      patch.end = {
        dateTime: `${newDate}T${newEndTime ?? newStartTime}:00`,
        timeZone: tz,
      };
    } else if (newDate) {
      patch.start = { date: newDate };
      patch.end = { date: newDate };
    }
  }
  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/primary/events/${eventId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patch),
    },
  );
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Calendar event update failed: ${err}`);
  }
  return response.json() as Promise<CalendarEvent>;
}

export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string,
): Promise<void> {
  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/primary/events/${eventId}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } },
  );
  // 410 Gone is fine — event already deleted
  if (!response.ok && response.status !== 410) {
    const err = await response.text();
    throw new Error(`Calendar event delete failed: ${err}`);
  }
}

export function formatEventsForPrompt(
  events: CalendarEvent[],
  dateLabel: string,
  timezone: string,
): string {
  if (events.length === 0) return `${dateLabel}: nothing scheduled`;
  const lines = events.map((e) => {
    const start = e.start.dateTime
      ? new Date(e.start.dateTime).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          timeZone: timezone,
        })
      : "all day";
    const loc = e.location ? ` (${e.location})` : "";
    return `  ${start}: ${e.summary}${loc} [eventId: ${e.id}]`;
  });
  return `${dateLabel}:\n${lines.join("\n")}`;
}
