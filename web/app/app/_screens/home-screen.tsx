"use client";

import type { CSSProperties, MouseEventHandler, ReactNode } from "react";
import { CSLogo } from "../_components/brand/cs-logo";
import {
  AlarmGlyph,
  CalendarPlusGlyph,
  ClipboardCheckGlyph,
  DateFilledIcon,
  HeartFilledGlyph,
  LogFilledIcon,
  PeopleFilledIcon,
  PinFilledIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  SunFilledIcon,
} from "../_components/icons";
import { useCurrentUser } from "../_lib/data-hooks";

export type CreateOptionKey =
  | "reminder"
  | "event"
  | "alarm"
  | "task"
  | "note";

type CreateOption = {
  key: CreateOptionKey;
  label: string;
  sub: string;
  iconKind: "cal-plus" | "alarm" | "clipboard-check" | "heart";
  color: string;
  tint: string;
};

const CREATE_OPTIONS: readonly CreateOption[] = [
  {
    key: "reminder",
    label: "Reminder",
    sub: "Set a reminder for yourself or your care recipient",
    iconKind: "cal-plus",
    color: "#B829D8",
    tint: "#F4E1FA",
  },
  {
    key: "event",
    label: "Event",
    sub: "Add an appointment, activity, or important date",
    iconKind: "cal-plus",
    color: "#F55A2A",
    tint: "#FFE5D6",
  },
  {
    key: "alarm",
    label: "Alarm",
    sub: "Set an alert for a medication or task",
    iconKind: "alarm",
    color: "#B829D8",
    tint: "#F4E1FA",
  },
  {
    key: "task",
    label: "Care plan task",
    sub: "Add a task to track or complete",
    iconKind: "clipboard-check",
    color: "#2BAE66",
    tint: "#DCF1E5",
  },
  {
    key: "note",
    label: "Note",
    sub: "Add a personal note or update",
    iconKind: "heart",
    color: "#F0457F",
    tint: "#FCE0EB",
  },
];

type HomeScreenProps = {
  onNavCoord: () => void;
  onTapMemory: () => void;
  onOpenSchedule: () => void;
  onOpenMeds: () => void;
  onPickCreate: (key: CreateOptionKey) => void;
  onOpenSettings: () => void;
};

