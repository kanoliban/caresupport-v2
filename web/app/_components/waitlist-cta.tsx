"use client";

import { useState, type FormEvent } from "react";
import { track } from "@vercel/analytics";
import { getAttribution } from "@/lib/attribution";
import { CARESUPPORT_PHONE, canOpenMessages, smsHref } from "@/lib/text-cta";
import styles from "./waitlist-cta.module.css";

type Status = "idle" | "loading" | "success" | "error";

export function WaitlistCta() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [showTextFallback, setShowTextFallback] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setMessage("");
    const attribution = getAttribution();
    try {
      const response = await fetch("/api/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone, ...attribution }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Something went wrong.");
      }
      track("signup_submitted", {
        utmSource: attribution.utmSource ?? null,
        referrer: attribution.referrer ?? null,
      });
      setStatus("success");
      setEmail("");
      setPhone("");
      if (CARESUPPORT_PHONE && canOpenMessages()) {
        setMessage("Check Messages — say hi and we'll take it from there.");
        track("text_cta_clicked", { utmSource: attribution.utmSource ?? null });
        window.location.href = smsHref(CARESUPPORT_PHONE);
      } else if (CARESUPPORT_PHONE) {
        setMessage(
          "You're in. Text us from your phone — or we'll text you shortly:",
        );
        setShowTextFallback(true);
      } else {
        setMessage("You're in. CareSupport will text you shortly.");
      }
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Please try again.");
    }
  }

  return (
    <section id="start" className={styles.cta} aria-label="Start with a text">
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
            {status === "loading" ? "One sec…" : "Start with a text"}
          </button>
        </div>

        {status === "success" && (
          <p className={styles.success} role="status">
            {message}
            {showTextFallback && CARESUPPORT_PHONE && (
              <>
                {" "}
                <a href={smsHref(CARESUPPORT_PHONE)}>{CARESUPPORT_PHONE}</a>
              </>
            )}
          </p>
        )}
        {status === "error" && (
          <p className={styles.error} role="alert">
            {message}
          </p>
        )}
        {status !== "success" && status !== "error" && (
          <p className={styles.trust} aria-live="polite">
            No app. No dashboard. Onboarding happens in the thread.
          </p>
        )}
      </form>
    </section>
  );
}
