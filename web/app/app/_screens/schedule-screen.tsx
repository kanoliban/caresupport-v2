"use client";

import { useMemo, useState } from "react";
import { CreateHeader } from "../_components/brand/create-header";
import { CheckIcon } from "../_components/icons";
import {
  useCurrentCareCase,
  useTodaySchedule,
} from "../_lib/data-hooks";
import type { Doc } from "@convex/_generated/dataModel";

type ScheduleItem = Doc<"scheduleItems">;

// ──────────────────────────────────────────────────────────────
// Display derivation — Convex schema is generic; the UI needs
// kind (shift/med/appt/activity/routine) and a display status
// (Taken/Done/On track/Due/Upcoming/Open/Scheduled).
// ──────────────────────────────────────────────────────────────

type DisplayKind = "shift" | "med" | "appt" | "activity" | "routine";

type DisplayStatus =
  | "taken"
  | "done"
  | "on-track"
  | "due"
  | "upcoming"
  | "open"
  | "scheduled";

type KindStyle = {
  icon: string;
  tint: string;
  tintColor: string;
};

const KIND_STYLES: Record<DisplayKind, KindStyle> = {
  shift: {
    icon: "👤",
    tint: "rgba(184, 41, 216, 0.10)",
    tintColor: "#B829D8",
  },
  med: {
    icon: "💊",
    tint: "rgba(43, 174, 102, 0.10)",
    tintColor: "#2BAE66",
  },
  appt: {
    icon: "🩺",
    tint: "rgba(42, 120, 240, 0.10)",
    tintColor: "#2A78F0",
  },
  activity: {
    icon: "🚶",
    tint: "rgba(43, 174, 102, 0.10)",
    tintColor: "#2BAE66",
  },
  routine: {
    icon: "🌙",
    tint: "rgba(120, 90, 224, 0.10)",
    tintColor: "#7A5AE0",
  },
};

type StatusInfo = {
  label: string;
  color: string;
  bg: string;
};

const STATUS_INFO: Record<DisplayStatus, StatusInfo> = {
  taken: {
    label: "Taken",
    color: "var(--cs-success)",
    bg: "rgba(43,174,102,0.10)",
  },
  done: {
    label: "Done",
    color: "var(--cs-success)",
    bg: "rgba(43,174,102,0.10)",
  },
  "on-track": {
    label: "On track",
    color: "var(--cs-success)",
    bg: "rgba(43,174,102,0.10)",
  },
  due: {
    label: "Due",
    color: "var(--cs-warning)",
    bg: "rgba(211,139,25,0.12)",
  },
  upcoming: {
    label: "Upcoming",
    color: "var(--cs-info)",
    bg: "rgba(42,120,240,0.10)",
  },
  open: {
    label: "Open",
    color: "var(--cs-danger)",
    bg: "rgba(210,74,44,0.10)",
  },
  scheduled: {
    label: "Scheduled",
    color: "var(--cs-text-muted)",
    bg: "rgba(0,0,0,0.05)",
  },
};

function deriveKind(item: ScheduleItem): DisplayKind {
  const t = item.title.toLowerCase();
  if (item.type === "appointment") return "appt";
  if (item.type === "reminder") return "med";
  if (t.includes("shift") || t.includes("covering")) return "shift";
  if (t.includes("walk") || t.includes("exercise") || t.includes("activity"))
    return "activity";
  return "routine";
}

function deriveStatus(item: ScheduleItem): DisplayStatus {
  const t = item.title.toLowerCase();
  if (item.status === "completed") {
    return item.type === "reminder" ? "taken" : "done";
  }
  if (item.status === "active") return "on-track";
  if (item.status === "cancelled") return "scheduled";
  // scheduled
  if (t.includes("open") || t.includes("uncovered")) return "open";
  return "scheduled";
}

function formatTime(time?: string): string {
  if (!time) return "";
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (Number.isNaN(h)) return time;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function parseHour(time?: string): number {
  if (!time) return 0;
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (Number.isNaN(h)) return 0;
  return h + (Number.isNaN(m) ? 0 : m / 60);
}

// ──────────────────────────────────────────────────────────────
// Week strip generation — Sun–Sat for the week containing today.
// ──────────────────────────────────────────────────────────────

type WeekDay = {
  iso: string;
  short: string;
  date: number;
  isToday: boolean;
};

function buildWeek(today: Date): WeekDay[] {
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay()); // Sunday
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return {
      iso: d.toISOString().slice(0, 10),
      short: d.toLocaleDateString(undefined, { weekday: "short" }),
      date: d.getDate(),
      isToday: d.toDateString() === today.toDateString(),
    };
  });
}

// ──────────────────────────────────────────────────────────────
// Root
// ──────────────────────────────────────────────────────────────

