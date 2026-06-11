// legal-page.tsx — shared shell for legal pages (/privacy, /terms).
// Created 2026-06-11. Renders SiteNav, a paper article card with eyebrow/title/
// updated date, numbered LegalSection blocks, and SiteFooter.

import type { ReactNode } from "react";
import { SiteFooter } from "./site-footer";
import { SiteNav } from "./site-nav";
import styles from "./legal-page.module.css";

export function LegalPage({
  eyebrow,
  title,
  updated,
  lead,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <>
      <SiteNav />
      <main className={`${styles.page} flex-1`}>
        <article className={styles.article}>
          <header className={styles.head}>
            <span className="annot">{eyebrow}</span>
            <h1 className={styles.title}>{title}</h1>
            <div className={styles.metaRow}>
              <span className="pill accent">Last updated · {updated}</span>
              <span className="pill">hello@caresupport.com</span>
            </div>
            <p className={styles.lead}>{lead}</p>
          </header>
          {children}
        </article>
      </main>
      <SiteFooter />
    </>
  );
}

export function LegalSection({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <span className={styles.sectionIndex}>{index}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function LegalCallout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.callout}>
      <p>{children}</p>
    </div>
  );
}