export function HomeScreen({
  onNavCoord,
  onTapMemory,
  onOpenSchedule,
  onOpenMeds,
  onPickCreate,
  onOpenSettings,
}: HomeScreenProps) {
  const user = useCurrentUser();
  const greeting = pickGreeting(user?.name ?? "there");
  const today = new Date();
  const dateLabel = today.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });
  const dateNum = String(today.getDate());

  return (
    <div style={{ paddingBottom: 220 }}>
      {/* Header — greeting + CSLogo top-right */}
      <div
        style={{
          padding: "4px 22px 18px 22px",
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 18,
          alignItems: "flex-start",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontFamily: "inherit",
              fontWeight: 800,
              fontSize: 30,
              color: "var(--cs-text)",
              letterSpacing: -0.9,
              lineHeight: 1.08,
            }}
          >
            {greeting}
          </h1>
          <div
            style={{
              marginTop: 6,
              fontFamily: "inherit",
              fontWeight: 500,
              fontSize: 15,
              color: "var(--cs-text-muted)",
              lineHeight: 1.4,
            }}
          >
            Here&rsquo;s what&rsquo;s important right now.
          </div>
        </div>
        <div style={{ marginTop: 6, paddingRight: 4 }}>
          <CSLogo size={46} />
        </div>
      </div>

      {/* Status pills — 2x2 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          padding: "0 22px 22px 22px",
        }}
      >
        <InfoPill icon={<PinFilledIcon color="var(--cs-primary)" />}>
          2801 Girard Ave
        </InfoPill>
        <InfoPill icon={<SunFilledIcon color="var(--cs-primary)" />}>
          59° · Partly cloudy
        </InfoPill>
        <InfoPill
          icon={
            <DateFilledIcon color="var(--cs-primary)" label={dateNum} />
          }
          onClick={onOpenSchedule}
        >
          {dateLabel}
        </InfoPill>
        <InfoPill
          icon={<SettingsIcon color="var(--cs-primary)" />}
          onClick={onOpenSettings}
        >
          Settings
        </InfoPill>
      </div>

      {/* Shortcuts */}
      <SectionTitle>Shortcuts</SectionTitle>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          padding: "0 22px 26px 22px",
        }}
      >
        <ShortcutCard
          onClick={onNavCoord}
          icon={<PeopleFilledIcon color="var(--cs-primary)" size={28} />}
          label="Coordinate"
        />
        <ShortcutCard
          active
          icon={<PlusIcon color="#fff" size={28} />}
          label="Create"
        />
        <ShortcutCard
          onClick={onTapMemory}
          icon={<LogFilledIcon color="var(--cs-info)" size={28} />}
          label="Log"
        />
        <ShortcutCard
          onClick={onOpenMeds}
          icon={<SearchIcon color="var(--cs-success)" size={28} />}
          label="Search"
        />
      </div>

      {/* What would you like to create? */}
      <div style={{ padding: "0 22px 14px 22px" }}>
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
          What would you like to create?
        </h2>
        <div
          style={{
            marginTop: 4,
            fontSize: 14.5,
            color: "var(--cs-text-muted)",
            fontWeight: 500,
            lineHeight: 1.4,
          }}
        >
          Choose what you&rsquo;d like to set up.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          padding: "0 22px",
        }}
      >
        {CREATE_OPTIONS.map((opt) => (
          <CreateOptionRow
            key={opt.key}
            option={opt}
            onClick={() => onPickCreate(opt.key)}
          />
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

function pickGreeting(name: string): string {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${name}.`;
  if (hour < 17) return `Good afternoon, ${name}.`;
  if (hour < 21) return `Good evening, ${name}.`;
  return `It's a bit late, ${name}.`;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2
      style={{
        margin: 0,
        padding: "6px 22px 12px 22px",
        fontFamily: "inherit",
        fontWeight: 800,
        fontSize: 22,
        color: "var(--cs-text)",
        letterSpacing: -0.5,
      }}
    >
      {children}
    </h2>
  );
}

type InfoPillProps = {
  icon: ReactNode;
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  badge?: string;
};

function InfoPill({ icon, children, onClick, badge }: InfoPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        height: 46,
        padding: "0 12px",
        background: "var(--cs-card)",
        borderRadius: 999,
        border: "1px solid var(--cs-card-border)",
        boxShadow: "var(--cs-chip-shadow)",
        cursor: onClick ? "pointer" : "default",
        fontFamily: "inherit",
        fontWeight: 700,
        fontSize: 13.5,
        color: "var(--cs-text)",
        letterSpacing: -0.2,
        width: "100%",
        minWidth: 0,
        textAlign: "left",
        whiteSpace: "nowrap",
        overflow: "hidden",
      }}
    >
      <span style={{ display: "inline-flex", flexShrink: 0 }}>{icon}</span>
      <span
        style={{
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {children}
      </span>
      {badge && (
        <span
          style={{
            flexShrink: 0,
            minWidth: 20,
            height: 20,
            padding: "0 6px",
            background: "var(--cs-primary)",
            color: "#fff",
            borderRadius: 999,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: -0.2,
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

type ShortcutCardProps = {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
};

function ShortcutCard({ icon, label, active, onClick }: ShortcutCardProps) {
  const baseStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    padding: "16px 6px",
    borderRadius: 18,
    cursor: "pointer",
    transition: "background 0.18s",
    minHeight: 100,
    border: active ? "none" : "1px solid var(--cs-card-border)",
    background: active ? "var(--cs-primary-gradient)" : "var(--cs-card)",
    color: active ? "var(--cs-primary-ink)" : "var(--cs-text)",
    boxShadow: active
      ? "0 8px 18px rgba(245, 90, 42, 0.30), 0 2px 4px rgba(245, 90, 42, 0.15), inset 0 1px 0 rgba(255,255,255,0.25)"
      : "var(--cs-chip-shadow)",
  };
  return (
    <button type="button" onClick={onClick} style={baseStyle}>
      <div
        style={{
          width: 34,
          height: 34,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontFamily: "inherit",
          fontWeight: 800,
          fontSize: 13.5,
          letterSpacing: -0.2,
        }}
      >
        {label}
      </div>
    </button>
  );
}

type CreateOptionRowProps = {
  option: CreateOption;
  onClick: () => void;
};

function CreateOptionRow({ option, onClick }: CreateOptionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
        background: "var(--cs-card)",
        border: "1px solid var(--cs-card-border)",
        borderRadius: 18,
        boxShadow: "var(--cs-chip-shadow)",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: option.tint,
          color: option.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <CreateOptionGlyph kind={option.iconKind} color={option.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "inherit",
            fontWeight: 800,
            fontSize: 17,
            color: "var(--cs-text)",
            letterSpacing: -0.35,
            lineHeight: 1.2,
          }}
        >
          {option.label}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--cs-text-muted)",
            fontWeight: 500,
            marginTop: 3,
            lineHeight: 1.4,
          }}
        >
          {option.sub}
        </div>
      </div>
      <span
        style={{
          color: "var(--cs-text-subtle)",
          fontSize: 22,
          fontWeight: 600,
          flexShrink: 0,
          marginRight: 4,
        }}
      >
        ›
      </span>
    </button>
  );
}

function CreateOptionGlyph({
  kind,
  color,
}: {
  kind: CreateOption["iconKind"];
  color: string;
}) {
  switch (kind) {
    case "cal-plus":
      return <CalendarPlusGlyph color={color} />;
    case "alarm":
      return <AlarmGlyph color={color} />;
    case "clipboard-check":
      return <ClipboardCheckGlyph color={color} />;
    case "heart":
      return <HeartFilledGlyph color={color} />;
  }
}
