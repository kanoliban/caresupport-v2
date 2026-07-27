// privacy/page.tsx — Privacy Policy page for caresupport.com.
// Created 2026-06-11. Covers data collected (waitlist, messages, care records),
// AI processing, SMS/texting disclosures (CTIA), sharing, retention, deletion.

import type { Metadata } from "next";
import {
  LegalCallout,
  LegalPage,
  LegalSection,
} from "../_components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy — CareSupport",
  description:
    "How CareSupport collects, uses, protects, and shares information when you use our care coordination service.",
};

const CONTACT = "hello@caresupport.com";

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="LEGAL / PRIVACY"
      title="Privacy Policy"
      updated="June 11, 2026"
      lead="CareSupport helps families coordinate care over text. That work involves information about you and the people you care for, and we treat it with the seriousness it deserves. This policy explains what we collect, why, and the choices you have."
    >
      <LegalSection index="01" title="Who we are">
        <p>
          CareSupport (&ldquo;CareSupport,&rdquo; &ldquo;we,&rdquo;
          &ldquo;us&rdquo;) provides a care coordination assistant that works
          through text messaging (iMessage/SMS). You can reach us any time at{" "}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
      </LegalSection>

      <LegalSection index="02" title="Information we collect">
        <p>We collect three kinds of information:</p>
        <ul>
          <li>
            <span>
              <strong>Signup and contact details.</strong> When you sign up, we
              collect your name, email address, and phone number.
            </span>
          </li>
          <li>
            <span>
              <strong>Messages and care coordination content.</strong> When you
              use the service, we receive and store the messages you send,
              along with the care information you choose to share — for
              example medications, schedules, reminders, care notes, and the
              names and phone numbers of caregivers and family members you ask
              CareSupport to coordinate with.
            </span>
          </li>
          <li>
            <span>
              <strong>Technical and usage information.</strong> Basic logs such
              as message delivery status, timestamps, device user-agent on our
              website, and records of actions the service took on your behalf.
            </span>
          </li>
        </ul>
      </LegalSection>

      <LegalSection index="03" title="How we use information">
        <ul>
          <li>
            <span>
              To provide the service: reading your messages, generating
              responses, and keeping organized records of medications,
              schedules, contacts, and coordination tasks you ask us to track.
            </span>
          </li>
          <li>
            <span>
              To send reminders and coordination messages you have asked for
              or approved.
            </span>
          </li>
          <li>
            <span>
              To keep an audit trail of outreach and actions taken on your
              behalf, so you can always see what CareSupport did and when.
            </span>
          </li>
          <li>
            <span>To improve reliability, safety, and quality of the service.</span>
          </li>
          <li>
            <span>To comply with legal obligations.</span>
          </li>
        </ul>
        <p>
          CareSupport uses artificial intelligence to understand and respond to
          your messages. Your messages are processed by AI language-model
          providers acting as service providers on our behalf, solely to
          operate the service. We do not allow them to use your content to
          train their models.
        </p>
      </LegalSection>

      <LegalSection index="04" title="Text messaging disclosures">
        <LegalCallout>
          No mobile information will be shared with third parties or
          affiliates for marketing or promotional purposes. Your text
          messaging originator opt-in data and consent will not be shared with
          any third parties.
        </LegalCallout>
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
              Reply <strong>STOP</strong> at any time to stop receiving
              messages. Reply <strong>HELP</strong> for help, or contact{" "}
              <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
            </span>
          </li>
        </ul>
      </LegalSection>

      <LegalSection index="05" title="People you ask us to contact">
        <p>
          CareSupport only texts a caregiver, family member, or other care
          contact after you explicitly approve that outreach. When we contact
          someone on your behalf, we identify the message as coming from
          CareSupport, we keep a record of it, and that person can opt out of
          further messages at any time by replying STOP.
        </p>
        <p>
          If someone you coordinate with shares information in reply, we store
          it as part of the same care record so the coordination loop stays in
          one place.
        </p>
      </LegalSection>

      <LegalSection index="06" title="How we share information">
        <p>
          We do not sell your personal information, and we do not share your
          care content for advertising. We share information only with:
        </p>
        <ul>
          <li>
            <span>
              <strong>Service providers</strong> that help us run CareSupport —
              message delivery, cloud hosting and database infrastructure, and
              AI processing — under contracts that limit their use of your
              information to providing those services.
            </span>
          </li>
          <li>
            <span>
              <strong>People you direct us to contact</strong>, limited to what
              is needed for the coordination you approved.
            </span>
          </li>
          <li>
            <span>
              <strong>Legal and safety recipients</strong>, if required by law
              or to protect the rights, safety, or property of you, others, or
              CareSupport.
            </span>
          </li>
        </ul>
      </LegalSection>

      <LegalSection index="07" title="Health information">
        <p>
          CareSupport is a coordination tool, not a healthcare provider, and we
          are not a HIPAA covered entity. Information you share with us is
          protected by this policy and our security practices, but it is not
          medical-record protection under HIPAA. Please share only what you
          are comfortable having stored to support coordination.
        </p>
      </LegalSection>

      <LegalSection index="08" title="Retention and deletion">
        <p>
          We keep your information while your account or care case is active
          so the service can remember context across conversations — that
          memory is the product. You can ask us to correct or delete your
          information at any time by emailing{" "}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>, and we will honor the
          request within 30 days except where we must retain records by law.
        </p>
      </LegalSection>

      <LegalSection index="09" title="Security">
        <p>
          We use industry-standard safeguards: encrypted transport, access
          controls, audit logging, and infrastructure providers with strong
          security practices. No system is perfectly secure, and we encourage
          you not to text information you would not want stored.
        </p>
      </LegalSection>

      <LegalSection index="10" title="Children">
        <p>
          CareSupport is for adults. The service is not directed to children
          under 13, and we do not knowingly collect personal information from
          them. Account holders must be 18 or older.
        </p>
      </LegalSection>

      <LegalSection index="11" title="Changes to this policy">
        <p>
          If we make material changes, we will update the date at the top of
          this page and notify active users by text or email before the
          changes take effect.
        </p>
      </LegalSection>

      <LegalSection index="12" title="Contact us">
        <p>
          Questions, corrections, or deletion requests:{" "}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