type ScheduleScreenProps = {
  onClose: () => void;
  onOpenCoord?: () => void;
};

export function ScheduleScreen({
  onClose,
  onOpenCoord,
}: ScheduleScreenProps) {
  const today = useMemo(() => new Date(), []);
  const todayISO = today.toISOString().slice(0, 10);
  const week = useMemo(() => buildWeek(today), [today]);
  const [activeISO, setActiveISO] = useState(todayISO);

  const todayEvents = useTodaySchedule();
  const careCase = useCurrentCareCase();
  const recipientName = careCase?.careRecipientName ?? "Mom";

  // Slice 1A: we only have data for today via useTodaySchedule. Other days
  // render as an empty state. Slice 1B will switch to listByCareCaseAndDate.
  const events = useMemo(
    () => (activeISO === todayISO ? todayEvents : []),
    [activeISO, todayISO, todayEvents],
  );

  const summary = useMemo(() => {
    let done = 0;
    let open = 0;
    let due = 0;
    for (const e of events) {
      const s = deriveStatus(e);
      if (s === "done" || s === "taken" || s === "on-track") done++;
      if (s === "open") open++;
      if (s === "due" || s === "upcoming") due++;
    }
    return { done, open, due };
  }, [events]);

  const morning = events.filter((e) => parseHour(e.time) < 12);
  const afternoon = events.filter(
    (e) => parseHour(e.time) >= 12 && parseHour(e.time) < 17,
  );
  const evening = events.filter((e) => parseHour(e.time) >= 17);

  const activeDay = week.find((d) => d.iso === activeISO);
  const dayLabel = activeDay
    ? activeDay.isToday
      ? "Today"
      : new Date(activeISO).toLocaleDateString(undefined, {
          weekday: "long",
        })
    : "Schedule";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 200,
        background: "var(--cs-bg)",
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      <CreateHeader onBack={onClose} backLabel="Home" />

      <h1
        style={{
          margin: 0,
          padding: "6px 22px 4px 22px",
          fontFamily: "inherit",
          fontWeight: 800,
          fontSize: 32,
          letterSpacing: -0.9,
          color: "var(--cs-text)",
          lineHeight: 1.1,
        }}
      >
        Schedule
      </h1>
      <div
        style={{
          padding: "0 22px 16px 22px",
          fontSize: 13.5,
          color: "var(--cs-text-muted)",
          fontWeight: 500,
          lineHeight: 1.4,
        }}
      >
        Everything time-bound for {recipientName}. Created from your texts.
      </div>

      <WeekStrip
        days={week}
        activeISO={activeISO}
        onPick={setActiveISO}
      />

      <div
        style={{
          padding: "20px 22px 14px 22px",
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: "inherit",
            fontWeight: 800,
            fontSize: 22,
            color: "var(--cs-text)",
            letterSpacing: -0.5,
          }}
        >
          {dayLabel}
        </h2>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            fontSize: 12.5,
            fontWeight: 600,
            color: "var(--cs-text-muted)",
          }}
        >
          {summary.done > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                color: "var(--cs-success)",
              }}
            >
              <CheckIcon color="var(--cs-success)" /> {summary.done} done
            </span>
          )}
          {summary.open > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                color: "var(--cs-danger)",
              }}
            >
              • {summary.open} open
            </span>
          )}
          {summary.due > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                color: "var(--cs-warning)",
              }}
            >
              • {summary.due} due
            </span>
          )}
        </div>
      </div>

      {events.length === 0 && (
        <div
          style={{
            padding: "40px 22px",
            textAlign: "center",
            color: "var(--cs-text-muted)",
            fontSize: 15,
            fontWeight: 500,
          }}
        >
          Nothing scheduled.
        </div>
      )}

      {morning.length > 0 && (
        <PeriodGroup
          label="Morning"
          events={morning}
          onOpenCoord={onOpenCoord}
        />
      )}
      {afternoon.length > 0 && (
        <PeriodGroup
          label="Afternoon"
          events={afternoon}
          onOpenCoord={onOpenCoord}
        />
      )}
      {evening.length > 0 && (
        <PeriodGroup
          label="Evening"
          events={evening}
          onOpenCoord={onOpenCoord}
        />
      )}

      <div style={{ height: 80 }} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Week strip
// ──────────────────────────────────────────────────────────────

function WeekStrip({
  days,
  activeISO,
  onPick,
}: {
  days: WeekDay[];
  activeISO: string;
  onPick: (iso: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        padding: "0 22px",
        overflowX: "auto",
        overflowY: "hidden",
      }}
    >
      {days.map((d) => (
        <DayChip
          key={d.iso}
          day={d}
          active={activeISO === d.iso}
          onClick={() => onPick(d.iso)}
        />
      ))}
    </div>
  );
}

