// Shared handle normalization for inbound/outbound identities.
//
// A "handle" is how the Linq Partner API addresses a person: either an E.164
// phone number or an email address (Apple ID) for iMessage. Both are valid
// senders. Earlier code had three duplicated phone-only normalizers that
// silently dropped international numbers without a leading `+` and every email
// handle, which meant non-US users and Apple-ID-email iMessage users could
// never be created or replied to.
//
// `normalizeHandle` returns a canonical string for storage/lookup, or `null`
// for input that is neither a usable phone nor a usable email.

// Conservative email shape check: one `@`, non-empty local part, a dotted
// domain. We intentionally do not try to fully validate RFC 5322.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MIN_PHONE_DIGITS = 8; // shortest plausible international subscriber number
const MAX_PHONE_DIGITS = 15; // E.164 maximum

export function normalizeHandle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Email branch: anything containing `@` is treated as an email handle.
  if (trimmed.includes("@")) {
    const email = trimmed.toLowerCase();
    return EMAIL_RE.test(email) ? email : null;
  }

  // Phone branch.
  const stripped = trimmed.replace(/[^\d+]/g, "");
  const digits = stripped.replace(/\+/g, "");
  if (digits.length < MIN_PHONE_DIGITS || digits.length > MAX_PHONE_DIGITS) {
    return null;
  }

  // Explicit E.164 — trust the provided country code.
  if (stripped.startsWith("+")) return `+${digits}`;

  // Bare US formats kept for backwards compatibility with existing data.
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;

  // Any other 8–15 digit input is treated as an international number that
  // simply lost its leading `+` (common from iMessage handles).
  return `+${digits}`;
}
