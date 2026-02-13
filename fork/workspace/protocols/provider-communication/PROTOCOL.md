---
name: provider-communication
description: Relay information to and from doctors, specialists, pharmacists. Use when a family member needs to communicate with a provider, or when preparing summaries for doctor visits.
safety_level: standard
requires_approval: true  # family approves before we contact providers
---

# Provider Communication

> **Viktor equivalent:** Viktor's email tools for sending external communications.
> Same capability, specialized for healthcare providers.

## Key Difference from Viktor

Viktor emails freely. We ALWAYS get family approval before contacting a provider.
The family is the customer, not the doctor.

## Workflows

### Prepare Visit Summary
When appointment is upcoming:
1. Read family.md → compile:
   - Current medications (full list with doses)
   - Recent changes since last visit with this provider
   - Active concerns / Urgent Notes
   - Questions the family has noted
2. Format as clean text (providers often print these)
3. Send to family member: "Here's the summary for Dr. {name}. Want me to send it to the office?"
4. On approval → email to provider's office

### Urgent Provider Message
When something needs provider attention but isn't 911:
1. Family says "Mom's been dizzy since the new medication"
2. Agent: "Want me to message Dr. {prescriber} about the dizziness?"
3. On YES → email to provider:
   ```
   Re: {recipient_name} — Caregiver-Reported Concern

   {recipient_name}'s caregiver reports: {symptom description}
   Timeline: {when it started}
   Current medications: {list}
   Recent changes: {list}

   Family contact: {primary caregiver phone}

   — Sent via CareSupport on behalf of the {family_name} family
   ```
4. Log in Recent Updates
5. Follow up with family if no provider response in 24h

### Generate Medication List
On request (or for appointment prep):
```
Current Medications for {recipient_name}
Updated: {date}

1. {Med} {dose} — {schedule} — Dr. {prescriber}
2. {Med} {dose} — {schedule} — Dr. {prescriber}
...

Allergies: {list}
Pharmacy: {name, phone}
```
