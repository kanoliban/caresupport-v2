const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";
export const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";

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

export function buildOAuthUrl(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: CALENDAR_SCOPE,
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
  },
): Promise<CalendarEvent> {
  const isAllDay = !event.startTime;
  const body: Record<string, unknown> = {
    summary: event.title,
    ...(event.description && { description: event.description }),
    ...(event.location && { location: event.location }),
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
  },
): Promise<CalendarEvent> {
  const patch: Record<string, unknown> = {};
  if (updates.title) patch.summary = updates.title;
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.location !== undefined) patch.location = updates.location;
  if (updates.date && updates.startTime) {
    patch.start = {
      dateTime: `${updates.date}T${updates.startTime}:00`,
      timeZone: updates.timezone,
    };
    patch.end = {
      dateTime: `${updates.date}T${updates.endTime ?? updates.startTime}:00`,
      timeZone: updates.timezone,
    };
  } else if (updates.date) {
    patch.start = { date: updates.date };
    patch.end = { date: updates.date };
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
