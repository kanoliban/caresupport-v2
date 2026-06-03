import Image from "next/image";
import styles from "./site-footer.module.css";

const PRODUCT = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Why iMessage", href: "#why-imessage" },
  { label: "FAQ", href: "#faq" },
];

const COMPANY = [
  { label: "About", href: "#" },
  { label: "Contact", href: "mailto:hello@caresupport.com" },
  { label: "Press", href: "#" },
];

const FAMILIES = [
  { label: "Aging parents", href: "#" },
  { label: "Recovery at home", href: "#" },
  { label: "Long-distance care", href: "#" },
];

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className={styles.footer} aria-label="Site footer">
      <div className={styles.content}>
        <div className={styles.brandCol}>
          <div className={styles.brandRow}>
            <Image
              src="/caresupport-logo.webp"
              alt="CareSupport"
              width={512}
              height={512}
              className={styles.brandMark}
            />
            <span>
              CareSupport<span className={styles.dot}>.com</span>
            </span>
          </div>
          <p className={styles.brandTagline}>
            Care coordination that lives in iMessage — for families holding it
            all together.
          </p>
        </div>

        <nav className={styles.navCol} aria-label="Product">
          <h3 className={styles.navTitle}>Product</h3>
          <ul className={styles.navList}>
            {PRODUCT.map((i) => (
              <li key={i.label}>
                <a href={i.href}>{i.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <nav className={styles.navCol} aria-label="For families">
          <h3 className={styles.navTitle}>For families</h3>
          <ul className={styles.navList}>
            {FAMILIES.map((i) => (
              <li key={i.label}>
                <a href={i.href}>{i.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <nav className={styles.navCol} aria-label="Company">
          <h3 className={styles.navTitle}>Company</h3>
          <ul className={styles.navList}>
            {COMPANY.map((i) => (
              <li key={i.label}>
                <a href={i.href}>{i.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.authCol}>
          <a href="#waitlist" className={`${styles.btn} ${styles.btnPrimary}`}>
            Join the waitlist
          </a>
          <p className={styles.authNote}>
            Free for the first cohort. We&rsquo;ll be in touch.
          </p>
        </div>
      </div>

      <div className={styles.legalStrip}>
        <span>© {year} CareSupport. Coordination, not clinical advice.</span>
        <div>
          <a href="#">Privacy</a>
          <span className={styles.legalSep}>·</span>
          <a href="#">Terms</a>
        </div>
      </div>
    </footer>
  );
}
