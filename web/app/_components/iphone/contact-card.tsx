"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";

const FONT_STYLE = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
};

type PersonaId = "aging-parents" | "recovery" | "long-distance";

const PERSONAS: Record<PersonaId, { title: string; body: string[] }> = {
  "aging-parents": {
    title: "Aging parents",
    body: [
      "Mom needs her medications, her Tuesday appointment, someone to call before dinner.",
      "You hold all of it in your head. It can live somewhere else — quietly, in the same texts you already send.",
    ],
  },
  recovery: {
    title: "Recovery at home",
    body: [
      "After the hospital, the schedule is brutal. Wound care, follow-ups, who's covering Saturday.",
      "We turn the discharge plan into the right reminders, sent to the right person, at the right moment.",
    ],
  },
  "long-distance": {
    title: "Long-distance care",
    body: [
      "You're three states away and the texts come at 11 PM.",
      "Those late-night texts get an answer. When something needs your sibling, the agency, or Dad's neighbor — we ask, and we follow up.",
    ],
  },
};

interface ContactCardProps {
  onBack: () => void;
  onJoinWaitlist: () => void;
  animate?: boolean;
}

export function ContactCard({
  onBack,
  onJoinWaitlist,
  animate = false,
}: ContactCardProps) {
  const [persona, setPersona] = useState<PersonaId | null>(null);

  if (persona) {
    const data = PERSONAS[persona];
    return (
      <div
        className="h-full overflow-y-auto bg-black text-white animate-slide-in-right"
        style={FONT_STYLE}
      >
        <div className="flex items-center px-[16px] pt-[50px] pb-[8px]">
          <button
            type="button"
            onClick={() => setPersona(null)}
            className="flex items-center gap-[4px] text-[#0a84ff] active:opacity-60"
          >
            <svg width="12" height="20" viewBox="0 0 12 20" aria-hidden>
              <path
                d="M10.5 1L2 10L10.5 19"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
            <span className="text-[17px]">CareSupport</span>
          </button>
        </div>

        <div className="px-[20px] pt-[16px] pb-[40px]">
          <h2 className="text-[28px] font-bold mb-[20px]">{data.title}</h2>
          {data.body.map((p, i) => (
            <p
              key={i}
              className="text-[16px] leading-[24px] text-[#d1d1d6] mb-[16px]"
            >
              {p}
            </p>
          ))}

          <div className="bg-[#1c1c1e] rounded-[14px] mt-[24px]">
            <button
              type="button"
              onClick={onJoinWaitlist}
              className="w-full px-[16px] py-[14px] text-[17px] text-[#0a84ff] text-left active:opacity-60"
            >
              Join the waitlist
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`h-full overflow-y-auto bg-black text-white ${animate ? "animate-slide-in-right" : ""}`}
      style={FONT_STYLE}
    >
      {/* top bar: back + edit */}
      <div className="flex items-center justify-between px-[16px] pt-[50px] pb-[12px]">
        <button
          type="button"
          onClick={onBack}
          className="w-[36px] h-[36px] rounded-full bg-[#1c1c1e] flex items-center justify-center active:opacity-60"
          aria-label="Back to conversation"
        >
          <svg width="10" height="16" viewBox="0 0 10 16" aria-hidden>
            <path
              d="M9 1L1 8L9 15"
              stroke="white"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          className="px-[14px] py-[6px] rounded-full bg-[#1c1c1e] text-[15px] active:opacity-60"
          aria-label="Edit contact"
        >
          Edit
        </button>
      </div>

      {/* avatar + name */}
      <div className="flex flex-col items-center px-[16px]">
        <div className="w-[88px] h-[88px] rounded-[20px] bg-white flex items-center justify-center overflow-hidden mb-[12px]">
          <Image
            src="/caresupport-logo.webp"
            alt=""
            width={512}
            height={512}
            className="w-[78px] h-[78px] object-contain"
          />
        </div>
        <h1 className="text-[28px] font-bold mb-[14px]">CareSupport</h1>
        <p className="text-[14px] text-[#a8a8ad] italic text-center max-w-[280px] leading-[20px] mb-[20px]">
          Care coordination that lives in iMessage — for the one who carries the
          care, and the family who shares it.
        </p>
      </div>

      {/* action row */}
      <div className="flex justify-center gap-[18px] px-[16px] mb-[20px]">
        <ActionButton ariaLabel="Call">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white" aria-hidden>
            <path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57a1 1 0 00-1.02.24l-2.2 2.2a15.07 15.07 0 01-6.59-6.59l2.2-2.21a1 1 0 00.25-1.02A11.36 11.36 0 018.5 4a1 1 0 00-1-1H4a1 1 0 00-1 1c0 9.39 7.61 17 17 17a1 1 0 001-1v-3.5a1 1 0 00-1-1z" />
          </svg>
        </ActionButton>
        <ActionButton ariaLabel="Video">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white" aria-hidden>
            <path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z" />
          </svg>
        </ActionButton>
        <ActionButton ariaLabel="Mail">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white" aria-hidden>
            <path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
          </svg>
        </ActionButton>
      </div>

      {/* tabs */}
      <div className="flex justify-center gap-[8px] px-[16px] mb-[20px] text-[15px]">
        <span className="px-[14px] py-[5px] rounded-full bg-[#1c1c1e] text-white">
          Info
        </span>
        <span className="px-[14px] py-[5px] text-[#a8a8ad]">Notes</span>
        <span className="px-[14px] py-[5px] text-[#a8a8ad]">Photos</span>
      </div>

      {/* sections */}
      <div className="px-[16px] pb-[40px] space-y-[24px]">
        {/* phone */}
        <Section>
          <Row>
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center gap-[6px] mb-[2px]">
                <span className="text-[13px] text-[#a8a8ad]">phone</span>
                <span className="text-[9px] font-semibold text-[#a8a8ad] bg-[#2c2c2e] px-[5px] py-[1px] rounded-[4px] tracking-wide">
                  RECENT
                </span>
              </div>
              <span className="text-[16px]">+1 (650) 441-5695</span>
            </div>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="#0a84ff"
              aria-hidden
            >
              <path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57a1 1 0 00-1.02.24l-2.2 2.2a15.07 15.07 0 01-6.59-6.59l2.2-2.21a1 1 0 00.25-1.02A11.36 11.36 0 018.5 4a1 1 0 00-1-1H4a1 1 0 00-1 1c0 9.39 7.61 17 17 17a1 1 0 001-1v-3.5a1 1 0 00-1-1z" />
            </svg>
          </Row>
        </Section>

        {/* how it works */}
        <div>
          <SectionTitle>How it works</SectionTitle>
          <Section>
            {[
              "Text the care details",
              "The details stick",
              "Family gets quiet reminders",
              "No new app, no dashboard",
            ].map((step, i, arr) => (
              <Row key={step} divider={i < arr.length - 1}>
                <div className="flex items-center gap-[12px]">
                  <span className="w-[24px] h-[24px] rounded-full bg-[#34c759]/20 text-[#34c759] flex items-center justify-center text-[12px] font-semibold">
                    {i + 1}
                  </span>
                  <span className="text-[15px]">{step}</span>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  aria-hidden
                >
                  <path
                    d="M3 8.5L6.5 12L13 4"
                    stroke="#34c759"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Row>
            ))}
          </Section>
        </div>

        {/* product */}
        <div>
          <SectionTitle>The product</SectionTitle>
          <Section>
            {(
              [
                ["product", "iMessage care agent"],
                ["works with", "any iPhone, any family"],
                ["cost", "free during private beta"],
                ["status", "private beta · cohort 1"],
              ] as const
            ).map(([k, v], i, arr) => (
              <Row key={k} divider={i < arr.length - 1}>
                <span className="text-[13px] text-[#a8a8ad]">{k}</span>
                <span className="text-[15px] text-right max-w-[220px]">{v}</span>
              </Row>
            ))}
          </Section>
        </div>

        {/* personas */}
        <div>
          <SectionTitle>For your situation</SectionTitle>
          <Section>
            {(Object.keys(PERSONAS) as PersonaId[]).map((id, i, arr) => (
              <button
                key={id}
                type="button"
                onClick={() => setPersona(id)}
                className="w-full active:opacity-60"
              >
                <Row divider={i < arr.length - 1}>
                  <span className="text-[16px] text-[#0a84ff]">
                    {PERSONAS[id].title}
                  </span>
                  <svg width="8" height="14" viewBox="0 0 8 14" aria-hidden>
                    <path
                      d="M1 1L7 7L1 13"
                      stroke="#48484a"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Row>
              </button>
            ))}
          </Section>
        </div>

        {/* notes / FAQ */}
        <div>
          <SectionTitle>Notes</SectionTitle>
          <Section>
            <div className="px-[16px] py-[14px] space-y-[14px]">
              <FaqItem
                q="Why iMessage?"
                a="The texts are already happening at 11 PM. We just answer them."
              />
              <FaqItem
                q="Will my family need to install anything?"
                a="No. CareSupport works in the iMessage they already have."
              />
              <FaqItem
                q="Is this medical advice?"
                a="No. Care coordination, not clinical advice."
              />
            </div>
          </Section>
        </div>

        {/* CTA */}
        <Section>
          <button
            type="button"
            onClick={onJoinWaitlist}
            className="w-full px-[16px] py-[14px] text-[16px] text-[#0a84ff] text-left active:opacity-60"
          >
            Join the waitlist
          </button>
        </Section>

        {/* legal */}
        <div className="px-[16px] pt-[4px] text-[11px] text-[#6e6e73] flex items-center justify-between">
          <span>© 2026 CareSupport.com</span>
          <span>Privacy · Terms</span>
        </div>
      </div>
    </div>
  );
}

function Section({ children }: { children: ReactNode }) {
  return (
    <div className="bg-[#1c1c1e] rounded-[14px] overflow-hidden">
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[12px] text-[#a8a8ad] uppercase tracking-wider mb-[8px] px-[8px] font-medium">
      {children}
    </h2>
  );
}

function Row({
  children,
  divider = false,
}: {
  children: ReactNode;
  divider?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-[16px] py-[12px] ${divider ? "border-b border-[#2c2c2e]" : ""}`}
    >
      {children}
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <p className="text-[14px] font-semibold mb-[2px]">{q}</p>
      <p className="text-[14px] text-[#a8a8ad] leading-[20px]">{a}</p>
    </div>
  );
}

function ActionButton({
  children,
  ariaLabel,
}: {
  children: ReactNode;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="w-[56px] h-[56px] rounded-full bg-[#1c1c1e] flex items-center justify-center active:opacity-60"
    >
      {children}
    </button>
  );
}
