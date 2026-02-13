---
name: emergency-response
description: Handle urgent and emergency situations. Activate IMMEDIATELY on emergency keywords — fall, chest pain, can't breathe, help, 911, choking, unresponsive, seizure, bleeding. Do NOT wait for confirmation.
safety_level: critical
requires_approval: false  # emergencies don't wait for approval
---

# Emergency Response

> **Viktor equivalent:** No equivalent. Viktor has no concept of emergency.
> This is the fastest-path protocol. Latency = danger.

## HARD RULES (never override)

1. **Respond within ONE message, IMMEDIATELY**
   - No "let me check the file first"
   - No loading reference sections
   - Act, then gather context

2. **Emergency keywords trigger this protocol unconditionally**
   - Even if the message is ambiguous: "mom fell" → emergency protocol
   - False positives are acceptable. False negatives are not.

3. **Notify ALL full-access members simultaneously**
   - Don't wait for one to respond before notifying others

4. **Never tell someone NOT to call 911**
   - "Should I call 911?" → "Yes, call 911 now. I'm notifying the family."

## Emergency Keywords

```
fall, fell, fallen
chest pain, chest hurts
can't breathe, breathing, short of breath
choking
unresponsive, won't wake, unconscious
seizure, convulsion
bleeding, blood
stroke, face drooping, arm weakness, speech
help, emergency, 911
allergic reaction, swelling, hives
```

## Response Protocol

### Tier 1: Life-Threatening (call 911)
Triggers: chest pain, can't breathe, unresponsive, seizure, stroke symptoms, choking, severe bleeding, allergic reaction

**Immediate response (< 10 seconds):**
```
Call 911 now.
Address: [home address from family.md]
I'm notifying [primary caregiver] and [secondary caregiver].
Stay with [recipient]. What's happening right now?
```

**Simultaneously:**
1. Message ALL full-access members: "🚨 URGENT: [who reported] reports [situation] with [recipient]. 911 may be needed. [address]"
2. If provider phone exists and during business hours: notify primary physician
3. Log in family.md Recent Updates + Urgent Notes

### Tier 2: Urgent, Not Life-Threatening
Triggers: fall (without loss of consciousness), missed multiple medications, sudden confusion, mild allergic reaction

**Immediate response:**
```
I hear you. Is [recipient] conscious and breathing normally?
I'm letting [primary caregiver] know right now.
```

**Then:**
1. Notify primary caregiver with details
2. Ask reporter for more details: "Can [recipient] move? Any pain? What happened?"
3. Based on response, escalate to Tier 1 or proceed with care guidance
4. Log everything

### Tier 3: Concerning, Monitor
Triggers: "help" (without other keywords), unusual behavior report, repeated wellness check failures

**Response:**
```
Tell me more about what's going on with [recipient].
```

**Then:**
1. Assess based on response
2. Escalate if warranted
3. Notify primary caregiver with summary
4. Add to Urgent Notes if ongoing concern

## After Emergency

1. Update Urgent Notes with outcome
2. Update Recent Updates with full timeline
3. If hospitalized: update This Week schedule
4. Follow up with reporter within 2 hours
5. If protocols or emergency contacts need updating, flag for primary caregiver

## Message Templates

```
Tier 1:  "🚨 Call 911 now. Address: {address}. I'm notifying {family}. Stay with {recipient}."
Notify:  "🚨 URGENT: {reporter} reports {situation} with {recipient}. {address}"
Tier 2:  "I hear you. Is {recipient} conscious and breathing? Letting {primary} know now."
Follow:  "Checking in — how is {recipient} doing after earlier? Any updates?"
```
