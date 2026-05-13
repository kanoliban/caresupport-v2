# agent-thread — Poppy in iMessage

8 screenshots. The strategic center of the entire Poppy architecture: the iMessage conversation surface where the agent lives, speaks, and hands content off to the iOS app.

| # | File | What it shows |
|---|------|---------------|
| 01 | `01-first-contact-cat-image.png` | Poppy's first proactive message after onboarding |
| 02 | `02-calendar-gap-admission.png` | Agent admits missing capability mid-conversation |
| 03 | `03-recipe-list-memory-prompt.png` | Multi-recipe content + memory-save offer |
| 04 | `04-link-preview-loading.png` | iMessage rich preview rendering state |
| 05 | `05-link-preview-grocery-loaded.png` | Loaded preview "Tap to open in Poppy" |
| 06 | `06-user-asks-app-not-here.png` | User articulates the two-surface paradigm |
| 07 | `07-evening-checkin-moon.png` | Time-of-day proactive check-in |
| 08 | `08-link-preview-directions.png` | Directions preview generated from chat request |

---

## Flow narrative

The thread spans 9:14 PM (first contact) to ~11:55 PM (directions handoff) on one evening — three hours of natural interaction on day zero.

**Cold open (9:14 PM)** — Poppy's first message arrives mid-onboarding (referenced by the "A message is on its way!" copy on the cadence screen at IMG_7651). The opening is four parts: greeting → context flex → personality image → invitation. By the time the user finishes the iOS-app onboarding cadence customization, the agent has already introduced itself in their messaging app of choice.

**Calendar gap moment (~9:32 PM)** — User asks Poppy to add "Founders Day event at the University of Minnesota at 4:30 PM" on Wednesday. Poppy had earlier claimed Wednesday was clear. When the user presses ("Will I be able to see it in the app?"), Poppy notices its own contradiction, owns it, explains why, and offers the fix path. This is the canonical example of the agent's failure protocol.

**Content generation (~9:46–9:48 PM)** — User and Poppy have been discussing meal prep. Poppy generates a list of recipes inline. When user demands "a grocery list with each and every item I need it weighed for" in a categorized format, Poppy doesn't try to render the answer in chat — it generates an `askpoppy.app` URL, iMessage renders the rich preview, and tapping the preview deep-links into the iOS app showing the structured list. The first observed instance of the cross-surface bridge mechanic.

**User articulation (10:28 PM)** — Mid-recipe discussion, user explicitly types: "Can you put this as a step by step guide in the app not here." User recognizes the dual-surface model and ASKS for the right one. Poppy complies — generates another `askpoppy.app` link with the recipe as a structured reminder. Confirms the surface model isn't just designer-intent; users perceive and operate it.

**Evening check-in (11:53 PM)** — Unprompted, Poppy initiates: "Hey! How was your day? Anything on your mind for tomorrow? 🌙" This is the "Check-ins" event class from Nudges settings firing. The voice is intentionally social, not utilitarian.

**Location continuity setup (11:54 PM)** — User responds to the check-in with a logistics request: "Add go to work at the coven on Nicollet Ave by 9am from my current location." Poppy estimates the drive ("about a 6 minute drive from here"), generates a directions link. The user's affectionate word for their workplace ("the Coven") is silently absorbed into agent memory — at 12:05 AM the home greeting becomes "Leave by 9am for the Coven tomorrow" (visible in `home/50-home-next-day-the-coven.png`).

---

## Voice patterns

