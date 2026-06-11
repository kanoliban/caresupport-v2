type AvatarProps = {
  /** Initials shown when no photo. e.g. "R" for Rob. */
  initials?: string;
  /** Default 56. */
  size?: number;
  /** URL → background image. Single emoji string → large emoji centered. Undefined → initials. */
  photo?: string;
  /** Gradient base color (a darker shade is auto-derived for the gradient end). */
  bgColor?: string;
  className?: string;
};

const isLikelyEmoji = (value: string): boolean => {
  // Quick heuristic: short strings without ASCII letters, not URLs.
  if (value.startsWith("http") || value.startsWith("/")) return false;
  return value.length <= 4 && !/[a-zA-Z0-9]/.test(value);
};

export function Avatar({
  initials = "",
  size = 56,
  photo,
  bgColor = "#C97A57",
  className = "",
}: AvatarProps) {
  const isEmoji = photo !== undefined && isLikelyEmoji(photo);
  const isPhotoUrl = photo !== undefined && !isEmoji;

  const background = isPhotoUrl
    ? `center / cover no-repeat url(${photo})`
    : `linear-gradient(135deg, ${bgColor} 0%, ${darken(bgColor, 0.25)} 100%)`;

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow:
          "0 0 0 3px rgba(255,255,255,0.7), 0 4px 10px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
        color: "#fff",
        fontFamily:
          isEmoji
            ? '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", system-ui, sans-serif'
            : "inherit",
        fontSize: isEmoji ? size * 0.62 : size * 0.36,
        fontWeight: 800,
        letterSpacing: -0.3,
        userSelect: "none",
        flexShrink: 0,
      }}
    >
      {isEmoji ? photo : isPhotoUrl ? "" : initials}
    </div>
  );
}

/** Naive hex darken — clamps to 0. */
function darken(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const num = parseInt(m[1], 16);
  const r = Math.max(0, ((num >> 16) & 0xff) - Math.round(255 * amount));
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * amount));
  const b = Math.max(0, (num & 0xff) - Math.round(255 * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
