"use client";

import type {
  CSSProperties,
  MouseEventHandler,
  ReactNode,
} from "react";
import { ChevronRightIcon } from "./icons";

// ──────────────────────────────────────────────────────────────
// BigEmoji — large platform emoji with soft drop-shadow.
// Used as floating icon on EmojiCard.
// ──────────────────────────────────────────────────────────────

type BigEmojiProps = {
  char: string;
  size?: number;
  style?: CSSProperties;
};

export function BigEmoji({ char, size = 48, style }: BigEmojiProps) {
  return (
    <div
      style={{
        fontSize: size,
        lineHeight: 1,
        filter:
          "drop-shadow(0 4px 6px rgba(0,0,0,0.18)) drop-shadow(0 1px 1px rgba(0,0,0,0.12))",
        fontFamily:
          '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", system-ui, sans-serif',
        userSelect: "none",
        ...style,
      }}
    >
      {char}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// StatusPill — small white pill with icon + label, used in
// Home's 2×2 status grid (Location / Weather / Date / Settings).
// ──────────────────────────────────────────────────────────────

type StatusPillProps = {
  icon?: ReactNode;
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  iconColor?: string;
  className?: string;
};

export function StatusPill({
  icon,
  children,
  onClick,
  iconColor,
  className = "",
}: StatusPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        height: 36,
        padding: "0 13px 0 11px",
        background: "var(--cs-card)",
        borderRadius: 999,
        border: 0,
        boxShadow: "var(--cs-chip-shadow)",
        cursor: onClick ? "pointer" : "default",
        fontFamily: "inherit",
        fontWeight: 600,
        fontSize: 13.5,
        color: "var(--cs-text)",
        letterSpacing: -0.2,
        whiteSpace: "nowrap",
      }}
    >
      {icon && (
        <span
          style={{
            fontSize: 15,
            color: iconColor ?? "var(--cs-primary)",
            display: "inline-flex",
          }}
        >
          {icon}
        </span>
      )}
      <span>{children}</span>
    </button>
  );
}

// ──────────────────────────────────────────────────────────────
// SectionLabel — bold left, optional muted action on the right.
// ──────────────────────────────────────────────────────────────

type SectionLabelProps = {
  children: ReactNode;
  action?: ReactNode;
  onActionClick?: MouseEventHandler<HTMLButtonElement>;
};

export function SectionLabel({
  children,
  action,
  onActionClick,
}: SectionLabelProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        padding: "20px 22px 12px 22px",
      }}
    >
      <h2
        style={{
          margin: 0,
          fontFamily: "inherit",
          fontWeight: 800,
          fontSize: 21,
          color: "var(--cs-text)",
          letterSpacing: -0.5,
        }}
      >
        {children}
      </h2>
      {action && (
        <button
          type="button"
          onClick={onActionClick}
          style={{
            background: "none",
            border: 0,
            padding: 0,
            cursor: onActionClick ? "pointer" : "default",
            fontFamily: "inherit",
            fontWeight: 600,
            fontSize: 14,
            color: "var(--cs-text-muted)",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {action}
          {onActionClick && (
            <ChevronRightIcon color="var(--cs-text-muted)" />
          )}
        </button>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// EmojiCard — white rounded card with floating BigEmoji at top-left.
// Optional left accent bar.
// ──────────────────────────────────────────────────────────────

type EmojiCardProps = {
  emoji: string;
  children: ReactNode;
  accentBar?: string;
  onClick?: MouseEventHandler<HTMLDivElement>;
  dim?: boolean;
};

export function EmojiCard({
  emoji,
  children,
  accentBar,
  onClick,
  dim = false,
}: EmojiCardProps) {
  return (
    <div style={{ position: "relative", margin: "0 22px 18px 22px" }}>
      <div
        style={{
          position: "absolute",
          top: -18,
          left: 16,
          zIndex: 2,
          transform: "rotate(-6deg)",
        }}
      >
        <BigEmoji char={emoji} size={44} />
      </div>
      <div
        onClick={onClick}
        style={{
          background: "var(--cs-card)",
          borderRadius: 22,
          padding: "32px 20px 16px 20px",
          boxShadow: "var(--cs-card-shadow)",
          position: "relative",
          overflow: "hidden",
          cursor: onClick ? "pointer" : "default",
          opacity: dim ? 0.6 : 1,
          transition: "transform 0.15s ease",
        }}
      >
        {accentBar && (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 4,
              background: accentBar,
            }}
          />
        )}
        {children}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// ViaTag — provenance chip ("via 💬").
// ──────────────────────────────────────────────────────────────

type ViaSource = "imessage" | "calendar" | "voice" | "saved" | "you";

const VIA_GLYPHS: Record<ViaSource, string> = {
  imessage: "💬",
  calendar: "📅",
  voice: "🎙️",
  saved: "💾",
  you: "🙋",
};

type ViaTagProps = {
  source?: ViaSource;
  children?: ReactNode;
};

export function ViaTag({ source = "imessage", children }: ViaTagProps) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 9px 4px 8px",
        background: "#EAF1FF",
        borderRadius: 999,
        fontFamily: "inherit",
        fontWeight: 600,
        fontSize: 12,
        color: "var(--cs-info)",
        letterSpacing: -0.1,
      }}
    >
      <span style={{ opacity: 0.55 }}>via</span>
      <span style={{ fontSize: 13 }}>{VIA_GLYPHS[source]}</span>
      {children && <span style={{ marginLeft: 2 }}>{children}</span>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// ActionTag — "1 action ›" trailing chip.
// ──────────────────────────────────────────────────────────────

type ActionTagProps = {
  count: number;
  label?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
};

export function ActionTag({
  count,
  label = "action",
  onClick,
}: ActionTagProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "6px 10px 6px 12px",
        background: "rgba(0,0,0,0.045)",
        border: 0,
        borderRadius: 999,
        cursor: "pointer",
        fontFamily: "inherit",
        fontWeight: 600,
        fontSize: 13,
        color: "var(--cs-text-muted)",
      }}
    >
      <span>
        {count} {label}
        {count !== 1 ? "s" : ""}
      </span>
      <span style={{ fontSize: 11, marginLeft: 1 }}>›</span>
    </button>
  );
}

