# experimental — Apple's deepest surfaces, hacked

12 screenshots. Three frontier features: Lock Screen Briefing (via a Shortcuts+Wallpaper alarm-chain hack), Voice Notifications (home-gated audio readouts), and Magic Cue (context-aware meta-launcher via Action Button / Control Center).

This bucket reveals the engineering ambition behind Poppy: they're not just building a chat app. They're treating iOS as a **surface graph** and colonizing every place a user might glance or listen.

---

## File index

### Experimental menu
- `01-experimental-menu.png` — entry: Lock Screen Briefing + Voice Notifications cards

### Lock Screen Briefing (5 screens)
- `02-lockscreen-briefing-dark.png` — theme customization (dark mode preview)
- `03-lockscreen-briefing-light.png` — light mode preview
- `04-lockscreen-briefing-setup-instructions.png` ⭐ — 4-step alarm-chain instructions
- `05-ios-shortcut-share.png` — Apple's Shortcuts share-sheet for Poppy's shortcut
- `06-ios-shortcut-actions-top.png` ⭐ — inside the shortcut: action ladder top half
- `07-ios-shortcut-actions-bottom.png` — action ladder bottom half (delete → schedule → fetch → setWallpaper)

### Voice Notifications
- `08-voice-notifications-setup.png` — single toggle, "only plays when you're at home"

### Magic Cue (4 screens)
- `09-magic-cue-top.png` ⭐ — feature explainer with Action Button + Control Center illustrations
- `10-magic-cue-dup.png` — capture duplicate (no diff)
- `11-magic-cue-dup2.png` — capture duplicate (faint illustration state diff)
- `12-magic-cue-how-it-works-setup.png` ⭐ — How It Works + Set It Up

---

## Lock Screen Briefing — the alarm-chain hack

**The trick**: Apple doesn't allow third-party apps to write to the Lock Screen beyond widgets. Poppy gets around this by hijacking the **wallpaper update API** in a self-perpetuating Shortcut + Alarm loop.

### The chain

```
1. User installs Poppy's public Shortcut ("Poppy On Your Lock Screen")
2. User creates a recurring Alarm in iOS Clock app labeled "Update Lock Screen"
3. User creates an iOS Automation: "When alarm goes off → run Poppy's shortcut"
4. User grants Shortcuts "Allow Deleting Without Confirmation"
5. User configures the shortcut to use their current wallpaper

When the alarm fires:
  → Poppy's shortcut runs
  → DELETES the existing alarm
  → Computes "current_time + 30 minutes"
  → CREATES a new alarm for that future time, same label
  → Calls Poppy's CUSTOM "Fetch Briefing as Image" App Intent
  → Sets the returned image as Lock Screen wallpaper
  → Loop completes; new alarm waits 30 minutes; cycle repeats forever.
```

Every 30 minutes, the Lock Screen becomes a fresh agent-rendered briefing image. The "wallpaper" is effectively a live agent surface.

### Why this is remarkable

- **No private APIs**. Every action used (Find Alarms, Delete, Create Alarm, Set Wallpaper, Run Shortcut) is a public Shortcuts action. The hack composes them.
- **Public Shortcut sharing as distribution**. Poppy published the shortcut on January 9, 2026 (visible in `05-ios-shortcut-share.png`). Anyone can install via the standard Shortcuts share URL.
- **Custom App Intent**. "Fetch Briefing as Image" is Poppy's own action — they ship an `AppIntent` in Swift that returns image content on demand. Server-side rendering of the briefing into an image, exposed as an iOS-system primitive.
- **Friction is intentional**. The 4-step setup is high friction. Only power users will do it. That's fine — beta features should select for committed users.

### The setup-instruction copy pattern

`04-lockscreen-briefing-setup-instructions.png` uses **numbered orange circles + bold step titles + plain instructions**. The instructions reference iOS settings paths verbatim:

> "In Settings → Apps → Shortcuts → Advanced, turn on 'Allow Deleting Without Confirmation'"

Pattern to steal: when a feature requires iOS-system configuration, give path strings, not screenshots-of-settings.

---

## Voice Notifications — context-gated audio

`08-voice-notifications-setup.png`. Single toggle. The killer copy:

> **"Voice notifications will only play when you're at home."**

The agent uses location + likely HomeKit signals to gate audio output. Speaking in public is intrusive; speaking at home is companion-like. The gate is the feature.