function DayChip({
  day,
  active,
  onClick,
}: {
  day: WeekDay;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "10px 6px 12px 6px",
        background: active ? "var(--cs-primary-gradient)" : "var(--cs-card)",
        color: active ? "var(--cs-primary-ink)" : "var(--cs-text)",
        border: 0,
        borderRadius: 18,
        cursor: "pointer",
        boxShadow: active
          ? "0 6px 14px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.25)"
          : "var(--cs-chip-shadow)",
        fontFamily: "inherit",
      }}
    >
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: 0.4,
          textTransform: "uppercase",
          opacity: active ? 0.85 : 0.55,
        }}
      >
        {day.short}
      </span>
      <span
        style={{
          fontSize: 18,
          fontWeight: 800,
          marginTop: 2,
          letterSpacing: -0.3,
        }}
      >
        {day.date}
      </span>
      <div
        style={{
          height: 4,
          display: "flex",
          alignItems: "center",
          gap: 3,
          marginTop: 4,
        }}
      >
        {day.isToday && (
          <span
            style={{
              width: 4,
              height: 4,
              borderRadius: 2,
              background: active ? "#fff" : "var(--cs-primary)",
            }}
          />
        )}
      </div>
    </button>
  );
}

// ──────────────────────────────────────────────────────────────
// Period group + event pill
// ──────────────────────────────────────────────────────────────

function PeriodGroup({
  label,
  events,
  onOpenCoord,
}: {
  label: string;
  events: ScheduleItem[];
  onOpenCoord?: () => void;
}) {
  return (
    <div>
      <div
        style={{
          padding: "6px 22px 8px 22px",
          fontSize: 11.5,
          fontWeight: 700,
          color: "var(--cs-text-subtle)",
          letterSpacing: 0.7,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          padding: "0 22px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {events.map((e) => (
          <EventPill key={e._id} event={e} onOpenCoord={onOpenCoord} />
        ))}
      </div>
      <div style={{ height: 12 }} />
    </div>
  );
}

function EventPill({
  event,
  onOpenCoord,
}: {
  event: ScheduleItem;
  onOpenCoord?: () => void;
}) {
  const kind = deriveKind(event);
  const ks = KIND_STYLES[kind];
  const status = deriveStatus(event);
  const statusInfo = STATUS_INFO[status];
  const isOpen = status === "open";
  const onClick = isOpen ? onOpenCoord : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "14px 16px",
        background: "var(--cs-card)",
        borderRadius: 16,
        border: 0,
        cursor: onClick ? "pointer" : "default",
        boxShadow: isOpen
          ? "0 0 0 1.5px var(--cs-danger), var(--cs-card-shadow)"
          : "var(--cs-card-shadow)",
        textAlign: "left",
        width: "100%",
      }}
    >
      {/* Time column */}
      <div
        style={{
          width: 64,
          flexShrink: 0,
          paddingTop: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            fontFamily: "inherit",
            fontWeight: 700,
            fontSize: 14,
            color: "var(--cs-text)",
            letterSpacing: -0.3,
            lineHeight: 1.1,
            whiteSpace: "nowrap",
          }}
        >
          {formatTime(event.time)}
        </div>
        {event.endTime && (
          <div
            style={{
              fontSize: 11,
              color: "var(--cs-text-muted)",
              fontWeight: 600,
              marginTop: 3,
              lineHeight: 1.1,
              whiteSpace: "nowrap",
            }}
          >
            – {formatTime(event.endTime)}
          </div>
        )}
      </div>

      {/* Icon */}
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: ks.tint,
          color: ks.tintColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: 16,
        }}
      >
        {ks.icon}
      </div>

      {/* Title + sub */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "inherit",
            fontWeight: 700,
            fontSize: 15,
            color: isOpen ? "var(--cs-danger)" : "var(--cs-text)",
            letterSpacing: -0.25,
            lineHeight: 1.25,
          }}
        >
          {event.title}
        </div>
        {event.notes && (
          <div
            style={{
              fontSize: 12.5,
              color: "var(--cs-text-muted)",
              fontWeight: 500,
              marginTop: 3,
              lineHeight: 1.35,
            }}
          >
            {event.notes}
          </div>
        )}
      </div>

      {/* Status badge */}
      <div
        style={{
          padding: "4px 9px",
          borderRadius: 999,
          background: statusInfo.bg,
          color: statusInfo.color,
          fontWeight: 700,
          fontSize: 10.5,
          letterSpacing: 0.3,
          textTransform: "uppercase",
          flexShrink: 0,
          alignSelf: "flex-start",
          marginTop: 2,
        }}
      >
        {statusInfo.label}
      </div>
    </button>
  );
}
