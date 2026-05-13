# onboarding — phone-first → Bloom in 13 minutes

41 screenshots. Liban's full onboarding span: from welcome screen at 9:07 PM to first home view at 9:16 PM — **9 minutes** to traverse phone verification, JTBD selection, 5 integration recommendations, a 13-screen data-transparency explainer, permission requests, widget instructions, channel selection, iOS contact creation, cadence preset, paywall, and post-payment loading.

This is the **longest onboarding I've seen for a consumer app**, and yet Liban completed it in 9 minutes without skipping. The transparency screens alone took ~2 minutes. The design choice: spend onboarding budget on trust-building, not feature-teasing.

---

## The 13 phases of onboarding

```
1. Welcome + phone entry         (7619-7620, 2 screens, ~30s)
2. SMS verification              (7621-7622, 2 screens, ~20s)
3. Name capture                  (7623, 1 screen, ~10s)
4. JTBD picker                   (7624-7625, 2 screens, ~30s)  ← personalization signal
5. Integration recommendation    (7626-7629, 4 screens, ~30s) ← JTBD-personalized
6. Data transparency explainer   (7630-7642, 13 screens, ~2min) ← TRUST BUDGET
7. Permissions (Location + Push) (7643, 1 screen, ~15s)
8. Widget setup (3 styles)       (7644-7646, 3 screens, ~30s)
9. Channel selection             (7647-7648, 2 screens, ~15s)
10. iOS contact creation         (7649-7650, 2 screens, ~30s) ← reveals two-number telephony
11. Cadence preset               (7651-7653, 3 screens, ~30s)
12. Paywall (Sprout/Bloom)       (7654-7658, 5 screens, ~1min)
13. Post-payment loading         (7659, 1 screen, ~30s)
```

By the end of phase 12 (paywall), Poppy has already sent the first iMessage to the user (visible in the cadence-screen copy: "A message is on its way!"). The agent is ALIVE before onboarding finishes.

---

## File index by phase

### Phase 1 — Welcome + phone
- `01-welcome-phone-empty.png`, `02-welcome-phone-empty-dup.png`

### Phase 2 — SMS verify
- `03-sms-verify-empty.png`, `04-sms-verify-filled-loading.png`

### Phase 3 — Name
- `05-name-capture.png`

### Phase 4 — JTBD picker
- `06-jtbd-unchecked.png`, `07-jtbd-all-selected.png`

### Phase 5 — Integration recommendations
- `08-integration-gmail.png`, `09-integration-outlook.png`, `10-integration-calendar.png`, `11-integration-add-more-later.png`

### Phase 6 — Data transparency explainer (13 screens)
- `12-transparency-intro.png` — "Your data, explained"
- `13-transparency-contacts.png`
- `14-transparency-calendar.png`
- `15-transparency-email.png`
- `16-transparency-health.png`
- `17-transparency-location.png`
- `18-transparency-messages-calls-MACAPP.png` ← reveals Mac companion app
- `19-transparency-photos.png`
- `20-transparency-music.png`
- `21-transparency-wallet.png`
- `22-transparency-zdr.png` — Zero Data Retention
- `23-transparency-encryption.png` — Personal Key + Encrypted at Rest
- `24-transparency-control-exit.png` — "You're in control"

### Phase 7 — Permissions
- `25-permissions-request.png`

### Phase 8 — Widget setup
- `26-widget-coming-up.png`, `27-widget-actions-list.png`, `28-widget-quick-actions-grid.png`

### Phase 9 — Channel selection
- `29-channel-imessage-or-whatsapp.png`, `30-channel-imessage-selected.png`

### Phase 10 — iOS contact creation
- `31-ios-contact-add-poppy.png`, `32-ios-contact-two-numbers.png` ← 510 voice + 313 messages

### Phase 11 — Cadence preset
- `33-cadence-balanced.png`, `34-cadence-quiet.png`, `35-cadence-active.png`

### Phase 12 — Paywall
- `36-paywall-sprout.png`, `37-paywall-bloom.png`, `38-paywall-features-mid.png`, `39-paywall-features-texting.png`, `40-paywall-loading.png`

### Phase 13 — Post-payment loading
- `41-post-payment-loading.png`

---

## Key UX patterns

### 1. Phone-first authentication

No "Sign in with Apple/Google" buttons. Phone number is the identity, because phone number IS the iMessage routing key. Onboarding starts with a single phone field + US flag prefix and a placeholder format ("+1 201-555-0123"). The choice eliminates a fork in the flow and commits to the iMessage-as-surface bet from screen one.

