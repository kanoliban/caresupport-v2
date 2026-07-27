/*
  web/app/_components/site-footer.tsx — Shared footer for CareSupport web pages.
  Updated: 2026-06-27
  Purpose: Keep footer navigation reusable and lint-clean for the marketing site and
           investor narrative page by using Next.js internal links where appropriate.
*/
import Image from "next/image";
import Link from "next/link";
import styles from "./site-footer.module.css";

const PRODUCT = [
  { label: "How it works", href: "/#how" },
  { label: "Start with a text", href: "/#start" },
  { label: "FAQ", href: "/#faq" },
];

const COMPANY = [
  { label: "Contact", href: "mailto:hello@caresupport.com" },
  { label: "Press", href: "mailto:hello@caresupport.com?subject=Press%20inquiry" },
];

const FAMILIES = [
  { label: "Aging parents", href: "/#how" },
  { label: "Recovery at home", href: "/#how" },
  { label: "Long-distance care", href: "/#how" },
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
                <Link href={i.href}>{i.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav className={styles.navCol} aria-label="For families">
          <h3 className={styles.navTitle}>For families</h3>
          <ul className={styles.navList}>
            {FAMILIES.map((i) => (
              <li key={i.label}>
                <Link href={i.href}>{i.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav className={styles.navCol} aria-label="Company">
          <h3 className={styles.navTitle}>Company</h3>
          <ul className={styles.navList}>
            {COMPANY.map((i) => (
              <li key={i.label}>
                <Link href={i.href}>{i.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.authCol}>
          <Link href="/#start" className={`${styles.btn} ${styles.btnPrimary}`}>
            Start with a text
          </Link>
          <p className={styles.authNote}>
            Free for the first cohort. No app to install.
          </p>
        </div>
      </div>

      <div className={styles.legalStrip}>
        <span>© {year} CareSupport. Coordination, not clinical advice.</span>
        <div>
          <Link href="/privacy">Privacy</Link>
          <span className={styles.legalSep}>·</span>
          <Link href="/terms">Terms</Link>
        </div>
      </div>
    </footer>
  );
}
