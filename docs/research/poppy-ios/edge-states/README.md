# edge-states — failure handling and system permission prompts

1 screenshot in the dedicated bucket, but several edge-state moments are filed elsewhere (in `home/` and `settings/`). This README catalogs ALL edge-state observations across the corpus.

---

## File index (this bucket)

- `01-ios-wants-to-open-uber.png` — iOS-system "Poppy wants to open Uber" deep-link confirmation

## Edge-state moments observed elsewhere

| Location | What | Why |
|----------|------|-----|
| `home/08-event-calendar-not-connected.png` | Calendar permission missing during event creation | Most important edge-state pattern — graceful fallback |
| `home/31-inbox-alarms-empty.png` | Inbox Alarms tab empty | Minimal empty-state copy ("No alarms") |
| `agent-thread/02-calendar-gap-admission.png` | Agent admits calendar isn't connected | Conversational graceful failure |
| `memories/02-people-empty.png` through `07-food-diet-empty.png` | Memory category empty states | Per-category empty templates with category icons |
| `memories/09-places-home-work-cards.png` | Places empty state with Home/Work preset cards | Preset suggestions + empty state pattern |
| `settings/14-mac-app-required-airdrop.png` | Mac App Required modal when integration needs Mac companion | "Capability gap" pattern with install fix-path |
| `onboarding/16-photos-...` (transparency screen) | Permission revocation reassurance | "You can disconnect anytime from Settings" |

---

## Edge-state patterns observed

### 1. Graceful permission fallback

`home/08-event-calendar-not-connected.png` — the most important pattern. When the agent can't fulfill a primary intent (Create Event) due to missing permission:

```
[Header with intent context: "Create event: Founders Day, May 16 2026 at 12:00 AM"]

[Grey calendar-with-slash icon]

Calendar Not Connected
Calendar access hasn't been granted yet. Enable it to create and manage your events.

[Grant Access (orange CTA)]

——

[Create Event (still primary CTA)]
[Remind me instead (secondary FALLBACK)]
[Not now (escape)]
```

Three actions stacked vertically:
1. **Primary** — what the user originally wanted (would fail without permission)
2. **Fallback** — "Remind me instead" routes to Reminders (which DOES have permission)
3. **Escape** — Not now

The user gets the **next-best outcome** they CAN have, immediately. This is the gold-standard edge-state UX.

### 2. Conversational graceful failure (agent thread)

`agent-thread/02-calendar-gap-admission.png` — text version of the same pattern. When the agent makes a claim that turns out wrong due to a capability gap:

1. Acknowledge with "Actually..."
2. Name the specific gap ("your calendar isn't linked to Poppy right now")
3. Connect the gap to the prior wrong claim ("That's probably why Wednesday looked empty!")
4. Offer fix path ("just head over to your app settings to link it")
5. State the future capability ("Once that's set up, I'll be able to see and add events for you")

Five-step script. Apply universally.

### 3. iOS-system cross-app deep-link prompt

`01-ios-wants-to-open-uber.png` — Apple's native alert when an app uses URL schemes to launch another:

```
"Poppy" wants to open "Uber"

[Cancel]  [Open]
```

This is non-customizable Apple UI — Poppy can't theme it. Pattern note: when planning deep-links to partner apps, expect this prompt and don't try to design around it; design FOR it (clear button labels, clear app names in your URL scheme handler).

### 4. Empty states with category-specific identity

Memory categories' empty states preserve category icons (heart, thumbs-down, clock, fork-and-knife). Empty doesn't mean generic — each empty state still tells the user WHAT category they're in.

Pattern: empty states are **branded waiting spaces**, not blank slates.

### 5. Preset suggestions before pure empty

`memories/09-places-home-work-cards.png` shows preset Home + Work cards ABOVE a generic empty-state. Two suggested next-actions before the pure "nothing here" message.

Pattern: don't ship pure empty states for high-value categories where there are OBVIOUS first cases.

### 6. Minimal copy for low-stakes empty

`home/31-inbox-alarms-empty.png` — empty Alarms tab. Just bell-with-slash icon + "No alarms." Two words. No instructions on how to create one (because alarms are obvious enough).

Compare to memory empty states which have full instructions. Pattern: **copy depth scales with category complexity** — alarms are universal, memory facts are novel.

### 7. Capability-gap modals (Mac App Required)

