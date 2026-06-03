"use client";

import { useState, type FormEvent } from "react";
import styles from "./waitlist-cta.module.css";

type Status = "idle" | "loading" | "success" | "error";

interface WaitlistCtaProps {
  initialCount: number;
}

export function WaitlistCta({ initialCount }: WaitlistCtaProps) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [count, setCount] = useState(initialCount);

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
    <section id="waitlist" className={styles.cta} aria-label="Join the waitlist">
      <p className={styles.line}>For the one who carries the care.</p>
      <p className={styles.lineMuted}>And the family who shares it.</p>

      <h2 className={styles.headline}>Start with a text.</h2>

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
                <span className={styles.count}>{count.toLocaleString()}</span>{" "}
                {count === 1 ? "person has joined." : "people have joined."}
              </>
            )}
          </p>
        )}
      </form>
    </section>
  );
}
