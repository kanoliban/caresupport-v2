/*
  web/app/investors/page.tsx — Investor narrative page for CareSupport.
  Created: 2026-06-27
  Purpose: Build the /investors route as a deck-memo hybrid that explains
           CareSupport's family-thread wedge, verified care record, proof ladder,
           moat, and angel investor ask directly on the website.
*/
import type { Metadata } from "next";
import { SiteFooter } from "../_components/site-footer";
import { SiteNav } from "../_components/site-nav";
import styles from "./investors.module.css";

export const metadata: Metadata = {
  title: "CareSupport Investors — Verification rails for family-led care",
  description:
    "CareSupport starts in the family thread and turns everyday care coordination into verified care records for the systems that fund home care.",
  robots: {
    index: false,
    follow: false,
  },
};

const agencyRows = [
  ["Scheduling", "Group texts, calls, calendar holds, last-minute swaps"],
  ["Staffing", "Family, neighbors, paid caregivers, backups, agencies"],
  ["Care plan", "Memory, routines, notes, preferences, risk signals"],
  ["Visit notes", "Buried caregiver updates and after-the-fact recollection"],
  ["Compliance", "Forms, portals, PDFs, timesheets, program rules"],
  ["Escalation", "Anxious follow-up when care, supplies, or coverage breaks"],
];

const failures = [
  {
    label: "Families",
    text: "Carry schedules, open loops, caregiver context, and paperwork in memory.",
  },
  {
    label: "Caregivers",
    text: "Work from unclear expectations, then document after the moment has passed.",
  },
  {
    label: "FMSs",
    text: "Chase corrections, late submissions, missing notes, and support tickets.",
  },
  {
    label: "States + payers",
    text: "Need fraud visibility and proof without adding more burden to the home.",
  },
];

const mechanismSteps = [
  {
    step: "01",
    name: "Thread",
    claim: "Families coordinate where everyone already is.",
    failure: "But threads forget.",
  },
  {
    step: "02",
    name: "Memory",
    claim: "Important care facts survive the scroll.",
    failure: "But remembered messages do not show whether the operation is covered.",
  },
  {
    step: "03",
    name: "Operating graph",
    claim: "People, roles, tasks, commitments, and gaps become explicit state.",
    failure: "But visible care is not the same as provable care.",
  },
  {
    step: "04",
    name: "Verified care record",
    claim: "Care events become structured, confirmed, approved, and inspectable.",
    failure: "But programs all speak different administrative languages.",
  },
  {
    step: "05",
    name: "Program schema",
    claim: "Verified records map into CFSS, FMS, payer, and program requirements.",
    failure: "But proof still needs to move.",
  },
  {
    step: "06",
    name: "Rails",
    claim: "Authorized systems consume the right proof in the right format.",
    failure: "The page becomes infrastructure only after the record is trusted.",
  },
];

const recordFields = [
  "Care recipient",
  "Caregiver",
  "Time window",
  "Tasks performed",
  "Source messages",
  "Caregiver confirmation",
  "Family approval",
  "Exceptions",
  "Program schema",
  "Acceptance status",
];

const whyNow = [
  "Care is moving out of institutions and into homes.",
  "Medicaid HCBS and self-direction are expanding.",
  "The direct-care workforce cannot meet demand alone.",
  "Families already coordinate the missing supply.",
  "Programs need proof, auditability, and fraud visibility.",
  "AI can now structure ordinary care communication without forcing forms.",
];

const businessModel = [
  "PMPM access for FMSs and care programs",
  "Per verified care record usage",
  "Program schema implementation fees",
  "FMS exception-reduction workflows",
  "State or MCO pilots around proof-of-care visibility",
  "Future API usage for authorized care-record consumption",
];

const moatItems = [
  "Family trust and thread proximity",
  "Longitudinal care operating graph",
  "Verified care records with source trails",
  "Program-specific schema library",
  "FMS and state workflow validation",
  "Consent, audit, and correction history",
  "Integrations into systems that fund care",
];

const proofLadder = [
  ["L1", "A real family uses CareSupport in the actual thread."],
  ["L2", "The thread produces reliable care state: who, what, when, what changed."],
  ["L3", "Care state graduates into verified care records."],
  ["L4", "One real program schema accepts the record output as useful."],
  ["L5", "Multiple systems consume records directly through rails/API."],
];