`settings/14-mac-app-required-airdrop.png` — when an integration requires the Mac companion app, Poppy doesn't let the user grant it from iOS. Modal opens:

```
[Phone→Laptop illustration]

Mac App Required

1. Turn on AirDrop on your macOS device
2. Tap the button below to send the download link to your Mac
3. Open the downloaded file and follow the instructions to connect your data

[Send to Mac]  (primary)
[Open in Browser]  (fallback)
```

Pattern: when a feature requires a different device or app, don't pretend it's available — explain the requirement and provide the cross-device handoff mechanism.

### 8. "While Using" isn't enough

`home/19-reminder-builder-triggers.png` shows the location-trigger reminders gated behind "Always Allow":

> "Poppy needs background location access so reminders can fire when you arrive or leave a place — even when the app isn't open. 'While Using' isn't enough because iOS suspends location updates as soon as you put Poppy away."

Pattern: when a permission level doesn't suffice for the feature, **explain the technical constraint plainly**. "iOS suspends location updates" is the right level of detail — not too technical (acronyms) but not too vague ("you need always access").

### 9. Locked / disabled UI with explanation

Same screen — Arrive and Leave trigger types are LOCKED (with padlock icons + dim styling) when permission isn't granted. They're visible but not usable. Pattern: **show disabled features so users see what's possible**, with a clear "unlock" path.

### 10. Loading states with patience-language

`onboarding/41-post-payment-loading.png` — explicit time expectation:

> "It can take up to 5 minutes for us to summarize your information and provide helpful information and suggestions."

Name the wait window. Manage expectations. Compare to spinners with no information ("loading...") which feel infinite.

---

## Verbatim copy

- **Calendar not connected**: "Calendar access hasn't been granted yet. Enable it to create and manage your events."
- **Always Allow rationale**: "iOS suspends location updates as soon as you put Poppy away."
- **Memory category empty**: "Add things Poppy should know about your [category]."
- **People empty**: "People you mention to Poppy will appear here."
- **Calls empty**: "Your calls with Poppy will appear here."
- **Places empty**: "Add Home and Work above to get started, or tap + to mark a custom place."
- **Mac required**: "Mac App Required / Turn on AirDrop on your macOS device..."
- **Post-payment**: "It can take up to 5 minutes for us to summarize your information."
- **Alarms empty**: "No alarms."

---

## Steal for CareSupport

1. **Three-stack CTAs on permission failure** — Primary (would fail), Fallback (works now with different mechanism), Escape (Not now). Care contexts often have fallback paths: can't text Helper Mei? Voice-call her. Can't sync med record? Log it locally. Always offer the next-best action.

2. **Conversational graceful failure protocol** — 5-step script when agent gives wrong info due to capability gap. Caregivers will catch these constantly; agent must own them gracefully.

3. **Show disabled features** — Don't hide what requires permissions or paid tier. Show with padlock + explanation. Caregivers should see what's possible AND what they need to unlock it.

4. **Cross-device capability gap modals** — Coordinator's iPad? Family member's phone? When the user's current device can't do what they want, explain + handoff. CareSupport's care plan editing might require coordinator desktop, for example.

5. **Loading windows named** — "Your care recipient's history is being summarized. This usually takes 1-2 minutes after first sign-in." Name expected duration. Coordinators are time-pressed; vague spinners erode trust.

6. **Empty-state depth scales** — Pure-empty for universal categories (Alarms-equivalent). Instructional empty for novel categories (Memory-equivalent for "Care Routines"). Preset-suggestion empty for high-value categories with obvious first cases ("Add Mom's primary care doctor" / "Add the night nurse").

7. **Permission rationale names the technical constraint** — "iOS doesn't allow apps to listen for medication-bottle openings unless you grant Bluetooth Always Allow. Without it, smart pill caps won't trigger reminders." Specific. Honest.

---

## Open questions

- The "Calendar Not Connected" edge-state appears DURING an event-creation flow that was started before permission was granted — implies the user can begin a flow without all permissions and get prompted later. Worth verifying: when do permission requests get bundled vs deferred?
- Are there agent-thread error states? E.g., when Poppy can't respond (network failure, API failure). Not observed in this corpus.
- The Free tier's "10 daily messages" limit — what does the user see when they hit the cap mid-conversation? "Upgrade to continue" modal? Worth checking for paywall-gate UX.