Implication: every "audio output" feature must be context-aware. Hearing "Reminder: take your antihypertensive" out loud in a grocery store is mortifying. Hearing it in your kitchen is helpful.

---

## Magic Cue — the meta-launcher

The most ambitious idea in Poppy.

> "The right app when you need it. Trigger Magic Cue from your Action Button or Control Center and Poppy opens the app that matches your moment."

The single example phrase that conveys the whole product:

> **"Maps before a meeting, Music in the air."**

Eight words. Context awareness (calendar = meeting upcoming; device state = on plane) → app prediction (Maps; Music). One press, you're in.

### How it works (3 cards)
1. **Reads your moment** — Calendar, location, device state, and more
2. **Picks the right app** — Maps before a meeting, Music in the air
3. **One press, you're in** — Tap to launch instantly

### How to set up (2 paths)
1. **Action Button** — Settings → Action Button → Shortcut → Magic Cue (Pro/Pro Max iPhones)
2. **Control Center** — Pull down Control Center → tap + → search "Magic Cue" → drop it in

Two iOS-system shortcuts (Action Button + Control Center widget) — the most-default ways to invoke ANY ANYTHING on iOS. Poppy claims those slots.

### Strategic positioning

Magic Cue reframes Poppy from "an app you use" to **"the meta-OS layer that orchestrates your apps."** You don't open Poppy and decide; Poppy decides which app you need and routes you there.

This is the same logic as the iMessage agent (agent-as-intermediary) extended to APP LAUNCHING. The iOS app's role isn't to be a destination — it's to be an active router.

For CareSupport's equivalent: a caregiver's Action Button could trigger CareSupport, which would predict whether to launch the iMessage Poppy thread, the companion app's home, a specific shift card, the med log — depending on time, location, and recent agent activity.

---

## Voice/copy patterns

| Pattern | Example |
|---------|---------|
| Numbered orange-circle steps | Lock Screen 4-step setup |
| Path strings as setup instructions | "Settings → Apps → Shortcuts → Advanced..." |
| Confident "experimental" framing | "Try new features that are still in development. These may change or be removed." |
| Concrete one-line example | "Maps before a meeting, Music in the air." |
| Friction-aware framing | "Voice notifications will only play when you're at home." |

---

## Steal for CareSupport

1. **Lock Screen Briefing for caregivers** — A Shortcuts-based daily briefing for the caregiver's Lock Screen: "Mom's morning meds at 9 AM. Helper Mei arriving 10 AM. Aunt Lara called yesterday — return call after 3 PM." Renders every 30 min via the same alarm-chain hack. High friction setup → committed caregivers self-select.

2. **Magic Cue for care contexts** — Caregiver presses Action Button:
   - Morning + at home → opens daily care plan
   - During a shift → opens shift handoff page
   - Near care recipient's address → opens med log + recent notes
   - Evening + offshift → opens family-pulse summary
   
   Context-aware meta-launching into care-relevant surfaces.

3. **Voice Notifications during caregiving hours** — Read med reminders aloud when caregiver is in the care recipient's home (HomeKit geofence) AND hands are likely full. Don't read when out of home (privacy).

4. **Publish iOS Shortcuts as distribution** — Care-specific shortcuts: "Log a med dose," "Quick handoff note," "Voice memo to coordinator" — published as public Shortcuts so any caregiver can install with a tap.

5. **App Intents as agent primitives** — Expose CareSupport agent actions as iOS App Intents (`Log Med`, `Get Today's Schedule`, `Send Handoff Note`) so they appear in Shortcuts, Spotlight, Siri suggestions.

6. **Experimental Features as opt-in beta channel** — Visible in settings, gated to paying tier, with public framing about "still in development." Builds power-user loyalty + product feedback.

---

## Open questions

- The custom "Fetch Briefing as Image" App Intent — is it implemented client-side (render in app, return image) or server-side (request server for image)? Likely server. Worth investigating for our equivalent — would need a `/briefing.png` endpoint.
- Magic Cue's app-prediction model — is it rule-based ("calendar event in N min → suggest Maps") or ML? Cards suggest hybrid. For CareSupport, deterministic rules might be safer initially.
- Why are 3 of 4 Magic Cue captures near-duplicates (`09`, `10`, `11`)? Likely the user captured the screen multiple times to test animation states.
