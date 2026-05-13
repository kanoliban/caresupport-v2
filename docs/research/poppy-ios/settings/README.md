# settings — the configuration spine

21 screenshots. Profile, plan details, Connected Apps (the full integration map), Nudges (granular notification controls), per-integration sub-flows (Google OAuth, per-calendar sync, Mac app install).

Settings isn't an inert preferences panel — it's a **feature exploration surface**. Memories, Nudges, Magic Cue, and Add Poppy to your contacts are accessed here. Settings is where users discover what Poppy can do.

---

## File index

### Profile + plan
- `01-settings-main.png` — main settings list
- `02-settings-scrolled-signout-footer.png` — sign out + footer (Second Nature Computing, SF + NYC, v0.71 (456))
- `08-edit-profile-popover.png` — Edit Profile action sheet (Change Name / Number / Photo)
- `06-bloom-plan-features-top.png` ⭐ — Poppy Bloom plan detail with trial ends Jun 11, 2026
- `07-bloom-plan-features-bottom.png` — bottom of Bloom features + Manage Subscription

### Feedback
- `03-feedback-inline-expand.png` — feedback as inline expandable text field

### Nudges (granular notification config)
- `04-nudges-delivery-channels.png` ⭐ — per-event-type Push/Text/Call selector
- `05-nudges-frequency-quiet-hours.png` ⭐ — daily limits + Quiet Hours window

### Connected Apps
- `09-connected-apps-required-productivity.png` — Required (Location, Notifications) + Productivity sections
- `10-connected-apps-social.png` — Social section (Call History, Contacts, iMessage, Photos)
- `11-connected-apps-health-home-aes256.png` ⭐ — Entertainment, Health, Home (Apple HomeKit) + AES-256 footer
- `15-connected-apps-selections.png` — state-persistence (Contacts + Photos checked)

### Google sub-flow
- `12-google-services-list.png` — Google Services entry (4 sub-services unselected)
- `16-google-gmail-syncing.png` — Gmail mid-sync spinner
- `17-google-gmail-connected.png` — Gmail connected, account email visible
- `18-google-oauth-web.png` — Google OAuth web page (6-month review + ongoing access option)
- `19-google-calendar-connected.png` — Calendar now showing chevron (connected)

### Calendar sync (per-calendar)
- `13-icloud-calendar-sync.png` — iCloud calendars list, mostly unselected
- `20-google-calendar-sync-all.png` — Google calendars, 5 default-selected
- `21-google-calendar-sync-trimmed.png` — Google calendars, user deselected 2

### Mac companion app
- `14-mac-app-required-airdrop.png` ⭐ — AirDrop-based Mac install flow

---

## UI patterns

### 1. Settings as feature exploration

The settings list is grouped:

```
[Profile card with avatar + name + tenure + phone + edit]
[Plan card with crest + tier name + features unlocked]

Settings
├── Connected Apps     ← integrations management
├── Nudges             ← notification cadence
├── Memories           ← memory system (feature, not config)
├── Magic Cue          ← meta-launcher (feature, not config)
└── Add Poppy to your contacts  ← shortcut to re-add contact

Support
├── Feedback           ← inline text field
├── Data Retention     ← privacy controls
├── Privacy Policy
├── Terms of Service
└── Experimental Features  ← beta surfaces

[Sign Out — red outline pill]

[Footer: Brand + version + social icons]
```

Notable: **Memories, Magic Cue, Experimental Features are accessed here**, not from home. Settings IS the feature menu. Pattern: routine config and feature exploration share a surface — the user finds new capabilities while adjusting preferences.

### 2. Profile card with tenure

```
[L]  Liban
     User since May 2026
     +1 (651) 703-7981   [✏ edit]
```

"User since" gamifies tenure — the longer you're a customer, the longer that line gets. Same pattern as memory fact-counts.

### 3. Plan card as feature exposure

```
[Crest]  Poppy Bloom
         See what you've unlocked   >
```

Even after paying, the plan card sells the features. Tap → see Bloom benefits in detail (`06`, `07`). Reinforcement: subscribed users see what they get.

### 4. Bloom plan detail (10 features)

The Bloom details (`06`, `07`) list 10 unlocks with icons + names + one-line value. Trial ends Jun 11, 2026 badge. Bottom: "Manage Subscription — Change plan or cancel in App Store" deep-link.

Pattern: post-paywall, keep selling value AND surface cancellation prominently. Trust-building.

### 5. Nudges as granular delivery-channel config

`04-nudges-delivery-channels.png` is the most consequential settings screen. Per-event-type delivery selector:

