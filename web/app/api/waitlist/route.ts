import { NextResponse } from "next/server";
import { getSignupCount, submitSignup } from "@/lib/waitlist-store";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET() {
  const count = await getSignupCount();
  return NextResponse.json({ count });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email =
    typeof body === "object" && body !== null && "email" in body
      ? String((body as { email: unknown }).email ?? "").trim()
      : "";
  const phone =
    typeof body === "object" && body !== null && "phone" in body
      ? String((body as { phone: unknown }).phone ?? "").trim()
      : "";

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }
  if (!phone || phone.replace(/[^\d]/g, "").length < 7) {
    return NextResponse.json(
      { error: "Please enter a valid phone number." },
      { status: 400 },
    );
  }

  const userAgent = request.headers.get("user-agent") ?? undefined;

  try {
    const { count } = await submitSignup({ email, phone, userAgent });
    return NextResponse.json({ ok: true, count });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not save signup.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
