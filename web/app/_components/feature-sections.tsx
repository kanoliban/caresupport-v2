"use client";

import { useEffect, useRef, useState } from "react";
import { MessageBubble } from "./iphone/message-bubble";
import styles from "./feature-sections.module.css";

type Msg = { kind: "sent" | "received"; text: string };

type Step = {
  id: string;
  tag: string;
  title: string;
  sub: string;
  reverse: boolean;
  human: string;
  messages: Msg[];
};

const STEPS: Step[] = [
  {
    id: "step-1",
    tag: "(1)",
    title: "You text CareSupport.",
    sub: "Getting started is just a message — no app, nothing for your family to download.",
    reverse: false,
    human: "You",
    messages: [
      {
        kind: "sent",
        text: "Mom's home from the hospital and honestly I'm a little overwhelmed. She takes her Eliquis every morning at 8, Dad's with her on weekdays but he forgets, and my sister Jess has the weekends.",
      },
      {
        kind: "received",
        text: "Okay, I've got the picture — Eliquis at 8am, Dad weekdays, Jess weekends. Want me to text your dad each morning to make sure the 8am dose happens, and check in with Jess about this Saturday?",
      },
      {
        kind: "sent",
        text: "Yes, please. That would take so much off my plate.",
      },
    ],
  },
  {
    id: "step-2",
    tag: "(2)",
    title: "CareSupport texts them.",
    sub: "With your okay, it reaches out to each person directly — so you're not the one chasing everyone down.",
    reverse: true,
    human: "Dad",
    messages: [
      {
        kind: "received",
        text: "Morning, Dad! Quick reminder that Mom takes her Eliquis at 8am today. No rush — just let me know once she's had it and I'll mark the family down as covered for the morning.",
      },
      {
        kind: "sent",
        text: "All done — gave it to her at 8:05 with her breakfast.",
      },
      {
        kind: "received",
        text: "Perfect, thank you. I'll let everyone know Mom's set for today.",
      },
    ],
  },
  {
    id: "step-3",
    tag: "(3)",
    title: "Everyone stays in sync.",
    sub: "Every confirmation comes back to you, anything missed gets flagged — and the whole loop runs again tomorrow.",
    reverse: false,
    human: "You",
    messages: [
      {
        kind: "received",
        text: "Morning update: Dad gave Mom her 8am dose, and Jess confirmed she's covering Saturday. Everything for today is taken care of.",
      },
      {
        kind: "received",
        text: "Nothing's open for tomorrow yet — I'll run the same check-ins in the morning and only ping you if something needs a decision.",
      },
      {
        kind: "sent",
        text: "I can't tell you how much this helps. Thank you.",
      },
    ],
  },
];

const FAQS = [
  {
    q: "Will my family need to install anything?",
    a: "No. CareSupport works in the iMessage they already have.",
  },
  { q: "Is this medical advice?", a: "No. Care coordination, not clinical advice." },
  { q: "How much does it cost?", a: "Free during the private beta." },
];

function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, inView };
}

export function FeatureSections() {
  return (
    <div className={styles.sections}>
      <section id="how" className={styles.intro}>
        <span className={styles.introTag}>How it works</span>
        <h2 className={styles.introHeadline}>Coordinating care, in three steps.</h2>
        <p className={styles.introLede}>
          When someone you love needs care, you become the coordinator overnight.
          CareSupport runs the loop with you — asking first, chasing no one — so
          the right people do the right things, right on time.
        </p>
      </section>

      <div className={styles.steps}>
        {STEPS.map((step) => (
          <StepRow key={step.id} step={step} />
        ))}
      </div>
    </div>
  );
}

function StepRow({ step }: { step: Step }) {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <section
      ref={ref}
      className={`${styles.step} ${step.reverse ? styles.reverse : ""}`}
    >
      <div className={styles.divider} aria-hidden />
      <div className={styles.row}>
        <div className={styles.copy}>
          <span className={styles.tag}>{step.tag}</span>
          <h3 className={styles.title}>{step.title}</h3>
          <p className={styles.sub}>{step.sub}</p>
        </div>

        <div className={styles.asset}>
          <div className={`${styles.msgCard} ${inView ? styles.revealed : ""}`}>
            {step.messages.map((m, i) => {
              const prev = step.messages[i - 1];
              const next = step.messages[i + 1];
              const tail = !next || next.kind !== m.kind;
              const firstOfRun = !prev || prev.kind !== m.kind;
              const isCare = m.kind === "received";
              return (
                <div
                  key={i}
                  className={styles.msgReveal}
                  style={{ transitionDelay: `${i * 220}ms` }}
                >
                  <MessageBubble
                    variant={m.kind}
                    showTail={tail}
                    avatarSrc={isCare ? "/caresupport-logo.webp" : undefined}
                    senderName={
                      firstOfRun
                        ? isCare
                          ? "CareSupport"
                          : step.human
                        : undefined
                    }
                  >
                    {m.text}
                  </MessageBubble>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section id="faq" className={styles.faq}>
      <h2 className={styles.faqHeadline}>Questions, answered.</h2>
      <dl className={styles.faqList}>
        {FAQS.map((item) => (
          <div key={item.q} className={styles.faqItem}>
            <dt className={styles.faqQ}>{item.q}</dt>
            <dd className={styles.faqA}>{item.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
