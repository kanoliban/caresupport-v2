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
  messages: Msg[];
};

const STEPS: Step[] = [
  {
    id: "step-1",
    tag: "(1)",
    title: "You text CareSupport.",
    sub: "Getting started is just a message — no app, no setup for anyone.",
    reverse: false,
    messages: [
      {
        kind: "sent",
        text: "Mom needs her Eliquis at 8am. Dad's on mornings, Jess has weekends.",
      },
      {
        kind: "received",
        text: "Got it. I'll keep Dad and Jess on track and check in with you.",
      },
    ],
  },
  {
    id: "step-2",
    tag: "(2)",
    title: "CareSupport texts them.",
    sub: "It reaches your family and caregivers directly — you never have to chase anyone.",
    reverse: true,
    messages: [
      { kind: "received", text: "Morning, Dad — reminder: Mom's Eliquis at 8am 💊" },
      { kind: "sent", text: "Done, 8:05 ✅" },
      { kind: "received", text: "Thank you. I'll let the family know." },
    ],
  },
  {
    id: "step-3",
    tag: "(3)",
    title: "Everyone stays in sync.",
    sub: "Confirmations come back to you, gaps get caught — and the loop runs again tomorrow.",
    reverse: false,
    messages: [
      { kind: "received", text: "Dad gave Mom's meds at 8:05. Jess confirmed Saturday." },
      { kind: "received", text: "Nothing slipped — and I'll run it all again tomorrow." },
      { kind: "sent", text: "Thank you 🙏" },
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
          Care is rarely one person&apos;s job. CareSupport runs the loop, so the
          right people do the right things — right on time.
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
              const next = step.messages[i + 1];
              const tail = !next || next.kind !== m.kind;
              return (
                <div
                  key={i}
                  className={styles.msgReveal}
                  style={{ transitionDelay: `${i * 220}ms` }}
                >
                  <MessageBubble variant={m.kind} showTail={tail}>
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
