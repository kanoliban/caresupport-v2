/*
  web/app/_components/site-nav.tsx — Floating site navigation for CareSupport web pages.
  Updated: 2026-06-27
  Purpose: Keep the reusable navigation lint-clean while supporting internal Next.js links
           used by the new investor narrative page.
*/
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./site-nav.module.css";

const MENU_ITEMS: { id: string; label: string; href: string; primary?: boolean }[] = [
  { id: "how", label: "How it works", href: "/#how" },
  { id: "faq", label: "FAQ", href: "/#faq" },
  { id: "join", label: "Join the waitlist", href: "/#waitlist", primary: true },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = prev;
    }
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function close() {
    setOpen(false);
  }

  return (
    <>
      {open && (
        <div
          className={styles.overlay}
          onClick={close}
          aria-hidden
        />
      )}

      <div className={`${styles.wrap} ${open ? styles.wrapOpen : ""}`}>
        <div className={styles.pill}>
          {open ? (
            <div className={styles.topRow}>
              <Image
                src="/caresupport-logo.webp"
                alt=""
                width={512}
                height={512}
                className={styles.mark}
                priority
              />
              <span className={styles.word}>CareSupport.com</span>
              <button
                type="button"
                className={styles.toggle}
                onClick={close}
                aria-label="Close menu"
                aria-expanded
                aria-controls="site-nav-panel"
              >
                <CloseIcon />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={`${styles.topRow} ${styles.topRowTrigger}`}
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={false}
              aria-controls="site-nav-panel"
            >
              <Image
                src="/caresupport-logo.webp"
                alt=""
                width={512}
                height={512}
                className={styles.mark}
                priority
              />
              <span className={styles.word}>CareSupport.com</span>
              <span className={styles.toggle} aria-hidden>
                <MenuIcon />
              </span>
            </button>
          )}

          {open && (
            <div id="site-nav-panel" className={styles.panelIn}>
              <div className={styles.divider} aria-hidden />

              <div className={styles.panel}>
                <ul className={styles.menu}>
                  {MENU_ITEMS.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        className={`${styles.menuLink} ${item.primary ? styles.menuLinkPrimary : ""}`}
                        onClick={close}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>

                <div className={styles.media}>
                  <Image
                    src="/footer-illustration.png"
                    alt=""
                    width={1448}
                    height={1086}
                    className={styles.mediaImg}
                  />
                </div>
              </div>

              <div className={styles.divider} aria-hidden />

              <div className={styles.meta}>
                <span>Care coordination in iMessage</span>
                <span className={styles.metaCenter}>Private beta · cohort 1</span>
                <Link href="/#waitlist" className={styles.metaCta} onClick={close}>
                  <span className={styles.metaDot} aria-hidden />
                  Join the waitlist →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function MenuIcon() {
  return (
    <svg width="22" height="14" viewBox="0 0 22 14" fill="none" aria-hidden>
      <path
        d="M2 4h18M2 10h18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M3 3l12 12M15 3L3 15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
