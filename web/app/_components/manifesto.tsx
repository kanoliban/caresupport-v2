import styles from "./manifesto.module.css";

export function Manifesto() {
  return (
    <section className={styles.section} aria-label="For families">
      <p className={styles.line}>
        For the one who carries the care.
      </p>
      <p className={styles.line}>
        And the family who shares it.
      </p>
      <a href="#waitlist" className={styles.link}>
        Join the waitlist →
      </a>
    </section>
  );
}