const beachhead = [
  "CFSS is schema #1.",
  "Minnesota is the first proving ground.",
  "Rob is the existence proof for the category.",
  "FMS workflow pain is the first revenue conversation.",
  "Verification pressure makes the timing politically legible.",
];

export default function InvestorsPage() {
  return (
    <>
      <SiteNav />
      <main className={styles.page}>
        <section className={styles.hero} aria-labelledby="investor-title">
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <span className={styles.kicker}>Investor memo · private thesis page</span>
              <h1 id="investor-title">
                CareSupport is building verification rails for family-led home care.
              </h1>
              <p className={styles.heroLead}>
                Families already coordinate schedules, caregivers, tasks, exceptions, and documentation through texts, calls, and memory. CareSupport starts in that family thread and turns everyday coordination into verified care records that home care systems can trust.
              </p>
              <div className={styles.heroActions}>
                <a href="mailto:hello@caresupport.com?subject=CareSupport%20investor%20conversation" className={styles.primaryCta}>
                  Request investor access
                </a>
                <a href="#thesis" className={styles.secondaryCta}>
                  Read the thesis
                </a>
              </div>
            </div>

            <div className={styles.heroArtifact} aria-label="CareSupport investor thesis card">
              <div className={styles.artifactTopline}>
                <span>CareSupport.com/investors</span>
                <span>Noindex · share intentionally</span>
              </div>
              <div className={styles.artifactCore}>
                <p className={styles.artifactLabel}>One-sentence company</p>
                <p className={styles.artifactQuote}>
                  Families are invisible home care agencies. CareSupport makes their work visible, verifiable, and fundable.
                </p>
              </div>
              <div className={styles.artifactFlow}>
                <span>Thread</span>
                <span>Memory</span>
                <span>Graph</span>
                <span>Record</span>
                <span>Schema</span>
                <span>Rails</span>
              </div>
            </div>
          </div>
        </section>

        <section id="thesis" className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.kicker}>01 · Category insight</span>
            <h2>Families are invisible home care agencies.</h2>
            <p>
              The family is not a licensed agency, and the product must never make them feel like one. But functionally, families already run the operation: staffing, scheduling, training, supervision, documentation, escalation, and payment survival.
            </p>
          </div>
          <div className={styles.agencyTable}>
            {agencyRows.map(([functionName, familyReality]) => (
              <div className={styles.agencyRow} key={functionName}>
                <span>{functionName}</span>
                <p>{familyReality}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.darkSection}`}>
          <div className={styles.sectionHeader}>
            <span className={styles.kicker}>02 · The broken state</span>
            <h2>The work exists. The system cannot see it.</h2>
            <p>
              The home is becoming the care setting, but it lacks the operating infrastructure formal care settings rely on. That invisibility creates burden for families and administrative drag for the systems that fund care.
            </p>
          </div>
          <div className={styles.failureGrid}>
            {failures.map((failure) => (
              <article className={styles.failureCard} key={failure.label}>
                <h3>{failure.label}</h3>
                <p>{failure.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.threadSection}`}>
          <div className={styles.threadCopy}>
            <span className={styles.kicker}>03 · The wedge</span>
            <h2>Start where care already happens.</h2>
            <p>
              We do not start by selling compliance software to exhausted families. We start by reducing coordination burden in the thread they already use. The same workflow that helps the family also produces the structured proof downstream systems need.
            </p>
          </div>
          <div className={styles.threadDemo} aria-label="Example family care thread">
            <div className={styles.messageIncoming}>Maya: Done 8–12. Breakfast, transfer, meds, laundry.</div>
            <div className={styles.messageSystem}>CareSupport: I saved breakfast, transfer support, medication reminder, and laundry. Rob, does this look right?</div>
            <div className={styles.messageOutgoing}>Rob: Yes.</div>
            <div className={styles.messageSystem}>CareSupport: Confirmed. This record is ready for review.</div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.kicker}>04 · The mechanism</span>
            <h2>Each layer exists because the previous layer fails without it.</h2>
            <p>
              This is the mechanical-watch structure for CareSupport: not a feature list, but a sequence of necessary mechanisms that turn invisible family care into trusted proof.
            </p>
          </div>
          <div className={styles.mechanismRail}>
            {mechanismSteps.map((item) => (
              <article className={styles.mechanismCard} key={item.step}>
                <span>{item.step}</span>
                <h3>{item.name}</h3>
                <p>{item.claim}</p>
                <strong>{item.failure}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.recordSection}`}>
          <div className={styles.recordCopy}>
            <span className={styles.kicker}>05 · The atomic object</span>
            <h2>The verified care record is the hinge from app to infrastructure.</h2>
            <p>
              Stripe made payments programmable around a trusted payment object. CareSupport makes care events programmable around a trusted care record: who cared for whom, when, what happened, how we know, and who approved it.
            </p>
          </div>
          <div className={styles.recordCard} aria-label="Verified care record fields">
            <div className={styles.recordHeader}>
              <span>verified_care_record</span>
              <strong>Ready for schema mapping</strong>
            </div>
            <div className={styles.recordFields}>
              {recordFields.map((field) => (
                <span key={field}>{field}</span>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.splitSection}>
          <div className={styles.panel}>
            <span className={styles.kicker}>06 · Why now</span>
            <h2>The gap is now technically and economically solvable.</h2>
            <ul>
              {whyNow.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className={styles.panelAccent}>
            <p>
              Ten years ago, families had the messages but not the intelligence layer. Programs had documentation requirements but no way to capture real care without adding more burden. That gap is now solvable.
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.kicker}>07 · Business model</span>
            <h2>Families get relief. Systems that need clean proof pay.</h2>
            <p>
              The family is the adoption wedge and source of truth. The buyer is the system that needs trusted records: FMS providers, state self-direction programs, MCOs, insurers, agencies, and future caregiver-benefit platforms.
            </p>
          </div>
          <div className={styles.businessGrid}>
            {businessModel.map((item) => (
              <div className={styles.businessCard} key={item}>{item}</div>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.darkSection}`}>
          <div className={styles.sectionHeader}>
            <span className={styles.kicker}>08 · Moat</span>
            <h2>The defensibility is not a chatbot. It is the compounding care graph.</h2>
            <p>
              A competitor can copy a chat UI. They cannot easily copy years of verified family care records mapped against real program rules, accepted by real administrative workflows, and governed by family consent.
            </p>
          </div>
          <div className={styles.moatList}>
            {moatItems.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.kicker}>09 · Proof ladder</span>
            <h2>The vision is large, so the proof must be staged.</h2>
            <p>
              Investors do not need to believe the whole Universal Care Protocol on day one. They need to believe the next proof in the ladder, and each proof makes the next layer credible.
            </p>
          </div>
          <div className={styles.proofLadder}>
            {proofLadder.map(([level, proof]) => (
              <div className={styles.proofStep} key={level}>
                <strong>{level}</strong>
                <p>{proof}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.beachheadSection}>
          <div>
            <span className={styles.kicker}>10 · Beachhead</span>
            <h2>CFSS is schema #1. Minnesota is the first proving ground.</h2>
            <p>
              The first market is not “all care.” It is one concrete program, one state, one workflow, one record type, one FMS conversation, and one real family proving the thread-to-record chain.
            </p>
          </div>
          <ul className={styles.beachheadList}>
            {beachhead.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className={styles.askSection}>
          <div className={styles.askCard}>
            <span className={styles.kicker}>Angel round</span>
            <h2>We are raising to turn the conceptual MVP into a production pilot.</h2>
            <p>
              The immediate goal is a real-family pilot, a verified care record pipeline, CFSS schema mapping, FMS workflow validation, and the compliance foundation required to make the first institutional proof credible.
            </p>
            <div className={styles.askActions}>
              <a href="mailto:hello@caresupport.com?subject=CareSupport%20investor%20memo" className={styles.primaryCta}>
                Request the investor memo
              </a>
              <a href="mailto:hello@caresupport.com?subject=CareSupport%20investor%20call" className={styles.secondaryCtaDark}>
                Schedule a conversation
              </a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
