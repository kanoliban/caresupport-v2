// terms/page.tsx — Terms of Service page for caresupport.com.
// Created 2026-06-11. Covers service description, not-medical-advice,
// texting terms, acceptable use, approved outreach, beta disclaimer, liability.

import type { Metadata } from "next";
import {
  LegalCallout,
  LegalPage,
  LegalSection,
} from "../_components/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service — CareSupport",
  description:
    "The terms that govern your use of CareSupport's care coordination service.",
};

const CONTACT = "hello@caresupport.com";

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="LEGAL / TERMS"
      title="Terms of Service"
      updated="June 11, 2026"
      lead="These terms govern your use of CareSupport. They are written to be read. The short version: CareSupport helps you coordinate care over text, only acts with your permission, and is not a substitute for medical care."
    >
      <LegalSection index="01" title="Agreement">
        <p>
          By joining the waitlist, texting with CareSupport, or otherwise using
          the service, you agree to these Terms of Service and our{" "}
          <a href="/privacy">Privacy Policy</a>. If you do not agree, please do
          not use the service.
        </p>
      </LegalSection>

      <LegalSection index="02" title="What CareSupport is">
        <p>
          CareSupport (&ldquo;CareSupport,&rdquo; &ldquo;we,&rdquo;
          &ldquo;us&rdquo;) is a care coordination assistant that works through
          text messaging. It helps you keep track of medications, schedules,
          caregivers, and coordination tasks, and — with your approval — texts
          the people in your care circle to keep everyone in sync.
        </p>
        <p>
          CareSupport uses artificial intelligence to understand and respond to
          messages. AI-generated responses can be wrong or incomplete. Always
          verify important details — doses, times, addresses — before acting
          on them.
        </p>
      </LegalSection>

      <LegalSection index="03" title="Not medical advice. Not for emergencies.">
        <LegalCallout>
          CareSupport provides coordination, not clinical advice. It is not a
          healthcare provider, does not practice medicine, and does not give
          medical advice, diagnosis, or treatment. If you have a medical
          emergency, call 911 or your local emergency number immediately — do
          not text CareSupport.
        </LegalCallout>
        <p>
          Information from CareSupport — including medication reminders and
          schedules — reflects what you and your care circle put in. It is
          your responsibility to confirm care decisions with qualified
          professionals.
        </p>
      </LegalSection>

      <LegalSection index="04" title="Eligibility">
        <p>
          You must be at least 18 years old to use CareSupport. You agree to
          provide accurate information and keep your contact details current.
          The service is currently a private beta and access may be limited,
          waitlisted, or invitation-only.
        </p>
      </LegalSection>

      <LegalSection index="05" title="Text messaging terms">
        <ul>
          <li>
            <span>
              By providing your phone number, you consent to receive text
              messages from CareSupport related to care coordination.
            </span>
          </li>
          <li>
            <span>Message frequency varies. Message and data rates may apply.</span>
          </li>
          <li>
            <span>
              Reply <strong>STOP</strong> to opt out at any time. Reply{" "}
              <strong>HELP</strong> for help, or contact{" "}
              <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
            </span>
          </li>
          <li>
            <span>
              Carriers are not liable for delayed or undelivered messages.
            </span>
          </li>
        </ul>
      </LegalSection>

      <LegalSection index="06" title="Coordinating with others">
        <p>
          When you ask CareSupport to contact a caregiver, family member, or
          other care contact, you confirm that you have the authority and
          their consent to involve them in care coordination and to share the
          related information with them. CareSupport only sends outreach you
          have explicitly approved, keeps a record of every attempt, and honors
          opt-outs from anyone who replies STOP.
        </p>
      </LegalSection>

      <LegalSection index="07" title="Acceptable use">
        <p>You agree not to use CareSupport to:</p>
        <ul>
          <li>
            <span>break the law or violate anyone else&rsquo;s rights;</span>
          </li>
          <li>
            <span>
              harass, spam, or contact people without authority or consent;
            </span>
          </li>
          <li>
            <span>
              send malicious content or attempt to probe, disrupt, or reverse
              engineer the service;
            </span>
          </li>
          <li>
            <span>
              impersonate others or misrepresent who is being cared for.
            </span>
          </li>
        </ul>
      </LegalSection>

      <LegalSection index="08" title="Your content">
        <p>
          You own the messages and care information you share. You grant us a
          limited license to store and process that content solely to operate,
          secure, and improve the service as described in our{" "}
          <a href="/privacy">Privacy Policy</a>. You can ask us to delete your
          content at any time.
        </p>
      </LegalSection>

      <LegalSection index="09" title="Beta service, provided as-is">
        <p>
          CareSupport is in active development. The service is provided
          &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without
          warranties of any kind, express or implied, including fitness for a
          particular purpose. We may change, suspend, or discontinue features
          at any time. We do not guarantee that messages will be delivered,
          that reminders will fire, or that coverage gaps will be filled — the
          service assists your coordination; it does not replace your
          judgment.
        </p>
      </LegalSection>

      <LegalSection index="10" title="Limitation of liability">
        <p>
          To the maximum extent permitted by law, CareSupport and its team will
          not be liable for indirect, incidental, special, consequential, or
          exemplary damages, or for loss of data, arising from your use of the
          service. Our total liability for any claim is limited to the greater
          of $100 or the amount you paid us in the twelve months before the
          claim. Nothing in these terms limits liability that cannot be
          limited by law.
        </p>
      </LegalSection>

      <LegalSection index="11" title="Termination">
        <p>
          You can stop using CareSupport at any time — texting STOP ends
          messages, and emailing{" "}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a> closes your account. We
          may suspend or terminate access for violations of these terms, with
          notice where practical.
        </p>
      </LegalSection>

      <LegalSection index="12" title="Governing law">
        <p>
          These terms are governed by the laws of the State of Minnesota,
          without regard to conflict-of-law rules. Disputes will be resolved
          in the state or federal courts located in Minnesota.
        </p>
      </LegalSection>

      <LegalSection index="13" title="Changes to these terms">
        <p>
          If we make material changes, we will update the date at the top of
          this page and notify active users by text or email before the
          changes take effect. Continued use after changes take effect means
          you accept the updated terms.
        </p>
      </LegalSection>

      <LegalSection index="14" title="Contact">
        <p>
          Questions about these terms:{" "}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
