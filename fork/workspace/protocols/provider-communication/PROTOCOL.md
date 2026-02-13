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

### Inbound Provider Communication
When a provider texts/calls with information for the family:
1. Verify the provider is documented in family.md Provider Contacts
2. Receive and document the information
3. Route to the appropriate family member(s) based on access level:
   - Medical order changes → primary caregiver + medication-management protocol
   - Appointment changes → care team + appointment-coordination protocol
   - Lab results → primary caregiver (with plain-language explanation if possible)
   - General updates → appropriate team members
4. Always confirm receipt with the provider: "Got it, I'll pass that along to {family member}."
5. Log the communication in Recent Updates

### Provider Follow-Up Tracking
When a provider asks for monitoring data (weight, BP, blood sugar, behavior):
1. Create a tracking entry in Condition Tracking (family.md)
2. Set up daily/periodic prompts via care_schedules to collect the data
3. After the specified monitoring period, compile and send to the provider
4. Example: "Dr. Patel asked for daily weight checks for 7 days" →
   Daily prompt → "What was [recipient]'s weight today?" →
   After 7 days → compile trend → email to Dr. Patel with family approval

### Telehealth Appointment Prep
For telehealth/phone appointments, provide enhanced preparation:
1. All items from standard Visit Summary
2. Add: Condition Tracking data (longitudinal trends)
3. Add: Recent behavioral observations from daily check-ins
4. Add: "For Next Visit" items
5. Add: Caregiver observations and concerns
6. This data is the product's KEY VALUE for telehealth — providers see the
   patient for 15 minutes; the agent observes the family for weeks.
