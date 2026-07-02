export const CARESUPPORT_PHONE = process.env.NEXT_PUBLIC_CARESUPPORT_PHONE;

export const TEXT_BODY = "Hi CareSupport — I'd like to get started.";

export function smsHref(phone: string): string {
  return `sms:${phone}?&body=${encodeURIComponent(TEXT_BODY)}`;
}

export function canOpenMessages(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android|Macintosh/.test(navigator.userAgent);
}

export function openMessages(): boolean {
  if (!CARESUPPORT_PHONE || !canOpenMessages()) return false;
  window.location.href = smsHref(CARESUPPORT_PHONE);
  return true;
}