```
MESSAGING PLATFORM:  [iMessage selected] [WhatsApp]

Suggestions  How Poppy delivers proactive suggestions
  [🔔 Push]  [💬 Text]  [📞 Call]

Reminders  How Poppy delivers your reminders when they trigger
  [🔔 Push]  [💬 Text]  [📞 Call]

Check-ins  How Poppy reaches out for end of day conversations
  [🔕 Off]  [💬 Text]  [📞 Call]

FREQUENCY & LIMITS:
  Max 4 notifications per day  [-] 4 [+]
  3 check-ins per week         [-] 3 [+]

QUIET HOURS:
  Enable Quiet Hours    [toggle ON]
  Start: 10:00 PM     End: 8:00 AM
```

THREE OBSERVABLE EVENT CLASSES:
- **Suggestions** — unprompted proactive recommendations
- **Reminders** — scheduled triggered notifications
- **Check-ins** — relational evening conversations

Each class has its own delivery channel preference (Push / Text / Call). Check-ins includes an Off option (most personal class — must be opt-out). Phone call is a notification channel.

### 6. Frequency limits + Quiet Hours

Two separate caps:
- **Max 4 notifications per day** (overall proactive limit)
- **3 check-ins per week** (separate, weekly cadence)

Quiet Hours: time window during which notifications AND calls are muted (10 PM - 8 AM default). Explicitly mentions "calls" — phone-call channel must respect quiet hours too.

### 7. Connected Apps — 6 sections

Connected Apps organizes integrations into 6 sections:

```
Required:        Location, Notifications
Productivity:    Google Account, Outlook, iCloud Mail, Calendar, Reminders, Wallet & Passes
Social:          Call History, Contacts, iMessage, Photos
Entertainment:   Apple Music
Health:          Fitness, Nutrition, Sleep
Home:            Apple HomeKit
```

Each row uses HUMAN-VALUE descriptions, not data names:
- Photos → "Share your memories"
- Contacts → "Keep track of birthdays, anniversaries, and people"

Same JTBD-friendly voice as onboarding. Consistency.

### 8. Connected Apps trust footer

The list ends with:

> "You have full control over your data at any time. Your data is encrypted using the AES-256 algorithm."

Plain technical claim. Two-tier copy: simple metaphor in onboarding ("personal lock that only fits your data"), explicit claim in settings ("AES-256"). Right level of detail per audience.

### 9. Granular OAuth — per-service within Google

Google has its own sub-page (`12`). Four sub-services individually selectable:
- Gmail
- Google Calendar
- Google Contacts
- YouTube

User can connect Gmail without YouTube. Multi-account support ("+ Add Google Account"). Each sub-service has a separate toggle.

Mature pattern: when one OAuth grants access to N services, expose them individually.

### 10. Per-calendar sync (privacy-respecting)

`13-icloud-calendar-sync.png` and `20`/`21`-google-calendar-sync show **per-calendar toggles** within each provider. User picks exactly which calendars Poppy reads. Calendar names + source-account suffix ("(iCloud)" / "(Gmail)") + Owner/Viewer/Editor role.

This is the right pattern for calendar consent. Most apps grab all calendars or none. Poppy lets users be surgical.

### 11. Mac App via AirDrop

`14-mac-app-required-airdrop.png` is the cross-device install flow:

```
[Phone → Laptop illustration]

Mac App Required

1. Turn on AirDrop on your macOS device
2. Tap the button below to send the download link to your Mac
3. Open the downloaded file and follow the instructions to connect your data

[Send to Mac]  (orange CTA)
[Open in Browser]  (plain alt)
```

The phone is already authenticated; AirDrop transfers an install link (presumably with a one-time install token). Most cross-device install flows are email/text-link friction; AirDrop is one tap.

### 12. Inline feedback (not new screen)

`03-feedback-inline-expand.png` — Feedback expands inline. Text field + image attach + send. No navigation away. Pattern: support actions should be lower-friction than feature actions.

### 13. Trust transparency on Google's OAuth page

The Google OAuth web page (`18`) shows the trust language Poppy doesn't control:

> "Poppy already has some access / See the 7 services that Poppy has some access to."

Implies broader scope than the 4 user-facing services. Worth noting as a scope-creep risk.

### 14. Footer signals

App footer (`02`):

> "Built by Second Nature Computing in SF and NYC / Version 0.71 (456)"

Sub-1.0 version with build 456. Communicates: actively shipped, beta-tier, location-disclosed (trust-building), small team (NYC + SF). Three social icons (X, Instagram, third unclear). Pattern: footer is the team's voice — keep it human.

