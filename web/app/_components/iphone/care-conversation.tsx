/*
  web/app/_components/iphone/care-conversation.tsx — Interactive iMessage-style CareSupport conversation demo.
  Updated: 2026-06-27
  Purpose: Keep the demo lint-clean while preserving the triggered signup transition
           used by marketing pages.
*/
"use client";

import { useEffect, useRef, useState } from "react";
import { IPhoneFrame } from "./iphone-frame";
import { IMessageHeader } from "./imessage-header";
import { MessageBubble } from "./message-bubble";
import { TypingIndicator } from "./typing-indicator";
import { OptionButtons, type Option } from "./option-buttons";
import { SignupView } from "./signup-view";
import { ContactCard } from "./contact-card";

const FONT_STYLE = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
};

type Message = {
  id: string;
  text: string;
  variant: "received" | "sent";
  showTail?: boolean;
};

type Phase =
  | "initial"
  | "show_options"
  | "streaming_response"
  | "final_cta"
  | "submitted";

type Path = "parent" | "siblings" | "learn";

type ViewState = "conversation" | "signup" | "confirmed" | "contact";

const INITIAL_OPTIONS: Option[] = [
  { id: "parent", label: "I help an aging parent" },
  { id: "siblings", label: "I share care with siblings" },
  { id: "learn", label: "Tell me more" },
];

const PATH_MESSAGES: Record<Path, Message[]> = {
  parent: [
    { id: "p1", text: "Got it. Day-to-day care for someone you love.", variant: "received", showTail: false },
    { id: "p2", text: "You text me what's happening — medications, appointments, who's checking in.", variant: "received", showTail: false },
    { id: "p3", text: "I send the right reminders to the right people, at the right time.", variant: "received", showTail: false },
    { id: "p4", text: "Quiet by default. No new app for anyone.", variant: "received", showTail: true },
  ],
  siblings: [
    { id: "s1", text: "Coordinating across siblings is brutal without it.", variant: "received", showTail: false },
    { id: "s2", text: "Drop me a note when something changes — meds, doctor visits, who's on tonight.", variant: "received", showTail: false },
    { id: "s3", text: "I keep everyone aligned through iMessage. No group-thread chaos.", variant: "received", showTail: true },
  ],
  learn: [
    { id: "l1", text: "Care doesn't happen in a dashboard.", variant: "received", showTail: false },
    { id: "l2", text: "It happens in the messages your family already sends at 11 PM.", variant: "received", showTail: true },
    { id: "l3", text: "I'm part of the thread. The details stick. I nudge before things slip.", variant: "received", showTail: false },
    { id: "l4", text: "One ask, the right people, the right time.", variant: "received", showTail: true },
  ],
};

export interface CareConversationProps {
  triggerSignup?: boolean;
  onSignupTriggered?: () => void;
}