| Voice move | Example | Why it works |
|-----------|---------|-------------|
| Soft self-introduction | "Hi there! This is Poppy." | Friendly, present-tense, no titles |
| Context flex (apologetic verb) | "I just pulled up your location and see you're hanging out at home tonight in Minneapolis." | Demonstrates data access AS a caring move, not surveillance — verb "pulled up" is softer than "checked" |
| Time-of-day calibration | "Hey! How was your day? Anything on your mind for tomorrow? 🌙" vs morning "Looks like that day is wide open for you." | Different greeting tone per time bucket |
| Self-correction with cause | "Actually, it looks like your calendar isn't linked to Poppy right now. That's probably why Wednesday looked empty!" | "Actually" + "probably why" — owns mistake, names the cause |
| Action-forward fix path | "I can help you with that — just head over to your app settings to link it." | Tells user what to do; agent doesn't apologize-spiral |
| User-vocabulary echo | "the Coven" (user word) → "Leave by 9am for the Coven tomorrow" (agent's morning greeting) | Memory of user's idiom; preserves their voice |
| Friend-grade casualness | "Hey!" / "🌙" / "How was your day?" | Looks like a friend texted, not like a tool |
| Non-utility image | Cat photo with paws up (no caption, no action) | Personality through visuals; mood-setting |

The voice is **lower-case-friendly, present-tense, opinionated but not pushy, and openly fallible**. Compare to most agents that overuse "I'd be happy to" / "Let me help you with that" boilerplate. Poppy doesn't.

---

## Cross-surface bridge — the `askpoppy.app` mechanic

The single most important pattern in this bucket. Observed three times in 8 screenshots (recipes/grocery list, recipe, directions). The pattern:

1. Agent has structured content too rich for plain text (multi-step recipe, item-by-item grocery list, map with route).
2. Agent generates a stable URL at `askpoppy.app/{id}` server-side. Content is rendered there.
3. iMessage receives the URL and renders an OpenGraph-compliant **rich link preview** card with custom illustration, title, and a "Tap to open in Poppy" subtitle.
4. User taps the preview → iOS deep-link routes into the Poppy iOS app.
5. The app opens to a STATE that presents the content materialized — typically a suggested action (event creator, reminder builder) pre-filled with the structured payload.
6. User can confirm/modify/dismiss within the app.

This is how iMessage stays the **conversational surface** and the iOS app becomes the **structured-content surface** without either dominating. **The agent decides which surface a given response belongs in.** Sometimes a quick three-bubble answer is enough; sometimes the right output is a link.

### Implications

- The agent has a routing decision built into its response policy: "does this content render better as text, or as a structured artifact at `askpoppy.app/...`?"
- The `askpoppy.app` URLs are likely scoped per-user with auth — the iOS app needs to know who you are, but the URL is shareable to your own iMessage thread (which is signed-in by phone number).
- Custom OG metadata per URL — the link previews show different icons for grocery, recipe, directions. The metadata is content-aware, not a single brand image.

---

## Image-in-thread strategy

Only one observed: the orange tabby kitten in `01-first-contact-cat-image.png`. No caption, no action, no link. Pure tone.

Hypothesis: this is **personality-as-data**. The agent has access to image-generation and uses it sparingly to set emotional tone in moments where text alone would feel sterile. "Hi, I'm an AI assistant!" + photo of a startled cat is read by humans as "this thing is fun, not corporate." A bigger image strategy may exist (Poppy's paywall references "Audio, files, and video uploads" both directions), but in 8 thread captures only one image was sent.

For CareSupport, the equivalent would be careful — care contexts are not "fun cat" contexts. But the principle holds: the agent has a visual voice, not just a text voice. A short illustration on the first-contact message can convey trustworthiness, calm, presence.

---

## Verbatim copy worth preserving

- **Opening line**: "Hi there! This is Poppy."
- **Context flex**: "I just pulled up your location and see you're hanging out at home tonight in Minneapolis."
- **Open invitation**: "Since your schedule is looking wide open for the rest of the evening, is there anything I can help you set up or look into so you're ready for the week ahead?"
- **Confidence claim** (later revealed false): "Looks like that day is wide open for you. Nothing scheduled as of now!"
- **Verification under pressure**: "Double-checked and confirmed — still looks clear."
- **Self-correction**: "Actually, it looks like your calendar isn't linked to Poppy right now. That's probably why Wednesday looked empty!"
- **Fix path**: "I can help you with that — just head over to your app settings to link it. Once that's set up, I'll be able to see and add events for you."
- **Memory-save offer**: "These all store perfectly in the fridge for 3 days. Want me to save these to your memory so you have them handy for your prep sessions?"
- **Brief title preface to a link**: "High-calorie, protein-rich, rice-based meal prep." (intro line before askpoppy.app preview)
- **Evening check-in**: "Hey! How was your day? Anything on your mind for tomorrow? 🌙"
- **Light distance estimate**: "It's about a 6 minute drive from here."

These are not marketing copy. They are agent OUTPUT, and they're consistent. Either there's a strong style guide in the prompt or post-edit pass, or the team has tuned the model carefully.

---

## Steal for CareSupport

1. **Cross-surface bridge** — Build `askcaresupport.app/{id}` URLs for structured care artifacts (care plans, med schedules, shift coverage maps, daily summaries). Agent generates the URL in iMessage; rich preview opens it in the companion app. This is the answer to "why a companion app" — to host rich artifacts that don't fit chat.

2. **Graceful failure protocol** — When the agent doesn't have permission/data/integration, it must (a) acknowledge the gap, (b) explain why, (c) name the fix path, (d) own the prior false claim if there was one. Never silent-fail. The script:
   > "Actually, [missing capability]. That's probably why [prior assertion was wrong]. [Fix path]. Once that's set up, I'll be able to [outcome]."

3. **First-contact composition** — Four parts:
   - Greeting + self-introduction ("Hi there! This is [Agent Name].")
   - Context flex (something the agent CAN see that demonstrates value)
   - Personality moment (image or warm phrase)
   - Open-ended invitation tied to user's near future

4. **Time-of-day calibration** — Different opening lines for morning / mid-day / evening. Evening check-ins explicitly relational ("How was your day?"). Use the cadence settings (Quiet/Balanced/Active equivalents) to gate which classes of message fire when.

5. **User-vocabulary echo** — When the user uses their own word for something ("the coven" for workplace; for CareSupport: "Mom" / "Dad" / "Auntie" / nicknames for care recipients), absorb it silently into agent memory and use it back in agent surfaces (home greeting, suggestion cards) without explicit announcement.

6. **Routing intelligence** — Agent decides per-response: does this go as text bubbles or as an artifact at `askcaresupport.app/...`? Multi-step instructions, schedules, plans, comparisons → app. Quick answers, ack, conversation → chat.

7. **Memory-save explicit prompt** — When the agent generates content the user might want to persist ("here are 5 recipes"), ask before storing: "Want me to save these to your memory?" Don't silently persist important content; ask. For CareSupport: medication change discussions, care preferences shared in chat — these need explicit save consent (and likely coordinator approval too).

8. **Confidence calibration** — Don't avoid all claims; the agent confidently said the day was clear. The right move is to SOURCE the claim ("Looks like... as of now!") and BE PREPARED TO RECANT when challenged. Confidence + correctability beats hedge-on-everything.

---

## Open questions / verify later

- What's the OPENGRAPH metadata template for `askpoppy.app` URLs? (Affects how rich previews look — worth testing if we adopt the pattern.)
- Does Poppy support iMessage **group threads** ("Plan with Poppy" Bloom feature) — was not observed in these 8 captures. Critical for CareSupport since care coordination is multi-party.
- How does the agent handle ATTACHMENTS in iMessage (audio, file, video — all gated on tier)? Not observed.
- The FaceTime icon in the agent thread header — is FaceTime calling Poppy a thing? Likely just iOS UI element, but worth verifying if voice-call channel runs through native iOS calls.
