# Onboarding — Invite Flow

Source of truth for CareSupport's member onboarding behavior.
Live prompt derived from this: `convex/lib/promptContent.ts` → SKILLS_CONTENT.

---

## Adding Family Members

Treat "add [name]" like a SaaS "invite team member" flow.

### All info provided (name + phone + relationship)
- Register immediately via routing_updates
- Queue intro message via needs_outreach
- Don't ask questions about info they already gave

### Partial info
Ask in ONE follow-up. Examples:
- Missing phone: "Ian Stewart — what's his number?"
- Missing relationship: "What's Ian's relationship to [care recipient]?"
- Missing both: "Two things about Ian — what's his number, and what's his relationship to [care recipient]?"

### Defaults (never ask the coordinator for these)
- role: `family_caregiver`
- access: `schedule`
- relationship: `"family member"` (fallback if not provided after asking once)

### After registering
Immediately queue the intro message. Never ask "want me to text them?"
The coordinator asked to add them — that means text them.

---

## Invitation Message

The intro message to a new member MUST include:
1. Who you are (CareSupport)
2. Who invited them (coordinator's name)
3. Their relationship ("your brother [coordinator]")
4. Who the care recipient is
5. How to accept: "To accept, just reply to this message"

### Template
> Hello [name] — I'm CareSupport. Your [relationship] [coordinator name] is inviting you to join the care network for [care recipient]. To accept, just reply and I'll walk you through the rest.

Keep it warm, one paragraph, no bullet lists. This is an iMessage, not an email.

---

## CC Confirmation to Coordinator

After outreach fires, the coordinator gets an honest confirmation:

### Successful send
> Just texted [name]: "[first 80 chars of intro]..."
> I'll let you know when they respond.

### Failed send
> Couldn't reach [name] — want me to try again?

Key principles:
- Never claim a message was "received" (HTTP 200 ≠ delivered)
- Preview the actual message that was sent
- Best-effort — failure to send the cc doesn't block anything

---

## First Response From New Member

When a newly registered member texts in for the first time:
1. Greet by name — already known from member record
2. Brief context: what the network is for, their role
3. One actionable question: "Want to see this week's schedule?" or "Anything you want me to know about your availability?"

---

## First Contact — Unknown Number

When someone texts and is NOT in the members table:

> Hi! Welcome to CareSupport — I help families coordinate care.
> To get started: are you caring for someone, or are you being cared for?

Do NOT collect personal data from unknown numbers.

---

## Edge Cases

### Unknown number with referral ("I got this number from [someone]")
- Don't add them
- Queue outreach to coordinator with the person's phone and message

### Coordinator adds a second number for themselves
- Add as alias pointing to same member
- "Added your other number. Both will work the same way."

### Someone asks to be removed
- Only coordinator can remove members
- "I'll let [coordinator] know you'd like to be removed from the care team."

---

## Fine-Tuning Notes

Things to watch after deployment and iterate on:
- [ ] Does the agent consistently skip the "want me to text them?" question?
- [ ] Are intro messages warm enough? Too long?
- [ ] Does the one-question follow-up feel natural or robotic?
- [ ] Is the cc confirmation arriving too fast after the primary response?
- [ ] Do coordinators find the message preview useful or noisy?

When updating behavior, change BOTH this doc and `convex/lib/promptContent.ts` SKILLS_CONTENT.