### 2. Persona pivot — "we" → "I"

- **Welcome** (7619): "Poppy keeps track of the important things in your life... we'll set things up." Third-person + first-person plural.
- **Name capture** (7623): "What should **I** call you? Poppy will use it to greet you." First-person singular.

The pivot from "we" to "I" happens immediately after SMS verification — trust is established, the agent individuates into a named "I." Before verification, it's "the company"; after, it's "Poppy."

### 3. JTBD picker drives downstream personalization

The five JTBD options at `06-jtbd-unchecked.png` aren't just survey questions — they're **personalization signals** that drive integration-card copy on the next screen:

| JTBD | Surfaces in |
|------|-------------|
| "My mornings are chaos" | Gmail card + Google Calendar card |
| "Plans keep falling through" | Outlook card |
| "I can't keep up with my inbox" | iCloud Mail card |
| "Connecting with people who matter" | (Reminders card likely) |
| "I forget to take care of myself" | (Reminders card "I forget to take care of myself" quote) |

Each integration card on the next screen INCLUDES the JTBD phrase the user selected — italicized in orange, like a callback. The personalization mechanic is visible and earned, not hidden behind ML opacity.

### 4. Integration card structure (carousel)

```
┌──────────────────────────────┐
│ [Service icon]    [✓ selected]│
│ Gmail                        │
│                              │
│ Poppy will surface what      │  ← class-level value description
│ needs a reply and flag       │     (same for email-class services)
│ threads worth your time.     │
│                              │
│ "My mornings are chaos"      │  ← JTBD personalization quote
└──────────────────────────────┘
```

Email-class services share value description; calendar-class has its own ("Prep you for what's coming up and catch conflicts"). Per-class copy + per-user quote.

### 5. Data transparency BEFORE permissions

Phase 6 (13 screens) happens BEFORE Phase 7 (permission requests). This is the inverse of standard mobile-app onboarding, which typically asks for permissions first and explains in fine print later.

Each transparency screen has the same template:
- Hero color-coded emoji per data category
- 3-section card: **WHAT IS COLLECTED** / **HOW IT IS USED** / **HOW LONG WE STORE**
- Concrete specifics (numerical retention windows, sync cadences, sample agent strings)

The sequence ends with **two emotional closers**:
- "Zero Data Retention" (technical claim with consumer translation)
- "You're in control" (revocation + deletion path)

Then "Encryption" (12th screen) provides metaphor-led security explanation.

The single most quoted phrase from this section: **"Every piece of data has a purpose. Nothing is collected 'just in case.'"**

### 6. Concrete specifics build trust

Transparency screens name actual numbers:
- Calendar: "2 weeks past, 4 weeks ahead. We check for updates every 20 minutes."
- Email: "Last 7 days of summaries are kept. Raw email content is never [stored]."
- Location: "Your location is checked roughly every 20 minutes. We keep 90 days of location history."
- Music: "Apple Music every hour, Spotify every 20 minutes."

Specificity = credibility. Vague claims ("we use your data responsibly") would have to fight default skepticism; numbers concede no ground.

### 7. Negative-space disclosure

Each category explicitly states what's **NOT** done:
- Email: "...but not your full email content."
- Photos: "The photos themselves are deleted immediately after."
- Wallet: "Never shared with third parties or used for ads."

Telling users what you DON'T do is more trust-building than telling them what you do. Pattern.

### 8. Encryption explained through adversary scenarios

`23-transparency-encryption.png` is the best consumer-grade encryption explanation in the screenshots:

> "Think of it like a personal lock that only fits your data. This key is protected by an enterprise-grade key management system. Even we can't see it."
>
> "If someone broke into our database, all they'd find is scrambled text. Without your key, it's meaningless."

Two analogies (lock that fits your data; database break-in scenario). No AES-256 mention here (saved for the much-later Connected Apps footer). Trust earned via clarity, not jargon.

### 9. Friction as filter (widget setup, contact creation)

Two phases require the user to leave Poppy and act in iOS:

- **Widget setup** (phase 8): "Go home and add the widget as shown above" with "Do it later" CTA. Poppy can't add widgets for the user — must teach them.
- **Contact creation** (phase 10): hands the user iOS's native New Contact sheet pre-filled with Poppy's avatar, name, and two phone numbers. User taps Save.

Both phases respect that **iOS system actions can't be automated by third-party apps**. Don't pretend; explain and exit.