export function CareConversation({
  triggerSignup,
  onSignupTriggered,
}: CareConversationProps = {}) {
  const [view, setView] = useState<ViewState>("conversation");
  const [animateView, setAnimateView] = useState(false);

  const [phase, setPhase] = useState<Phase>("initial");
  const [messages, setMessages] = useState<Message[]>([]);
  const [showTyping, setShowTyping] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [selectedPath, setSelectedPath] = useState<Path | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);
  const [hasInitialized, setHasInitialized] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!triggerSignup) return;

    const timer = window.setTimeout(() => {
      setAnimateView(true);
      setView("signup");
      onSignupTriggered?.();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [triggerSignup, onSignupTriggered]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, showTyping, showOptions]);

  // initial sequence
  useEffect(() => {
    if (view !== "conversation" || hasInitialized) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setShowTyping(true), 500));
    timers.push(
      setTimeout(() => {
        setShowTyping(false);
        setMessages([
          { id: "1", text: "Hey — this is CareSupport.", variant: "received", showTail: false },
        ]);
      }, 1500),
    );
    timers.push(
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { id: "2", text: "Care coordination for your family.", variant: "received", showTail: true },
        ]);
      }, 2200),
    );
    timers.push(setTimeout(() => setShowTyping(true), 2800));
    timers.push(
      setTimeout(() => {
        setShowTyping(false);
        setMessages((prev) => [
          ...prev,
          { id: "3", text: "What brings you here?", variant: "received", showTail: true },
        ]);
      }, 3800),
    );
    timers.push(
      setTimeout(() => {
        setShowOptions(true);
        setPhase("show_options");
        setHasInitialized(true);
      }, 4300),
    );

    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [view, hasInitialized]);

  // path-specific streaming
  useEffect(() => {
    if (!selectedPath || phase !== "streaming_response") return;

    const pathMsgs = PATH_MESSAGES[selectedPath];
    if (messageIndex >= pathMsgs.length) return;

    const msg = pathMsgs[messageIndex];
    if (!msg) return;

    const timer = setTimeout(() => {
      setShowTyping(false);
      setMessages((prev) => [...prev, msg]);
      setMessageIndex((prev) => prev + 1);

      if (messageIndex < pathMsgs.length - 1) {
        setTimeout(() => setShowTyping(true), 300);
      } else {
        setTimeout(() => setPhase("final_cta"), 800);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [selectedPath, phase, messageIndex]);

  function handleOptionSelect(option: Option) {
    setShowOptions(false);
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, text: option.label, variant: "sent", showTail: true },
    ]);

    setTimeout(() => {
      setShowTyping(true);
      setSelectedPath(option.id as Path);
      setMessageIndex(0);
      setPhase("streaming_response");
    }, 500);
  }

  function handleJoinClick() {
    setAnimateView(true);
    setView("signup");
  }

  function handleBackFromSignup() {
    setAnimateView(true);
    setView("conversation");
  }

  function handleContactTap() {
    setAnimateView(true);
    setView("contact");
  }

  function handleBackFromContact() {
    setAnimateView(true);
    setView("conversation");
  }

  function handleMessagesBack() {
    if (view !== "conversation") {
      setAnimateView(true);
      setView("conversation");
      return;
    }
    setMessages([]);
    setShowTyping(false);
    setShowOptions(false);
    setSelectedPath(null);
    setMessageIndex(0);
    setPhase("initial");
    setHasInitialized(false);
  }

  function handleSignupSuccess() {
    setAnimateView(true);
    setView("conversation");
    setPhase("submitted");

    const timestamp = Date.now();
    setMessages((prev) => [
      ...prev,
      { id: `submit-${timestamp}`, text: "I'm ready to get started", variant: "sent", showTail: true },
    ]);
    setTimeout(() => setShowTyping(true), 400);
    setTimeout(() => {
      setShowTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: `c1-${timestamp}`, text: "You're in", variant: "received", showTail: false },
        { id: `c2-${timestamp}`, text: "Say hi from your phone and we'll set up your family's thread.", variant: "received", showTail: true },
      ]);
    }, 1500);
  }

  return (
    <IPhoneFrame>
      <div className="h-full overflow-hidden relative">
        {view === "conversation" && (
          <div
            className={`h-full flex flex-col bg-[#f2f2f7] ${animateView ? "animate-slide-in-right" : ""}`}
          >
            <IMessageHeader
              onMessagesBack={handleMessagesBack}
              onContactTap={handleContactTap}
            />

            <div
              ref={containerRef}
              className="flex-1 overflow-y-auto px-[16px] py-[12px] space-y-[8px]"
              style={{ overscrollBehavior: "contain" }}
            >
              <div
                className="text-center text-[12px] text-[#8e8e93] mb-[8px]"
                style={FONT_STYLE}
              >
                Today
              </div>

              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  variant={msg.variant}
                  showTail={msg.showTail}
                  animate
                >
                  {msg.text}
                </MessageBubble>
              ))}

              {showTyping && <TypingIndicator animate />}

              {showOptions && (
                <div className="pt-[12px] px-[8px]">
                  <OptionButtons
                    options={INITIAL_OPTIONS}
                    onSelect={handleOptionSelect}
                    animate
                  />
                </div>
              )}

              {phase === "final_cta" && (
                <div className="pt-[16px] px-[8px] animate-options-in">
                  <button
                    type="button"
                    onClick={handleJoinClick}
                    className="w-full py-[14px] rounded-[12px] text-[17px] font-semibold bg-[#ff5b1f] text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
                    style={FONT_STYLE}
                  >
                    Start with a text
                  </button>
                </div>
              )}

              <div ref={endRef} />
            </div>
          </div>
        )}

        {view === "signup" && (
          <SignupView
            onBack={handleBackFromSignup}
            onSuccess={handleSignupSuccess}
            animate={animateView}
          />
        )}

        {view === "contact" && (
          <ContactCard
            onBack={handleBackFromContact}
            onJoinWaitlist={handleJoinClick}
            animate={animateView}
          />
        )}
      </div>
    </IPhoneFrame>
  );
}
