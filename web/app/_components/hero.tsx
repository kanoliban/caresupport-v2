import { CareConversation } from "./iphone/care-conversation";
import styles from "./hero.module.css";

export function Hero() {
  return (
    <section className={styles.hero} aria-label="CareSupport">
      <div className={styles.inner}>
        <h1 className={styles.title}>
          <span>Meet CareSupport,</span>
          <span className={styles.titleLine}>your family&apos;s care coordinator.</span>
        </h1>

        <p className={styles.lede}>
          Ask anything, coordinate everything — right from your texts.
        </p>

        <div className={styles.actions}>
          <a href="#waitlist" className={styles.btnPrimary}>
            Join the waitlist
          </a>
          <a href="#how" className={styles.btnGhost}>
            See how it works
          </a>
        </div>

        <div className={`${styles.phoneWrap} phone-glow`}>
          <CareConversation />
        </div>
        <p className={styles.phoneHint}>Go ahead — tap around.</p>
      </div>
    </section>
  );
}