### 10. Cadence presets show OPTIONS-CHANGING behavior

Selecting Quiet/Balanced/Active doesn't just change values — it changes which CONFIG ROWS are visible:
- Quiet: only "As things come up" (1x/day)
- Balanced: "Morning briefing" + "As things come up" (2x/day)
- Active: above + "Evening recap" (3x/week)

The number of features available scales with preset. Pattern: presets aren't just slider positions; they're feature-set toggles.

### 11. Paywall arrives AFTER value is built

The paywall (phase 12) is screen 36 of 41. Twelve phases before the user ever sees pricing. By then they've:
- Authenticated with phone
- Picked their problems
- Connected (or selected) integrations
- Read 13 transparency screens
- Granted permissions
- Customized cadence

The mental investment is too high to abandon at "Start Free Trial." This is **commitment escalation**, used responsibly: the value built up in phases 1-11 is real (the user understands the product), so paying isn't extraction.

The paywall itself has a NOT NOW exit lane — soft, not gated. Liban tapped Start Free Trial; many users probably tap Not Now and convert later.

### 12. Tier naming as growth metaphor

**Free → Sprout ($8.99/mo) → Bloom ($15.99/mo)**.

Botanical progression matches the poppy logo. Sprout is the "growth-stage" tier; Bloom is "all-in." Names tell the user where they are on their relationship with the product. Compare to generic "Plus / Pro / Premium" labels.

### 13. Metering by RESOURCE units, not feature lockouts

The Free tier doesn't lock features outright; it caps QUANTITIES:
- Email accounts: 1 / 2 / ∞
- Push-to-talk per day: 3 / 10 / ∞
- Memory facts: 10 / 100 / ∞
- Daily messages with Poppy: 10 / ∞ / ∞

This is more humane than feature-paywalls. Free users can experience the full product at small scale; paying unlocks scale.

The "10 memory facts" cap matches the 10 locale facts auto-populated in Personal Info (`memories/08-personal-info-locale-facts.png`). The Free tier is literally **"the locale-baseline."**

### 14. "Add more later" / "Do it later" / "Not now"

Every screen has a soft escape:
- Integration carousel ends with "Add more later" card (`11-integration-add-more-later.png`)
- Widget setup CTA is "Do it later" (`26-widget-coming-up.png`)
- Paywall has "Not now" plaintext below CTA (`36-paywall-sprout.png`)

Pattern: every commitment-asking screen has an opt-out. Avoiding sunk-cost lock-in.

---

## Voice patterns in onboarding copy

| Move | Example |
|------|---------|
| Two-line JTBD format | "**My mornings are chaos** / I want to wake up knowing what's ahead" — user-voice problem + user-voice desire |
| Quoted JTBD in personalization | "Poppy will surface what needs a reply and flag threads worth your time. *'My mornings are chaos'*" |
| Concrete agent-output quotes in consent | "Shows up in your morning briefing with things like 'You slept 7 hours' or 'You hit your step goal yesterday.'" |
| Negative-space honesty | "...but not your full email content." |
| Adversary scenario | "If someone broke into our database, all they'd find is scrambled text." |
| Soft self-reference | "Even we can't see it." |
| Anticipation builder | "A message is on its way!" (cadence screen) |
| Playful CTA | "Finish up!" with exclamation |
| Aspirational tier | "The full Poppy. No caps. Everything unlocked." |

---

## Verbatim copy to preserve

- **Welcome**: "Poppy keeps track of the important things in your life and surfaces what matters to you at the right time."
- **Name screen**: "What should I call you? What's your name? Poppy will use it to greet you."
- **JTBD**: "What should Poppy help with? Pick what matters most right now."
- **Integration intro**: "Here's what I recommend you connect. Link your accounts so Poppy can help you. You can add more accounts and apps later."
- **Transparency intro**: "Poppy uses your data to help you out, like a briefing before your day starts or a heads-up when weather changes. Every piece of data has a purpose. Nothing is collected 'just in case.'"
- **ZDR claim**: "ZDR is a contractual guarantee from our AI providers, not just a setting we turn on."
- **Encryption metaphor**: "Think of it like a personal lock that only fits your data."
- **Permission framing**: "Poppy needs background location access so reminders can fire when you arrive or leave a place — even when the app isn't open. 'While Using' isn't enough because iOS suspends location updates as soon as you put Poppy away."
- **Cadence intro**: "Your day with Poppy / A message is on its way! Meanwhile, customize how Poppy fits into your day."
- **Paywall titles**: "Grow with Sprout — Poppy with room to actually keep up with your life." / "Go All-In with Bloom — The full Poppy. No caps. Everything unlocked."
- **Post-payment**: "Everything is getting ready for you / It can take up to 5 minutes for us to summarize your information and provide helpful information and suggestions. As you continue to use Poppy, it will get smarter and more personalized."

