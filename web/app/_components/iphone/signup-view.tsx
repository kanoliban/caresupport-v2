"use client";

import { useState, type FormEvent } from "react";
import { track } from "@vercel/analytics";
import { getAttribution } from "@/lib/attribution";
import { openMessages } from "@/lib/text-cta";

const FONT_STYLE = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
};

interface SignupViewProps {
  onBack: () => void;
  onSuccess: (email: string) => void;
  animate?: boolean;
}

export function SignupView({ onBack, onSuccess, animate = false }: SignupViewProps) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setError("");
    try {
      const attribution = getAttribution();
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone, ...attribution }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Something went wrong.");
      }
      track("signup_submitted", {
        utmSource: attribution.utmSource ?? null,
        placement: "hero-phone",
      });
      onSuccess(email);
      if (openMessages()) {
        track("text_cta_clicked", { placement: "hero-phone" });
      }
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Please try again.");
    }
  }

  return (
    <div
      className={`h-full flex flex-col bg-[#f2f2f7] ${animate ? "animate-slide-in-right" : ""}`}
      style={FONT_STYLE}
    >
      {/* header */}
      <div className="flex items-center justify-between px-[16px] pt-[60px] pb-[12px] bg-white border-b border-[#c6c6c8]">
        <button
          type="button"
          onClick={onBack}
          className="text-[#007aff] text-[17px] active:opacity-50"
        >
          ← Back
        </button>
        <h2 className="text-[17px] font-semibold text-black">Get started</h2>
        <span className="w-[48px]" />
      </div>

      {/* body */}
      <div className="flex-1 overflow-y-auto px-[20px] py-[24px]">
        <div className="bg-white rounded-[14px] p-[20px]">
          <h3 className="text-[22px] font-bold text-black mb-[8px]">
            Get early access
          </h3>
          <p className="text-[15px] text-[#3c3c43] leading-[20px] mb-[20px]">
            Drop your email and number, then say hi over text. Onboarding
            happens right in the thread.
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-[12px]">
            <label className="block">
              <span className="text-[13px] font-medium text-[#3c3c43] mb-[6px] block">
                Email
              </span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-[14px] py-[12px] rounded-[10px] bg-[#f2f2f7] border border-transparent text-[16px] text-black placeholder-[#8e8e93] outline-none focus:border-[#007aff]"
              />
            </label>

            <label className="block">
              <span className="text-[13px] font-medium text-[#3c3c43] mb-[6px] block">
                Phone
              </span>
              <input
                type="tel"
                name="phone"
                autoComplete="tel"
                required
                placeholder="(555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-[14px] py-[12px] rounded-[10px] bg-[#f2f2f7] border border-transparent text-[16px] text-black placeholder-[#8e8e93] outline-none focus:border-[#007aff]"
              />
            </label>

            {status === "error" && (
              <p className="text-[13px] text-[#ff3b30]" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full py-[14px] rounded-[12px] bg-[#ff5b1f] text-white text-[17px] font-semibold active:scale-[0.98] disabled:opacity-60"
            >
              {status === "loading" ? "One sec…" : "Start with a text"}
            </button>
          </form>
        </div>

        <p className="text-[12px] text-[#8e8e93] text-center mt-[16px]">
          No app. No spam. Unsubscribe anytime.
        </p>
      </div>
    </div>
  );
}
