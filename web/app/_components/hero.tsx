"use client";

import Image from "next/image";
import { useCallback, useRef, useState, type FormEvent } from "react";
import { CareConversation } from "./iphone/care-conversation";
import styles from "./hero.module.css";

type Status = "idle" | "loading" | "success" | "error";

interface HeroProps {
  initialCount: number;
}

export function Hero({ initialCount }: HeroProps) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [count, setCount] = useState(initialCount);
  const [triggerSignup, setTriggerSignup] = useState(false);
  const phoneRef = useRef<HTMLDivElement>(null);

  const handleSignupTriggered = useCallback(() => {
    setTriggerSignup(false);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setMessage("");
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        count?: number;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Something went wrong.");
      }
      if (typeof data.count === "number") setCount(data.count);
      setStatus("success");
      setMessage("You're on the list. We'll text you when it's ready.");
      setEmail("");
      setPhone("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Please try again.");
    }
  }

  return (
    <section
      id="waitlist"
      className={styles.hero}
      aria-label="CareSupport — join the waitlist"
    >
      <div className={styles.inner}>
        <div className={styles.left}>
          <div className={styles.brandRow}>
            <Image
              src="/caresupport-logo.webp"
              alt="CareSupport"
              width={512}
              height={512}
              className={styles.brandMark}
              priority
            />
            <span className={styles.brandWord}>
              CareSupport<span className={styles.brandDot}>.com</span>
            </span>
          </div>

          <span className={styles.eyebrow}>
            <span className={styles.eyebrowDot} aria-hidden />
            Now in private beta
          </span>

          <h1 className={styles.title}>CareSupport lives in iMessage.</h1>

          <p className={styles.lede}>
            Text the care details once. CareSupport turns medications,
            appointments, refills, rides, and check-ins into quiet reminders
            your family can follow — without another app to manage.
          </p>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.fieldStack}>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                aria-label="Email address"
              />
              <input
                type="tel"
                name="phone"
                autoComplete="tel"
                required
                placeholder="(555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={styles.input}
                aria-label="Phone number"
              />
              <button
                type="submit"
                className={styles.submit}
                disabled={status === "loading"}
              >
                {status === "loading" ? "Joining…" : "Join waitlist"}
              </button>
            </div>

            {status === "success" && (
              <p className={styles.success} role="status">
                {message}
              </p>
            )}
            {status === "error" && (
              <p className={styles.error} role="alert">
                {message}
              </p>
            )}
            {status !== "success" && status !== "error" && (
              <p className={styles.trust} aria-live="polite">
                {count === 0 ? (
                  "Be the first to join."
                ) : (
                  <>
                    <span className={styles.count}>
                      {count.toLocaleString()}
                    </span>{" "}
                    {count === 1 ? "person has joined." : "people have joined."}
                  </>
                )}
              </p>
            )}
          </form>
        </div>

        <div className={styles.right}>
          <div ref={phoneRef} className={`${styles.phoneWrap} phone-glow`}>
            <CareConversation
              triggerSignup={triggerSignup}
              onSignupTriggered={handleSignupTriggered}
            />
          </div>
          <p className={styles.phoneHint}>Go ahead — tap around.</p>
        </div>
      </div>
    </section>
  );
}