---

## Steal for CareSupport

1. **Phone-first auth, no SSO** — CareSupport already does this (Linq, iMessage routing). Reinforce the choice — Poppy validates it as the right pattern for iMessage-primary products.

2. **JTBD picker drives onboarding personalization** — Capture caregiver problems early ("I'm worried about Mom's medication", "Care team handoffs keep failing", "Family doesn't know what's happening"). Use them to:
   - Tailor integration recommendations
   - Set up initial Smart Reminder watchers
   - Quote back in agent greetings ("You mentioned [problem] — here's what I noticed today...")

3. **Transparency-before-permissions** — A multi-screen explainer for each PHI/PII data class (member context, medication records, location of caregivers, messages, photos) using the same template:
   - **WHAT IS COLLECTED**
   - **HOW IT IS USED**
   - **HOW LONG WE STORE**
   - Plus a closer on encryption and a final "You're in control" / data deletion screen.
   
   For HIPAA-adjacent contexts this isn't optional; it's the difference between a trusted product and a sketchy one.

4. **Concrete specifics over vague claims** — Always state retention windows, sync intervals, and capability limits numerically. "Med records kept for the duration of the care relationship + 30 days post-disengagement" beats "we keep your data only as long as needed."

5. **Negative-space disclosure** — Tell caregivers explicitly what we DON'T do: "We don't share care recipient information with anyone outside the network. We don't sell data. We don't train AI on your care recipient's records."

6. **Tier names as care progression** — Avoid "Plus / Pro / Premium." Use names that mirror care journey: e.g., **Care / Network / Coordination** or domain-specific terms.

7. **Meter by resource, not feature lockout** — Caps on number of care recipients, number of caregivers per recipient, daily agent messages, memory facts. Free tier should let a single caregiver run a single care relationship — paid tiers unlock multi-recipient and multi-caregiver scale.

8. **"Do it later" everywhere** — Caregivers are time-pressed. Every onboarding screen needs a soft skip. Save state and reprompt later if essential.

9. **Cadence presets** — Map Quiet/Balanced/Active to care-realistic intensities. Examples:
   - **Calm** — Critical alerts only (med late, no-show, emergency)
   - **Balanced** — Above + daily summary + ad-hoc suggestions
   - **High-Engagement** — Above + morning briefing + evening check-in + multi-day-ahead planning

10. **Cadence preset CHANGES OPTIONS, not just values** — Quiet preset shouldn't even show "Evening recap" as a toggleable item. Reduces UI noise for users who chose less.

11. **Paywall arrives after value is felt** — Pre-payment trial of agent capability is critical. Bill on day-1 only if the user has experienced multiple agent interactions (delivered reminder, completed a coordination, etc.). Maybe even gate paywall behind a "first delivered care action."

12. **Pre-payment first iMessage** — Poppy's "A message is on its way!" on the cadence screen and the first iMessage at 9:14 PM (mid-onboarding) is genius — the agent is ALIVE before payment. The user feels the relationship begin during free trial setup. CareSupport equivalent: agent's first iMessage should be sent during onboarding, BEFORE paywall, so the user experiences the product surface immediately.

13. **Cross-platform contact creation** — Hand iOS the pre-filled New Contact sheet. CareSupport equivalent: pre-fill iOS contact with care-coordinator's iMessage number + agent's number, brand avatar. Single tap to save.

---

## Open questions

- The 20s "Welcome" duplicate (`02-welcome-phone-empty-dup.png`) suggests user captured the same screen twice — probably accidental, not a distinct state.
- The widget setup (`26-28`) shows three widget styles in carousel — does the user have to pick one to add, or can multiple be added later from iOS widget gallery?
- Mac companion app is mentioned in transparency (`18-...MACAPP.png`) but its install isn't part of the iPhone-side onboarding — the user discovers it later in Connected Apps. Question: do iMessage-thread features (relationship memory, "who matters most") require the Mac app, or do they work degraded without it?
- The post-payment "5 minutes" wait — what happens server-side during that window? Bulk import of connected-account data into agent memory, presumably. Worth understanding for our equivalent.
