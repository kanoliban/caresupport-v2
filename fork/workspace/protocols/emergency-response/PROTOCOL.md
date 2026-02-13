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

### Compound Phrase Exceptions
Some phrases contain emergency keywords but are NOT emergencies:
- "fell asleep" → NOT a fall emergency
- "taking my breath away" → NOT breathing emergency
- "bleeding heart" / figurative language → NOT bleeding emergency
- "fall colors" / "fall season" → NOT a fall

When a keyword appears in a clearly non-emergency compound phrase, DO NOT
trigger the emergency protocol. If ambiguous, ask: "Just to be safe — when
you said [phrase], is [recipient] OK?"

### Emergency Access Override
During an active emergency (Tier 1 or Tier 2):
- The on-scene member receives ALL medically-relevant information regardless
  of their normal access level.
- This includes: medications, allergies, blood type, conditions, emergency contacts.
- Document the override in the PHI access log: "Emergency access override for
  [member] during [event] at [time]"
- The override ends when the emergency is resolved.
- For Tier 1 emergencies: notify ALL care team members at ALL access levels.
  Everyone needs to know there's a life-threatening situation.

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

## Clinical Knowledge Rule

**Do NOT rely on the model's general medical knowledge for time-critical actions.**
Condition-specific emergency guidance MUST be stored IN the family.md Emergency
Protocols section, not in the agent's reasoning.

Examples of what must be in the file, NOT left to inference:
- CHF patient: "Do NOT lay flat. Keep upright."
- Blood thinner patient: "Tell 911 which anticoagulant and dose."
- Diabetes patient: "If unconscious and low BG suspected, DO NOT give food by mouth."
- Epilepsy patient: "Do not restrain. Clear area. Time the seizure."
- Sulfa allergy: "Bactrim, Septra, sulfasalazine are contraindicated."

When onboarding a family, populate Emergency Protocols with condition-specific
clinical actions based on the care recipient's conditions. This is a CRITICAL
onboarding step, not optional.

## Post-Surgical Emergency Guidance

For patients recovering from surgery:
1. If the fall/injury involves the SURGICAL SITE → contact the SURGEON first
   (not 911), UNLESS there is: head injury, loss of consciousness, uncontrolled
   bleeding, or severe acute distress.
2. Provide the surgeon: surgery date, current medications (especially blood
   thinners and anticoagulants), and description of the event.
3. If the surgeon says ER → call 911 and relay the surgeon's assessment.

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