---

## Verbatim copy

- **Plan card**: "See what you've unlocked"
- **Bloom subtitle**: "You're on the top tier. Everything in Poppy is unlocked."
- **Bloom feature names** (10):
  - "Unlimited email & calendar accounts"
  - "Unlimited chat"
  - "Magic Cue"
  - "Plan with Poppy"
  - "Unlimited memory & personalized replies"
  - "Always-on Poppy"
  - "WhatsApp linking"
  - "Video uploads"
  - "Early access"
- **Manage subscription**: "Change plan or cancel in App Store"
- **Nudges section heading**: "How Poppy delivers proactive suggestions" / "How Poppy delivers your reminders when they trigger" / "How Poppy reaches out for end of day conversations"
- **Quiet Hours**: "Mute all notifications and calls during this window"
- **Connected Apps footer**: "You have full control over your data at any time. Your data is encrypted using the AES-256 algorithm."
- **Calendar sync intro**: "Events from enabled calendars will be included in your context."
- **Mac app install**: "Mac App Required"

---

## Steal for CareSupport

1. **Settings as feature exploration** — Memories, Magic Cue, Experimental Features live in settings. The settings list IS where caregivers discover product capabilities. Don't bury features under deeply-nested menus.

2. **Profile with tenure** — "Caregiver since [date]" or "Coordinating [Recipient Name] for [N months]" — quantify the relationship.

3. **Plan card sells features post-purchase** — Even after subscribing, surface the unlocked features prominently. "You have access to [features X, Y, Z]" — reinforcement that subscription is worth it.

4. **Cancellation in App Store, never hidden** — Same direct deep-link. Trust-building.

5. **Three-class notification taxonomy** — For caregivers, the equivalents:
   - **Care alerts** (med late, no-show, emergency) — high-priority, default Push+Text+Call
   - **Coordination** (shift handoffs, schedule changes) — default Text
   - **Check-ins** (daily summaries, agent prompts) — default Text, Off-able
   
   Each class has its own delivery channel + frequency limit + override.

6. **Quiet Hours explicit about calls** — Care contexts have life-or-death edges. Quiet Hours must distinguish "informational mute" from "emergency override" — emergencies bypass mute even at 3 AM, but coordinator gets to define what counts as emergency.

7. **Two-cap notification limits** — Daily limit + weekly check-in limit, separate. Prevents firehose AND prevents complete silence.

8. **6-section integrations panel** — For CareSupport:
   - **Required**: Location (for caregivers on shift), Notifications, iMessage
   - **Medical**: PCP, pharmacy, EHR (when feasible)
   - **Coordination**: Calendar, Reminders, family members' messaging
   - **Recipient**: Care recipient's home (smart locks, motion sensors), photos, medical devices
   - **Caregiver-personal**: Caregiver's own calendar, sleep, transit
   
   Each section uses HUMAN-VALUE descriptions, not "we access X."

9. **Per-calendar sync** — Caregivers often have many calendars (personal, shift, family, work). Per-calendar opt-in. Same for Reminders, Photos albums.

10. **Mac companion app for coordinators** — A Mac app for coordinators to manage care plans, run reports, batch-message family members. AirDrop-install from the iPhone setup.

11. **AES-256 footer + plain trust copy** — Two-tier transparency. Onboarding uses metaphor; Settings names the algorithm.

12. **Inline feedback** — Caregivers in crisis need to give feedback fast. Inline expand + send is right.

13. **Build version visible** — In a HIPAA-adjacent product, version transparency builds trust ("we ship often, we own bugs"). Keep build number in app footer.

---

## Open questions

- The "7 services that Poppy has some access to" from Google's OAuth page — what are the extra 3 beyond Gmail/Calendar/Contacts/YouTube? Worth investigating before adopting similar scope.
- iCloud Calendar sync default vs Google Calendar sync default — iCloud was mostly UNCHECKED on default (`13`), Google was ALL CHECKED (`20`). Different defaults across providers. Why? Worth checking.
- Per-calendar role labels (Owner/Editor/Viewer) come from Google — useful information. Does iCloud expose roles? (Probably not; their calendar permission model differs.)
- The 3rd social icon in the footer (`02-...footer.png`) — Threads? Discord? Worth identifying for brand parity.
- Mac app install token mechanism — how does the AirDrop'd link authenticate to the user's account on the Mac? Likely a short-lived install URL with embedded JWT or device code. Architectural detail worth investigating.
