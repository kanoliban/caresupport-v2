import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  color?: string;
  size?: number;
};

const stroke = "currentColor";

// ──────────────────────────────────────────────────────────────
// Small icon map — 16px base, used in status pills, list rows,
// memory facts, etc. Mirrors prototype components.jsx Icon map.
// ──────────────────────────────────────────────────────────────

export function HeartIcon({ color = stroke, size = 16, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" {...rest}>
      <path
        d="M8 14s-5-3.2-5-7.3C3 4.5 4.6 3 6.4 3c1 0 1.8.5 2.3 1.3C9.2 3.5 10 3 11 3c1.8 0 3.4 1.5 3.4 3.7C14.4 10.8 9.4 14 9.4 14L8 14z"
        fill={color}
      />
    </svg>
  );
}

export function CalendarIcon({
  color = stroke,
  size = 16,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" {...rest}>
      <rect
        x="2"
        y="3.5"
        width="12"
        height="11"
        rx="2"
        stroke={color}
        strokeWidth="1.6"
        fill="none"
      />
      <path
        d="M2 6.5h12M5.5 2v3M10.5 2v3"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PillIcon({ color = stroke, size = 16, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" {...rest}>
      <rect
        x="1.5"
        y="5"
        width="13"
        height="6"
        rx="3"
        stroke={color}
        strokeWidth="1.6"
        fill="none"
        transform="rotate(-30 8 8)"
      />
      <path d="M5.5 11l5-6" stroke={color} strokeWidth="1.6" />
    </svg>
  );
}

export function AlertIcon({ color = stroke, size = 16, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" {...rest}>
      <path
        d="M8 2L14 13H2L8 2z"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M8 6.5v3M8 11v.1"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LoopIcon({ color = stroke, size = 16, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" {...rest}>
      <path
        d="M3 8a5 5 0 015-5 5 5 0 014.5 2.8M13 8a5 5 0 01-5 5 5 5 0 01-4.5-2.8"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M11 2.5L13 5L10.5 5.8M5 13.5L3 11L5.5 10.2"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function PersonIcon({ color = stroke, size = 16, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" {...rest}>
      <circle
        cx="8"
        cy="5.5"
        r="2.5"
        stroke={color}
        strokeWidth="1.6"
        fill="none"
      />
      <path
        d="M3 13.5c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function CheckIcon({ color = stroke, size = 14, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" {...rest}>
      <path
        d="M2.5 7.5l3 3 6-6.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EditIcon({ color = stroke, size = 14, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" {...rest}>
      <path
        d="M2 12l1-3 7-7 2 2-7 7-3 1z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function ClockIcon({ color = stroke, size = 16, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" {...rest}>
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke={color}
        strokeWidth="1.6"
        fill="none"
      />
      <path
        d="M8 4.5V8l2.5 1.5"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BrainIcon({ color = stroke, size = 16, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" {...rest}>
      <path
        d="M5 3a2 2 0 00-2 2v1a2 2 0 00-1 3.5A2 2 0 003 13h4V3H5zM11 3a2 2 0 012 2v1a2 2 0 011 3.5A2 2 0 0113 13H9V3h2z"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}

export function IdCardIcon({ color = stroke, size = 16, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" {...rest}>
      <rect
        x="1.5"
        y="3"
        width="13"
        height="10"
        rx="1.8"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
      />
      <circle
        cx="5.5"
        cy="7.5"
        r="1.6"
        stroke={color}
        strokeWidth="1.4"
        fill="none"
      />
      <path
        d="M3 11.2c.6-1.2 1.5-1.7 2.5-1.7s1.9.5 2.5 1.7"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M9.5 6h3.5M9.5 8.5h3.5M9.5 11h2"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function QuestionIcon({
  color = stroke,
  size = 16,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" {...rest}>
      <circle
        cx="8"
        cy="8"
        r="6.3"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M6 6.5C6 5 7 4.3 8 4.3s2 .7 2 2c0 1.3-2 1.5-2 3"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="8" cy="11.2" r="0.8" fill={color} />
    </svg>
  );
}

export function MapIcon({ color = stroke, size = 16, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" {...rest}>
      <path
        d="M8 14C5.5 11 3 9 3 6.5a5 5 0 0110 0C13 9 10.5 11 8 14z"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
      />
      <circle
        cx="8"
        cy="6.5"
        r="1.8"
        stroke={color}
        strokeWidth="1.4"
        fill="none"
      />
    </svg>
  );
}

export function CloseIcon({ color = stroke, size = 16, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" {...rest}>
      <path
        d="M3 3L13 13M13 3L3 13"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BackIcon({ color = stroke, size = 18, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" {...rest}>
      <path
        d="M11 4L5 9L11 14"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function ChevronRightIcon({
  color = stroke,
  size = 14,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" {...rest}>
      <path
        d="M5 3L9 7L5 11"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function ThumbIcon({ color = stroke, size = 16, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" {...rest}>
      <path
        d="M5 7L7.5 2.5C8.5 2.5 9 3.2 9 4.2V6.5H12.5C13.3 6.5 13.8 7.2 13.6 8L12.5 12.5C12.4 13 12 13.5 11.3 13.5H5V7zM5 7H2.5V13.5H5"
        stroke={color}
        strokeWidth="1.4"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function PlaceIcon({ color = stroke, size = 14, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" {...rest}>
      <path
        d="M7 1L2 3.5V10L7 12.5L12 10V3.5L7 1z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M7 1V12.5M2 3.5L7 6L12 3.5"
        stroke={color}
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function MailIcon({ color = stroke, size = 14, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" {...rest}>
      <rect
        x="1.5"
        y="3"
        width="11"
        height="8"
        rx="1.5"
        stroke={color}
        strokeWidth="1.4"
        fill="none"
      />
      <path d="M2 3.5L7 7L12 3.5" stroke={color} strokeWidth="1.4" />
    </svg>
  );
}

export function RideIcon({ color = stroke, size = 18, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" {...rest}>
      <path
        d="M3 11V8L5 4H13L15 8V11M3 11H4.5C5.3 11 6 10.3 6 9.5V8.5C6 7.7 5.3 7 4.5 7H3M3 11V13H5V11M15 11H13.5C12.7 11 12 10.3 12 9.5V8.5C12 7.7 12.7 7 13.5 7H15M15 11V13H13V11"
        stroke={color}
        strokeWidth="1.4"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function CarePeopleIcon({
  color = stroke,
  size = 18,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" {...rest}>
      <circle
        cx="6"
        cy="6"
        r="2.5"
        stroke={color}
        strokeWidth="1.4"
        fill="none"
      />
      <circle
        cx="13"
        cy="7"
        r="2"
        stroke={color}
        strokeWidth="1.4"
        fill="none"
      />
      <path
        d="M1.5 14.5C1.5 11.5 3.5 10 6 10S10.5 11.5 10.5 14.5"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M10.5 13C10.5 11 12 10 13 10S15.5 11 15.5 13"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function ClipboardIcon({
  color = stroke,
  size = 18,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" {...rest}>
      <rect
        x="3.5"
        y="3"
        width="11"
        height="13"
        rx="1.6"
        stroke={color}
        strokeWidth="1.4"
        fill="none"
      />
      <rect
        x="6"
        y="1.5"
        width="6"
        height="3"
        rx="0.8"
        stroke={color}
        strokeWidth="1.4"
        fill="none"
      />
      <path
        d="M6 9H12M6 12H10"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────
// Home-screen filled icons — larger, used in status pills and
// shortcuts row. Distinct from the small outline set above.
// ──────────────────────────────────────────────────────────────

export function PinFilledIcon({
  color = stroke,
  size = 18,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <path
        d="M12 22s-7-7-7-13a7 7 0 0114 0c0 6-7 13-7 13z"
        fill={color}
      />
      <circle cx="12" cy="9.5" r="2.5" fill="#fff" />
    </svg>
  );
}

export function SunFilledIcon({
  color = stroke,
  size = 18,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <circle cx="12" cy="12" r="4.5" fill={color} />
      <g stroke={color} strokeWidth="2.2" strokeLinecap="round">
        <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2 2M17 5l-2 2M5 19l2-2M17 19l-2-2" />
      </g>
    </svg>
  );
}

export function DateFilledIcon({
  color = stroke,
  size = 18,
  label = "25",
  ...rest
}: IconProps & { label?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <rect x="3" y="5" width="18" height="16" rx="2.2" fill={color} />
      <rect x="3" y="5" width="18" height="4" rx="2.2" fill={color} />
      <path
        d="M8 3v4M16 3v4"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <text
        x="12"
        y="17"
        textAnchor="middle"
        fill="#fff"
        fontSize="8"
        fontWeight="800"
        fontFamily="-apple-system, system-ui, sans-serif"
      >
        {label}
      </text>
    </svg>
  );
}

export function SettingsIcon({
  color = stroke,
  size = 18,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <path
        d="M19.4 13a7.5 7.5 0 000-2l2-1.5-2-3.5-2.4 1a7.5 7.5 0 00-1.7-1L15 3.5h-4l-.3 2.5a7.5 7.5 0 00-1.7 1l-2.4-1-2 3.5L6.6 11a7.5 7.5 0 000 2l-2 1.5 2 3.5 2.4-1c.5.4 1.1.7 1.7 1L11 20.5h4l.3-2.5c.6-.3 1.2-.6 1.7-1l2.4 1 2-3.5L19.4 13z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="13" cy="12" r="2.5" fill={color} />
    </svg>
  );
}

export function PeopleFilledIcon({
  color = stroke,
  size = 22,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <circle cx="9" cy="9" r="3.5" fill={color} />
      <circle cx="17" cy="10" r="2.5" fill={color} />
      <path
        d="M2 19c0-3 3-5 7-5s7 2 7 5M14 18c.6-2 2.4-3.5 5-3.5s3.5 1 4 2.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function PlusIcon({ color = stroke, size = 22, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" {...rest}>
      <path
        d="M11 3v16M3 11h16"
        stroke={color}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LogFilledIcon({
  color = stroke,
  size = 22,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <rect x="5" y="4" width="14" height="18" rx="2.2" fill={color} />
      <rect x="9" y="2" width="6" height="3" rx="1" fill={color} />
      <path
        d="M9 12l2 2 4-4"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function SearchIcon({ color = stroke, size = 22, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <circle
        cx="11"
        cy="11"
        r="7"
        stroke={color}
        strokeWidth="2.4"
        fill="none"
      />
      <path
        d="M16.5 16.5L21 21"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────
// Create-option glyphs — used in the "What would you like to
// create?" picker on Home.
// ──────────────────────────────────────────────────────────────

export function CalendarPlusGlyph({
  color = stroke,
  size = 24,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="2.5"
        stroke={color}
        strokeWidth="2.2"
        fill="none"
      />
      <path
        d="M3 10h18M8 3v4M16 3v4"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="17" cy="16" r="4" fill={color} />
      <path
        d="M15.2 16h3.6M17 14.2v3.6"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AlarmGlyph({ color = stroke, size = 24, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <circle
        cx="12"
        cy="13"
        r="7.5"
        stroke={color}
        strokeWidth="2.2"
        fill="none"
      />
      <path
        d="M12 9v4l3 2"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M4 5l3-3M20 5l-3-3"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ClipboardCheckGlyph({
  color = stroke,
  size = 24,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <rect x="5" y="4" width="14" height="18" rx="2.2" fill={color} />
      <rect x="9" y="2" width="6" height="3.4" rx="1" fill={color} />
      <path
        d="M9 13l2 2 4-4"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function HeartFilledGlyph({
  color = stroke,
  size = 24,
  ...rest
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <path
        d="M12 21s-8-5-8-12a5 5 0 019-3 5 5 0 019 3c0 7-8 12-8 12h-2z"
        fill={color}
      />
    </svg>
  );
}
