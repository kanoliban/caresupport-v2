import Image from "next/image";
import styles from "./site-header.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header} aria-label="Site header">
      <a href="#top" className={styles.brand}>
        <Image
          src="/caresupport-logo.webp"
          alt=""
          width={512}
          height={512}
          className={styles.mark}
          priority
        />
        <span className={styles.word}>
          CareSupport<span className={styles.dot}>.com</span>
        </span>
      </a>
    </header>
  );
}