// ──────────────────────────────────────────────────────────────
// PrimaryButton — full-width orange CTA, 54px tall.
// ──────────────────────────────────────────────────────────────

type PrimaryButtonProps = {
  children: ReactNode;
  icon?: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  variant?: "primary" | "accent";
  style?: CSSProperties;
  type?: "button" | "submit";
};

export function PrimaryButton({
  children,
  icon,
  onClick,
  variant = "primary",
  style,
  type = "button",
}: PrimaryButtonProps) {
  const bg =
    variant === "accent"
      ? "var(--cs-accent-gradient)"
      : "var(--cs-primary-gradient)";
  return (
    <button
      type={type}
      onClick={onClick}
      style={{
        width: "100%",
        height: 54,
        background: bg,
        color: "var(--cs-primary-ink)",
        border: 0,
        borderRadius: 16,
        fontFamily: "inherit",
        fontWeight: 700,
        fontSize: 17,
        letterSpacing: -0.3,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        cursor: "pointer",
        boxShadow:
          "0 6px 14px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.25)",
        ...style,
      }}
    >
      {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
      <span>{children}</span>
    </button>
  );
}

// ──────────────────────────────────────────────────────────────
// GhostButton — white pill button, 48px tall.
// ──────────────────────────────────────────────────────────────

type GhostButtonProps = {
  children: ReactNode;
  icon?: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  style?: CSSProperties;
};

export function GhostButton({
  children,
  icon,
  onClick,
  style,
}: GhostButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        height: 48,
        background: "var(--cs-card)",
        color: "var(--cs-text)",
        border: 0,
        borderRadius: 14,
        fontFamily: "inherit",
        fontWeight: 600,
        fontSize: 15.5,
        letterSpacing: -0.2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        cursor: "pointer",
        boxShadow: "var(--cs-chip-shadow)",
        ...style,
      }}
    >
      {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
      <span>{children}</span>
    </button>
  );
}

// ──────────────────────────────────────────────────────────────
// PageDots — elongated active dash, small inactive dots.
// ──────────────────────────────────────────────────────────────

type PageDotsProps = {
  count: number;
  active: number;
  onJump?: (index: number) => void;
};

export function PageDots({ count, active, onJump }: PageDotsProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onJump?.(i)}
          aria-label={`Go to page ${i + 1}`}
          style={{
            border: 0,
            padding: 0,
            cursor: "pointer",
            background: "transparent",
          }}
        >
          <div
            style={{
              width: i === active ? 26 : 8,
              height: 8,
              borderRadius: 4,
              background:
                i === active ? "var(--cs-primary)" : "rgba(0,0,0,0.18)",
              transition: "width 0.25s ease, background 0.25s ease",
            }}
          />
        </button>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// VoiceFab — 60px circular orange FAB with mic glyph.
// ──────────────────────────────────────────────────────────────

type VoiceFabProps = {
  onClick?: MouseEventHandler<HTMLButtonElement>;
};

export function VoiceFab({ onClick }: VoiceFabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Voice"
      style={{
        width: 60,
        height: 60,
        borderRadius: "50%",
        background: "var(--cs-primary-gradient)",
        border: 0,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "var(--cs-fab-shadow)",
        color: "#fff",
      }}
    >
      <svg width="22" height="28" viewBox="0 0 22 28" fill="none">
        <rect x="6" y="2" width="10" height="16" rx="5" fill="currentColor" />
        <path
          d="M2 13 V14 C2 19 6 23 11 23 C16 23 20 19 20 14 V13"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M11 23 V27"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
