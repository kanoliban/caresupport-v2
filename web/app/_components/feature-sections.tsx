import styles from "./feature-sections.module.css";

type FeatureVisual = "memory" | "coverage" | "permission" | "update";

interface Feature {
  id: string;
  title: string;
  body: string;
  visual: FeatureVisual;
  reverse?: boolean;
}

const FEATURES: Feature[] = [
  {
    id: "memory",
    title: "The thread remembers.",
    body: "CareSupport turns the details families keep repeating into living memory: medications, appointments, routines, door codes, and who handles what.",
    visual: "memory",
  },
  {
    id: "coverage",
    title: "Coverage gaps stop hiding.",
    body: "When something changes, CareSupport keeps the open loop visible until someone confirms the plan.",
    visual: "coverage",
    reverse: true,
  },
  {
    id: "permission",
    title: "It asks before it acts.",
    body: "Outreach is permissioned. CareSupport can draft the message, show who it is going to, and wait for approval before contacting anyone.",
    visual: "permission",
  },
  {
    id: "update",
    title: "Everyone gets the smallest useful update.",
    body: "Confirmations, declines, and pending replies come back as short operational updates, not another dashboard to check.",
    visual: "update",
    reverse: true,
  },
];

const FAQS = [
  {
    q: "Will my family need to install anything?",
    a: "No. CareSupport works in the iMessage they already have.",
  },
  { q: "Is this medical advice?", a: "No. Care coordination, not clinical advice." },
  { q: "How much does it cost?", a: "Free during the private beta." },
];

export function FeatureSections() {
  return (
    <section id="how" className={styles.sections} aria-label="How CareSupport works">
      <div className={styles.grid}>
        {FEATURES.map((feature) => (
          <FeatureRow key={feature.id} feature={feature} />
        ))}
      </div>
    </section>
  );
}

function FeatureRow({ feature }: { feature: Feature }) {
  return (
    <article className={`${styles.row} ${feature.reverse ? styles.reverse : ""}`}>
      <div className={styles.copy}>
        <h2 className={styles.title}>{feature.title}</h2>
        <p className={styles.body}>{feature.body}</p>
      </div>
      <FeatureCard visual={feature.visual} />
    </article>
  );
}

function FeatureCard({ visual }: { visual: FeatureVisual }) {
  return (
    <div className={styles.card} aria-hidden="true">
      {visual === "memory" && <MemoryCard />}
      {visual === "coverage" && <CoverageCard />}
      {visual === "permission" && <PermissionCard />}
      {visual === "update" && <UpdateCard />}
    </div>
  );
}

function MemoryCard() {
  const memoryItems = [
    ["meds", "Medication", "Donepezil after breakfast"],
    ["routine", "Routine", "Tea at 4, then a short walk"],
    ["access", "Access", "Back door code saved"],
    ["coverage", "Coverage", "Maya handles evenings"],
  ];

  return (
    <div className={styles.memoryStack}>
      <div className={`${styles.bubble} ${styles.bubbleReceived}`}>
        What should I remember for tonight?
      </div>
      <div className={styles.memoryPanel}>
        <div className={styles.memoryTopline}>Thread memory</div>
        <div className={styles.memoryItems}>
          {memoryItems.map(([variant, label, value]) => (
            <div key={label} className={styles.memoryItem}>
              <span className={`${styles.memoryDot} ${styles[`memoryDot_${variant}`]}`} />
              <span className={styles.memoryText}>
                <span>{label}</span>
                <span>{value}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CoverageCard() {
  return (
    <div className={styles.phoneStack}>
      <div className={`${styles.bubble} ${styles.bubbleReceived}`}>
        Angela cancelled tonight.
      </div>
      <div className={styles.coveragePanel}>
        <div className={styles.panelTopline}>Open gap</div>
        <div className={styles.panelTitle}>Tonight, 6-10 PM</div>
        <div className={styles.panelMeta}>needs confirmed coverage</div>
      </div>
      <div className={styles.choiceList}>
        <div className={styles.choiceRow}>
          <span>Ask Maya first</span>
          <span className={styles.choiceCircle} />
        </div>
        <div className={styles.choiceRow}>
          <span>Ask the agency</span>
          <span className={styles.choiceCircle} />
        </div>
        <div className={styles.choicePrompt}>Choose one path</div>
      </div>
    </div>
  );
}

function PermissionCard() {
  return (
    <div className={styles.permissionStack}>
      <div className={`${styles.bubble} ${styles.bubbleSent}`}>
        Ask Maya if she can check in at 2:30.
      </div>
      <div className={styles.draftCard}>
        <div className={styles.avatar}>M</div>
        <div className={styles.draftText}>
          <div className={styles.draftTopline}>
            <span>Draft to Maya</span>
            <span>Now</span>
          </div>
          <p>Can you check on Ruth around 2:30 today? Liban wants to make sure she is settled.</p>
        </div>
      </div>
      <div className={styles.choiceList}>
        <div className={styles.choiceRow}>
          <span>Send</span>
          <span className={styles.choiceCircle} />
        </div>
        <div className={styles.choiceRow}>
          <span>Edit first</span>
          <span className={styles.choiceCircle} />
        </div>
      </div>
    </div>
  );
}

function UpdateCard() {
  return (
    <div className={styles.updateStack}>
      <div className={`${styles.bubble} ${styles.bubbleSent}`}>
        What changed tonight?
      </div>
      <div className={`${styles.bubble} ${styles.bubbleReceived}`}>
        Maya can cover 7-9. The agency is still pending.
      </div>
      <div className={styles.statusCard}>
        <div className={styles.statusLabel}>still open</div>
        <div className={styles.statusTitle}>9-10 PM coverage</div>
        <div className={styles.statusFooter}>CareSupport will ask before the next outreach.</div>
      </div>
    </div>
  );
}

export function Faq() {
  return (
    <section id="faq" className={styles.faq}>
      <h2 className={styles.faqHeadline}>Questions, answered.</h2>
      <dl className={styles.faqList}>
        {FAQS.map((item) => (
          <div key={item.q} className={styles.faqItem}>
            <dt className={styles.faqQ}>{item.q}</dt>
            <dd className={styles.faqA}>{item.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
