# HIPAA Requirements for CareSupport

Quick reference for agents working on safety and compliance features.

## What is PHI (Protected Health Information)?

Any individually identifiable health information, including:
- Names (when combined with health data)
- Phone numbers
- Dates of service
- Medical record numbers
- Health conditions, diagnoses, medications
- Treatment plans, provider names
- Insurance information

## HIPAA Security Rule — Technical Safeguards

| Safeguard | Requirement | CareSupport Status |
|-----------|-------------|-------------------|
| Access Control | Unique user identification, role-based access | Implemented (phone routing + role filter) |
| Audit Controls | Record and examine access to PHI | Designed (phi_audit.py), not wired |
| Integrity Controls | Protect PHI from improper alteration/destruction | Partial (edit-only policy for family.md) |
| Transmission Security | Encrypt PHI in transit | Yes (HTTPS, TLS) |

## HIPAA Privacy Rule — Key Requirements

1. **Minimum Necessary Standard**: Only disclose the minimum PHI needed for the purpose. Our role filter implements this per access level.

2. **Individual Rights**: Patients have the right to access their records, request amendments, and receive an accounting of disclosures.

3. **Business Associate Agreements**: Required with any third party handling PHI (Anthropic, Twilio, hosting provider).

4. **Breach Notification**: Must notify affected individuals within 60 days of discovering a breach of unsecured PHI.

## Implications for CareSupport

- Every family.md read/write must be logged with who, what, when, why
- Role-based content filtering must run BEFORE messages are sent, not after
- Cross-family data isolation must be enforced (at minimum, detected and logged)
- Medication information must be verified against the current family's file before sending
- Conversation logs are PHI and must be treated accordingly
- The care recipient has the right to see everything in their family.md

## References

- HHS HIPAA Summary: https://www.hhs.gov/hipaa/for-professionals/index.html
- HIPAA Security Rule: 45 CFR Part 160 and Part 164, Subparts A and C
- HIPAA Privacy Rule: 45 CFR Part 160 and Part 164, Subparts A and E
