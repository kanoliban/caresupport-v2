# Poppy iOS — Screenshot Manifest

Source: 145 PNG screenshots, AirDrop'd 2026-05-12 from 24h personal testing of getpoppy.app.
Filename range: `IMG_7617.PNG` → `IMG_7763.PNG` (24 numbers skipped — not all consecutive).
Working copies live in `./_originals/`. Originals also retained in `~/Downloads/Poppy Screenshots/` as backup.

## Schema

Each entry below is one screenshot:

```
### IMG_XXXX.PNG
- **bucket**: <provisional bucket>
- **summary**: <one-line description of what's on screen>
- **state**: <iOS surface — main app screen, modal, sheet, notification, iMessage, lock screen, etc.>
- **copy**: <verbatim text worth preserving; quote distinctively>
- **ui**: <notable UI primitives or patterns>
- **flow-hint**: <what came before/after if obvious from capture order>
- **notes**: <anything else worth flagging — animations implied, unique affordances, accessibility, etc.>
```

## Buckets (provisional)

| Code | Bucket | Definition |
|------|--------|-----------|
| MK | marketing | App Store screenshots, landing-page captures, promotional shots |
| ON | onboarding | First-run, signup, account creation, permission requests, tutorial |
| IN | integrations | Service connections (calendar, email, Uber, etc.), connection state UI |
| HM | home | Main dashboard, primary tab, widgets, lock-screen surfaces |
| AT | agent-thread | iMessage conversations with the Poppy agent — the sync mechanic in action |
| SG | suggestions | Proactive action proposals, "tap to confirm" affordances |
| RT | routines | Recurring task automation UI |
| NT | notifications | Push notifications, banners, lock-screen alerts |
| HS | history | Past actions, log of agent activity |
| ST | settings | Profile, account, preferences, privacy controls, support |
| ES | edge-states | Empty states, errors, loading, permission denials |
| MS | misc | Doesn't fit cleanly — revisit during Phase 3 |

---

## Entries

_Entries appended during Phase 2 triage. Capture order preserved (IMG number ascending)._

---

### Batch 1 — IMG_7617 → IMG_7628 (App Store preview + start of onboarding)

### IMG_7617.PNG
- **bucket**: MK
- **summary**: App Store preview screenshot #1 — notification stream hero showing fragmented daily life across 7 apps
- **state**: App Store preview pane (back-arrow "◀ App Store" in status bar at 9:07)
- **copy**: Stacked notifications — "Resy: Reminder: Dinner at Nobu tonight at 8pm" (9:33 AM, 123 badge) / "WhatsApp: Mom: Don't forget to call grandma" (9:35 AM) / "Maps: Moderate traffic on your route to work" (9:36 AM, 15 badge) / "Uber: Your driver is 3 minutes away" (9:37 AM) / "Instagram: ye liked your photo" (9:39 AM) / "Google Calendar: Performance review in 30 minutes" (9:45 AM, 23 badge) / "Waymo: Your ride is arriving now" (9:38 AM, 67 badge) / "Messages: Hey! Are you coming tonight?" (9:41 AM)
- **ui**: Stacked iOS notification cards on pitch-black background. Implied chaos: out-of-order timestamps, oversized badge counts (123, 67, 23, 15), notification overlap. Marketing visual making the case that "life across too many apps" is the problem.
- **flow-hint**: This is the first App Store preview image — user is on App Store page about to install.
- **notes**: Deliberate dramaturgy: the notification cards LOOK like real iOS notifications but are arranged to feel suffocating. The 123-badge on Resy is satirically high. This is the problem-framing screenshot — every screenshot after this is the solution.

### IMG_7618.PNG
- **bucket**: MK
- **summary**: App Store preview #2 — "Meet Poppy" intro screen with Messages icon up top and Poppy app icon below
- **state**: App Store preview pane (still 9:07, "◀ App Store" visible)
- **copy**: "Meet Poppy"
- **ui**: Two icons. TOP: iOS native green Messages bubble icon at small size in upper-left. BOTTOM: Poppy app icon (white/gray rounded square, orange poppy flower silhouette emerging from bottom edge — feels like sunrise) much larger, centered low. Title "Meet Poppy" beneath it in heavy sans.
- **flow-hint**: Second App Store preview — pairs Messages with Poppy visually, signaling iMessage is the primary surface.
- **notes**: Brilliant compositional move — by showing Messages icon ABOVE Poppy on the marketing slide, they pre-frame that Poppy LIVES inside Messages, not as a separate app you'll launch. The Poppy icon's "rising sun behind a poppy" metaphor reinforces "morning, start fresh, ahead of the day."

### IMG_7619.PNG
- **bucket**: ON
- **summary**: Welcome screen — value prop above phone number entry
- **state**: First screen of installed app, 9:07
- **copy**: "Welcome / Poppy keeps track of the important things in your life and surfaces what matters to you at the right time. / Enter your phone number below and we'll set things up." Placeholder: "+1 201-555-0123" with US flag emoji.
- **ui**: Small orange poppy flower glyph above the title (smaller than the app icon). Title left-aligned. Phone field is full-width pill with country flag prefix. Heavy poppy flower illustration peeking up from bottom of screen — large, decorative, suggestive of growth/blooming.
- **flow-hint**: User just opened the app for the first time.
- **notes**: Two notable copy choices. (1) "Surfaces what matters to you at the RIGHT TIME" — temporal framing is the value prop, not features. (2) "We'll set things up" — first-person plural, makes onboarding feel collaborative not transactional. Notable absences: no "Sign in with Apple/Google" — phone-first auth, which matches iMessage-as-primary.

### IMG_7620.PNG
- **bucket**: ON
- **summary**: Welcome screen, 1s later — phone field still empty (likely just a capture moment, not a distinct state)
- **state**: Same as 7619, timestamp 9:08
- **copy**: Identical to 7619.
- **ui**: Identical to 7619.
- **flow-hint**: Probably user took a second screenshot to ensure the welcome was captured. Effectively a duplicate.
- **notes**: Duplicate of 7619. Worth marking as "duplicate" in Phase 3 — could be dropped from primary set but kept in _originals for completeness.

### IMG_7621.PNG
- **bucket**: ON
- **summary**: SMS verification screen — 6-digit code entry, iOS Messages autofill suggestion visible
- **state**: Verification screen, 9:08
- **copy**: "Let's confirm it's you / We just sent a 6 digit code to (651) 703-7981. / Enter it below to keep going. / Didn't receive a code?" Autofill suggestion bar at bottom: "From Messages 192014" with key icon.
- **ui**: Back chevron in top-left circle. Six empty input squares (first one ringed in orange = focused). Standard iOS numeric keypad. iOS-native code-from-Messages autofill suggestion ABOVE the keyboard.
- **flow-hint**: After 7619/7620, user entered their phone number — Poppy sent SMS code 192014.
- **notes**: Uses iOS's `oneTimeCode` autofill — Poppy worked with iOS's verification UX. Phone "(651) 703-7981" is Liban's real number (matches settings screen at IMG_7690). "Didn't receive a code?" is plain text, not a button — slightly under-affordanced. The orange focus ring matches the brand color.

### IMG_7622.PNG
- **bucket**: ON
- **summary**: SMS verification — code filled, "Loading..." button state
- **state**: Verification screen, 9:08
- **copy**: "Let's confirm it's you / We just sent a 6 digit code to (651) 703-7981. / Enter it below to keep going. / Didn't receive a code?" Code shown: 1 9 2 0 1 4. Button: "Loading..." with spinner glyph.
- **ui**: Six filled boxes (no orange ring now — focus moved off). Solid orange CTA pill replaces the keyboard, says "Loading..." with the iOS spinner. Keyboard dismissed.
- **flow-hint**: Immediately after 7621 — code filled in, button transitioned to loading.
- **notes**: Strong micro-detail: the CTA appears only AFTER all 6 digits are entered. The keyboard dismisses on completion. This is the proof of submission — implicit, no "Submit" button. Common modern pattern but executed cleanly.

### IMG_7623.PNG
- **bucket**: ON
- **summary**: Name capture — "What should I call you?"
- **state**: Name-entry screen, 9:08
- **copy**: "What should I call you? / What's your name? Poppy will use it to greet you." Placeholder: "Enter your name"
- **ui**: First-person voice "I". No back chevron visible (interesting — maybe verification is final/non-reversible?). Pill text field. Keyboard implicitly will appear on tap (not shown here).
- **flow-hint**: After successful verification (7622).
- **notes**: The shift from "we'll set things up" (welcome, 7619) to "What should I CALL you?" / "POPPY will use it to greet you" is the moment Poppy individuates from collective "we" into an agent identity. Very deliberate language pivot. Pattern to steal: introduce agent name AFTER trust is established (post-verification), not before.

### IMG_7624.PNG
- **bucket**: ON
- **summary**: Jobs-to-be-done picker — five checkbox cards, all unchecked
- **state**: JTBD selection screen, 9:09
- **copy**: "What should Poppy help with? / Pick what matters most right now." Five cards:
  1. "My mornings are chaos / I want to wake up knowing what's ahead" (sunrise/sun icon)
  2. "Plans keep falling through / I need something to manage my day" (orange-dot list icon)
  3. "I can't keep up with my inbox / I need help organizing the clutter" (envelope icon)
  4. "Connecting with people who matter / Let me show up for the people in my life" (people icon)
  5. "I forget to take care of myself / Help improve my fitness, sleep, and nutrition" (heart icon)
- **ui**: Vertically stacked cards, each with leading icon, two-line copy (problem + desired outcome), and trailing empty checkbox square. No "Next" CTA visible — likely appears after at least one selection.
- **flow-hint**: Right after name capture.
- **notes**: ZERO of these jobs are "use the app." They're all PROBLEM statements in the user's voice, paired with desired states. The copy pattern is "user-voice problem / user-voice desire." This is JTBD card design at its best. The five jobs are also the five "value bundles" the agent will personalize against — and we'll see in 7626-7628 that each integration card quotes back the chosen jobs.

### IMG_7625.PNG
- **bucket**: ON
- **summary**: Jobs picker — all 5 selected, "Next" CTA revealed
- **state**: JTBD selection screen, 9:09 (1s after 7624)
- **copy**: Same as 7624. CTA: "Next"
- **ui**: All five cards now have orange-ringed checkmarks (white check in orange-filled circle). Solid orange "Next" CTA appears at bottom.
- **flow-hint**: User selected all five — captures the "maxed-out" scenario.
- **notes**: This is a flow user-test moment — Liban likely picked all five to see how Poppy handles maximalism (probably recommends ALL the integrations). Confirms the JTBD selections drive downstream recommendation logic. The orange-ring-with-check is a recurring brand element across the app.

### IMG_7626.PNG
- **bucket**: ON
- **summary**: Integration recommendation carousel — Gmail centered, Outlook partial right
- **state**: Recommendation screen, 9:09
- **copy**: "Here's what I recommend you connect / Link your accounts so Poppy can help you. You can add more accounts and apps later." Card 1 (centered, selected): "Gmail / Poppy will surface what needs a reply and flag threads worth your time. / 'My mornings are chaos'" CTA: "Next" Subtle link: "How your data is used & stored"
- **ui**: Horizontal carousel of integration cards. Currently-selected card is centered with orange ring + orange checkmark in top-right. Adjacent cards (Outlook partial visible) are darker, no ring. Each card has: service icon, service name, plain-English explanation of what Poppy DOES with that data, AND a quoted JTBD phrase from the previous screen (italic, orange leading bar).
- **flow-hint**: After JTBD selection — Poppy recommends integrations matched to chosen jobs.
- **notes**: This is the cleverest moment in onboarding I've seen so far. The integration card includes a QUOTE from the user's own JTBD selection — making the recommendation feel earned, not pushed. The "data is used & stored" link below the CTA (not as a modal interrupt) is mature placement — visible to anyone who looks for it, not blocking. Also: phrase "what needs a reply and flag threads worth your time" — the agent positions itself as a TRIAGER, not a reader.

### IMG_7627.PNG
- **bucket**: ON
- **summary**: Same carousel scrolled right — Outlook centered, iCloud Mail partial right
- **state**: Recommendation screen, 9:09
- **copy**: Outlook card: "Outlook / Poppy will surface what needs a reply and flag threads worth your time. / 'Plans keep falling through'" iCloud Mail card (partial): "...Poppy will surface what needs a reply and flag threads worth your time. / 'I can't keep up with my inbox'"
- **ui**: Outlook now centered (no ring — unselected). Gmail still has orange ring (selected, partial left). iCloud Mail partial right.
- **flow-hint**: Continued from 7626.
- **notes**: The JTBD quote ROTATES across cards — Outlook gets "Plans keep falling through," iCloud Mail gets "I can't keep up with my inbox." Each card highlights a different chosen job. The "what Poppy will do" copy is IDENTICAL across all three email services (same value description) but the JTBD quote personalizes the pitch. Brilliant cost-efficient copy strategy — write once, personalize the wrapper.

### IMG_7628.PNG
- **bucket**: ON
- **summary**: Same carousel scrolled further — Google Calendar centered/selected, Reminders partial right
- **state**: Recommendation screen, 9:10
- **copy**: Google Calendar card: "Google Calendar / Prep you for what's coming up and catch conflicts / 'My mornings are chaos'" Reminders card (partial): "...your to-dos surface...the right m[oment] / 'I forget to take care of myself'"
- **ui**: Google Calendar centered with orange ring + check. Reminders peeking right.
- **flow-hint**: Continued scroll within the integration carousel.
- **notes**: Calendar gets a DIFFERENT value description ("Prep you for what's coming up and catch conflicts") — not the same copy as email cards. So integrations get class-specific copy: email-class says "surface what needs reply," calendar-class says "prep + catch conflicts." Each gets a JTBD quote pulled from the user's selection. Architecturally this implies an integration manifest mapping: per-integration value-prop text + matching JTBD-id for personalization.

---

### Batch 2 — IMG_7629 → IMG_7640 (end of integration carousel + 11-screen data-transparency explainer)

### IMG_7629.PNG
- **bucket**: ON
- **summary**: Last card of integration carousel — "Add more later" reassurance card
- **state**: Recommendation screen, 9:10
- **copy**: "Add more later / You can connect more apps and accounts anytime from Settings."
- **ui**: Final card in carousel — DIFFERENT visual treatment: dimmed orange plus-circle icon, "tile" appearance rather than service-branded. No orange ring, no JTBD quote. Just a low-pressure exit ramp.
- **flow-hint**: Right edge of integration carousel started in 7626.
- **notes**: This card is a flow-control affordance, not an integration. Pattern: end every "stack of choices" with a graceful escape that says you don't have to pick everything now. Reduces commitment anxiety. The card mimics integration-card shape so it feels consistent but visually de-emphasized (no logo color, dimmed icon).

### IMG_7630.PNG
- **bucket**: ON (sub-flow: data transparency)
- **summary**: Intro screen of an 11-step data-transparency explainer — "Your data, explained"
- **state**: Modal sheet (X close in top-left, progress indicator across top), 9:10-ish
- **copy**: "Your data, explained / Poppy uses your data to help you out, like a briefing before your day starts or a heads-up when weather changes. / Every piece of data has a purpose. Nothing is collected 'just in case.'"
- **ui**: Top-left X close button (modal pattern). Horizontal stepper made of dashes — first dash is filled orange (this is screen 1 of ~11). Big orange waving-hand emoji as hero. Heading. Bulleted explainer in a brown-tinted card.
- **flow-hint**: User tapped "How your data is used & stored" link visible in 7626. This sub-flow is opt-in — modal X means user can dismiss anytime.
- **notes**: This is the privacy onboarding pre-permission grant — they EARN consent by explaining BEFORE asking. Key copy choice: "Nothing is collected 'just in case.'" That single quoted phrase is the entire trust argument. The brown-tinted card matches the waving-hand emoji color, establishing the per-screen color theme (every category gets its own color).

### IMG_7631.PNG
- **bucket**: ON (sub-flow: data transparency)
- **summary**: Data explainer — Contacts (screen 2 of explainer)
- **state**: Modal sheet, second dash filled
- **copy**: Title: "Contacts" / Section "WHAT IS COLLECTED": "Names, phone numbers, emails, and addresses from your device and/or your Google account." / Section "HOW IT IS USED": "Poppy can remember birthdays, suggest who to call, or draft a quick message to the right person. / Poppy learns who's important in your life and can mention them by name." / Section "HOW LONG WE STORE": "Kept as long as your account is active. You can disconnect anytime from Settings."
- **ui**: Three-section card layout. Each section has a colored eyebrow label (CAPS, brand-tinted) and bullet items below. The color theme is PINK/MAGENTA matching the people emoji.
- **flow-hint**: One of 11 explainer screens; specifically the second.
- **notes**: The template is now visible — every data category screen has the same three-section structure: WHAT IS COLLECTED / HOW IT IS USED / HOW LONG WE STORE. Color-coded per category. Specific use cases ("remember birthdays," "suggest who to call") are concrete, not abstract. The phrase "Poppy learns who's important in your life and can mention them by name" telegraphs a relational mental model — the agent maintains a who-matters graph.

### IMG_7632.PNG
- **bucket**: ON (sub-flow: data transparency)
- **summary**: Data explainer — Calendar (screen 3)
- **state**: Modal sheet, third dash filled
- **copy**: Title: "Calendar" / WHAT IS COLLECTED: "Event titles, times, locations, and who's attending, from both your iPhone calendar and Google Calendar." / HOW IT IS USED: "Poppy can remind you about a meeting in 30 minutes, warn you about scheduling conflicts, or book a ride to your next appointment. / Used in your daily morning briefing so you know what's ahead." / HOW LONG WE STORE: "Poppy stores about a month's worth of events: 2 weeks in the past and 4 weeks ahead. / We check for updates every 20 minutes."
- **ui**: Same three-section template. Color theme is RED matching the calendar emoji.
- **flow-hint**: 3 of 11.
- **notes**: Three high-value specifics: (1) "book a ride to your next appointment" — the agent doesn't just remind, it takes action across integrations. (2) "2 weeks past, 4 weeks ahead" — temporal scope quantified. (3) "every 20 minutes" — sync cadence stated up front. Stating these numbers builds trust ("they know exactly what they're doing"). This is a copy pattern worth borrowing: state retention windows and sync intervals BY THE NUMBER, not in vague language.

### IMG_7633.PNG
- **bucket**: ON (sub-flow: data transparency)
- **summary**: Data explainer — Email (screen 4)
- **state**: Modal sheet, fourth dash filled
- **copy**: Title: "Email" / WHAT IS COLLECTED: "Email subject lines, senders, and short summaries, but not your full email content. / Poppy reads the last 7 days of emails to stay current." / HOW IT IS USED: "Important updates show up in your briefing, like a flight confirmation, a bill reminder, or a reply you've been waiting for. / During calls with Poppy, it can search your recent emails to help you find something fast." / HOW LONG WE STORE: "Only the last 7 days of summaries are kept. Raw email content is never [stored]..."
- **ui**: Same template. Teal/cyan color theme matching envelope emoji.
- **flow-hint**: 4 of 11.
- **notes**: Mentions "calls with Poppy" — they have a VOICE channel too, not just text and visual. Will need to look for voice-related screens later. Also: "subject lines, senders, and short summaries, but NOT your full email content" — explicit negative-space disclosure. Powerful trust move: tell users what you DON'T do, not just what you do. Pattern to borrow.

### IMG_7634.PNG
- **bucket**: ON (sub-flow: data transparency)
- **summary**: Data explainer — Health (screen 5)
- **state**: Modal sheet, fifth dash filled
- **copy**: Title: "Health" / WHAT IS COLLECTED: "Steps, workouts, and exercise minutes from Apple Health. / Sleep duration and quality, like when you fell asleep and how restful it was. / Nutrition data if you track meals: calories, macros, and meal times." / HOW IT IS USED: "Shows up in your morning briefing with things like 'You slept 7 hours' or 'You hit your step goal yesterday.' / Poppy looks back 14 days to spot trends and give you wellness tips." / HOW LONG WE STORE: "The last 14 days of health data is kept and refreshed from your device regularly."
- **ui**: Red heart theme.
- **flow-hint**: 5 of 11.
- **notes**: Sample agent voice quoted directly: "You slept 7 hours" / "You hit your step goal yesterday." The exact agent strings appear in CONSENT copy. This is unusually transparent — most apps don't quote the agent's actual output strings during onboarding. It both shows what the user will experience AND signals these are crafted phrases, not LLM-generated each time.

### IMG_7635.PNG
- **bucket**: ON (sub-flow: data transparency)
- **summary**: Data explainer — Location (screen 6)
- **state**: Modal sheet, sixth dash filled
- **copy**: Title: "Location" / WHAT IS COLLECTED: "Your location is checked roughly every 20 minutes, including coordinates and timezone. / Places you save (like Home or Work) are stored by name so Poppy knows where you are without asking." / HOW IT IS USED: "Poppy can remind you to leave early when traffic is bad, suggest nearby restaurants, or give you weather alerts for where you actually are. / Poppy can tell when you've arrived somewhere or left, like giving you your commute time before you head out." / HOW LONG WE STORE: "We keep 90 days of location history."
- **ui**: Blue paper-airplane/arrow theme.
- **flow-hint**: 6 of 11.
- **notes**: "Places you save (like Home or Work) are stored by name so Poppy knows where you are without asking" — labels feed the agent's spatial mental model. "Without asking" is a powerful affordance — fewer interaction taxes. "When you've arrived somewhere or left" implies geofence-style triggers feed agent behavior. 90-day retention is the longest stated so far.

### IMG_7636.PNG ⭐
- **bucket**: ON (sub-flow: data transparency)
- **summary**: Data explainer — Messages & Calls (screen 7) — REVEALS MAC COMPANION APP
- **state**: Modal sheet, seventh dash filled
- **copy**: Title: "Messages & Calls" / WHAT IS COLLECTED: **"iMessage history synced from your Mac via the Poppy companion app."** / "Phone call logs from your device." / HOW IT IS USED: "Poppy uses this to understand who matters most in your life and keep up with your relationships. / Poppy can remind you to follow up with someone you haven't talked to in a while, or help you draft a reply." / HOW LONG WE STORE: "Kept as long as your account is active. You can disconnect anytime by signing out of the Mac app."
- **ui**: Green speech-bubble theme matching iOS Messages icon.
- **flow-hint**: 7 of 11.
- **notes**: **MAJOR DISCOVERY.** Poppy is NOT just iOS + iMessage. The architecture is three pieces: (1) iOS app (rich-state layer), (2) iMessage agent (conversational surface), (3) **Mac companion app** that reads iMessage history. The Mac app is how they get around iMessage's iOS sandbox — read user's iMessage corpus from `~/Library/Messages/chat.db` on macOS (the standard Mac iMessage backing store). Then they have a complete relationship/conversation graph for the agent. CareSupport implications: (a) the iMessage agent doesn't have access to the user's broader iMessage history on iOS alone — they had to build a Mac-side bridge; (b) this is HARD engineering, not just a UI veneer; (c) "who matters most in your life" requires this data, which is why it's so valuable. The phrase "disconnect anytime by signing out of the Mac app" confirms the architecture.

### IMG_7637.PNG
- **bucket**: ON (sub-flow: data transparency)
- **summary**: Data explainer — Photos (screen 8)
- **state**: Modal sheet, eighth dash filled
- **copy**: Title: "Photos" / WHAT IS COLLECTED: "Photo metadata like when and where a photo was taken. / A random sample of your photos is analyzed to generate descriptions of what's in them. The photos themselves are deleted immediately after." / HOW IT IS USED: "Poppy uses this to build memories and understand your life, like recognizing a vacation, a birthday party, or a night out with friends." / HOW LONG WE STORE: "Metadata and descriptions are kept as long as your account is active. / All photo analysis happens on our own servers. Never sent to a third party."
- **ui**: Orange landscape-photo theme.
- **flow-hint**: 8 of 11.
- **notes**: "The photos themselves are deleted immediately after" — directly addresses the biggest photo-privacy anxiety. "All photo analysis happens on our own servers. Never sent to a third party" — Poppy runs vision models in-house, doesn't pass photos to OpenAI/Anthropic. This is a non-trivial infra claim. The framing "build memories and understand your life" frames the data as serving an EMOTIONAL function (memory) not a productivity one (tagging). Builds different mental model.

### IMG_7638.PNG
- **bucket**: ON (sub-flow: data transparency)
- **summary**: Data explainer — Music (screen 9)
- **state**: Modal sheet, ninth dash filled
- **copy**: Title: "Music" / WHAT IS COLLECTED: "Your recently played songs, top tracks, playlists, and recently added albums from Apple Music and/or Spotify." / HOW IT IS USED: "Poppy uses this to understand your taste and mood, like knowing you listen to chill music at night or upbeat songs in the morning." / HOW LONG WE STORE: "Only your latest listening data is kept. It gets replaced each time Poppy checks for updates. / We check for updates every hour for Apple Music and every 20 minutes for Spotify."
- **ui**: Blue music-note theme.
- **flow-hint**: 9 of 11.
- **notes**: Music as a SIGNAL for mood/taste — not a feature for playback. Poppy doesn't play music, it reads listening data as biographical signal. Different sync cadence per service (hourly Apple Music, 20-min Spotify) — likely a function of API rate limits, but stated to users plainly. The transparency on sync cadence is a recurring trust-building tactic.

### IMG_7639.PNG
- **bucket**: ON (sub-flow: data transparency)
- **summary**: Data explainer — Wallet & Passes (screen 10)
- **state**: Modal sheet, tenth dash filled
- **copy**: Title: "Wallet & Passes" / WHAT IS COLLECTED: "Apple Wallet passes like boarding passes, concert tickets, and loyalty cards. / Payment transactions: the store name, amount, and where you were." / HOW IT IS USED: "Poppy can show your boarding pass before a flight, remind you about a concert tomorrow, or help you keep track of spending." / HOW LONG WE STORE: "Kept as long as your account is active. Never shared with third parties or used for ads."
- **ui**: Yellow wallet theme.
- **flow-hint**: 10 of 11.
- **notes**: "Show your boarding pass before a flight" — implies Poppy can DISPLAY Wallet passes, which requires entitlements I'd expect to be hard to get. Either they have those entitlements or they deep-link into Apple Wallet. "Never shared with third parties or used for ads" — explicit anti-pattern statement. Same "never" framing as Photos.

### IMG_7640.PNG
- **bucket**: ON (sub-flow: data transparency)
- **summary**: Data explainer — Zero Data Retention (screen 11, capstone)
- **state**: Modal sheet, eleventh dash filled — last in the explainer sequence
- **copy**: Title: "Zero Data Retention" / "Poppy uses AI models with Zero Data Retention (ZDR). The AI provider never stores, logs, or trains on any data sent through our system. / Your messages, calendar events, emails, and other personal info are processed in real time and immediately discarded by the AI provider after responding. / ZDR is a contractual guarantee from our AI providers, not just a setting we turn on."
- **ui**: Purple brain emoji theme.
- **flow-hint**: 11 of 11 — capstone of the data-transparency explainer.
- **notes**: This is the EMOTIONAL CLOSER of the explainer sequence. After 10 screens of "we collect X, use it like Y, keep it Z long," the final screen says "and the AI never even keeps a copy." "Contractual guarantee from our AI providers, not just a setting we turn on" — that single phrase is the differentiator vs. competitors who use OpenAI's default mode. By landing on ZDR last, Poppy makes the strongest privacy claim the takeaway. The "Zero Data Retention" label leverages enterprise-AI vocabulary (ZDR is an OpenAI/Anthropic enterprise-tier feature) which builds confidence with technically literate users. Capital-letter abbreviation + acronym spell-out is a copywriting move that asserts authority.

---

### Batch 3 — IMG_7641 → IMG_7652 (end of explainer + permissions + widget + channel + contact + cadence)

### IMG_7641.PNG
- **bucket**: ON (sub-flow: data transparency)
- **summary**: Data explainer — Encryption (screen 12 of explainer)
- **state**: Modal sheet, ~12 of 13 dashes filled
- **copy**: Title: "Encryption" / YOUR PERSONAL KEY: "When you create your account, a unique encryption key is generated just for you. Think of it like a personal lock that only fits your data. / This key is protected by an enterprise-grade key management system. Even we can't see it." / ENCRYPTED AT REST: "Your messages, tokens, location history, and other sensitive data are encrypted before they ever reach our database. / If someone broke into our database, all they'd find is scrambled text. Without your key, it's meaningless." / DECRYPTED ONLY WHEN NEEDED (cut off)
- **ui**: Green shield-with-lock icon. Same three-section explainer template, but section labels now read as security-tier names rather than the data-handling triplet seen on data-category screens.
- **flow-hint**: 12 of explainer (so total explainer length is likely 13, not 11 as initially guessed).
- **notes**: Two extraordinary copy moves. (1) "Think of it like a personal lock that only fits your data" — analogy. (2) "If someone broke into our database, all they'd find is scrambled text. Without your key, it's meaningless." — names the adversary scenario plainly. This is the BEST consumer-grade encryption explanation I've seen. The phrase "Even we can't see it" — staff threat model addressed. Pattern: explain security via concrete adversary scenarios, not "industry-standard AES-256."

### IMG_7642.PNG
- **bucket**: ON (sub-flow: data transparency)
- **summary**: Data explainer — "You're in control" (final screen, closer)
- **state**: Modal sheet, last dash filled
- **copy**: Title: "You're in control" / "Disconnect any service from Settings > Permissions to stop syncing that data. / You can request full data deletion by contacting support. We'll wipe everything."
- **ui**: Orange three-slider icon (settings/controls metaphor). Smaller card than usual — only ONE section, no triplet. Just two bullets.
- **flow-hint**: Final screen of explainer. After this, modal X closes and user returns to onboarding flow.
- **notes**: Pattern: end a transparency flow with an EXIT/CONTROL screen. The user can revoke at any time, and full deletion is available via support. "We'll wipe everything" is simple and absolute. Compare to most apps' equivalent which is buried in 4-page legal text. Note the deletion path is "contact support" — not self-serve in-app. Trade-off: friction protects against accidental deletion but adds a step. For CareSupport (HIPAA-adjacent territory), this is the right pattern — irreversibility means a human gate.

### IMG_7643.PNG
- **bucket**: ON
- **summary**: Permissions request screen — Location + Notifications
- **state**: Main onboarding flow, 9:11
- **copy**: "Almost there / Poppy needs these permissions to keep you on track throughout the day." Two cards: "Location / Get location-based suggestions" and "Notifications / Receive timely reminders and updates"
- **ui**: Two permission cards, each with leading colored icon, name, micro-description, and trailing empty circle (=tap to grant). No CTA visible yet — likely appears after both granted.
- **flow-hint**: Comes after the transparency-explainer ended. Now Poppy ASKS for permissions (the transparency flow EARNED the right to ask).
- **notes**: "Almost there" frames remaining onboarding steps as nearly done — sustains momentum. Pattern: TRANSPARENCY → CONSENT. Don't ask for permissions before explaining why. The card UI mimics integration cards from earlier — visual continuity reduces cognitive load. Each card description ties the permission to USER VALUE ("location-based suggestions," "timely reminders"), not to functionality ("Allow Location Access").

### IMG_7644.PNG
- **bucket**: ON
- **summary**: Widget setup — preview of "Coming Up" widget
- **state**: Widget onboarding screen
- **copy**: "Add the Poppy Widget / Add the widget to your home screen. Once added, tap on the widget to finish onboarding." Widget preview: "Coming Up ↗" header + calendar icon + "Meeting at 10 AM with the design team" / paginator dots. CTA: "Do it later"
- **ui**: Widget preview embedded in the screen — looks like the actual rendered widget. Adjacent partial widgets visible to right (other widget styles peek out). Below preview: "Go home and add the widget as shown above" instruction. Orange "Do it later" pill — interestingly NOT "Next" or "Continue." Acknowledges that widget add must happen OUTSIDE the app.
- **flow-hint**: Permissions granted, now adding home-screen surface.
- **notes**: "Once added, tap on the widget to finish onboarding" — the widget itself is the next interaction point. This means the WIDGET KNOWS it's in an onboarding state and completes the flow when tapped. Sophisticated multi-surface state coordination. The "Do it later" CTA respects that widget setup is an iOS-system-level action, not in-app — uncoachable, so don't pretend otherwise.

### IMG_7645.PNG
- **bucket**: ON
- **summary**: Widget setup — preview of "Actions" list widget
- **state**: Same screen, swiped to reveal alternate widget style
- **copy**: Same heading. Widget preview shows 3 action items: 📅 "Open backup Google Meet (..." / 🚗 "Get a Lyft to dinner" / 💬 "Waymo to the office"
- **ui**: List-style widget — small leading icons + one-line text + separators between rows.
- **flow-hint**: Same onboarding step; carousel of widget styles.
- **notes**: This widget is a "next actions" feed, not "next events." Notable: same list shows mix of CALENDAR (Google Meet), TRANSPORT (Lyft), and TRANSPORT (Waymo) actions. The agent appears to have BOOKED OR SUGGESTED these — they aren't passive reflections of calendar data, they're proactive task suggestions. This is the agent's "things you can do right now to make your day go well" surface.

### IMG_7646.PNG
- **bucket**: ON
- **summary**: Widget setup — preview of "Quick Actions" 2x2 button widget
- **state**: Same screen, further swiped
- **copy**: Same heading. Widget preview: 2x2 grid of action buttons — "+ Create" (purple) / "🎒 Order" (green) / "↗ Go" (blue) / "🔍 Search" (yellow)
- **ui**: 2x2 color-coded button grid widget. Each button is a distinct verb-tagged shortcut.
- **flow-hint**: Same step.
- **notes**: Quick Actions = invocation shortcuts that probably deep-link into specific agent intents. Verb-tagged matches the proactive-action paradigm — every interaction with Poppy is verb-centric. "Create" / "Order" / "Go" / "Search" are universal intent shortcuts that could match almost any user need. This is essentially a tiny home-screen agent invocation pad, color-coded for memorability. Compare to ChatGPT's home-screen widget which is just "Type a question" — Poppy's is intentful, not blank.

### IMG_7647.PNG
- **bucket**: ON
- **summary**: Channel-selection screen — iMessage vs WhatsApp
- **state**: Onboarding, 9:12
- **copy**: "How would you like to be reached? / Poppy will proactively reach out when something important or urgent comes up." Two cards: "iMessage / Use iMessages for fast, familiar updates" / "WhatsApp / Get updates in WhatsApp conversations"
- **ui**: Two large cards, branded icons in colored squares (blue speech bubble for iMessage, green WhatsApp logo). Both unselected.
- **flow-hint**: After widget setup.
- **notes**: NOTE THE COPY HIERARCHY: "Poppy will PROACTIVELY reach out when something important or urgent comes up." This is the central UX assertion. The agent is OUTBOUND-FIRST, not inbound. iMessage = "fast, familiar" — leverages existing user habits. WhatsApp option = international/global users (not all phones are iMessage-equipped). Notable absences: NO SMS (Poppy doesn't fall back to standard SMS), NO push-only option. This is a deliberate funnel — Poppy refuses to be a notification-only app. If you're using Poppy, you're conversing in a messaging app.

### IMG_7648.PNG
- **bucket**: ON
- **summary**: Channel selection — iMessage chosen, "Next" revealed
- **state**: Same screen, 9:13
- **copy**: Same heading + iMessage card. CTA: "Next"
- **ui**: iMessage card now has orange ring (selected). Solid orange CTA.
- **flow-hint**: User chose iMessage as primary outbound channel.
- **notes**: Captures the moment of channel commitment. Note: only ONE channel selectable (radio, not checkbox). Single conversational surface — no fragmentation.

### IMG_7649.PNG
- **bucket**: ON
- **summary**: iOS-native "New Contact" sheet with Poppy prefilled
- **state**: iOS contact creation modal, 9:13
- **copy**: Title: "New Contact" / Avatar shown (Poppy poppy-flower logo on white) / Edit pill below / First name field: "Poppy" / Last name: empty / Company: "Second Nature Computing"
- **ui**: iOS-system contact-creation UI (not Poppy's own UI — they've handed off to iOS). Standard X close (left), blue checkmark save (right). iOS keyboard active. Avatar shows Poppy's flower logo at large size.
- **flow-hint**: After channel selection — Poppy directs user to ADD POPPY AS A CONTACT in iOS Contacts.
- **notes**: Major UX move: instead of asking permission to write to contacts, Poppy hands the user the iOS sheet pre-filled and lets them tap save. Works around iOS contact-write permissions which most apps don't get. The contact's COMPANY is "Second Nature Computing" — that's Poppy's parent entity. Logo-as-avatar — clever — makes the agent visually identifiable in every Messages thread. CareSupport implication: if we want the agent to feel like "a person" in Messages, we need an avatar that survives at thumbnail size.

### IMG_7650.PNG
- **bucket**: ON
- **summary**: iOS contact sheet scrolled — TWO phone numbers visible (split lines)
- **state**: iOS contact creation modal, 9:13
- **copy**: Two phone rows: "phone: +1 (510) 947-6779" and "messages: +1 (313) 263-8263" (each with red delete handle = removable). Below: "add phone," "add email," "add pronouns" plus rows. "Ringtone: Default."
- **ui**: Standard iOS contact form with two pre-populated phone slots, labeled differently — one labeled "phone" (Bay Area area code) and one labeled "messages" (Detroit area code).
- **flow-hint**: Same iOS contact sheet, scrolled to reveal numbers.
- **notes**: **SECOND MAJOR DISCOVERY** — Poppy operates on a **two-number architecture**. One number receives voice calls, a separate number receives iMessage/SMS. This is the standard pattern when you need a high-deliverability messaging gateway (like Linq for CareSupport, or Twilio's two-number setup for voice+SMS). The two area codes are: (510) Oakland CA for voice, (313) Detroit MI for messages. Likely two different telephony providers. Implication for CareSupport: separating voice and message routes is a known telephony pattern; Poppy committed to BOTH channels from day one. Voice-call channel exists (referenced in 7633 "During calls with Poppy"); we should look for voice-related screenshots later.

### IMG_7651.PNG
- **bucket**: ON
- **summary**: Cadence preferences — "Your day with Poppy" with Quiet/Balanced/Active tabs (Balanced selected)
- **state**: Onboarding, 9:14
- **copy**: "Your day with Poppy / A message is on its way! Meanwhile, customize how Poppy fits into your day." Tab segments: "Quiet | Balanced | Active." Card 1: "Morning / Daily briefing & priorities / Send my briefings at 8:30 AM" (toggle ON). Card 2: "As things come up / Real-time suggestions & alerts / Poppy reaches out — 2 times a day" (with — and + steppers). CTA: "Finish up!"
- **ui**: Segmented control tabs at top — three intensity presets. Below: two toggle/stepper cards. Time input ("8:30 AM") is tappable to change. Stepper for proactive-message count.
- **flow-hint**: After contact added. "A message is on its way!" — Poppy has ALREADY sent the first iMessage, in parallel with the user finishing onboarding. Beautiful overlapping UX.
- **notes**: THREE-PRESET CADENCE selector. "Quiet | Balanced | Active" — each preset bundles multiple settings. Then individual settings are exposed below for fine-tuning. This is "presets + escape hatch" pattern at its best. The phrase "A message is on its way!" creates anticipation while the user customizes — making the customization feel like prepping for a known event. CTA "Finish up!" with exclamation mark — playful, light. Borrow this dual-loop pattern for CareSupport: "Quiet | Balanced | Active" maps cleanly to caregiver intensity preferences. Active = full daily check-ins, Balanced = critical-only, Quiet = emergencies only.

### IMG_7652.PNG
- **bucket**: ON
- **summary**: Cadence preferences — "Quiet" preset selected; reveals what changes
- **state**: Same screen, 9:14
- **copy**: Same heading. Quiet tab now orange/selected. Card 1 (Morning) DISAPPEARED. Card 2 still present: "As things come up / Real-time suggestions & alerts / Poppy reaches out — 1 times a day"
- **ui**: When Quiet is selected: Morning briefing is REMOVED entirely (not just toggled off — visually disappears). "As things come up" stepper reduces from 2 to 1 per day. Card layout collapses.
- **flow-hint**: User tapping different presets to see the effect.
- **notes**: This is a strong UX move — presets aren't just "set values," they change the AVAILABLE OPTIONS. Quiet doesn't even show "Morning briefing" as a toggleable item because Quiet definitionally excludes it. Active probably shows more cards (will need to verify). The reduce of "2 times a day" → "1 times a day" demonstrates Quiet's restraint. Note minor copy bug: "1 times a day" should be "1 time a day" — they're using a single stepper template that doesn't pluralize. Surface-level QA debt visible.

---

### Batch 4 — IMG_7653 → IMG_7664 (Active preset confirmation + paywall + post-payment home + settings)

### IMG_7653.PNG
- **bucket**: ON
- **summary**: Cadence preferences — "Active" preset selected, adds Evening card
- **state**: Same cadence screen, 9:14
- **copy**: "Active" tab selected. Card 1: "Morning / Daily briefing & priorities / Send my briefings at 8:30 AM" (ON). Card 2: "As things come up / Real-time suggestions & alerts / Poppy reaches out — 3 times a day." Card 3: "Evening 🌙 / Day recap & tomorrow prep / Poppy reaches out — 3 times a week" (ON).
- **ui**: Three cards now visible; Evening card added with moon icon. Two daily cadence + one weekly cadence.
- **flow-hint**: Continuation of 7651-7652 — user testing presets.
- **notes**: Three-preset model fully revealed. Active adds an Evening BRIEFING with WEEKLY cadence (3x/week, not daily) — distinguishing between hourly/daily/weekly rhythms is design-aware about what's overload. Active still doesn't blast — 3 morning + 3 ad-hoc + 3 weekly evenings. They've thought about agent voice rhythm. Pattern: a "ceremonial briefing" (morning, weekly evening) vs. "interruptive" (as things come up) — two distinct cadence types per preset.

### IMG_7654.PNG
- **bucket**: ON (paywall)
- **summary**: Paywall — Sprout tier (mid-tier), monthly with 1-week trial selected
- **state**: Paywall screen, 9:15
- **copy**: "Grow with Sprout / Poppy with room to actually keep up with your life." Tabs: Sprout (selected) | Bloom. Plan options: "Monthly / 1-week free trial / $8.99/month" (selected) / "Annual / $6.67/mo / $79.99/year / Save 26%" (with green badge). Table starts: "What you unlock — Free | Sprout | Bloom — FEATURES — Email accounts: 1 | 2 | ∞ — Push-to-talk / day: 3 | 10 | ∞". CTA: "Start Free Trial." Below: "Not now." Footer: "Restore Purchases / Privacy / Terms"
- **ui**: Two-tier segmented control (Sprout/Bloom). Plan radio cards (Monthly/Annual). Three-column feature comparison table inside a card. Solid orange CTA. "Not now" plaintext escape under CTA.
- **flow-hint**: After "Finish up!" on cadence prefs, user lands on paywall.
- **notes**: NAMING — Sprout (mid) / Bloom (premium) — botanical progression matching the poppy logo. Smart naming: avoids generic Plus/Pro labels. Tab structure means user can compare two TIERS before paying — typically paywalls show only one. Trial structure: Monthly = 1-week trial, Annual = 1-month trial (revealed in next screenshot). The "1-week free trial" badge is highlighted in orange to lower commitment friction. This paywall arrives RIGHT AFTER 13+ screens of onboarding (after value already built), not as an interrupt — well-placed gate.

### IMG_7655.PNG
- **bucket**: ON (paywall)
- **summary**: Paywall — Bloom tier selected, Annual ($149.99/year) with 1-month trial
- **state**: Paywall screen, 9:15
- **copy**: Title swap: "Go All-In with Bloom / The full Poppy. No caps. Everything unlocked." Bloom tab selected. Plan options: "Monthly / $15.99/month" / "Annual / 1-month free trial / $149.99/year / Save 22%" (selected). Same comparison table starts.
- **ui**: Bloom tab now orange. Title and subtitle CHANGE per tier — Sprout's pitch was "with room to actually keep up with your life," Bloom's is "The full Poppy. No caps. Everything unlocked." Plan card layout same — Annual still pre-selected when on Bloom tab.
- **flow-hint**: User tapped Bloom tab to compare.
- **notes**: Bloom annual price $149.99 = $12.50/mo, vs Bloom monthly $15.99 — modest annual discount (22%). Sprout annual was 26% off — more aggressive. Suggests they want to push users into Sprout-Annual as the sweet-spot conversion. The "The full Poppy. No caps." copy is aspirational — appeals to power-users who don't want to feel limited.

### IMG_7656.PNG
- **bucket**: ON (paywall)
- **summary**: Paywall — feature table scrolled, MIDDLE rows
- **state**: Paywall screen, 9:15, scrolled to feature comparison
- **copy**: Comparison table rows visible:
  - Email accounts: Free 1 | Sprout 2 | Bloom ∞
  - Push-to-talk / day: Free 3 | Sprout 10 | Bloom ∞
  - Memory facts: Free 10 | Sprout 100 | Bloom ∞
  - Refresh frequency: Free Hourly | Sprout 30 min | Bloom 30 min
  - Magic Cue: Free — | Sprout ✓ | Bloom ✓
  - Improved suggestions: Free — | Sprout ✓ | Bloom ✓
  TEXTING POPPY section starts: Daily messages: Free 10 | Sprout ∞ | Bloom ∞
- **ui**: Same table card, scrolled. Section headers in dim grey (FEATURES / TEXTING POPPY). Numeric values in white; ∞ glyph for "unlimited." Sprout-tier values highlighted in orange. Free uses em-dash for "not included."
- **flow-hint**: User scrolled the comparison.
- **notes**: KEY GATES REVEALED:
  - **Memory facts (10 / 100 / ∞)**: Poppy has a structured MEMORY system measured in "facts" — discrete unit of agent-remembered information. Free is severely capped (10).
  - **Refresh frequency (Hourly / 30 min / 30 min)**: Background sync cadence is itself a paid feature.
  - **Magic Cue**: A specific feature gated for paid. Need to figure out what Magic Cue is (mentioned in settings too).
  - **TEXTING POPPY section means iMessage usage IS the product** — they treat texting Poppy as a distinct feature with its own caps. Free user gets only 10 messages PER DAY. This is the most consequential gate — they treat the conversational surface as the metered resource.
  Pattern note: tiering by RESOURCE units (messages, facts, accounts) rather than features. Free isn't crippled by lockout — it's throttled by quantity, which is more humane.

### IMG_7657.PNG
- **bucket**: ON (paywall)
- **summary**: Paywall — feature table scrolled to BOTTOM, full TEXTING POPPY section
- **state**: Same paywall, scrolled further
- **copy**: Lower table rows:
  - Push-to-talk / day: 3 | 10 | ∞
  - Memory facts: 10 | 100 | ∞
  - Refresh frequency: Hourly | 30 min | 30 min
  - Magic Cue: — | ✓ | ✓
  - Improved suggestions: — | ✓ | ✓
  TEXTING POPPY section:
  - Daily messages: 10 | ∞ | ∞
  - Audio & file uploads: — | ✓ | ✓
  - Video uploads: — | — | ✓
- **ui**: Same table; final visible rows.
- **flow-hint**: Bottom of comparison.
- **notes**: TEXTING POPPY has three sub-features: daily messages, audio/file uploads, VIDEO uploads. Video is BLOOM-ONLY — that's the single feature only Bloom unlocks. Sprout = ∞ messages + audio/file (most of what users need). Bloom adds video. Smart tier-segmentation. This implies the iMessage agent accepts attachments (audio, file, even video) — capabilities most "chat with AI" products don't expose. Video uploads suggest the agent does video understanding too. CareSupport implication: attachments (photos of pill bottles, videos of how someone's moving, audio voice notes) are a critical capability for care coordination — Poppy's tier structure validates this is a paid-feature class.

### IMG_7658.PNG
- **bucket**: ON (paywall)
- **summary**: Paywall — Bloom Annual selected, "Loading..." (user purchased)
- **state**: Same paywall, 9:16, CTA in loading state
- **copy**: "Go All-In with Bloom / The full Poppy. No caps. Everything unlocked." Bloom tab. Annual selected. CTA now reads "Loading..." with spinner.
- **ui**: CTA pill now muted grey with spinner.
- **flow-hint**: User tapped Start Free Trial — payment in flight.
- **notes**: User picked BLOOM ANNUAL (the highest tier). One-month free trial. $149.99/year. Liban went all-in on Day 0 — high signal of product-market fit confidence. Worth noting in synthesis.

### IMG_7659.PNG
- **bucket**: ON
- **summary**: Post-payment loading screen — "Everything is getting ready for you"
- **state**: Post-payment hand-off screen, 9:16
- **copy**: "Everything is getting ready for you / It can take up to 5 minutes for us to summarize your information and provide helpful information and suggestions. As you continue to use Poppy, it will get smarter and more personalized."
- **ui**: Plain text on black with poppy illustration at bottom. No spinner, no progress bar. Just patience-language.
- **flow-hint**: After payment confirmed, while initial-state generation happens server-side.
- **notes**: They explicitly set a "5 minute" expectation — naming the wait window prevents abandonment. "Summarize your information" implies an INITIAL BATCH JOB after payment — likely they're processing the connected accounts' first-time data dump (emails, calendar, contacts) into a memory state. The phrase "it will get smarter and more personalized" sets expectations that the agent's value compounds — first-day Poppy isn't peak Poppy.

### IMG_7660.PNG ⭐
- **bucket**: HM
- **summary**: HOME screen — first post-onboarding home; suggestions feed view
- **state**: Main home tab, 9:16
- **copy**: "It's a bit late, Liban" (greeting) / Avatar (L) top right with red notification dot. Status pills row: "📍 2801 Girard Ave S" / "🌧 59°F · Layers ne..." / "📅 May 11th" / "📬 Inbox clear." Section heading: "Suggested For You." Card: "📌 Late night at Little Tijuana" (with map pin icon, blue dot in top-right = new/unread).
- **ui**: Time-aware greeting at top. Four-pill horizontal status bar capturing: location, weather (with item-specific note "Layers ne..."), date, inbox state. Below: vertical scrolling feed of suggestion cards. Single card visible with thumbnail. Pagination dots at bottom (orange highlighted) indicate horizontal swipe between home variants.
- **flow-hint**: Loaded after 7659 — first full home view.
- **notes**: This is the SUGGESTIONS-HEAVY home variant. Several brilliant design choices:
  - **"It's a bit late, Liban"** — the agent NOTICES it's evening and adjusts opening line. Time-of-day-aware greetings.
  - **Status pills as ambient state**: Location, weather, date, inbox state. The weather pill includes a RECOMMENDATION ("Layers ne...[eded]") — the pill itself is opinionated. Same with "Inbox clear" — that's a STATE statement, not just metadata. This is the agent CARRYING ITS OPINION onto the status bar.
  - **"Suggested For You"** is the primary content slot — the home isn't a dashboard of widgets, it's an opinionated feed of proactive suggestions.
  - **"Late night at Little Tijuana"** — agent's suggestion is contextual ("it's late"), local-aware (Little Tijuana is a Minneapolis bar), and casual in voice.
  - **Pagination dots at bottom** indicate this home has SWIPEABLE PANES — multiple home variants stacked horizontally (next image shows this).

### IMG_7661.PNG
- **bucket**: HM
- **summary**: Home screen — Shortcuts pane (swiped right from Suggested For You)
- **state**: Same home, 9:17, swiped to Shortcuts variant
- **copy**: Same greeting + status pills. Section heading: "Shortcuts." 2x2 grid: "+ Create" (purple) / "🎒 Order" (green) / "↗ Go" (blue) / "🔍 Search" (yellow). Floating orange MIC icon bottom-right.
- **ui**: Same top section (greeting + pills). Replaces "Suggested For You" with "Shortcuts" 2x2 button grid. Floating orange microphone button bottom-right = voice activation / Push-to-Talk.
- **flow-hint**: Swiped from 7660. Second pane in horizontal swipe.
- **notes**:
  - Floating MIC = the Push-to-talk feature from the paywall. The agent has a primary VOICE input modality.
  - The same Shortcuts buttons appear in onboarding (7646) and in the home — design consistency between widget and main app.
  - **Two-pane home**: Pane 1 = Suggestions feed (opinionated). Pane 2 = Shortcuts grid (user-initiated). The home has two modes: agent-driven (suggestions) and user-driven (shortcuts). The pagination dots at bottom let user toggle between agent-mode and user-mode.
  - "Create" / "Order" / "Go" / "Search" are conversational INTENT seeds — tapping them likely opens the agent thread with that intent pre-armed.

### IMG_7662.PNG ⭐
- **bucket**: ST
- **summary**: Settings screen — top sections (profile, plan, settings, support)
- **state**: Settings sheet, 9:17
- **copy**: Profile card: "Liban / User since May 2026 / +1 (651) 703-7981" (with pencil edit). Plan card: "Poppy Bloom / See what you've unlocked." Settings section: "Connected Apps" (red dot), "Nudges," "Memories," "Magic Cue," "Add Poppy to your contacts." Support section starts: "Feedback," "Data Retention."
- **ui**: X close top-left (modal). Profile card with avatar (L initial), name, "User since [date]," phone, edit icon. Plan card with star/poppy icon. List sections grouped under "Settings" and "Support" labels. List rows with icon + label + chevron. Red dot on Connected Apps = attention needed.
- **flow-hint**: Tapped settings/avatar from home.
- **notes**:
  - **Settings architecture revealed**:
    - Profile (name/phone, plus the social signal "User since May 2026" — gamifies tenure)
    - Plan promotion card (showcases Bloom benefits even though user already paid — reinforcement)
    - Connected Apps — integrations management (red dot = something needs attention, likely a disconnection or token re-auth)
    - Nudges — likely the notification cadence prefs (Quiet/Balanced/Active)
    - Memories — the "memory facts" system from paywall lives here as a user-visible surface. Users can SEE what Poppy remembers about them.
    - Magic Cue — first-class paid feature gets its own settings entry
    - Add Poppy to your contacts — quick-link to re-add contact (in case user dismissed during onboarding)
  - **Note**: Nudges + Memories + Magic Cue are not "configuration" — they're FEATURES surfaced in settings. Settings ≠ inert preferences; it's a feature exploration surface.

### IMG_7663.PNG
- **bucket**: ST
- **summary**: Settings screen — scrolled to bottom (Support, Sign Out, footer)
- **state**: Same settings, 9:17, scrolled
- **copy**: Top visible: "Magic Cue," "Add Poppy to your contacts." Support: "Feedback," "Data Retention," "Privacy Policy," "Terms of Service," "Experimental Features." Then: red-outlined "Sign Out" button. Footer: orange poppy flower glyph + "Poppy" / "Built by Second Nature Computing in SF and NYC / Version 0.71 (456)" / social icons (X, Instagram, headphones?).
- **ui**: Continued list. "Sign Out" is destructive-styled (red outline pill). Footer is centered: brand glyph, name, byline, version, social. Three small social-icon glyphs.
- **flow-hint**: Settings scrolled.
- **notes**:
  - **Company**: Second Nature Computing, SF + NYC.
  - **Version**: 0.71 (456). MAJOR — version sub-1.0, build 456. This is BETA software running this well. Either they've been internal-testing for many builds or they ship aggressively.
  - "Experimental Features" as a first-class menu item — they're publicly exposing beta features to users (next screenshot).
  - Three social icons — the third icon is unclear (looks like a headset/podcast — could be Threads, Discord, or a podcast app). Will check when buckets are filed.
  - Sign Out is destructively styled — not a casual action. Pattern: distinguish destructive auth actions from regular settings items.

### IMG_7664.PNG ⭐
- **bucket**: ST
- **summary**: Experimental Features — two beta surfaces
- **state**: Experimental sub-screen, 9:17
- **copy**: "Experimental / Try new features that are still in development. These may change or be removed." Card 1: "📋 Lock Screen Briefing / Display your daily briefing on your Lock Screen." Card 2: "🎙 Voice Notifications / Hear Poppy read notifications aloud when you're at home."
- **ui**: Back chevron. Heading + disclaimer. Two large cards, each with icon, name, description, and chevron (each is enterable for setup).
- **flow-hint**: User tapped Experimental Features in 7663.
- **notes**:
  - **Lock Screen Briefing** — iOS Lock Screen widget for daily briefing. Extends Poppy onto the most-glanced surface on the device.
  - **Voice Notifications** — when device is at HOME (presumably HomeKit + location signal), Poppy reads notifications aloud. This is HomePod/CarPlay-adjacent ambition.
  - The "may change or be removed" disclaimer reads as confident — they're not hiding experimentation, they're publishing it. Builds power-user loyalty.
  - These two features are Apple's deepest surfaces (Lock Screen + audio output). Poppy is treating iOS as a SURFACE GRAPH to colonize — every place a user might look or listen, Poppy shows up. CareSupport implication: think of iOS not as "where the app lives" but as a graph of surfaces (Messages, widget, lock screen, audio, complications). The agent should appear where the caregiver naturally looks.

---

### Batch 5 — IMG_7665 → IMG_7676 (Lock Screen Briefing setup, Voice Notifications, Feedback, Magic Cue)

### IMG_7665.PNG
- **bucket**: ST (experimental)
- **summary**: Lock Screen Briefing setup — Dark mode customization
- **state**: Sub-screen of Experimental Features, 9:17
- **copy**: Title: "Lock Screen Briefing." Preview shows phone Lock Screen: "Monday, May 11 / 9:17 / No information yet. Check back soon!" Theme toggle: Light | Dark (Dark selected). Section: "Customize Dark Mode" with: Background Type (Color | Image), Background Color (color picker dot with rainbow ring), Presets (6 dark-blue/black swatches, first checked). Bottom CTA: "Install Lock Screen Shortcut."
- **ui**: Phone-shaped preview at top showing literal lock screen render. Two-pill light/dark toggle. Form sections with leading labels and trailing controls (segmented, color, swatch row). Orange CTA at bottom.
- **flow-hint**: Tapped "Lock Screen Briefing" from Experimental Features (7664).
- **notes**: WYSIWYG preview is rare in feature configuration UIs — typically users have to install and toggle to see. Color swatches let users theme the briefing to match their existing wallpaper. The bottom CTA gives away that this is NOT a native iOS feature — it requires a SHORTCUT INSTALL. Genius framing: experimental feature setup IS the shortcut install.

### IMG_7666.PNG
- **bucket**: ST (experimental)
- **summary**: Lock Screen Briefing setup — Light mode customization (variant of 7665)
- **state**: Same screen, Light mode selected
- **copy**: Same screen. "Light" pill orange. Preview now shows light-themed lock screen (white background). "Customize Light Mode." Presets: 6 white/cream swatches.
- **ui**: Same as 7665 but theme toggled.
- **flow-hint**: User tapped Light to compare.
- **notes**: Six presets per theme — they let users pick from curated palettes rather than mandate brand color. Recognition of personalization needs.

### IMG_7667.PNG ⭐
- **bucket**: ST (experimental)
- **summary**: Lock Screen Briefing — Setup Instructions (4 numbered steps)
- **state**: Same screen, 9:18, scrolled past preview
- **copy**: Section: "Install Shortcut" with CTA "Install Lock Screen Shortcut." "This shortcut automatically updates your lock screen with your daily briefing." Section: "Setup Instructions":
  1. **Create a Recurring Alarm** — "In the Clock app, set a recurring alarm that repeats every day with the label 'Update Lock Screen'"
  2. **Enable Permissions** — "In Settings → Apps → Shortcuts → Advanced, turn on 'Allow Deleting Without Confirmation'"
  3. **Configure Wallpaper** — "In the Shortcut, scroll to 'Set Wallpaper to', tap Wallpaper, and select your current Photos wallpaper"
  4. **Create Automation** — "In Shortcuts → Automation, create: Alarm → Goes Off → Any → Run Immediately. Turn off 'Notify When Run', then select the shortcut"
- **ui**: Orange CTA pill with download icon. Numbered orange circles + bold step titles + plain-text instructions. Step links/buttons (chevron-arrow) tap out to relevant iOS settings.
- **flow-hint**: Same screen scrolled. User must do FOUR iOS-system-level configuration steps to enable this experimental feature.
- **notes**: **THIS IS THE BIG HACK.** Apple does NOT allow third-party apps to render content on the Lock Screen beyond widgets. Poppy worked around it by hijacking the wallpaper update chain via Shortcuts + Alarms automation. The mechanism:
  - User sets a recurring alarm "Update Lock Screen" in Clock app.
  - User creates a Shortcut Automation: "When alarm goes off, run Poppy's shortcut."
  - Poppy's shortcut: fetches a freshly rendered briefing as an IMAGE, then SETS THE LOCK SCREEN WALLPAPER to that image.
  - Cycle repeats every alarm fire.
  - This means: the Lock Screen "briefing" is actually a dynamically-generated wallpaper image. Brilliant repurposing of Apple's wallpaper API.
  - This level of system-glue engineering signals: Poppy's team has a sophisticated grasp of iOS's automation surface and uses it as a distribution channel.
  - Required user steps are FOUR settings dives — high friction, but the friction is OK because this is an "experimental" power-user feature. Pattern: gate-in power features behind setup friction so they self-select for committed users.
  - The setup also requires "Allow Deleting Without Confirmation" which means the shortcut DELETES the old alarm and CREATES a new one each run — self-perpetuating alarm. Genius loop construction.

### IMG_7668.PNG
- **bucket**: ST (experimental)
- **summary**: iOS Shortcuts app — "Poppy On Your Lock Screen" shortcut share page
- **state**: Apple's Shortcuts app (deep-linked from Poppy), 9:18
- **copy**: Heading: "Poppy On Your Lock Screen." Meta: "Shared January 9, 2026." Tile: "Poppy On Your Lock Screen" (orange). About This Shortcut: "Say 'Siri, Poppy On Your Lock Screen' to run." "Appears on Apple Watch." Blue CTA: "Add Shortcut."
- **ui**: Apple's standard Shortcuts share-sheet. X close. Share icon top-right.
- **flow-hint**: User tapped "Install Lock Screen Shortcut" → deep link → opens iOS Shortcuts app on the shared shortcut.
- **notes**: "Shared January 9, 2026" tells us when Poppy first shipped the shortcut publicly — useful timeline data. They use the iOS Shortcut-sharing API as a deployment vector for novel functionality. The Siri trigger phrase IS the shortcut name — easy verbal invocation. "Appears on Apple Watch" — extends to wearable.

### IMG_7669.PNG ⭐
- **bucket**: ST (experimental)
- **summary**: iOS Shortcuts app — actions inside Poppy's Lock Screen shortcut (top)
- **state**: Shortcuts editor view, 9:18
- **copy**: Title: "Poppy On Your Lock Screen." Action ladder (visible):
  - "Find Alarms where Label is Update Lock Screen" (Sort: None, Limit: off)
  - "If Alarms has any value"
  - "Delete Alarms"
  - "Add 30 minutes to Current Date"
  - "Create an Alarm for Adjusted Date called Update Lock Screen"
  - "Fetch Briefing as Image" ← Poppy's CUSTOM SHORTCUT ACTION
- **ui**: Apple's Shortcuts builder. Each action is a card. Right-side blue confirm checkmark. Connector lines between actions.
- **flow-hint**: User tapped through to view shortcut innards.
- **notes**:
  - **"Fetch Briefing as Image"** is Poppy's CUSTOM Shortcut action — they exposed an app-intent that renders a server-side image of the current briefing on demand.
  - This means Poppy ships at least one **App Intent** registered with iOS Shortcuts that returns image content. That's modern iOS architecture (Swift's `AppIntent` protocol).
  - The shortcut self-perpetuates: delete the alarm → schedule a new one 30 minutes ahead → render briefing image → set as wallpaper. Loop runs forever.

### IMG_7670.PNG
- **bucket**: ST (experimental)
- **summary**: iOS Shortcuts — actions inside Lock Screen shortcut (bottom half)
- **state**: Same shortcut, scrolled down
- **copy**: Continued action ladder:
  - "Delete Alarms"
  - "Add 30 minutes to Current Date"
  - "Create an Alarm for Adjusted Date called Update Lock Screen"
  - "Fetch Briefing as Image"
  - "Set Wallpaper to Fetch Briefing as Image for Lock Screen"
  - "Otherwise" (else branch of the If)
  - "End If"
- **ui**: Continued ladder. The "Set Wallpaper" action is Apple's native — Poppy chains their custom Fetch action into Apple's wallpaper-setting action.
- **flow-hint**: Continued from 7669.
- **notes**: Confirms the full mechanism. The "Otherwise / End If" branch suggests there's an else case for when no alarm exists (the FIRST run creates one). Engineering quality is high — they handle the bootstrap case.

### IMG_7671.PNG
- **bucket**: ST (experimental)
- **summary**: Voice Notifications setup — single toggle, location-gated
- **state**: Voice Notifications screen, 9:18
- **copy**: "Voice Notifications / Hear Poppy speak / When enabled, notifications will include Poppy's voice reading the content aloud." Toggle: "Enable Voice Notifications" (OFF). Footer: "Voice notifications will only play when you're at home."
- **ui**: Speaker/voice waveform icon. Card with description, then a single toggle row. Italic footer note.
- **flow-hint**: Tapped "Voice Notifications" from Experimental.
- **notes**:
  - **"Will only play when you're at home"** = home-aware audio gate. Uses location signal (likely the "Home" Place from 7635) to suppress voice notifications in public/work contexts. Beautiful guardrail.
  - Single toggle = low setup friction (vs. the 4-step Lock Screen hack). This feature is closer to "ready for everyone."
  - Pattern: every "audio output" feature must be context-gated. Listening at home is fine; listening at work is intrusive.
  - CareSupport implication: voice readouts for "Helper Mei just arrived at Mom's" could be a powerful zero-look surface — but ONLY when the caregiver is in a safe context.

### IMG_7672.PNG
- **bucket**: ST
- **summary**: Settings — Feedback inline expandable form
- **state**: Settings scrolled, 9:19, Feedback expanded inline
- **copy**: Visible above: "Memories / Magic Cue / Add Poppy to your contacts." Support section. "Feedback" card now EXPANDED to show: "Share your thoughts..." text field with upload icon (image attach) and send icon (arrow up). iOS keyboard active.
- **ui**: Feedback expands inline (X close button replaces chevron). Text field with two icon affordances: image upload, send. Keyboard up.
- **flow-hint**: User tapped Feedback to open.
- **notes**: **PATTERN**: Inline expansion vs. nav-to-new-screen for support actions. Reduces friction for what should be a 5-second task. Pre-populated send button + photo attach makes screenshot-with-feedback the natural path. This is the right design for a support channel — make it almost as easy as messaging a friend.

### IMG_7673.PNG ⭐
- **bucket**: ST (Magic Cue)
- **summary**: Magic Cue — feature explainer (top)
- **state**: Magic Cue settings, 9:19
- **copy**: "Magic Cue / The right app when you need it. Trigger Magic Cue from your Action Button or Control Center and Poppy opens the app that matches your moment." Two illustrations: "Action Button" (showing iPhone with finger pressing the Action Button side-button + orange flash) / "Control Center" (showing Control Center pulled down with orange icon being tapped). Section: "Supported Apps" with 5 app icons (round-square: blue-mosaic, red, mostly-white-airplane-icon, blue-with-airplane, JetBlue red+blue). Section: "How It Works" begins: "Reads your moment / Calendar, location, device state, and more"
- **ui**: Heading + paragraph. Two illustration tiles with subtle drop shadows showing hardware buttons being pressed. Carousel of supported app icons. Numbered explanation section starting.
- **flow-hint**: User tapped Magic Cue from settings.
- **notes**: **MAGIC CUE = CONTEXT-AWARE META-LAUNCHER.** The single most ambitious idea in Poppy. Concept: instead of a chat command or shortcut, you tap your iPhone's Action Button (or Control Center widget), and Poppy LAUNCHES THE RIGHT APP based on your current "moment." Examples to follow.
  - Strategic positioning: Poppy ISN'T trying to replace your apps — it's trying to be the agent that ROUTES you to them at the right moment. "Agent of agents." 
  - This re-frames Poppy from "another app" to "the meta-OS layer that orchestrates your apps." Huge ambition.
  - 5 supported apps shown — likely transit/travel/local-services class (the JetBlue icon, an airplane icon = likely Delta or American Airlines, mosaic = possibly Lyft or Uber). They've integrated with curated partner apps where prediction has high-confidence outcomes.
  - "Reads your moment" → context inputs: Calendar, location, device state. Plus "and more" — the input feature graph is broader.

### IMG_7674.PNG
- **bucket**: ST (Magic Cue)
- **summary**: Magic Cue — same screen (effective duplicate of 7673)
- **state**: Same Magic Cue screen, 9:19
- **copy**: Identical to 7673.
- **ui**: Identical.
- **flow-hint**: Likely a duplicate capture moment.
- **notes**: Duplicate of 7673. Mark for possible exclusion from primary set.

### IMG_7675.PNG
- **bucket**: ST (Magic Cue)
- **summary**: Magic Cue — same screen, micro-different (orange illustration state)
- **state**: Same Magic Cue screen, 9:20
- **copy**: Identical to 7673.
- **ui**: Subtle diff — the Action Button illustration shows the side-button now NEUTRAL (not orange/active). Might just be an animation frame difference.
- **flow-hint**: Duplicate-ish; possibly captures animation.
- **notes**: Near-duplicate of 7673/7674. Probably the illustrations have a subtle "press" animation cycle.

### IMG_7676.PNG ⭐
- **bucket**: ST (Magic Cue)
- **summary**: Magic Cue — scrolled to "How It Works" and "Set It Up" sections
- **state**: Magic Cue scrolled, 9:20
- **copy**: "Supported Apps" row top. "How It Works":
  - "Reads your moment / Calendar, location, device state, and more"
  - "Picks the right app / Maps before a meeting, Music in the air."
  - "One press, you're in / Tap to launch instantly."
  "Set It Up":
  1. "Action Button / Go to Settings → Action Button → Shortcut → Magic Cue."
  2. "Control Center / Pull down Control Center, tap +, search 'Magic Cue,' drop it in."
  CTA: "See My Suggestions"
- **ui**: How It Works = three feature cards. Set It Up = two numbered setup paths. Orange CTA at bottom with a magic-wand icon.
- **flow-hint**: User scrolled to see the full feature explanation + setup.
- **notes**:
  - Killer example copy: **"Maps before a meeting, Music in the air."** Eight words explain the whole product. "Maps before a meeting" = location/calendar prediction. "Music in the air" = flight detection → Apple Music or Spotify becomes the right app. Poppy is predicting your CONTEXT and matching to APPS that match it.
  - "One press, you're in" — friction reduced to zero. No menu, no search, just press.
  - Two SETUP paths reflect iOS's two "universal hardware/system shortcuts": Action Button (Pro/Pro Max physical button) and Control Center (everyone else). They picked the two most-default iOS surfaces. Smart.
  - "See My Suggestions" CTA → presumably shows what Magic Cue WOULD launch right now based on current context. Worth investigating in later batches.
  - Magic Cue is the closest thing Poppy has to a "killer feature" that justifies the iOS app's existence apart from iMessage. The IOS APP'S ROLE is to host context-aware meta-launching that iMessage can't do.

---

### Batch 6 — IMG_7677 → IMG_7688 (Memories architecture + Nudges granularity + Bloom tier reveal)

### IMG_7677.PNG ⭐
- **bucket**: HM (Memories hub — also feature-level)
- **summary**: Memories hub — the structured memory architecture surfaced as a hub screen
- **state**: Memories main screen, 9:20
- **copy**: Title: "Memories" / Search icon top-right. Section: "Your Places" / "See all >" / Pin "📍 2801 Girard Ave S" / mini-Apple-Maps preview / tooltip "Tap to label this location." Section: "Your Preferences" (5 list cards):
  - "💛 Likes / No facts yet"
  - "👎 Dislikes / No facts yet"
  - "🔮 Habits & Routines / No facts yet"
  - "🍴 Food & Diet / No facts yet"
  - "🪪 Personal Info / 10 facts"
  Section: "Your People" / "See all >" / "People you mention to Poppy will appear here"
- **ui**: Hub-style navigation: each row is a category card with leading icon, name, fact-count, chevron. Search icon at top — implies user can SEARCH their memories. Map preview embedded inline (Apple Maps tile rendered inside the app).
- **flow-hint**: User tapped Memories from settings (visible in 7662).
- **notes**: **MEMORY ARCHITECTURE REVEALED.** Poppy's memory system is structured into named CATEGORIES:
  - **Places** (geographic memories with map UI)
  - **Preferences** with 5 sub-categories: Likes / Dislikes / Habits & Routines / Food & Diet / Personal Info
  - **People** (relational memories)
  - Plus the implied **Calls** seen in next screenshot
  Each category has a fact COUNT — quantifies what Poppy "knows" about you. This is a NAMED-CATEGORY memory schema, not a free-form long-context blob. Engineering: likely a typed memory store with category → list-of-facts.
  - The "10 facts" on Personal Info is the same number as the FREE tier memory cap. They've front-loaded the locale defaults to fill the free quota — Free users can't add their own facts until they delete a locale default.
  - **Implication for CareSupport**: a structured memory schema (Members / Schedule / Meds / etc.) matches the same pattern. Worth thinking about what "Your People" looks like for caregivers — likely a Care Network view of every person mentioned and their role.

### IMG_7678.PNG
- **bucket**: HM (Memories — People sub-screen)
- **summary**: "Your People" — empty state with + add affordance
- **state**: People sub-screen, 9:20
- **copy**: Title: "Your People." Empty state: "👥 No people yet / People you mention to Poppy will appear here."
- **ui**: Back chevron + orange "+" add button top right. Standard empty state with people icon and helper copy.
- **flow-hint**: User tapped "Your People" or "See all" from Memories.
- **notes**: People are AUTO-EXTRACTED from mentions ("people you mention to Poppy will appear here") — but the + button means user can ADD a person directly. Two memory-population paths: implicit extraction during conversation + explicit manual addition. CareSupport: the equivalent is Network Members — auto-extracted as caregivers mention them, but coordinators can add directly.

### IMG_7679.PNG
- **bucket**: HM (Memories — Calls sub-screen)
- **summary**: "Your Calls with Poppy" — empty state
- **state**: Calls history sub-screen, 9:20
- **copy**: Title: "Your Calls with Poppy" / Phone icon / "No calls yet / Your calls with Poppy will appear here."
- **ui**: Back chevron only (no + add — calls aren't user-added, they're generated). Phone receiver icon.
- **flow-hint**: User reached this via memories navigation (likely tapped Phone-related Memory entry).
- **notes**: Calls have their own memory surface. Implies call TRANSCRIPTS / summaries are stored and browsable. Major capability — this is "show me what we talked about on the phone yesterday." For CareSupport, equivalent would be conversation summaries by member/relationship.

### IMG_7680.PNG
- **bucket**: HM (Memories — Likes sub-screen, empty state)
- **summary**: "Likes" category — empty state
- **state**: Likes detail, 9:21
- **copy**: Title: "Likes" / Grey heart icon / "No facts yet / Add things Poppy should know about your likes." Orange CTA: "⊕ Add a fact"
- **ui**: Empty-state template — category-specific icon (grey), title, instruction, orange add CTA. + add button also in top-right corner.
- **flow-hint**: Tapped Likes from Memories hub.
- **notes**: **EMPTY-STATE PATTERN**: each Memory category has an identical empty-state structure with category-specific icon. Friction-free fact addition via "Add a fact" CTA OR top-right + button (redundant entry points for the same action).

### IMG_7681.PNG
- **bucket**: HM (Memories — Dislikes)
- **summary**: "Dislikes" category — empty state (mirror of 7680)
- **state**: Dislikes detail, 9:21
- **copy**: Title: "Dislikes" / Thumbs-down icon / "No facts yet / Add things Poppy should know about your dislikes." "⊕ Add a fact"
- **ui**: Same empty-state template.
- **flow-hint**: From Memories hub.
- **notes**: Mirror screen of 7680 — confirms the template pattern. The presence of separate Likes AND Dislikes (rather than one combined "Preferences" list) reflects intentional valence labeling. The agent treats positive and negative preferences asymmetrically — likely uses them differently when generating suggestions (preferring vs avoiding).

### IMG_7682.PNG
- **bucket**: HM (Memories — Habits & Routines)
- **summary**: "Habits & Routines" — empty state
- **state**: Habits detail, 9:21
- **copy**: Title: "Habits & Routines" / Clock icon / "No facts yet / Add things Poppy should know about your habits & routines." "⊕ Add a fact"
- **ui**: Same template.
- **flow-hint**: From hub.
- **notes**: Habits are a SEPARATE category from Preferences — temporal patterns vs. valence preferences. The agent likely uses Habits to predict timing (when you do things) and Likes/Dislikes to predict targets (what you want).

### IMG_7683.PNG
- **bucket**: HM (Memories — Food & Diet)
- **summary**: "Food & Diet" — empty state
- **state**: Food & Diet detail, 9:21
- **copy**: Title: "Food & Diet" / Fork-knife icon / "No facts yet / Add things Poppy should know about your food & diet." "⊕ Add a fact"
- **ui**: Same template.
- **flow-hint**: From hub.
- **notes**: Food gets its OWN category, separate from Likes — suggests food/diet facts have high agent utility (restaurant recs, meal reminders, dietary constraints). For CareSupport: dietary memories about CARE RECIPIENTS (allergies, restrictions, preferences) are critical — this pattern maps directly.

### IMG_7684.PNG ⭐
- **bucket**: HM (Memories — Personal Info, the populated one)
- **summary**: "Personal Info" — 10 facts auto-populated from device locale
- **state**: Personal Info detail, 9:21
- **copy**: Title: "Personal Info." 10 fact cards (each with badge-id icon):
  1. "Week starts on Sunday"
  2. "Primary language is English"
  3. "Uses the imperial measurement system (miles, feet, pounds)"
  4. "Uses US Dollar (USD) as their currency"
  5. "Uses 12-hour (AM/PM) time format"
  6. "Prefers temperatures in Fahrenheit"
  7. "Uses the Gregorian calendar"
  8. "Timezone is America/Chicago (UTC CDT)"
  9. "Prefers date format like 12/31/05"
  10. "Located in United States"
- **ui**: Each fact is a tappable card (presumably editable). Same badge-icon header pattern as fact cards in the agent's outputs (worth verifying).
- **flow-hint**: From hub — this is the only populated category.
- **notes**: **HUGE INSIGHT**: Poppy auto-imports DEVICE LOCALE as their seed memory. The 10 facts = the 10 axes of locale (calendar start, language, units, currency, time format, temperature, calendar system, timezone, date format, country). This is brilliant engineering AND brilliant UX:
  - **Engineering**: zero user effort, 100% accurate
  - **UX**: shows the user immediately that Poppy already knows things — first taste of "Poppy knows me"
  - **Strategic**: locale facts are universal but contextual (used in every output). User sees them and thinks "of course, but also: cool that it cares."
  - The free tier's "10 fact" memory cap is suspicious — exactly matches the locale fact count. So Free tier = locale-only memories. Sprout/Bloom = ability to add personal memories beyond locale.
  - For CareSupport: equivalent seed would be CARE-RECIPIENT facts auto-extracted from network setup (relationship, primary diagnosis, household timezone, etc.) — but require explicit input from coordinator. We don't have OS-level access to "diagnoses" the way Poppy has access to locale.

### IMG_7685.PNG
- **bucket**: HM (Memories — Your Places sub-screen)
- **summary**: "Your Places" — empty state with Home/Work as suggested places
- **state**: Places detail, 9:21
- **copy**: Title: "Your Places." Card 1: "🏠 Add Home / Set your home location for better suggestions" (with orange + button). Card 2: "💼 Add Work / Set your work location for commute insights" (with orange + button). Below: pin icon, "No saved places / Add Home and Work above to get started, or tap + to mark a custom place."
- **ui**: Two preset-suggestion cards at top, then empty-state below. The two suggested places (Home, Work) match the most-common cases.
- **flow-hint**: From hub.
- **notes**: Pre-suggest the TWO highest-value places explicitly. Anything else is user-driven via the + button. Pattern: in any user-facing collection, pre-populate the obvious entries as suggestion-cards so first interaction is one tap, not many.

### IMG_7686.PNG ⭐
- **bucket**: ST (Nudges granular controls)
- **summary**: Nudges — per-event-type delivery channel selector (Push/Text/Call) with PHONE-CALL as a channel
- **state**: Nudges settings, 9:21
- **copy**: Title: "Nudges." Master toggle: "Enable Nudges" (ON).
  - "MESSAGING PLATFORM": iMessage (selected) | WhatsApp
  - "Suggestions" / "How Poppy delivers proactive suggestions" — segmented: Push | Text (selected) | Call
  - "Reminders" / "How Poppy delivers your reminders when they trigger" — Push | Text (selected) | Call
  - "Check-ins" / "How Poppy reaches out for end of day conversations" — Off | Text (selected) | Call
  - "FREQUENCY & LIMITS": "Max 4 notifications per day" with — 4 + stepper
- **ui**: Segmented controls for each event-type with three icon-options (bell for Push, speech-bubble for Text, phone for Call). The "Check-ins" segment includes an "Off" option but Suggestions and Reminders don't — those event types must always have a channel. Stepper for daily limits.
- **flow-hint**: User tapped Nudges from settings.
- **notes**: **PHONE CALL AS A NOTIFICATION CHANNEL.** This is unprecedented in productivity apps. Every event type — Suggestions, Reminders, Check-ins — can be delivered via PUSH, TEXT, or PHONE CALL.
  - Three event types reveal Poppy's PROACTIVE BEHAVIOR TAXONOMY:
    - **Suggestions** = unprompted "you might want to..."
    - **Reminders** = "you asked me to remind you that..."
    - **Check-ins** = "how was your day?" social-cadence touches
  - "Check-ins" has an Off option because checking in is the most personal interaction class — must be opt-out.
  - Pattern: **Each interaction class gets its own channel preference** so users can say "Reminders via Text (don't interrupt me), but Check-ins via Call (talk to me)." This is unusually thoughtful — most apps have one global notification setting.
  - For CareSupport: this maps directly. The equivalent caregiver-facing axes:
    - Med reminders (often must be call/voice — high stakes)
    - Shift coordination (text is fine — async)
    - Daily check-ins (text or scheduled call — personal preference)

### IMG_7687.PNG ⭐
- **bucket**: ST (Nudges granular controls)
- **summary**: Nudges — FREQUENCY & LIMITS, plus Quiet Hours window
- **state**: Nudges scrolled, 9:21
- **copy**: (Repeated top) "Check-ins" segment. Then:
  - "FREQUENCY & LIMITS":
    - "Max 4 notifications per day" (- 4 +) / "Maximum proactive notifications per day"
    - "3 check-ins per week" (- 3 +) / "How often Poppy reaches out to chat about your day"
  - "QUIET HOURS":
    - Toggle "Enable Quiet Hours" (ON)
    - "Mute all notifications and calls during this window"
    - Start: "10:00 PM" / End: "8:00 AM"
- **ui**: Stepper cards. Quiet Hours toggle + start/end time pickers (tap chevrons to change).
- **flow-hint**: Same Nudges screen, scrolled down.
- **notes**:
  - **Two distinct cadence limits**: daily notifications (4) and weekly check-ins (3). They're separated because check-ins are conversational ("chat about your day") not informational.
  - **Quiet Hours** explicitly state "mute all notifications AND CALLS" — explicit mention of calls reinforces the voice-call-as-channel architecture. 10 PM → 8 AM default.
  - For CareSupport: quiet hours map to "Caregiver Sleep Window" — equally important. A med reminder at 3am for a swing-shift caregiver could be life-saving OR catastrophically intrusive depending on context. The window is a per-user setting.

### IMG_7688.PNG ⭐
- **bucket**: ST (Plan details — Bloom unlocks revealed)
- **summary**: "Poppy Bloom" plan detail screen — full Bloom feature list
- **state**: Plan modal sheet, 9:22
- **copy**: X close. Brand crest (orange/red poppy in pink circle). Heading: "Poppy Bloom" with orange "Trial" badge and red "Trial ends Jun 11, 2026" tag. "You're on the top tier. Everything in Poppy is unlocked." Section: "What you've unlocked":
  - ✉ "Unlimited email & calendar accounts" — "Google, Outlook, or iCloud — every inbox you've got."
  - 💬 "Unlimited chat" — "No daily cap. Audio, files, and video uploads."
  - 🪄 "Magic Cue" — "The right app at the right time, before you ask."
  - 📋 "Plan with Poppy" — "Brainstorm and lock in plans with friends in iMessage."
  - 💖 "Unlimited memory & personalized replies" — "No fact caps. iMessages tuned to your full context."
  - ⏰ "Always-on Poppy" — "Phone calls included. Check-ins every 30 min, weeks of context."
  - 🟢 "WhatsApp linking" — "Connect WhatsApp so Poppy can keep up..." (truncated)
- **ui**: Brand crest at top. Trial-status visual indicators. Vertical list of feature cards with colored leading icons + name + one-line value.
- **flow-hint**: Tapped "Poppy Bloom" plan card from settings (7662).
- **notes**: **TWO BIG NEW REVEALS**:
  1. **"Plan with Poppy" — "Brainstorm and lock in plans with friends in iMessage."** This means Poppy can be ADDED TO GROUP iMESSAGE THREADS with the user's friends. The agent participates in the group, helps coordinate plans, "locks in" decisions. This is a multi-party iMessage agent that does group coordination. **THIS IS EXACTLY WHAT CARESUPPORT IS** — but Poppy generalized it from social planning rather than caregiving. Confirms the multi-party iMessage agent paradigm is being built in parallel by another team.
  2. **"Always-on Poppy" — "Phone calls included. Check-ins every 30 min, weeks of context."** Bloom tier gets:
     - Unlimited Poppy phone calls (voice channel)
     - Check-ins every 30 minutes (very high cadence)
     - "Weeks of context" — long memory window
     This is the explicit pricing distinction between Sprout and Bloom — Bloom buys you AVAILABILITY (always-on calls) and LONGER MEMORY.
  - Trial ends date "Jun 11, 2026" = 30 days from May 11 install. Standard month trial.
  - "Personalized replies" — Poppy can DRAFT iMessage replies for the user (likely from the "iMessages tuned to your full context" phrase). The agent acts as a co-writer for the user's own iMessage conversations, not just its own thread.
  - The 7 features map cleanly to the 4 onboarding pillars (Email + Calendar + iMessage + Voice) plus the 3 power-features (Magic Cue + Memory + Plan with Poppy).

---

### Batch 7 — IMG_7689 → IMG_7700 (Bloom features complete, Edit Profile, home Shortcut cascades, calendar permission edge state, suggestion-history pattern, iMessage notification interrupt)

### IMG_7689.PNG
- **bucket**: ST (Plan details — Bloom unlocks continued)
- **summary**: Bloom plan details — scrolled to bottom; reveals last 3 features + Manage Subscription link
- **state**: Plan modal sheet, 9:22
- **copy**: Continuation of feature list:
  - 🟢 "WhatsApp linking" — "Connect WhatsApp so Poppy can keep up with your chats."
  - 🎬 "Video uploads" — "Send video clips Poppy can actually watch."
  - ⭐ "Early access" — "First to try new features as they ship."
  Bottom CTA: "Manage Subscription / Change plan or cancel in App Store ›"
- **ui**: Same vertical card list as 7688, plus a footer button to App Store subscription management.
- **flow-hint**: Same plan modal, scrolled.
- **notes**: TOTAL BLOOM FEATURE LIST (10 items):
  1. Unlimited email & calendar accounts
  2. Unlimited chat (no daily cap; audio/file/video uploads)
  3. Magic Cue
  4. Plan with Poppy
  5. Unlimited memory & personalized replies
  6. Always-on Poppy (phone calls included, check-ins every 30min, weeks of context)
  7. WhatsApp linking
  8. Video uploads
  9. Early access
  - "Video clips Poppy can ACTUALLY watch" — phrasing implies videos are processed (not just stored). Video understanding.
  - "Early access" + "Experimental Features" in settings = a tight beta-distribution loop. Power users opt into beta via paid tier.
  - "Manage Subscription / Change plan or cancel in App Store" — they route cancellation to the iOS subscription manager (Apple's standard pattern). Doesn't bury cancellation, doesn't fake-route to support email — direct App Store link. Trust-building.

### IMG_7690.PNG
- **bucket**: ST (Profile edit)
- **summary**: Settings — Edit Profile popover (Change Name / Number / Library / Photo)
- **state**: Settings with action sheet popover, 9:22
- **copy**: Popover title: "Edit Profile." Four orange options: "Change Name / Change Number / Choose from Library / Take Photo"
- **ui**: iOS-native popover/action-sheet style with rounded gray container, options stacked vertically, all orange text. Popover anchored to the profile card pencil-edit icon (visible blurred behind).
- **flow-hint**: User tapped pencil icon next to "Liban" in settings.
- **notes**: The avatar options are split into LIBRARY vs TAKE PHOTO — standard iOS pattern. "Change Number" being its own first-class option is interesting — phone number IS the identity, so they make it changeable. Most apps make phone-changes a settings tier or a re-verification flow. Poppy treats it as just-another-profile-edit (with re-verification implied behind the scenes).

### IMG_7691.PNG
- **bucket**: HM
- **summary**: Home — Shortcuts pane, no shortcut selected yet (canonical state)
- **state**: Home, Shortcuts pane, 9:22
- **copy**: "It's a bit late, Liban" / Status pills row / "Shortcuts" / four buttons: + Create, 🎒 Order, ↗ Go, 🔍 Search. Mic floating bottom-right.
- **ui**: Same as 7661.
- **flow-hint**: User returned to home from settings.
- **notes**: Sets up the comparison for the next several screenshots — this is the "unselected" baseline. The Shortcuts pane is empty/idle.

### IMG_7692.PNG ⭐
- **bucket**: HM (Shortcut cascade)
- **summary**: Tap Create — Shortcut pill turns PURPLE, reveals "What would you like to create?" cascade
- **state**: Home, Shortcuts pane, 9:22; Create activated
- **copy**: Top: greeting + pills. "Shortcuts." Create pill now FILLED PURPLE. Below: micro-heading "What would you like to create?" with 2x2 cascade: "≡ Reminder | ⏰ Alarm | ⏱ Timer | 📅 Event"
- **ui**: Create button state changes from outlined neutral to solid purple. Below-cascade appears with NEW heading + 2x2 grid of sub-options. Each sub-option has a small leading icon.
- **flow-hint**: User tapped Create.
- **notes**: **CASCADING SHORTCUT MECHANIC**. The Shortcuts aren't deep-links into the agent thread — they're FORM BUILDERS. Each tap selects a path; the UI reveals the next set of options. Selected pills stay highlighted (purple). User constructs the intent incrementally. This is a really clean way to give users many entry points without dumping them into a chat field. Tap-driven discovery for users who don't yet know what to ASK Poppy. Pattern to steal — extremely valuable for less verbose users.

### IMG_7693.PNG ⭐
- **bucket**: HM (Shortcut cascade)
- **summary**: Tap Event — Event pill purple, reveals "When?" sub-cascade
- **state**: Home, Shortcuts, 9:22, Event activated
- **copy**: Create pill purple. Event pill now purple too. Below: "When?" heading. Options: "✨ Tomorrow | 🌃 This weekend | 📌 Pick time"
- **ui**: Stacks of pill selections grow vertically as cascades are made. Each level adds a new mini-heading.
- **flow-hint**: User selected Event from previous cascade.
- **notes**: Vertical cascading FORM. Each pill remains visible after tap so user sees the path they've taken. "Pick time" gives full date/time picker (next screenshot) — combines preset shortcuts (Tomorrow, This weekend) with custom path. Two-mode: shortcuts for casual users, full picker for precision.

### IMG_7694.PNG ⭐
- **bucket**: HM (Shortcut cascade)
- **summary**: Tap Tomorrow — Tomorrow pill purple, reveals event form (Title + When + CTA)
- **state**: Home, Shortcuts, 9:22
- **copy**: Path: Create > Event > Tomorrow (all purple). Below cascade: "Title" → "Event name" text field. "When" → "May 11, 2026 | 9:22 PM" datetime pills. Orange "📅 Create Event" CTA.
- **ui**: Form reveals incrementally as cascades resolve. Date and time pills are tappable. Final orange CTA at bottom.
- **flow-hint**: User tapped Tomorrow.
- **notes**: Now the FULL form is in view — title + date + time + CTA. Each tap surfaced one more step. The whole interaction is roughly five taps from cold home to event-created: Create → Event → Tomorrow → (type title) → Create Event. Very fast for power users.

### IMG_7695.PNG
- **bucket**: HM (Date picker modal)
- **summary**: Full calendar picker (modal) for "Pick time" path
- **state**: Date-picker modal sheet, 9:23
- **copy**: Top: "Cancel | Pick a time | Confirm." Month header "May 2026" with chevrons. Day-of-week labels SUN..SAT. Calendar grid showing days, 11 selected (orange circle). Row: "Time" with picker "9:23 PM"
- **ui**: Standard month-grid calendar + time row. Orange selection accent. Cancel/Confirm at top.
- **flow-hint**: User tapped "Pick time" from 7693 cascade.
- **notes**: Standard iOS-style date picker layout but Poppy's own custom UI (not iOS's native sheet — they wanted control over styling). Time-of-day is exposed as a single picker row, not a full wheel.

### IMG_7696.PNG ⭐
- **bucket**: ES (edge state) / HM
- **summary**: Event creation — Calendar Not Connected error with graceful fallback
- **state**: Event detail screen, 9:24, calendar permission missing
- **copy**: Header (with calendar icon): "Create event: Founders Day / May 16, 2026 at 12:00 AM." Below: empty state with grey calendar icon and "Calendar Not Connected / Calendar access hasn't been granted yet. Enable it to create and manage your events." Orange "Grant Access" CTA. Bottom CTAs row: solid orange "Create Event" / "Remind me instead" / "Not now"
- **ui**: Same screen as the event editor would be, but now showing a permission-fail state with the timeline replaced by an empty-state with "Grant Access." Bottom CTA row offers THREE outs: primary action, fallback action ("Remind me instead"), dismiss ("Not now").
- **flow-hint**: User confirmed an event date but Poppy doesn't have calendar permissions yet — graceful handling.
- **notes**: **EXCEPTIONAL EDGE-STATE PATTERN**. When the agent can't fulfill the primary intent (Calendar write) it doesn't fail — it offers a SEMANTIC FALLBACK:
  - Primary: Create Event (which would fail given permission state)
  - Fallback: "Remind me instead" (uses a different system Poppy DOES have permission for)
  - Escape: "Not now"
  This is the right way to handle permission gaps — don't punish the user with an error dialog; offer the next-best thing they CAN have. For CareSupport: think about every "can't do X" moment — is there a "Y instead" that achieves the user's underlying goal?
  - The event title "Founders Day" was likely auto-extracted from somewhere — calendar import or user mention. Worth noting Poppy can SUGGEST event titles from context.

### IMG_7697.PNG
- **bucket**: HM (event creator with timeline visualization)
- **summary**: Event creator view with timeline visualization for collision detection
- **state**: Event detail screen, 9:24, permission granted (presumably)
- **copy**: Same header. Row: "Date — May 16, 2026 | 12:00 AM." Timeline view: blue block "Founders Day / 12:00 AM - 1:00 AM" anchored at the top; below empty timeline rows 1 AM through 6 AM. Orange "Create Event" CTA + "Remind me instead" / "Not now" buttons.
- **ui**: Timeline shows event POSITIONED ON A HOURLY SCHEDULE. User can see the slot the event will occupy. The fallback CTAs remain even when primary is now possible — gives user choice.
- **flow-hint**: After granting calendar access, the same screen now shows the event-in-context.
- **notes**: Timeline visualization is a beautiful affordance for SCHEDULE CONFLICT CHECK. User sees not just "what" but "where in the day." If there were other events at 12 AM - 1 AM, they'd appear as colored blocks. The pattern: visualize state, don't just describe it. CareSupport implication: schedule view (shift coverage, appointment overlap) benefits hugely from timeline visualizations.

### IMG_7698.PNG ⭐
- **bucket**: HM
- **summary**: Home — Suggested For You feed now shows 2 cards including a COMPLETED action
- **state**: Home, Suggested For You pane, 9:24
- **copy**: Greeting + pills. "Suggested For You" with two cards:
  - "📌 Late night at Little Tijuana" (active, blue dot top right)
  - "📅 Create event: Founders Day" (FADED, checkmark badge top right)
- **ui**: Two cards side by side. The completed card has REDUCED opacity, grey text, and a small white-on-grey checkmark badge replacing the blue dot.
- **flow-hint**: After event was created, the suggestion-action persists in the feed as a "done" item.
- **notes**: **COMPLETED-STATE PATTERN**. Past actions DON'T disappear; they fade and gain a checkmark badge. This serves three functions:
  1. **Confirmation**: user sees their action was completed.
  2. **History**: a lightweight "what I did today" trail.
  3. **Continuity**: the feed isn't a refresh-and-empty list; it's a chronological narrative of agent + user activity.
  CareSupport: post-action retention with visual completion state would be powerful for "I handed off the shift," "I confirmed Mom's appointment," etc. A coordinator scrolling the feed sees what was done today.

### IMG_7699.PNG ⭐
- **bucket**: HM / NT (notification interrupt)
- **summary**: Home — iMessage banner notification interrupts; Search Shortcut also active (yellow) with sub-cascade
- **state**: Home, Shortcuts pane, 9:24, iMessage notification banner sliding in
- **copy**: Top: notification banner "Stockholm Travelers / Brigelle: Hbu? / now" (group iMessage). Below banner: greeting + pills. Shortcuts: Search pill highlighted YELLOW (color-coded to Search). Below: "Where would you like to search?" with options "▶ YouTube | 🌐 Web | 📌 Places"
- **ui**: iOS-system notification banner overlays Poppy. Beneath it, the Search shortcut is in cascade state with three sub-options. Search button is the only yellow Shortcut (color-coded by intent class).
- **flow-hint**: User opened Search cascade; meanwhile an iMessage arrived from group "Stockholm Travelers."
- **notes**: TWO PATTERNS in one screen:
  1. **Search cascade**: like Create, Search has its own sub-options — YouTube / Web / Places. Different from Create (event types) — these are search DESTINATIONS. Color is yellow (vs purple for Create).
  2. **iMessage Interrupt**: shows that Poppy's iOS app DOESN'T capture iMessage notifications — they break through normally. The user's regular iMessage conversations are unobstructed by Poppy presence. This is critical: Poppy doesn't take over the messaging surface, it shares it. The "Stockholm Travelers" group is presumably a real iMessage thread Liban is part of — Brigelle saying "Hbu?" (How about you?).
  - The bottom of the screen at this moment shows the Search submenu — a multi-tasking state visible.

### IMG_7700.PNG
- **bucket**: HM (Shortcut cascade)
- **summary**: Home — Search cascade visible (iMessage banner gone)
- **state**: Home, 9:24, Search activated
- **copy**: Greeting + pills + "Shortcuts" + the Create/Order/Go/Search row (Search yellow) + "Where would you like to search? — YouTube | Web | Places"
- **ui**: Same as 7699 minus the iMessage banner.
- **flow-hint**: Banner dismissed after a few seconds.
- **notes**: This screen reinforces the cascade pattern: tap a Shortcut → it changes color (theme matches the verb) → sub-options appear with their own micro-heading. Sub-options for Search are search DESTINATIONS, not topic-types. Worth noting that "Places" is one of the search destinations — implies Poppy can resolve "find me a [place type]" without a separate Maps integration.

---

### Batch 8 — IMG_7701 → IMG_7712 (Search/Go/Order cascades, Reminder templates, Trigger types, Timer/Alarm presets)

### IMG_7701.PNG
- **bucket**: HM (Shortcut cascade)
- **summary**: Search > Web — final query field with orange CTA
- **state**: Home, Shortcuts, 9:24
- **copy**: Path: Search > Web (both yellow). "Search" text field "Search the web..." Orange "🔍 Search Web" CTA.
- **ui**: Text input pill appears at terminal end of cascade. Orange action CTA.
- **flow-hint**: User selected Web from Search cascade.
- **notes**: Terminal end of cascade = INPUT FIELD + ACTION CTA. Pattern: every cascade resolves into one of: free-form input + action OR direct action. Web search needs a query input. The "Search Web" copy is descriptive (vs generic "Search") — tells user exactly what will happen on tap.

### IMG_7702.PNG
- **bucket**: HM (Shortcut cascade)
- **summary**: Go shortcut activated — blue, "Where would you like to go?" with single "Other" option
- **state**: Home, Shortcuts, 9:25, Go activated
- **copy**: Go pill BLUE (color theme). "Where would you like to go?" with one option: "↗ Other"
- **ui**: Go pill blue. Single sub-option "Other" — surprising; possibly other destinations (Home, Work) would auto-populate if user had saved them. From 7685 we know "No saved places."
- **flow-hint**: User tapped Go.
- **notes**: **GO IS BLUE.** Confirms verb-color taxonomy: Create=purple, Search=yellow, Go=blue. Only "Other" appears because no places are saved. If Home/Work were configured, they'd appear as preset destinations. The home pre-population from saved places makes the Go shortcut a one-tap action — "Go home" without typing.

### IMG_7703.PNG
- **bucket**: HM (Shortcut cascade)
- **summary**: Go > Other — destination text input
- **state**: Home, Shortcuts, 9:25
- **copy**: Path: Go > Other (both blue). "Destination" with text field "Enter address or place name."
- **ui**: Text input field. (No visible CTA yet — likely activates after typing.)
- **flow-hint**: User picked Other.
- **notes**: Free-form destination. Maps-class input field.

### IMG_7704.PNG
- **bucket**: HM (Shortcut cascade)
- **summary**: Create cascade reactivated (variant)
- **state**: Home, Shortcuts, 9:25, Create active again
- **copy**: Create purple. Sub-options: Reminder | Alarm | Timer | Event.
- **ui**: Same Create cascade as 7692. User returned to Create.
- **flow-hint**: User navigated back to try Create.
- **notes**: Same as 7692 — captures the canonical state again. Possibly captured to ensure full cascade is documented.

### IMG_7705.PNG ⭐
- **bucket**: HM (Reminder builder modal)
- **summary**: Reminder modal — Step 1, "Create a reminder" with 10 preset templates
- **state**: Modal sheet over home, 9:25
- **copy**: Title: "Create a reminder / What should Poppy tell you?" / Field: "Poppy should..." with placeholder "remind me what to wear based on the we..." Section: "Start with one of these" — 10 template pills:
  - 🚗 "Commute Heads-Up"
  - 📧 "Inbox Zero"
  - 🔭 "Weekend Scout"
  - 🌃 "Wind Down"
  - 🎁 "Birthday Radar"
  - 🏃 "Fitness Nudge"
  - 🍴 "Meal Inspo"
  - 📰 "News Catch-Up"
  - ❤ "Social Pulse"
  - 💰 "Spend Check"
  Pagination: 1 dot orange. Greyed "→ Next" CTA.
- **ui**: Modal sheet with X close. Text field with placeholder showing a SAMPLE reminder. Below: 5x2 grid of preset templates. Bottom: pagination dot + Next CTA.
- **flow-hint**: User tapped Reminder from Create cascade.
- **notes**: **PRE-FABBED "LIFESTYLE WATCHERS"**. These aren't "remind me at 3pm." They're CATEGORIZED RECURRING AGENT BEHAVIORS:
  - **Commute Heads-Up** — agent proactively flags traffic/transit before leaving
  - **Inbox Zero** — agent helps clear email at chosen times
  - **Weekend Scout** — surfaces weekend activities
  - **Wind Down** — bedtime/evening routine
  - **Birthday Radar** — birthdays + reminders to message
  - **Fitness Nudge** — workout encouragement
  - **Meal Inspo** — recipe/dining suggestions
  - **News Catch-Up** — daily/weekly news brief
  - **Social Pulse** — relationship check-ins
  - **Spend Check** — financial mindfulness
  These are essentially 10 PRE-DESIGNED AGENT JOBS with custom prompt + cadence baked in. The user picks one and Poppy installs it as a recurring reminder. **MAJOR PRODUCT INSIGHT**: a "reminder" in Poppy is a CONFIGURED AGENT BEHAVIOR, not a notification. Calling them "watchers" or "agents" would be technically accurate; "reminder" is consumer-friendly framing.
  - The placeholder "remind me what to wear based on the we..." (weather) demonstrates ad-hoc reminder creation.
  - For CareSupport: pre-fab care watchers — "Pill check-in (morning)," "Sundown notice," "Shift handoff reminder," "Family pulse" — would be a powerful onboarding pattern.

### IMG_7706.PNG
- **bucket**: HM (Reminder builder modal)
- **summary**: Reminder modal — Step 1 with user-typed reminder text
- **state**: Same modal, 9:25, text typed
- **copy**: Field: "Poppy should... — Suggest a quick dinner recipe I can make tonight based on what's easy and in season." Templates still visible below. Orange "→ Next" CTA (now active).
- **ui**: Text now filled, CTA active.
- **flow-hint**: User typed custom reminder.
- **notes**: User wrote a CONVERSATIONAL prompt directly — not just "remind me to..." but a full agent instruction. Poppy's reminders are essentially mini-prompts. This blurs reminders/agents/prompts into one mechanic.

### IMG_7707.PNG ⭐
- **bucket**: HM (Reminder builder modal)
- **summary**: Reminder modal — Step 2, "When should I remind you?" with 4 trigger types + location warning
- **state**: Modal Step 2, 9:25
- **copy**: Title: "When should I remind you? / Pick a time, schedule, or place." Four trigger cards (2x2):
  - 🔄 "Recurring / Repeats on a schedule" (SELECTED — orange ring)
  - ⏰ "One-time / Triggers once at a specific time"
  - 🚶➡ "Arrive / When you arrive somewhere" (DISABLED with lock 🔒)
  - 🚶⬅ "Leave / When you leave somewhere" (DISABLED with lock 🔒)
  Orange warning card: "📍 Location triggers need 'Always Allow' / Poppy needs background location access so reminders can fire when you arrive or leave a place — even when the app isn't open. 'While Using' isn't enough because iOS suspends location updates as soon as you put Poppy away. / Enable Always Location →"
  Section "Schedule" with day pills: Su Mo Tu We (selected) Th Fr Sa. Pagination: 2nd dot orange. "Next" CTA.
- **ui**: 2x2 trigger card selector. Disabled options have lock-icon overlays and dim styling. Orange-tinted warning card. Day-of-week pills as schedule picker.
- **flow-hint**: After typing reminder in Step 1.
- **notes**: **FOUR TRIGGER TYPES** revealed:
  1. **Recurring** (schedule) — day-of-week pills + likely time picker
  2. **One-time** (datetime)
  3. **Arrive** (geofence enter)
  4. **Leave** (geofence exit)
  Geofences require "Always Allow" location — Poppy explains WHY plainly: "iOS suspends location updates as soon as you put Poppy away." This is one of the BEST permission-rationale copy I've ever seen — names the iOS behavior, names the user behavior, names the consequence. It's pedagogical, not begging. Compare to most apps' "We need location to give you the best experience" which earns suspicion.
  - **Pattern**: when a feature requires a high-trust permission, EXPLAIN THE TECHNICAL CONSTRAINT, not just the user benefit.
  - Disabled triggers stay VISIBLE (not hidden) — user sees what's possible AFTER enabling. Aspirational disabled state.

### IMG_7708.PNG
- **bucket**: HM (Reminder builder modal)
- **summary**: Reminder modal — Step 2, One-time selected; reveals "Trigger at" datetime picker
- **state**: Modal Step 2, 9:26, one-time selected
- **copy**: Same step. One-time card now selected (orange ring). Schedule day-pills removed. Section "Trigger at — Date & Time | May 11, 2026 | 10:25 PM" (datetime widgets).
- **ui**: Selection drives content swap — recurring shows day-pills, one-time shows datetime pickers. Disabled location options still shown.
- **flow-hint**: User toggled trigger type.
- **notes**: Reinforces dynamic-form pattern: changing a selector swaps visible inputs. Smart UI economy.

### IMG_7709.PNG
- **bucket**: HM (Timer modal)
- **summary**: New Timer modal — duration wheels + 6 named presets
- **state**: New Timer modal, 9:26
- **copy**: "Cancel" button. Title: "New Timer." Label field (placeholder "e.g., Pasta"). Duration: 3-column wheel picker (0 hr | 5 min | 0 sec — center row in pill, surrounding rows ghosted). "Quick presets": 🍅 Pomodoro | ☕ Break (SELECTED — orange) | 🍴 Pasta | 🍚 Rice | 🏃 Workout | 🛏 Nap. Orange "▶ Start Timer" CTA.
- **ui**: Wheel picker (iOS-style) for duration. Six preset pills with emoji icons. Label field with cooking-themed hint.
- **flow-hint**: User selected Timer from Create cascade.
- **notes**: **6 NAMED TIMER PRESETS** = clear LIFESTYLE AWARENESS. Pomodoro (25min work), Break (typically 5-15min), Pasta (al dente ~10min), Rice (20-30min), Workout (TBD), Nap (TBD). Half are food/cooking, indicating Poppy users likely cook at home. The label hint "e.g., Pasta" is consistent with the cooking lean. Pattern: name the most common use-cases AS presets so users don't have to type. CareSupport equivalent: "Med check (15min)," "Hand-off (5min)," "Pill swallow (2min)" — domain-aware preset library.

### IMG_7710.PNG
- **bucket**: HM (Alarm modal)
- **summary**: New Alarm modal — time wheels + repeat days
- **state**: New Alarm modal, 9:26
- **copy**: Cancel button. Title: "New Alarm." Label "e.g., Wake up." Time: 3-column wheel (9 26 PM). Repeat: day pills (Su-Sa, all unselected). Greyed "✓ Create Alarm" CTA.
- **ui**: Standard alarm-creation form.
- **flow-hint**: User explored Alarm option from Create cascade.
- **notes**: Plain alarm form — less differentiated than Reminder or Timer. Suggests alarms are unenriched (no agent-specific behavior) — just a time-trigger. The "Repeat" day-pills are the only configuration beyond time + label. Pattern: keep "system primitives" (alarms) lightweight; reserve agent-enriched flows for higher-level intents (Reminders/Events).

### IMG_7711.PNG ⭐
- **bucket**: HM (Shortcut cascade)
- **summary**: Home — STATUS PILL CHANGED: "1 reminder" replaced "May 11th"; Order cascade active (green)
- **state**: Home, Shortcuts, 9:26
- **copy**: Greeting + pills. Pills row now: "2801 Girard Ave S | 59°F · Layers ne... | **1 reminder** | Inbox clear" (May 11th pill REPLACED by reminder count). Order pill GREEN. "What would you like to order? — 🚗 Ride | 🍴 Restaurant | 🛒 Groceries"
- **ui**: Order pill green. Status-pill content has UPDATED — the date pill became a reminder counter because the user has an active reminder.
- **flow-hint**: After creating a reminder, the status pills evolve to reflect the new state.
- **notes**: **STATUS PILLS ARE DYNAMIC**. When the user has 1+ reminder, the date pill MORPHS into a reminder counter. The status bar is an evolving summary of "what's pertinent right now" — date is generic, reminder count is personal. Pattern: pills are CONTEXTUAL not categorical — they reflect what currently matters most. CareSupport implication: a caregiver's status pills could morph based on what's active — "2 unhandled tasks," "Shift in 30 min," etc.
  - **ORDER IS GREEN.** Completes the verb-color taxonomy: Create=purple, Order=green, Go=blue, Search=yellow.
  - Three Order sub-types: **Ride** (transport), **Restaurant** (food delivery), **Groceries** (grocery delivery). These map to Uber/Lyft, DoorDash/Postmates, Instacart class. Poppy as commerce broker.

### IMG_7712.PNG
- **bucket**: HM (Shortcut cascade)
- **summary**: Order > Ride — destination text field
- **state**: Home, Shortcuts, 9:26
- **copy**: Path: Order > Ride (both green). "Where to? — ↗ Other" (single sub-option visible)
- **ui**: Green theme continues. Same single-option sub-cascade.
- **flow-hint**: User picked Ride from Order cascade.
- **notes**: Same pattern as Go > Other (free-form destination). Likely if Home/Work were saved, they'd appear as preset destinations alongside Other. This duplication between Go and Order > Ride is intentional — same "where" sub-cascade but different downstream behavior. Pattern: cascade choices can SHARE sub-trees but diverge in terminal actions.

---

### Batch 9 — IMG_7713 → IMG_7724 (Order partners, Groceries/Instacart, agent thread FIRST CONTACT, day view, Inbox, status-pill drill-downs, ride-hailing)

### IMG_7713.PNG ⭐
- **bucket**: HM (Shortcut cascade)
- **summary**: Order > Restaurant — "Book with..." OpenTable + Resy reservation partners
- **state**: Home, Shortcuts, 9:26
- **copy**: Path: Order > Restaurant (both green). Sub-section: "Book with..." — pills "🅾 OpenTable | Ⓡ Resy" (both circular brand icons)
- **ui**: Two partner-branded pills for restaurant reservations.
- **flow-hint**: User selected Restaurant.
- **notes**: **POPPY AS COMMERCE BROKER**: Restaurant cascade routes to OpenTable or Resy for reservations. Not Poppy's own booking system — third-party API integrations. Implies they've made deals (or used public APIs) with both reservation networks. Note that DoorDash/Uber Eats/etc. (food delivery) don't appear here — Restaurant means EATING OUT, not ordering in. Two-platform partnership reduces switching cost for users with one preferred app.

### IMG_7714.PNG ⭐
- **bucket**: HM (Shortcut cascade — Groceries)
- **summary**: Order > Groceries → Instacart-powered shopping list modal
- **state**: Modal sheet, 9:27
- **copy**: Title: "🛍 Shop for groceries / Add items to your cart" / "🥕 via Instacart" / Cart icon / "No items yet / Tap 'Add Item' to start your list" / Add Item pill (greyed) / Dark green "🥕 Get Ingredients" CTA
- **ui**: Modal sheet with brand-themed (Instacart green) styling. Empty state with cart icon. Add Item is gently affordanced. Bottom CTA uses Instacart's signature dark green.
- **flow-hint**: User selected Groceries from Order cascade.
- **notes**: **INSTACART INTEGRATION.** Brand-themed UI (dark green Instacart aesthetic). "Get Ingredients" CTA suggests Poppy can suggest ingredients for a recipe context — likely an Instacart-powered "shop for a recipe" deep link. This is a sophisticated commerce integration — not just a deep-link out, but an in-app cart builder. CareSupport implication: a "Pharmacy" Order pathway could integrate with PillPack/Walgreens/CVS for med refills, branded similarly.

### IMG_7715.PNG ⭐
- **bucket**: HM (voice activation alternate state)
- **summary**: Home — "Press and hold to tell Poppy what to do" — wide push-to-talk pill at bottom
- **state**: Home, Shortcuts pane, 9:27
- **copy**: Greeting + pills + standard Shortcuts grid. Bottom: large orange pill "Press and hold to tell Poppy what to do" with mic icon.
- **ui**: The floating round mic icon (seen in earlier home screens) has EXPANDED into a wider, more affordant push-to-talk pill spanning more of the bottom. May have been triggered by extended idle, by tapping the mic, or by Shortcut state.
- **flow-hint**: Possibly the alternate state of the voice mic — instructional.
- **notes**: **PUSH-TO-TALK** branding made explicit. The narrow mic teaches "voice is here"; the wide pill teaches HOW (press and hold). Same control, two surface states. Onboarding-by-affordance. The full text "tell Poppy what to do" frames voice as IMPERATIVE input — give Poppy commands, not just queries.

### IMG_7716.PNG
- **bucket**: HM (Suggestions feed evolved)
- **summary**: Suggested For You — 4 cards including duplicates (active + completed pair)
- **state**: Home, Suggestions pane, 9:27
- **copy**: Greeting + pills. "Suggested For You": Cards (2x2):
  - 🛍 "Shop for groceries" (active, blue dot)
  - 📌 "Late night at Little Tijuana" (active, blue dot)
  - 🛍 "Shop for groceries" (faded, checkmark)
  - 📅 "Create event: Founders Day" (faded, checkmark)
- **ui**: 2x2 grid of suggestion cards mixing active and completed states. Note two "Shop for groceries" cards — same title but different states (one active, one done).
- **flow-hint**: After exploring various Shortcuts and creating reminders, feed accumulated.
- **notes**: Active and completed versions of the same suggestion can coexist — likely the user dismissed/completed one Shop for groceries earlier, then a new one arose. Feed is dense with state. Pattern: even when the agent surfaces duplicate intents, both states stay legible.

### IMG_7717.PNG ⭐
- **bucket**: HM (Day view)
- **summary**: Day View — vertical hourly timeline with one event "Creative boredom challenge" and red current-time line
- **state**: Day view modal, 9:27
- **copy**: X close. Heading: "Monday / May 11" / right-side "‹ 1 event ›" pagination. Vertical timeline from 2 PM to 11 PM. Event block: teal "Creative boredom challenge" at 3 PM (45-min duration roughly). Horizontal red line at 9:27 PM (current time).
- **ui**: Apple-Calendar-like timeline view. Days are paginated via chevrons. Events render as colored blocks at their time slot. The current-time indicator is a thin red line spanning the timeline.
- **flow-hint**: User likely tapped a date-related pill or icon.
- **notes**: **DAY VIEW EXISTS** — separate from the Suggestions home view. Poppy isn't replacing Apple Calendar; it provides a quick "what's left today" view inline. The red current-time line is a Apple Calendar copy — pattern recognition for any calendar user.
  - "Creative boredom challenge" — a single calendar event from earlier in the day (3 PM). Provides texture about Liban's actual life.
  - "1 event" counter and chevron paging implies multi-day navigation but in compact modal form.

### IMG_7718.PNG ⭐
- **bucket**: HM (Inbox)
- **summary**: Inbox — Reminders tab with Smart Reminders intro banner + Meal Inspo entry
- **state**: Inbox modal, 9:27
- **copy**: X close. + add top-right. Title: "Inbox." Tabs: Reminders (selected) | Alarms | Timers. Orange banner: "Meet Smart Reminders / Smart reminders let Poppy check in on things for you automatically. Set an objective, pick a schedule, and Poppy handles the rest." Entry card: "🍴 Meal Inspo / 📅 May 11, 2026 at 10:25 PM / ⚡ Suggest a quick dinner recipe I can..." (truncated)
- **ui**: Modal with 3-tab segmented control. Banner explainer for the new feature. List of reminder cards. Each card has leading category icon, name, time, ⚡ icon + preview of objective.
- **flow-hint**: User opened the Inbox to see their configured reminders.
- **notes**:
  - **INBOX = the system tray for time-based + objective-based agent jobs**.
  - **"Meet Smart Reminders" banner**: positioning copy CONFIRMS the reminder mechanic — "set an objective, pick a schedule, Poppy handles the rest." Reminders are AGENT-OBJECTIVE-COMPLETION JOBS, not just notifications.
  - The Meal Inspo entry shows the reminder template was applied — its template name + scheduled time + ⚡ objective preview. The ⚡ icon (a lightning/spark) suggests "agent-handled" distinct from passive reminders.
  - For CareSupport: an Inbox of agent-managed objectives (med-check, shift-handoff watcher, family-pulse) would be a useful surface.

### IMG_7719.PNG
- **bucket**: ES (edge state) / HM
- **summary**: Inbox — Alarms tab empty state
- **state**: Inbox, Alarms tab, 9:27
- **copy**: Tabs visible: Reminders | Alarms (selected) | Timers. Empty state: bell-with-slash icon, "No alarms."
- **ui**: Simple empty state.
- **flow-hint**: User toggled to Alarms tab.
- **notes**: Empty state with minimal copy ("No alarms" — three words). When users have nothing, you don't need a paragraph. Compare to other empty states with elaborate instructions — alarms are obvious enough not to require teaching.

### IMG_7720.PNG ⭐⭐⭐
- **bucket**: AT (agent-thread — FIRST CONTACT)
- **summary**: iMessage thread with Poppy — opening message with location awareness + AI-generated cat image + invitation
- **state**: iOS Messages app, conversation with Poppy, 9:28
- **copy**:
  - Header back chevron with badge "354" (unread iMessages elsewhere in inbox). Poppy avatar (orange/white poppy). "Poppy >" name. Camera icon (FaceTime?) top-right.
  - Subtitle: "iMessage / Encrypted / Today 9:14 PM"
  - Bubble 1 (grey, agent): "Hi there! This is Poppy."
  - Bubble 2 (grey, agent): "I just pulled up your location and see you're hanging out at home tonight in Minneapolis."
  - Image bubble: orange tabby kitten with paws raised (cute startled-cat pose)
  - Bubble 3 (grey, agent): "Since your schedule is looking wide open for the rest of the evening, is there anything I can help you set up or look into so you're ready for the week ahead?"
  - Bottom: iOS Messages input bar "+" / "iMessage" placeholder / mic icon
- **ui**: Standard iOS iMessage thread UI (Apple's native). Poppy appears as a contact with their avatar. Encrypted iMessage label visible (system-level). Three text bubbles + one image bubble.
- **flow-hint**: Poppy's first proactive outbound message to a new user.
- **notes**: **THE AGENT THREAD — the central artifact of the entire architecture**.
  - **First message strategy** (4-part composition):
    1. **Greeting + self-introduction**: "Hi there! This is Poppy." Plain, friendly.
    2. **Context flex**: "I just pulled up your location and see you're hanging out at home tonight in Minneapolis." Two functions — (a) demonstrates the agent IS using its data access, (b) frames Poppy as caring about the user's current state, not generic. Note the soft framing: "just pulled up your location" — apologetic verb choice, like a friend checking.
    3. **Personality moment — IMAGE**: an AI-generated cat image with no text. This is wild. It serves as visual identity, friendliness signal, and ice-breaker. Not utilitarian — purely vibes. Modern AI agents almost never send proactive images.
    4. **Open invitation**: "Since your schedule is looking wide open for the rest of the evening, is there anything I can help you set up or look into so you're ready for the week ahead?" Combines: (a) schedule awareness, (b) low-stakes invitation, (c) future-oriented framing ("ready for the week ahead").
  - **Voice characteristics**:
    - First-person ("This is Poppy" / "I just pulled up")
    - Casual ("hanging out at home tonight")
    - Awareness without intrusion ("I see you're..." not "I noticed you're...")
    - Open-ended invitation, not specific action
  - **Image strategy**: the cat is unrelated to any utility but creates EMOTIONAL TONE. Pattern: occasional non-utility visuals as personality moves. Risky for CareSupport (care contexts are higher-stakes), but the principle — agent has VISUAL voice, not just text voice — is borrowable.
  - **Encrypted iMessage label** — confirms native iMessage (blue bubbles would show on user side; agent sends grey since user is iOS). Poppy registered as iMessage-capable (Apple-business iMessage account, or similar). Major: not SMS — REAL iMessage.
  - **Camera/FaceTime icon** in top-right header — implies FaceTime CAN be called with Poppy? Or just standard iMessage UI element. Worth investigating.
  - The "354" badge in back = other unread iMessages in user's inbox. Provides social context — Liban has a busy iMessage inbox; Poppy is a single thread among hundreds.

### IMG_7721.PNG ⭐
- **bucket**: HM (Status-pill drill-down)
- **summary**: Weather pill tapped → opens detail modal sheet
- **state**: Home with weather detail sheet, 9:30
- **copy**: Home behind. Weather sheet: X close. "☁ 58°" / "Layers needed · Feels like 51°" / 3-stat cards: "💧 40% Humidity | 〰 11 mph Wind | ☔ 0% Precip" / "10:00 PM" + hourly precipitation chart (10pm, 11pm, 12am with orange anchor).
- **ui**: Bottom sheet modal. Big weather number at top. Three stat cards in a row. Hourly precip chart below.
- **flow-hint**: User tapped the weather status pill (or similar).
- **notes**: STATUS PILLS ARE INTERACTIVE — they drill into detail sheets. Each status pill is a portal to its underlying domain.
  - "Layers needed" — Poppy's opinionated wardrobe recommendation appears in the modal too, confirming it's an agent inference, not data point.
  - Pattern: status bar at top → tappable for detail. Tiny pills → full sheets. Visualization hierarchy.

### IMG_7722.PNG ⭐
- **bucket**: HM (Suggestion drill-down — directions)
- **summary**: "Late night at Little Tijuana" suggestion → opens Maps directions sheet
- **state**: Bottom sheet modal, 9:31
- **copy**: Header: "📌 Late night at Little Tijuana / 🚗 1.0 mi · 4.7 stars · Open until 1:00 AM." Apple Maps inline showing route from Start (blue dot) to Destination (red pin). Segmented: Driving (selected) | Walking | Transit. Stats: "⏱ Duration 6m | 📏 1.2 mi." Address: "17 E 26th St, Minneapolis, MN 55408, USA." CTAs: Orange "Open in Maps" / Two below: "Order ride instead" / "Not now."
- **ui**: Suggestion modal sheet with: (1) entity summary with name + distance + rating + hours, (2) inline Maps preview with route, (3) transport-mode tabs, (4) stats, (5) address, (6) action buttons.
- **flow-hint**: User tapped "Late night at Little Tijuana" suggestion card.
- **notes**: **SUGGESTION CARD → ACTION-RICH DETAIL SHEET.** Tapping a card opens a CONTEXT-AWARE detail modal with:
  - All relevant entity info (name, distance, rating, hours)
  - Apple Maps embedded
  - Transport-mode selector
  - Multi-CTA: primary (Open in Maps) + alternative ("Order ride instead") + escape ("Not now")
  Pattern: suggestion details aren't INFORMATION-FIRST, they're ACTION-FIRST. The user can complete the suggestion in 1-2 taps without leaving Poppy. "Order ride instead" is the SECONDARY action — chains directly to the Order > Ride flow we saw earlier.
  - Note: 4.7 star rating, "Open until 1:00 AM" — Poppy enriches with Apple Maps POI data (rating + hours). This is Maps API integration at minimum.

### IMG_7723.PNG ⭐
- **bucket**: HM (Suggestion drill-down — Uber ride)
- **summary**: "Late night at Little Tijuana" — Order Uber path with Apple Maps preview
- **state**: Bottom sheet modal, 9:31
- **copy**: Same suggestion header (car icon now). "Uber" tab selected (black/white) | "Lyft" (next to it). Map preview with pin. "Pick-up Location: 2801 Girard Ave S, Minneapolis, MN" / "Drop-off Location: 17 E 26th St, Minneapolis, MN 55408, USA / Drag the map to adjust pick-up location." CTA: "Uber Request Uber" (black/white Uber-themed). Below: "Undo | Not now"
- **ui**: Uber-themed CTA (black with white Uber logo). Same suggestion-modal pattern but with ride-hailing form. Pick-up and drop-off rendered as text rows with edit icons.
- **flow-hint**: User selected "Order ride instead" from 7722.
- **notes**: **POPPY EMBEDS RIDE-HAILING.** Tab switches between Uber/Lyft. CTA color and logo match the active platform. The user can request a ride INSIDE Poppy — likely through each platform's deep-link API. "Drag the map to adjust pick-up location" — they support precision adjustment in-app. Mature flow.

### IMG_7724.PNG
- **bucket**: HM (Suggestion drill-down — Lyft ride)
- **summary**: Same suggestion — Lyft tab selected, pink CTA
- **state**: Modal, 9:31, Lyft selected
- **copy**: Lyft tab now selected. CTA: "✦ Request Lyft" (LYFT PINK)
- **ui**: Same form, color-themed to Lyft (pink throughout).
- **flow-hint**: User toggled Uber → Lyft.
- **notes**: **PLATFORM-THEMED CTAs**. Selecting Uber → black/white CTA; selecting Lyft → pink CTA. Matches each brand's identity. This is brand stewardship of integration partners — Poppy's color disappears in favor of each partner's color when actioning through them. Compare to most aggregator apps that drown partner branding under their own color. Pattern: respect partner brand in terminal action.

---

### Batch 10 — IMG_7725 → IMG_7736 (iOS app-switch prompt, agent thread with graceful failure, evolving greetings, long-form suggestions, transparency explainer, Connected Apps full map, Mac install flow)

### IMG_7725.PNG
- **bucket**: ES (system permission)
- **summary**: iOS-system "Poppy wants to open Uber" prompt
- **state**: Home dimmed behind iOS-system alert, 9:31
- **copy**: "'Poppy' wants to open 'Uber'" / Cancel / Open
- **ui**: Apple's native cross-app open prompt (rounded alert overlay).
- **flow-hint**: User tapped Request Uber from ride-hailing modal.
- **notes**: iOS requires this confirmation for every URL-scheme deep-link. Poppy uses URL schemes (`uber://`) to launch ride requests. Standard pattern but confirms the integration is DEEP-LINK based, not API-based — Poppy doesn't book the ride itself, it hands over to Uber with the trip details pre-populated.

### IMG_7726.PNG ⭐⭐⭐
- **bucket**: AT
- **summary**: Agent thread continued — graceful failure when calendar isn't connected; agent ADMITS the gap and offers a fix path
- **state**: iOS Messages, Poppy thread, 9:32
- **copy**: (Top, truncated visible at edge — appears to be prior agent prompt about reminders.)
  - User (blue): "...on Wednesday" (paraphrasing — partial visible)
  - Poppy: "Looks like that day is wide open for you. Nothing scheduled as of now!"
  - User: "You sure?"
  - Poppy: "Double-checked and confirmed — still looks clear. Want me to add anything for you if it's already on your radar?"
  - User: 👍 (emoji)
  - User: "Add founders day event at the University of Minnesota at 4:30 PM" (Read 9:32 PM)
  - User: "Will I be able to see it in the app?"
  - Poppy: "Actually, it looks like your calendar isn't linked to Poppy right now. That's probably why Wednesday looked empty!"
  - Poppy: "I can help you with that — just head over to your app settings to link it. Once that's set up, I'll be able to see and add events for you."
- **ui**: iOS Messages thread. Agent grey bubbles, user blue bubbles. "Read 9:32 PM" timestamp on user message.
- **flow-hint**: User asked Poppy about Wednesday's calendar — Poppy initially said it was empty, then realized calendar wasn't linked.
- **notes**: **MASTERCLASS IN AGENT FAILURE HANDLING**. The agent INITIALLY claimed the day was clear ("Double-checked and confirmed — still looks clear"). When user asked a follow-up that pressed the issue ("Will I be able to see it in the app?"), the agent REALIZED it didn't have calendar access and OWNED the mistake: **"Actually, it looks like your calendar isn't linked to Poppy right now. That's probably why Wednesday looked empty!"** Then offered the path forward: "just head over to your app settings to link it."
  - **Voice characteristics here**:
    - **Self-correcting**: agent revises its own assertion when caught.
    - **Causal explanation**: "That's probably why Wednesday looked empty!" — connects the missing capability to the prior false claim.
    - **Action-oriented**: ends with the fix path, not an apology.
    - **No shame**: doesn't grovel, doesn't over-apologize. "Actually" is the most apologetic word.
  - **For CareSupport**: this is THE pattern for handling missing data/permissions. When agent can't fulfill — acknowledge, explain why, give fix path. Never silently fail. Never pretend you have access you don't.
  - **The user's question reveals the bug**: "Will I be able to see it IN THE APP?" — the question that pressured the agent to verify is a UX question about the cross-surface model (iMessage agent ↔ iOS app). This is exactly the kind of question Poppy users will ask, and exactly the kind of bug Poppy needs the agent to catch.

### IMG_7727.PNG ⭐
- **bucket**: HM
- **summary**: Home — EVOLVED greeting and long-form rich suggestion cards with "Why was this suggested?" affordance
- **state**: Home, Suggested For You, 9:33
- **copy**: Greeting NOW: "Your schedule is clear for a peaceful evening" (replacing "It's a bit late, Liban"). Status pills (same). "Suggested For You" — two long-form text cards:
  - 🥗 "For a quick seasonal 📅 dinner tonight, try a sheet-pan salmon with asparagus and snap peas; these spring greens are currently in peak season and require minimal cleanup." Below: blue link "Why was this suggested to me? ↗"
  - 🏠 "Your 📅 Wednesday and the rest of your week remain completely open, so it is a great time to tackle any home projects or just enjoy the quiet." Below: same "Why was this suggested to me? ↗"
- **ui**: Cards are now MULTI-LINE TEXT BLOCKS (not just titles). Each ends with a small blue-tinted "Why was this suggested to me?" pill link.
- **flow-hint**: Time passed; the home state evolved.
- **notes**:
  - **GREETING IS STATEFUL**: it changes based on inferred context. "It's a bit late, Liban" earlier → "Your schedule is clear for a peaceful evening" now. Both convey time-of-day awareness AND opinionated framing of what's happening.
  - **SUGGESTION CARDS CAN BE LONG-FORM**: not just titles but full paragraphs of agent reasoning. The card from 7660 was "Late night at Little Tijuana" — terse, action-oriented. These cards are PROSE, conversational, narrative. Mixed card formats in the same feed.
  - The "Why was this suggested to me?" link is on EVERY card — transparency-by-default. Tap → opens an explainer (next screenshot).

### IMG_7728.PNG ⭐⭐
- **bucket**: HM (Suggestion explainer modal)
- **summary**: "Why was this suggested?" modal — Context + Sources + Last Updated + feedback buttons
- **state**: Bottom-sheet modal, 9:33
- **copy**: X close. Section: "CONTEXT / Poppy noticed that you recently searched for recipes for quick dinners and mentioned enjoying salmon. It also saw that you have a favorite grocery store near your location that sells fresh asparagus and snap peas, so it thought these ingredients would be a great combination for your meal." Section: "SOURCES / ↗ Location." Section: "LAST UPDATED / 🕒 Now." Two pill buttons: "👍 Show Me More Like This" / "👎 Not Interested In This"
- **ui**: Dark sheet, three labeled sections (CONTEXT, SOURCES, LAST UPDATED), and two thumb-up/thumb-down feedback buttons styled as soft brown pills.
- **flow-hint**: User tapped "Why was this suggested to me?" from a suggestion card.
- **notes**: **EXPLAINABILITY PATTERN OF THE YEAR.** Every agent suggestion has a self-explanation surface containing:
  - **CONTEXT** (natural-language reasoning): why this suggestion was generated.
  - **SOURCES** (data inputs): which integrations contributed.
  - **LAST UPDATED** (freshness): when the reasoning was computed.
  - **FEEDBACK** (preference learning): user can endorse or reject the suggestion as a CLASS, training the recommender.
  - For CareSupport: this is THE PATTERN for any agent recommendation in a sensitive domain. "Why did you suggest this med change?" must show CONTEXT + SOURCES + LAST UPDATED + FEEDBACK. Caregivers will trust an agent that shows its work.
  - Note: the prose CONTEXT is generated, not template-filled — it reads naturally and chains causal reasoning ("It also saw that... so it thought..."). High-effort writing per suggestion.
  - Two buttons (positive + negative feedback) mirror the THUMBS-UP / THUMBS-DOWN affordance familiar from ChatGPT/Claude responses. Universal pattern.

### IMG_7729.PNG
- **bucket**: HM (Suggestion explainer modal — example 2)
- **summary**: Another "Why was this suggested?" — example shows weaker reasoning
- **state**: Bottom-sheet modal, 9:33
- **copy**: CONTEXT: "Based on your location and recent activity, Poppy believes that you might be interested in SQL programming. This is a common task for those who work with databases and data analysis." SOURCES: Location. LAST UPDATED: Now. Same feedback buttons.
- **ui**: Same explainer template.
- **flow-hint**: User tapped Why on a different suggestion.
- **notes**: Same template, different content. Worth noting the reasoning is THIN here — "Based on your location and recent activity... believes that you might be interested in SQL programming. This is a common task for those who work with databases and data analysis." This reads as a WEAK suggestion — generic, low-confidence, location-only. The transparency UI surfaces the agent's weak reasoning honestly, which is risk: bad suggestions get exposed BY the explainer. Net positive — exposed bad suggestions can be downvoted via "Not Interested In This." User-driven model improvement.

### IMG_7730.PNG ⭐
- **bucket**: ST (Connected Apps — full integration map)
- **summary**: Connected Apps settings — Required + Productivity sections
- **state**: Settings sub-screen, 9:34
- **copy**: Title: "Connected Apps." Section "Required":
  - "↗ Location / Location Linked" (with ↗ link icon)
  - "🔔 Notifications / Receive timely reminders and updates" (with ↗ link icon)
  Section "Productivity":
  - "G Google Account / Tap to link >"
  - "📧 Outlook / Tap to link ○"
  - "☁ iCloud Mail / Tap to link ○"
  - "📅 Calendar / Select which calendars sync >"
  - "✓ Reminders / Stay on top of your tasks ○"
  - "💳 Wallet & Passes / Track your spending and passes ○"
- **ui**: Sectioned list with leading colored icons, name, sub-text, and trailing affordance (chevron for ALREADY connected services, circle for unconnected). Required section uses external-link icon (↗) indicating these route to iOS Settings.
- **flow-hint**: User opened Connected Apps from Settings.
- **notes**: COMPLETE CONNECTED APPS MAP IN VIEW:
  - **Required** — Location + Notifications (must be granted to use Poppy at all)
  - **Productivity**: Google Account (grouped), Outlook, iCloud Mail, Calendar (multi-calendar selection), Reminders, Wallet & Passes
  - Two cycles of integration UI:
    - "Tap to link" with circle ○ = not connected, single-tap to OAuth
    - "Select which..." with chevron > = ALREADY granted/has data, drill into config
  - The Required services are styled differently (link icon vs circle) because they're iOS-system permissions, not OAuth integrations.

### IMG_7731.PNG
- **bucket**: ST (Connected Apps)
- **summary**: Connected Apps — Social section (Call History, Contacts, iMessage, Photos)
- **state**: Same screen, scrolled, 9:34
- **copy**: (Continued from Productivity) ... Section "Social":
  - "☎ Call History / Never miss a call from the people who matter"
  - "👤 Contacts / Keep track of birthdays, anniversaries, and people"
  - "💬 iMessage / Keep up with conversations and loved ones"
  - "🖼 Photos / Share your memories"
  Entertainment section starts with Apple Music.
- **ui**: Same list pattern.
- **flow-hint**: Continued scroll.
- **notes**: **SOCIAL CATEGORY** is treated as its own first-class integration class. Each entry has a HUMAN-VALUE description (not data-name):
  - Call History → "Never miss a call from the people who matter"
  - Contacts → "Keep track of birthdays, anniversaries, and people"
  - iMessage → "Keep up with conversations and loved ones"
  - Photos → "Share your memories"
  Notice: NOT "we access your X data" but "you can do Y human thing." Same pattern as JTBD-quoted onboarding (7626-7628). Consistent voice across the product.

### IMG_7732.PNG ⭐
- **bucket**: ST (Connected Apps)
- **summary**: Connected Apps — Entertainment, Health, Home sections; AES-256 footer
- **state**: Same screen, scrolled to bottom, 9:34
- **copy**: 
  - Section "Entertainment":
    - "🎵 Apple Music / Share your favorite artists and listening history"
  - Section "Health":
    - "🏃 Fitness / Get recommendations for workouts"
    - "🍴 Nutrition / Track your meals and eating habits"
    - "🛏 Sleep / Get reminders for a good night's rest"
  - Section "Home":
    - "🏠 Apple HomeKit / Control and monitor your smart home"
  Footer: "You have full control over your data at any time. Your data is encrypted using the AES-256 algorithm."
- **ui**: Continued list, same pattern.
- **flow-hint**: Bottom of Connected Apps.
- **notes**: **APPLE HOMEKIT INTEGRATION CONFIRMED.** Combined with "Voice Notifications at home" (7671), Poppy can:
  - DETECT that user is home (via HomeKit + location)
  - SPEAK aloud (voice notifications) when context-safe
  - CONTROL smart home (HomeKit access)
  - Implies: Poppy can dim lights when "wind down" reminder triggers, adjust thermostat for "wake up" alarm. Adaptive home behaviors.
  - **For CareSupport**: HomeKit access to monitor a care recipient's home (motion sensors, presence detection, smart locks) could be a frontier feature — but requires consent and privacy work.
  - **AES-256** named in footer copy. They were vague in the encryption explainer (7641) — said "enterprise-grade key management system" — but here they're concrete. Two-tier copy: simple explanation in onboarding, technical claim in settings.
  - Spotify is NOT in this list — only Apple Music. So Spotify integration referenced in 7638 might be a recent addition or accessed via Music category (TBD).

### IMG_7733.PNG
- **bucket**: ST (Google sub-integration)
- **summary**: Google Services sub-page — 4 Google services individually selectable
- **state**: Google sub-screen, 9:34
- **copy**: Title: "Google Services / Connect a Google service to get started." Cards:
  - "G Gmail / Track important updates and conversations"
  - "📅 Google Calendar / See events and prep you"
  - "👤 Google Contacts / Keep track of birthdays, anniversaries, and people"
  - "▶ YouTube / Get video recommendations"
  Orange CTA: "+ Add Google Account"
- **ui**: Cards with brand icons (Gmail multicolor, etc.). Trailing circle ○ for each service. CTA at bottom to add another Google Account.
- **flow-hint**: User tapped "Google Account" in Connected Apps.
- **notes**: GOOGLE INTEGRATION GRANULARITY: 4 sub-services individually selectable. User can connect Gmail but NOT YouTube, or any combination. Multi-account support ("Add Google Account" — plural).
  - **YouTube** is listed as a Google service for "video recommendations." Suggests Poppy can recommend YouTube content based on context — entertainment recommendation engine.
  - **Google Contacts** here vs Apple Contacts in Social section — Poppy can read both, treats them as separate.
  - Pattern: when a parent OAuth account hosts multiple services, expose them as a grouped sub-page with per-service granularity. This is best-practice OAuth UX.

### IMG_7734.PNG ⭐
- **bucket**: ST (Calendar sync granularity)
- **summary**: Calendar Sync — per-calendar enable toggles with mixed-source calendars listed
- **state**: Calendar config screen, 9:35
- **copy**: Title: "Calendar Sync / Select which calendars to sync with Poppy. Events from enabled calendars will be included in your context." List of calendars:
  - "Talk to Me Day" at Loring Park: 23 Sep, 12pm - 6pm (iCloud) ○
  - 2024 Partnership Engagement Fund Launch (iCloud) ○
  - April 2025 Twin Cities Medical Device Networking Group Event (iCloud) ○
  - Birthdays (Other) ○
  - Eventbrite (iCloud) ✓
  - Holidays in Colombia (Gmail) ○
  - Home (iCloud) ✓
  - Mint (iCloud) ✓
- **ui**: Each calendar has a colored dot (user-assigned calendar color), name, source-account in small text, and selection toggle.
- **flow-hint**: User tapped Calendar in Connected Apps.
- **notes**: **GRANULAR PER-CALENDAR CONSENT.** User picks exactly which of their calendars Poppy reads. Calendar list reveals Liban's actual calendar setup — mix of iCloud and Gmail-sourced calendars, some event-named (likely auto-created from Eventbrite/etc.), some "real" calendars (Home, Birthdays). Three currently selected: Eventbrite, Home, Mint (Mint = finance reminders?).
  - Pattern: privacy-respecting calendar integration is per-calendar, not all-or-nothing. Most apps grab everything.
  - The "(iCloud)" / "(Gmail)" / "(Other)" suffix tells user which account each calendar belongs to — useful for multi-account users to disambiguate.

### IMG_7735.PNG ⭐⭐
- **bucket**: ST / IN (Mac install flow)
- **summary**: Mac App Required modal — AirDrop-based install flow for the Mac companion app
- **state**: Connected Apps with overlay modal, 9:35
- **copy**: Connected Apps list behind. Modal:
  - Phone → laptop illustration
  - "Mac App Required"
  - Numbered steps:
    1. "Turn on AirDrop on your macOS device"
    2. "Tap the button below to send the download link to your Mac"
    3. "Open the downloaded file and follow the instructions to connect your data"
  - Orange CTA: "Send to Mac"
  - Plain alt link: "Open in Browser"
- **ui**: Modal sheet with hero illustration (orange phone with orange arrow to brown laptop). Step-numbered instructions. Orange CTA + plain-text fallback.
- **flow-hint**: User tapped an integration (likely iMessage or Call History) that requires the Mac companion app.
- **notes**: **MAC APP INSTALL FLOW = AIRDROP-BASED.** Brilliant cross-device handoff:
  - Phone is the authenticated device (logged in, knows the user).
  - Mac needs the app + data-connection setup.
  - AirDrop transfers a download link from iPhone to Mac — likely with an authenticated install token embedded.
  - "Open in Browser" fallback for non-Apple-Continuity setups.
  - **CONFIRMS architecture**: Mac companion is REQUIRED for certain integrations (iMessage history sync, Call History). The Mac app is presented to the user as a CAPABILITY-EXTENDER, not a separate product.
  - Pattern: AirDrop as cross-device install vector. Most apps require URL email/text or a manual download — this is significantly smoother.

### IMG_7736.PNG
- **bucket**: ST (Connected Apps with active selections)
- **summary**: Connected Apps — Contacts and Photos now SELECTED (orange check)
- **state**: Settings, 9:36
- **copy**: (Top items partially visible: Reminders, Wallet & Passes — both unchecked.) Section "Social":
  - "☎ Call History" ○
  - "👤 Contacts" ✓ (orange check)
  - "💬 iMessage" ○
  - "🖼 Photos" ✓ (orange check)
  - "Apple Music" ○ (Entertainment section)
  - Fitness... (Health section starts)
- **ui**: Two services now show orange checks. Visual state change confirms selections persist.
- **flow-hint**: User toggled Contacts and Photos on (probably from the iOS native permission flow after tapping each).
- **notes**: SELECTION STATE PERSISTS as orange-circled-check icons. Pattern reuses the same orange-ring-check from onboarding integration carousels (7626-7628) — visual consistency between onboarding and settings. CareSupport implication: granular per-integration consent settings should mirror onboarding visual language so users have ONE trust gesture, not two.

---

### Batch 11 — IMG_7737 → IMG_7748 (Google OAuth flow, per-calendar Google sync, agent recipe generation, cross-surface deep linking via askpoppy.app, source-badged long-form suggestions, agent follow-through across surfaces)

### IMG_7737.PNG
- **bucket**: ST (Google Services with sync in-flight)
- **summary**: Google Services screen — Gmail loading spinner (OAuth sync in flight)
- **state**: Google Services sub-screen, 9:37
- **copy**: Same as 7733 with Gmail card showing a small orange spinner icon in place of the circle. No account email shown yet at top.
- **ui**: Tiny spinner on the Gmail row indicates OAuth/sync underway.
- **flow-hint**: User tapped Gmail; OAuth flow started.
- **notes**: Subtle progress indicator — sync state shown PER SERVICE, not as a full-screen loader. Lets user continue interacting with other parts of the screen while one connection completes.

### IMG_7738.PNG
- **bucket**: ST (Google Services connected)
- **summary**: Google Services — Gmail now connected (orange check), kanoliban@gmail.com identified
- **state**: Google Services, 9:37
- **copy**: "Google Services / kanoliban@gmail.com" / Gmail ✓ / Google Calendar ○ / Google Contacts ○ / YouTube ○. Footer: "Tap a linked service to disconnect or manage it." CTA: "+ Add Google Account"
- **ui**: Subtitle now shows linked email. Gmail check is solid orange.
- **flow-hint**: OAuth completed for Gmail.
- **notes**: The screen now identifies WHICH Google account is connected via subtitle text. The "+ Add Google Account" CTA remains, indicating multi-account support. Footer guides next steps. Mature multi-account UX.

### IMG_7739.PNG ⭐
- **bucket**: ST (Google OAuth web flow)
- **summary**: Google's OAuth consent page in iOS in-app browser — 6-month review + ongoing-access option
- **state**: Google account consent page in iOS web view, 9:38
- **copy**: URL bar "accounts.google.com." Heading: "your Google Account" with photo + "kanoliban@gmail.com" identifier.
  Info box 1: "If you allow Poppy access to your Gmail data, Google will ask you to review their access to your Google Account data every 6 months, and this access will expire on November 7, 2026. You can also choose to allow Poppy ongoing access to the Google Account data you're sharing today. This means you won't need to review their access to your Google Account data every 6 months. [☑] I want to allow Poppy ongoing access to the Google Account data I'm sharing today"
  Info box 2: "Poppy already has some access / See the 7 services that Poppy has some access to."
  Footer: "Make sure you trust Poppy / Review Poppy's Privacy Policy and Terms of Service / To make changes at any time, go to your Goog..." (truncated)
- **ui**: Google's standard OAuth consent flow rendered inside iOS in-app browser (Safari View Controller). X close, share, refresh icons.
- **flow-hint**: User tapped Google Calendar; Google's consent page loaded.
- **notes**:
  - **"Poppy already has some access / See the 7 services that Poppy has some access to."** — significant. Poppy has FOUR services listed in their Google Services screen, but Google reports SEVEN with existing access. Either Poppy has additional under-the-hood Google API permissions OR they granted scopes for things not yet user-facing. Worth investigating — possible scope creep.
  - User can opt-in to **ongoing access** vs Google's default 6-month re-review. Poppy benefits from ongoing, but Google's default is friendlier.
  - User-side trust artifact — Google itself shows "Make sure you trust Poppy" in plain text. This is exposure that Poppy doesn't control.

### IMG_7740.PNG
- **bucket**: ST (Google Services after Calendar connect)
- **summary**: Google Services — Calendar now linked (chevron instead of circle)
- **state**: Google Services, 9:39
- **copy**: Same as 7738. Google Calendar row now has ">" chevron instead of "○" — connected and configurable.
- **ui**: State change: chevron indicates connected + drillable.
- **flow-hint**: Returned from Google consent page after authorizing Calendar.
- **notes**: SAME ROW UI pattern as Connected Apps (chevron > = connected). Visual consistency between sub-screens.

### IMG_7741.PNG ⭐
- **bucket**: ST (Per-calendar Google sync)
- **summary**: Google Calendar Sync — 5 calendars listed with roles, all selected by default
- **state**: Calendar Sync sub-screen, 9:39
- **copy**: "Calendar Sync / Select which Google calendars to sync with Poppy. Events from enabled calendars will be included in your context."
  - "🔵 kanoliban@gmail.com [Primary] / Owner" ✓
  - "● Family / Owner" ✓
  - "🟢 Holidays in United States / Viewer" ✓
  - "● Mpls Volunteer Opportunities / Editor" ✓
  - "🔴 smsthecompany@gmail.com / Owner" ✓
  Red link: "Disconnect Google Calendar"
- **ui**: Same per-calendar list pattern as iCloud Calendar Sync (7734). Each calendar shows colored dot, name, role (Owner/Viewer/Editor — Google's permission model), and check toggle.
- **flow-hint**: User drilled into Google Calendar.
- **notes**:
  - **Two accounts visible**: kanoliban@gmail.com (personal) + smsthecompany@gmail.com (likely a company account — "SMS the Company"? Possibly Liban's startup).
  - Role labels (Owner/Viewer/Editor) come from Google Calendar — Poppy preserves Google's vocabulary for clarity.
  - "[Primary]" badge highlights the user's main calendar.
  - DEFAULT IS "ALL CHECKED" — opposite of iCloud Calendar Sync (which seemed default-unchecked). Maybe because the user just authorized Calendar scope wholesale via OAuth — all calendars get equal treatment by default.
  - "Disconnect Google Calendar" in red — destructive option at the bottom, exit lane.

### IMG_7742.PNG
- **bucket**: ST (Per-calendar Google sync)
- **summary**: Calendar Sync — user deselected 2 of 5 calendars
- **state**: Same screen, 9:39, two calendars now ○
- **copy**: Same list but Family and Mpls Volunteer Opportunities now ○ (unchecked).
- **ui**: Three checked, two unchecked.
- **flow-hint**: User refined sync list.
- **notes**: Reinforces granularity — user CAN disable specific calendars without disconnecting account entirely. Privacy preserved at category level.

### IMG_7743.PNG ⭐⭐
- **bucket**: AT
- **summary**: Agent thread — recipe content + memory-save offer + grocery-list request
- **state**: iMessage with Poppy, 9:47
- **copy**: (Top, truncated content visible at edge — appears to be a series of recipe names with descriptions, bulleted with "•". Visible:)
  - "• Sweet Potato and Black Bean B... [bowls]: Roast sweet potatoes and toss with seasoned ... [b]black beans"
  - "...Rice S... [skillet]: A one-pan meal with rice, potatoes, beans, ... of spices."
  - "• Roasted Sweet Potato and Lime Rice: Add lime and taco seasoning to the rice, beans, and potatoes for an extra flavor boost."
  Poppy: "These all store perfectly in the fridge for 3 days. Want me to save these to your memory so you have them handy for your prep sessions?"
  User (blue): "No, I need is a grocery list with each and every item I need it weighed for exactly what ingredients I need and then I need you to add that to the grocery list that you need to put into a category list so that it makes shopping easy for me" (Read 9:46 PM)
  Poppy: "High-calorie, protein-rich, rice-based meal prep."
  Below: a partially-rendered link preview "Tap to Load Preview" / "askpoppy.app"
- **ui**: Long agent message with bulleted recipe list (multiline). User reply in long-form. Agent's brief follow-up. Link preview is partially-loaded (small grey card with "Tap to Load Preview").
- **flow-hint**: User was discussing meal prep with Poppy; Poppy proposed recipes and offered to save them to memory. User pushed back wanting actionable grocery list.
- **notes**:
  - **AGENT WRITES STRUCTURED CONTENT IN iMESSAGE**: bullet-pointed recipe list with name + description per recipe. iMessage supports plain text but bullets render fine.
  - **MEMORY-SAVE PROMPT**: "Want me to save these to your memory so you have them handy for your prep sessions?" — agent ASKS before persisting to long-term memory. Explicit consent for memory writes. Pattern: don't silently store; ask for permission for important persistence.
  - **USER RESPONSE GOES OFF-SCRIPT**: rejects memory-save, demands a different output format (grocery list with weights, categorized). Agent doesn't argue — pivots and generates new artifact.
  - **AGENT GENERATES URL CONTENT**: "High-calorie, protein-rich, rice-based meal prep." (intro line) + link preview "askpoppy.app" — implies Poppy created a web-hosted grocery list and is sharing the URL. Agent's response includes a SHAREABLE LINK, not just text. **MAJOR**.

### IMG_7744.PNG
- **bucket**: AT (Link preview loading)
- **summary**: Same thread — link preview loading state
- **state**: iMessage, 9:47
- **copy**: Same conversation. Link preview now showing iOS loading spinner.
- **ui**: Standard iOS link-preview loading state.
- **flow-hint**: Tapped to load preview.
- **notes**: Standard iMessage rich-link UX. Worth noting Poppy's URL preview takes a beat to render — implies the askpoppy.app URLs are dynamically generated (server-side render) rather than precomputed static images.

### IMG_7745.PNG ⭐⭐⭐
- **bucket**: AT (Loaded link preview — CROSS-SURFACE BRIDGE)
- **summary**: Link preview loaded — rich card "Grocery List: 3-Day Meal Prep" with "Tap to open in Poppy"
- **state**: iMessage, 9:48
- **copy**: Same conversation. Link preview now showing rich content: white card with house/grocery emoji icon, title "Grocery List: 3-Day Meal Prep" / subtitle "Tap to open in Poppy" / Below the preview: "Grocery List: 3-Day Meal Prep" repeated as filename + "askpoppy.app" as domain.
- **ui**: iMessage rich link preview card (white card on dark thread). Custom illustration/icon + agent-generated content title + CTA hint "Tap to open in Poppy."
- **flow-hint**: After preview loaded.
- **notes**: **CROSS-SURFACE BRIDGE — THE CORE MECHANIC.** This is one of the most important mechanics in the entire architecture:
  - Agent generates content in iMessage (recipe list, grocery list, anything structured).
  - Content is HOSTED at `askpoppy.app/...` as a stable URL.
  - URL renders as iMessage rich link preview (custom OG metadata).
  - User taps the preview → deep-links INTO the Poppy iOS app, displaying the content.
  - **This is how the iMessage agent hands off rich content to the iOS app surface.** When text isn't enough, the agent generates URL + preview, user taps to expand in app.
  - This is THE answer to "why have an iOS app if iMessage is the surface" — the iOS app is where complex artifacts (lists, schedules, plans, comparisons) are CONSUMED. iMessage is where they're CONVERSATIONALLY GENERATED.
  - "Tap to open in Poppy" — exactly THREE words plus brand-name. Maximum signal, minimum copy.
  - **For CareSupport**: a "Care Plan Summary" / "Med Schedule" / "Today's Coverage Map" generated in caregiver iMessage thread, shared as askcaresupport.app/{id} URL, opens in CareSupport companion app showing full visual. THIS pattern is the bridge between the iMessage-as-UI bet and the rich-state companion app.

### IMG_7746.PNG ⭐⭐
- **bucket**: HM (Deep-link landing — askpoppy.app → app)
- **summary**: Tapped preview → opens in Poppy iOS app; grocery list materializes as a calendar-event-creator with timeline view
- **state**: Poppy iOS app, home with content materialized, 9:48
- **copy**: Top: ◀ Messages back link (from iOS — coming back from iMessage). New greeting: "Rest up, tomorrow's a big day for the fund." Status pills: "2422 E 22nd Ave / Loading... / May 11th / 1 reminder." Section: "Suggested For You" with a single embedded card:
  - 📅 "Grocery List: 3-Day Meal Prep / High-calorie, protein-rich, rice-based meal prep."
  Below the card: form rows:
  - "Date — May 11, 2026 | 9:47 PM"
  - "Calendar — Default"
  - Timeline view 8 PM–11 PM with blue block "Grocery List: 3-Day Meal Prep / 9:47 PM - 10:47 PM" at 9-10 PM
  CTAs: "📅 Create Event" / "Remind me instead" / "Not now"
- **ui**: Deep-link landed on home with content embedded as a suggestion + event-creator form pre-filled. Back chevron shows "Messages" (from iMessage).
- **flow-hint**: User tapped the rich preview in iMessage.
- **notes**:
  - **CONTENT-AWARE DEEP-LINK LANDING.** The app didn't just open to home — it opened to a STATE that PRESENTS the linked artifact (grocery list) as a SUGGESTED ACTION (schedule it as event). Brilliant: cross-surface continuity preserves the user's intent.
  - **Greeting EVOLVED again**: "Rest up, tomorrow's a big day for the fund." Now references "the fund" — Poppy is aware Liban has a fundraising-related event tomorrow. Greeting integrates calendar context.
  - **Location pill changed**: "2422 E 22nd Ave" replaces "2801 Girard Ave S" from earlier — user physically moved.
  - **Weather pill is "Loading..."** — soft state for data refresh.
  - The agent ROUTED the grocery list to a CALENDAR EVENT slot — suggesting that meal prep time should be a scheduled hour. Smart inference: meal prep is a task that benefits from time-blocking.

### IMG_7747.PNG ⭐
- **bucket**: HM
- **summary**: Home with TWO long-form source-badged suggestion cards (Google One storage + Wednesday morning summary)
- **state**: Home, Suggested For You, 9:49
- **copy**: Greeting: "Rest up, tomorrow's a big day for the fund." Pills: location, weather "57°F · Layers need...", "📅 2 events today | 📋 1 reminder."
  - Card 1: "🛍 Your Google One storage is 79% full, which can eventually stall your emails and file syncing. You can manage your existing files or check upgrade options to keep everything running smoothly." Bottom: "via 📧"
  - Card 2: "☕ 📅 Wednesday morning is packed with two back-to-back meetings. You'll start with the Rotary Club at the Minneapolis Club at 7:00 AM, followed immediately by coffee with Leanda at Cafe Astoria in St. Paul at 9:00 AM." Bottom: "via 📅"
- **ui**: Long-form text cards (multi-line). Each card has a SOURCE BADGE at bottom: small icon indicating which integration the suggestion was sourced from.
- **flow-hint**: Returned to home after deep-link interaction.
- **notes**:
  - **SOURCE BADGES** ("via 📧", "via 📅"): every long-form suggestion includes a leading attribution to the originating integration. Transparency-by-icon. Pattern: when an agent suggestion depends on a specific data source, name the source visibly so the user can trust-by-inspection.
  - **Card 1 = Email-sourced suggestion**: Poppy noticed user's Google One storage warning email and surfaced it as a suggestion with a proactive recommendation. The original email was passive notification; Poppy converted it to an actionable card.
  - **Card 2 = Calendar-sourced suggestion**: Poppy summarized tomorrow morning's actual calendar events. Prose synthesis from raw calendar data: extracts event titles, times, locations, attendees ("with Leanda" — knows the person attending).
  - **"with Leanda"** — agent uses first names for attendees, casually (like a personal assistant would). Implies attendee resolution in calendar invites → contact records → name extraction.
  - "2 events today" pill — counter changed from "May 11th" / "1 reminder" earlier. Status pills dynamically reflect day's calendar load.

### IMG_7748.PNG ⭐⭐
- **bucket**: HM (Agent cross-surface follow-through)
- **summary**: Home — another long-form card confirms Founders Day event after calendar was linked (closes loop on chat at 9:32)
- **state**: Home, 9:49, scrolled
- **copy**: Top of card 2 visible — "two back-to-back meetings. You'll start with the Rotary Club at the Minneapolis Club at 7:00 AM, followed immediately by coffee with Leanda at Cafe Astoria in St. Paul at 9:00 AM. / via 📅"
  - Card 3: "🏛 The Founders Day event at the University of Minnesota is confirmed for 📅 Wednesday at 4:30 PM at the Walter Library & Toaster Innovation Hub. This is the event you recently mentioned wanting to track in your schedule." Bottom: "via 📅"
- **ui**: Same long-form card pattern.
- **flow-hint**: Continued scroll on home.
- **notes**: **AGENT CROSS-SURFACE FOLLOW-THROUGH** — the single most powerful agent behavior I've seen.
  - At 9:32 PM (IMG_7726), in iMessage, the user asked Poppy to "Add founders day event at the University of Minnesota at 4:30 PM." Agent admitted it didn't have calendar access; said it would help link calendar.
  - User went to Connected Apps, linked Google Calendar (IMG_7733-7742).
  - Now at 9:49 PM, BACK on home, Poppy proactively confirms the event in a suggestion card: "The Founders Day event at the University of Minnesota is confirmed for Wednesday at 4:30 PM at the Walter Library & Toaster Innovation Hub. **This is the event you recently mentioned wanting to track in your schedule.**"
  - The agent:
    1. REMEMBERED the user's unfulfilled request from a different surface (iMessage).
    2. NOTICED that calendar was now connected.
    3. FOUND the event (which was already on the user's Google Calendar — agent didn't create it; just confirmed existence).
    4. SURFACED it on home with EXPLICIT reference to the prior conversation ("the event you recently mentioned").
  - This requires:
    - Persistent agent memory across surfaces (iMessage thread state + iOS app state)
    - Goal-tracking ("track this event when possible")
    - Capability-change awareness ("calendar got connected — what unblocked?")
    - Cross-surface narrative continuity ("you mentioned this earlier")
  - **For CareSupport**: this is the gold standard. When a caregiver asks "Has the home-care nurse confirmed Friday's visit?" in iMessage and the answer is "I don't have access to that data," the agent should NOTE the goal, ALERT when integration gets added, and FOLLOW UP without being asked.

---

### Batch 12 — IMG_7749 → IMG_7763 (Grid suggestion feed, completed strikethrough, Coming Up multi-actions, agent check-ins, recipe-as-reminder, cross-day continuity with user's own language)

### IMG_7749.PNG ⭐
- **bucket**: HM (Suggestions grid mode)
- **summary**: Home — Suggestions feed in GRID/TILE mode with 8 visible "Open X" suggestion cards
- **state**: Home, Suggested For You, 9:49
- **copy**: Same greeting + pills. Suggested For You as 2-column tile grid:
  - "📅 Join Setup -AI.com" (blue dot)
  - "📅 Open See Cafe Astoria menu" (blue dot)
  - "📅 Pay your USAA bill" (blue dot)
  - "📅 Open Clear up storage space" (blue dot)
  - "📅 Open America's Seed Fund Week Agenda" (blue dot)
  - "📅 Open Explore delegation strategies" (blue dot)
  - (partial) 📌 map-icon card below
  - (partial) 📅 calendar-icon card below
- **ui**: Compact 2-column grid of suggestion tiles. Each tile has a small leading icon, short verb-titled action ("Open X", "Pay X"), and a blue dot (unread/new).
- **flow-hint**: User scrolled or feed populated more.
- **notes**:
  - **SUGGESTION FEED HAS TWO DISPLAY MODES**: long-form prose cards (7727, 7747-7748) AND compact grid tiles (this view). Mixed mode possible (next screenshot shows mixed). Density is responsive — when feed has many suggestions, tiles. When few, prose.
  - **TITLE PATTERN**: every grid-tile suggestion is verb-prefixed: "Open X / Pay X / Join X." Imperative voice. User scans an action verb, decides quickly.
  - Cards include suggestions FROM EMAIL (Pay USAA bill, Google One storage), FROM CALENDAR (Join Setup -AI.com, America's Seed Fund Week Agenda), FROM LOCATION (Open See Cafe Astoria menu — nearby restaurant). The grid is multi-source-merged.

### IMG_7750.PNG ⭐
- **bucket**: HM (Suggestion completed-state with strikethrough)
- **summary**: Home — grid feed scrolled; shows completed cards with STRIKETHROUGH styling
- **state**: Home, suggestions scrolled, 9:49
- **copy**: Visible cards:
  - "📅 Open America's Seed Fund Week Agenda" (blue dot)
  - "📅 Open Explore delegation strategies" (blue dot)
  - "📌 Get directions to AI Innovator Lab" (blue dot)
  - "📅 View Founders Day event details" (blue dot)
  - "📌 Visit The Home Depot" (blue dot)
  - "📌 Late night at Little Tijuana" (FADED, no dot)
  - "📅 ~~Grocery List: 3-Day Meal Prep~~" (FADED, checkmark, STRIKETHROUGH)
- **ui**: Grid view with mix of unread (blue dot), read-but-pending (faded), and COMPLETED (faded + checkmark + strikethrough title).
- **flow-hint**: User scrolled feed further.
- **notes**: **STRIKETHROUGH ON COMPLETED ITEMS.** Earlier completed suggestions (7698) just had faded + checkmark. Now we see also STRIKETHROUGH applied to the title text. Three states observable:
  - **Active**: full opacity + blue dot
  - **Stale**: faded opacity, no dot
  - **Completed**: faded + checkmark + strikethrough title
  Visual progression makes the suggestion lifecycle legible at a glance. Pattern: don't hide completed items; downgrade them visually so they recede but remain navigable.

### IMG_7751.PNG
- **bucket**: HM (Suggestion drill-down — bill payment)
- **summary**: Pay USAA bill — modal sheet with external partner link
- **state**: Bottom sheet, 9:50
- **copy**: Modal: "💳 Pay your USAA bill / USAA bill requires immediate attention." Embedded card: "USAA Customer Service and Support / usaa.com" with USAA logo. CTAs: "Open" / "Not now"
- **ui**: Standard suggestion-detail modal. Embedded link-preview-style card showing the destination (USAA logo + URL). Simple Open / Not now.
- **flow-hint**: Tapped "Pay your USAA bill" suggestion.
- **notes**: Email-sourced ACTIONABLE FINANCIAL SUGGESTION. Routes out to USAA's customer site — Poppy doesn't handle the payment itself. "Immediate attention" copy comes from extracting urgency from the source email. Pattern: agent identifies urgent inbox items and elevates them to actionable suggestions with a one-tap exit lane.

### IMG_7752.PNG ⭐
- **bucket**: HM (Suggestion drill-down — meeting join)
- **summary**: Join Setup -AI.com — calendar event with Google Meet deep-link
- **state**: Bottom sheet, 9:50
- **copy**: Modal: "📅 Join Setup -AI.com / For Setup -AI.com tomorrow at 3:00 PM" / Large Google Meet logo (colored shape) / CTAs: "Open" / "Not now"
- **ui**: Suggestion modal with embedded Google Meet brand display. Branded CTA.
- **flow-hint**: Tapped "Join Setup -AI.com" suggestion.
- **notes**: **CALENDAR + INTEGRATION-AWARE SUGGESTIONS.** Calendar events with video-conferencing URLs get a "Join X" suggestion with embedded brand (Meet/Zoom/etc.). One-tap join. Pattern: when a calendar event has a join URL, surface a join-button suggestion close to the event time.
  - "Setup -AI.com" = the company Liban is fundraising for / working on. The agent recognizes the meeting name and surfaces a meeting-join card.

### IMG_7755.PNG ⭐⭐
- **bucket**: HM (Coming Up feed)
- **summary**: Home at 10:15 — NEW greeting "Busy Wednesday ahead with Leanda" + "Coming Up" feed with multi-action cards
- **state**: Home, 10:15 PM
- **copy**: Greeting: "Busy Wednesday ahead with Leanda" / Pills: "2421 E 22nd Ave / 57°F · **Wear a jacket** / 2 events today / 1 reminder." Heading: "Coming Up." Cards:
  1. "📅 Leanda x Liban at 📅 9:00 AM Wednesday — Cafe Astoria, ↗ 180 Grand Ave, St Paul, MN 55102, USA / via 📅 / 2 actions >" (blue arrow)
  2. "🗂 Your Google One storage is 79% full. You can manage your files or upgrade your plan now to avoid running out of space for new emails and photos. / via 📅 📧 / 2 actions >"
- **ui**: NEW feed heading "Coming Up" (distinct from "Suggested For You" earlier in the day). Each card has structured event detail + multi-source attribution badge + "N actions >" expand affordance in blue.
- **flow-hint**: 26 minutes after the prior home views — feed has evolved into a temporal "what's next" view.
- **notes**:
  - **TWO DISTINCT FEED MODES IN HOME**:
    - **"Suggested For You"** = ad-hoc opinionated suggestions (visible 9:16–9:49 PM).
    - **"Coming Up"** = scheduled / upcoming items with structured detail (10:15+ PM).
    The feed heading itself shifts based on what's relevant. Time-of-day-aware ranking.
  - **GREETING REFERENCES A SPECIFIC PERSON**: "Busy Wednesday ahead with Leanda." Person extracted from tomorrow's calendar event. Personalized greeting tone.
  - **WEATHER PILL EVOLVED**: "Wear a jacket" replaces "Layers needed" — same weather data, different agent recommendation (later evening = colder, "jacket" is more definitive than "layers").
  - **MULTI-SOURCE ATTRIBUTION**: "via 📅 📧" on the Google One card — Calendar AND Email contributed to surfacing. Multi-source data fusion shown transparently.
  - **"2 actions >"** affordance — multi-action drawer. Tap chevron to expand into action options (revealed in 7763).

### IMG_7756.PNG ⭐
- **bucket**: AT (User asks "put this in the app not here")
- **summary**: Agent thread — user EXPLICITLY requests recipe in app not in iMessage; agent generates app-link
- **state**: iMessage, 10:29 PM
- **copy**:
  - Poppy (truncated context): "...still spring, try an asparagus and lemon pasta — ...the aspara... with ... in cookin... [noodles] with lemon juice, ze... [a little] parmesan. It's su... [fresh], and perfect for a simple weeknight dinner."
  - User (blue): "Can you put this as a step by step guide in the app not here" (Read 10:28 PM)
  - Poppy: "Step-by-step recipe for tonight's dinner."
  - Link preview loading: "askpoppy.app"
- **ui**: Standard iMessage thread. iOS keyboard at bottom.
- **flow-hint**: User mid-conversation about dinner; explicitly asks for richer format than chat.
- **notes**: **USER ARTICULATES THE CROSS-SURFACE PARADIGM**: "Can you put this as a step by step guide in the app not here." Liban explicitly distinguishes "here" (iMessage) from "in the app" — and asks for the rich-format version. The agent immediately complies by generating an askpoppy.app link. **THIS CONFIRMS USERS PERCEIVE THE TWO SURFACES AS DIFFERENT TOOLS** with different affordances. They know iMessage is good for quick reply, the app is good for visual structure. They can ASK for the right tool. CareSupport implication: users will articulate this preference too — design the surfaces such that EITHER can hand off to the other.

### IMG_7757.PNG ⭐
- **bucket**: HM (Deep-link landing — recipe as calendar event)
- **summary**: Recipe deep-link opens — "Add recipe to calendar" with timeline preview at 11 PM
- **state**: Poppy app from iMessage deep-link, 10:29 PM
- **copy**: Back link: "Messages." Heading: "📅 Add recipe to calendar / Step-by-step recipe for tonight's dinner." Date: May 11, 2026 | 10:35 PM. Calendar: Default. Timeline 5 PM–11 PM with blue block "Asparagus and Lemon Pasta Recipe" at 11 PM. CTAs: "📅 Create Event" / "Remind me instead" / "Not now"
- **ui**: Same event-creator modal pattern as 7717. Timeline view with single event block. Note Default Calendar is now selectable (Default ↕ menu).
- **flow-hint**: Tapped recipe link from iMessage.
- **notes**: The recipe was routed to a CALENDAR EVENT slot. Pattern: app-side, structured content becomes time-blockable. A recipe becomes a 1-hour "cooking" event you can pin to a time slot. Subtle agentive framing: "things you'd like to do" should occupy actual time on your calendar.

### IMG_7758.PNG ⭐
- **bucket**: HM (Recipe rendered as REMINDER with notes)
- **summary**: Same screen — scrolled to "Create Reminder" variant with full recipe steps in Notes field
- **state**: Same screen, 10:29 PM, scrolled
- **copy**: Heading: "Add recipe to calendar / Step-by-step recipe for tonight's dinner." Title: "Asparagus and Lemon Pasta Recipe." Notes:
  1. "Boil pasta and sauté asparagus with garlic in a pan."
  2. "Toss cooked pasta into the pan with the asparagus."
  3. "Stir in fresh lemon juice, lemon zest, and..." (truncated)
  Remind me: May 11, 2026 | 10:35 PM. CTA: "Create Reminder" / "Undo" / "Not now"
- **ui**: Form with Title + Notes + Remind-me. CTA changed from "Create Event" to "Create Reminder" — same input form, alternate destination action.
- **flow-hint**: Scrolled in the same modal.
- **notes**: **RECIPE TEXT → STRUCTURED FIELDS.** The free-form recipe from chat was parsed into:
  - Title: "Asparagus and Lemon Pasta Recipe"
  - Numbered steps in Notes field (1, 2, 3 ...)
  - Remind-me time pre-populated
  Then user can either Create Event (calendar slot) OR Create Reminder (with steps as notes). Two destinations from one source. The "Undo" CTA is unusual — implies the action is reversible OR that the agent created a draft and user can dismiss it. Pattern: agent-generated artifacts have UNDO affordances, not just confirm/cancel.

### IMG_7759.PNG ⭐⭐
- **bucket**: AT (Evening check-in proactive)
- **summary**: Agent thread — proactive evening check-in "How was your day? Anything on your mind for tomorrow? 🌙"
- **state**: iMessage, 11:54 PM
- **copy**:
  - (Top context, truncated visible): "Step-by-step recipe... [tonight]'s dinner."
  - Loaded link preview: "Add recipe to calendar / askpoppy.app"
  - Poppy: "Hey! How was your day? Anything on your mind for tomorrow? 🌙"
  - "Today 11:53 PM"
  - User (blue): "Add go to work at the coven on Nicollet Ave by 9am from my current location" (Read 11:54 PM)
  - Poppy: "It's about a 6 minute drive from here."
  - Link preview loading: "askpoppy.app"
- **ui**: iMessage. Moon emoji 🌙 in agent message.
- **flow-hint**: User's day winding down; agent initiates evening check-in.
- **notes**: **PROACTIVE EVENING CHECK-IN.** This is the "Check-ins" event class from Nudges settings (7686). Time: 11:53 PM — late evening. Voice:
  - "Hey!" — casual greeting, not "Hello" or "Good evening."
  - "How was your day?" — open question, no specific anchor.
  - "Anything on your mind for tomorrow?" — invites planning behavior.
  - "🌙" — emoji bookend, sets nighttime tone.
  This is the agent's MOST HUMAN moment seen so far. Compare to morning briefing tone (proactive informational) or suggestion-card tone (recommending) — this is RELATIONAL, not utilitarian. Pattern: end-of-day touches should feel like a friend texting, not a tool reminding.
  - User responds with WORK PLANNING REQUEST despite the open prompt — "Add go to work at the coven on Nicollet Ave by 9am from my current location." The agent immediately handles distance lookup + generates a directions deep-link.
  - "the coven" — user's affectionate name for their workplace. The agent doesn't ask what "the coven" is; treats it as a known referent. Suggests memory of user's vocabulary OR willingness to interpret loosely.

### IMG_7760.PNG
- **bucket**: AT (Link preview — directions)
- **summary**: Agent thread — "Getting to Nicollet Ave" link preview loaded
- **state**: iMessage, 11:54 PM
- **copy**: Same conversation. Link preview now rendered: card with map-pin icon, title "Getting to Nicollet Ave / Tap to open in Poppy" / Below: subtitle "Getting to Nicollet Ave / askpoppy.app"
- **ui**: Rich link card with custom map pin illustration.
- **flow-hint**: Preview loaded.
- **notes**: Confirms cross-surface bridge mechanic again — directions artifact at askpoppy.app/... renders as iMessage rich preview, taps into app. Reused mechanic across many content types (grocery list, recipe, directions, plans, etc.).

### IMG_7761.PNG
- **bucket**: HM (Deep-link landing — directions)
- **summary**: Directions deep-link opens — Apple Maps inline with route from current location to Nicollet Ave
- **state**: Poppy app, 11:55 PM
- **copy**: Back: "Messages." Heading: "📌 Getting to Nicollet Ave / It's about a 6 minute drive from here." Apple Maps inline showing route (Destination pin at top, Start dot at right, blue route line through Minneapolis area). Tabs: Driving (selected) | Walking | Transit. Stats: "⏱ Duration 11m | 📏 Distance 3.5 mi." Address: "Nicollet Ave, Minneapolis, MN." CTAs: "Open in Maps" / "Order ride instead" / "Not now."
- **ui**: Same Maps modal pattern as 7722 / 7723, content adapted for new destination.
- **flow-hint**: Tapped the link from iMessage.
- **notes**:
  - **DISCREPANCY**: agent said "6 minute drive" in chat (7759); but Maps shows "11m" / "3.5 mi." The agent's quick estimate (probably a heuristic based on distance) differs from Apple's full route compute. Worth noting agent claims aren't always precise.
  - "Nicollet Ave, Minneapolis, MN" — generic; Liban said "the coven on Nicollet Ave" — agent picked Nicollet Ave as the address. The destination isn't specific to "the coven" — agent couldn't resolve the local name to an exact address. Honest behavior, but missing the specific spot.

### IMG_7762.PNG ⭐
- **bucket**: HM (Next-day continuity)
- **summary**: Home next morning (12:05) — greeting evolved using user's OWN LANGUAGE ("the Coven")
- **state**: Home, 12:05 (Wednesday early morning)
- **copy**: Greeting: "Leave by 9am for the Coven tomorrow." Pills: location, weather "56°F · Layers need...", "2 events today / 1 reminder." Heading: "Coming Up":
  - "📅 Rotary Club at 📅 7:00 AM Wednesday — Minneapolis Club, ↗ 729 2nd Ave S, Minneapolis, MN 55402, USA" / via 📅 / 2 actions >
  - "📅 Leanda x Liban at 📅 9:00 AM Wednesday — Cafe Astoria, ↗ 180 Grand Ave, St Paul, MN 55102, USA" / via 📅 / 2 actions >
  - "📨 Email from B. Kano: Meeting Agenda 📅 May 12, 2026" (partial)
- **ui**: Same Coming Up pattern; three cards visible.
- **flow-hint**: Cross-day — user is now seeing the home Wednesday morning at 12:05 AM (or screenshot at midnight of the new day).
- **notes**: **MASSIVE — CROSS-DAY CONTINUITY USING USER VOCABULARY.** The greeting "Leave by 9am for the Coven tomorrow" uses Liban's OWN PHRASE ("the Coven") from his iMessage at 11:54 PM (7759). The agent:
  1. STORED the user's affectionate term for their workplace.
  2. SURFACED IT in the home greeting the next day.
  3. CONVERTED the request ("by 9am from my current location") into an actionable greeting ("Leave by 9am for the Coven tomorrow") with the right framing (LEAVE BY, not "go to" — accounts for travel time).
  - This is **personalized voice memory at the agent level**. Compare to ChatGPT/Claude where each conversation is amnesiac; Poppy carries user language across the day, across surfaces.
  - **"Email from B. Kano: Meeting Agenda"** — another email-sourced suggestion. B. Kano is presumably a family member (Liban's surname is Kano). Inbox-aware.

### IMG_7763.PNG ⭐
- **bucket**: HM (Coming Up multi-action drawer)
- **summary**: Home Coming Up — "2 actions" expanded on Rotary Club card to show inline action options
- **state**: Home, 12:05 (same as 7762), Rotary Club card expanded
- **copy**: Same greeting/pills. Coming Up:
  - "📅 Rotary Club at 7:00 AM Wednesday — Minneapolis Club, 729 2nd Ave S, Minneapolis, MN 55402, USA / via 📅 / 2 actions [v]"
    - Expanded child action 1: "📌 Get directions to Rotary Club >"
    - Expanded child action 2: "📅 Open Rotary Club >"
  - "📅 Leanda x Liban at 9:00 AM Wednesday — Cafe Astoria..." (collapsed)
- **ui**: Multi-action drawer mechanic — chevron "2 actions" on a Coming Up card expands inline to reveal action child rows. Each child is a tappable row with leading icon + name + chevron.
- **flow-hint**: User tapped "2 actions >" on the Rotary Club card.
- **notes**: **MULTI-ACTION DRAWER** = perfect compact UX for cards that have several actionable paths.
  - **Two actions per event card**: "Get directions to X" (navigation) + "Open X" (event detail). Same two-action class as the suggestion drill-downs earlier — navigation + open.
  - Inline expansion (drawer) vs full-modal pop-out — keeps the user in the home feed. Reduces context switching.
  - Pattern to STEAL: cards with multiple downstream actions should expand inline before navigating away. CareSupport: "Mom's appointment Friday 2pm — [Get directions] [Confirm with Helper Mei] [Add to schedule]." Inline multi-action.

---

## Phase 2 — TRIAGE COMPLETE

145 screenshots covered. IMG_7753 and IMG_7754 are not present in the source folder (skipped IMG numbers, not missing files).

### Coverage by bucket (provisional, pending Phase 3 lock)

- **MK** marketing: 2 (IMG_7617, 7618)
- **ON** onboarding: 28 (IMG_7619 through 7659, plus 7737-7742 connection flows)
- **HM** home + suggestions + day view + inbox + cascades + multi-actions: ~50 (the bulk of the feature surface)
- **AT** agent-thread: 7 (IMG_7720, 7726, 7743, 7744, 7745, 7756, 7759, 7760)
- **ST** settings + memories + connected apps + magic cue + experimental: ~40
- **ES** edge-state: a few (IMG_7696 calendar-not-connected, IMG_7719 alarms-empty, IMG_7725 iOS system prompt)
- **SG, RT, NT, HS** never observed as distinct buckets — these intents are absorbed into HM (suggestions = SG-equivalent, reminders inbox = RT-equivalent, calls-history = HS-equivalent, notification banner in 7699 = NT-evidence)

### Taxonomy refinement recommendations (for Phase 3)

Original 12 buckets were too granular. Recommend collapse:
- Merge SG (suggestions) into HM — they ARE the home feed
- Merge RT (routines) into HM — Inbox of reminders is part of home
- Merge HS (history) into HM — Memories' Calls sub-screen
- Merge NT (notifications) into HM with sub-folder for the one banner moment
- Keep MK, ON, HM, AT, ST, ES, IN (consolidated integration screens), and add: **EXP** (experimental — Lock Screen + Voice Notifications + Magic Cue), **MEM** (memory hub + sub-screens, distinct from settings)

Proposed final buckets (8): MK / ON / HM / AT / ST / EXP / MEM / ES

This will get refined when filing — some screenshots (especially settings deep-dives like Magic Cue setup) are border cases.

### Key cross-cutting findings (for Phase 5 synthesis)

Already tagged with ⭐ in the manifest:
- Two-number telephony (510 voice + 313 messages)
- Mac companion app (iMessage history sync via macOS chat.db)
- Lock Screen alarm-chain hack (Shortcuts + Wallpaper API loop)
- Magic Cue context-aware meta-launcher
- Plan with Poppy (multi-party group iMessage agent)
- askpoppy.app cross-surface deep-linking
- Memory architecture (Places/Preferences/People/Calls with named categories)
- "Always-on Poppy" voice channel (Push-to-talk)
- Suggestion explainability (Context / Sources / Last Updated / Feedback)
- Three-preset cadence (Quiet/Balanced/Active)
- Color-coded verb shortcuts (Create=purple, Order=green, Go=blue, Search=yellow)
- 10 reminder templates (lifestyle watchers, not just timed alerts)
- Agent cross-surface follow-through (Founders Day loop closure)
- Cross-day continuity using user's own language ("the Coven")
- Per-integration granular consent + per-calendar sync
- Source-badge attribution on suggestions (via 📅 / 📧)
- Multi-action drawers on event cards
- Graceful failure protocol (admits gaps, offers fix path)



Filed 145 files into 8 buckets.

| Bucket | IMG | New path |
|--------|-----|----------|
| MK | IMG_7617.PNG | `marketing/01-appstore-notification-stream.png` |
| MK | IMG_7618.PNG | `marketing/02-appstore-meet-poppy.png` |
| ON | IMG_7619.PNG | `onboarding/01-welcome-phone-empty.png` |
| ON | IMG_7620.PNG | `onboarding/02-welcome-phone-empty-dup.png` |
| ON | IMG_7621.PNG | `onboarding/03-sms-verify-empty.png` |
| ON | IMG_7622.PNG | `onboarding/04-sms-verify-filled-loading.png` |
| ON | IMG_7623.PNG | `onboarding/05-name-capture.png` |
| ON | IMG_7624.PNG | `onboarding/06-jtbd-unchecked.png` |
| ON | IMG_7625.PNG | `onboarding/07-jtbd-all-selected.png` |
| ON | IMG_7626.PNG | `onboarding/08-integration-gmail.png` |
| ON | IMG_7627.PNG | `onboarding/09-integration-outlook.png` |
| ON | IMG_7628.PNG | `onboarding/10-integration-calendar.png` |
| ON | IMG_7629.PNG | `onboarding/11-integration-add-more-later.png` |
| ON | IMG_7630.PNG | `onboarding/12-transparency-intro.png` |
| ON | IMG_7631.PNG | `onboarding/13-transparency-contacts.png` |
| ON | IMG_7632.PNG | `onboarding/14-transparency-calendar.png` |
| ON | IMG_7633.PNG | `onboarding/15-transparency-email.png` |
| ON | IMG_7634.PNG | `onboarding/16-transparency-health.png` |
| ON | IMG_7635.PNG | `onboarding/17-transparency-location.png` |
| ON | IMG_7636.PNG | `onboarding/18-transparency-messages-calls-MACAPP.png` |
| ON | IMG_7637.PNG | `onboarding/19-transparency-photos.png` |
| ON | IMG_7638.PNG | `onboarding/20-transparency-music.png` |
| ON | IMG_7639.PNG | `onboarding/21-transparency-wallet.png` |
| ON | IMG_7640.PNG | `onboarding/22-transparency-zdr.png` |
| ON | IMG_7641.PNG | `onboarding/23-transparency-encryption.png` |
| ON | IMG_7642.PNG | `onboarding/24-transparency-control-exit.png` |
| ON | IMG_7643.PNG | `onboarding/25-permissions-request.png` |
| ON | IMG_7644.PNG | `onboarding/26-widget-coming-up.png` |
| ON | IMG_7645.PNG | `onboarding/27-widget-actions-list.png` |
| ON | IMG_7646.PNG | `onboarding/28-widget-quick-actions-grid.png` |
| ON | IMG_7647.PNG | `onboarding/29-channel-imessage-or-whatsapp.png` |
| ON | IMG_7648.PNG | `onboarding/30-channel-imessage-selected.png` |
| ON | IMG_7649.PNG | `onboarding/31-ios-contact-add-poppy.png` |
| ON | IMG_7650.PNG | `onboarding/32-ios-contact-two-numbers.png` |
| ON | IMG_7651.PNG | `onboarding/33-cadence-balanced.png` |
| ON | IMG_7652.PNG | `onboarding/34-cadence-quiet.png` |
| ON | IMG_7653.PNG | `onboarding/35-cadence-active.png` |
| ON | IMG_7654.PNG | `onboarding/36-paywall-sprout.png` |
| ON | IMG_7655.PNG | `onboarding/37-paywall-bloom.png` |
| ON | IMG_7656.PNG | `onboarding/38-paywall-features-mid.png` |
| ON | IMG_7657.PNG | `onboarding/39-paywall-features-texting.png` |
| ON | IMG_7658.PNG | `onboarding/40-paywall-loading.png` |
| ON | IMG_7659.PNG | `onboarding/41-post-payment-loading.png` |
| HM | IMG_7660.PNG | `home/01-home-suggestions-first.png` |
| HM | IMG_7661.PNG | `home/02-home-shortcuts-first.png` |
| HM | IMG_7691.PNG | `home/03-home-shortcuts-canonical.png` |
| HM | IMG_7692.PNG | `home/04-cascade-create-tap.png` |
| HM | IMG_7693.PNG | `home/05-cascade-create-event.png` |
| HM | IMG_7694.PNG | `home/06-cascade-create-event-tomorrow.png` |
| HM | IMG_7695.PNG | `home/07-cascade-event-date-picker.png` |
| HM | IMG_7696.PNG | `home/08-event-calendar-not-connected.png` |
| HM | IMG_7697.PNG | `home/09-event-timeline-view.png` |
| HM | IMG_7698.PNG | `home/10-home-suggestion-completed-state.png` |
| HM | IMG_7699.PNG | `home/11-cascade-search-with-imessage-banner.png` |
| HM | IMG_7700.PNG | `home/12-cascade-search-web.png` |
| HM | IMG_7701.PNG | `home/13-cascade-search-web-input.png` |
| HM | IMG_7702.PNG | `home/14-cascade-go-tap.png` |
| HM | IMG_7703.PNG | `home/15-cascade-go-other-input.png` |
| HM | IMG_7704.PNG | `home/16-cascade-create-revisit.png` |
| HM | IMG_7705.PNG | `home/17-reminder-builder-templates.png` |
| HM | IMG_7706.PNG | `home/18-reminder-builder-typed.png` |
| HM | IMG_7707.PNG | `home/19-reminder-builder-triggers.png` |
| HM | IMG_7708.PNG | `home/20-reminder-builder-onetime.png` |
| HM | IMG_7709.PNG | `home/21-timer-modal.png` |
| HM | IMG_7710.PNG | `home/22-alarm-modal.png` |
| HM | IMG_7711.PNG | `home/23-cascade-order-status-pill-changed.png` |
| HM | IMG_7712.PNG | `home/24-cascade-order-ride.png` |
| HM | IMG_7713.PNG | `home/25-cascade-order-restaurant.png` |
| HM | IMG_7714.PNG | `home/26-cascade-order-groceries-instacart.png` |
| HM | IMG_7715.PNG | `home/27-home-push-to-talk-pill.png` |
| HM | IMG_7716.PNG | `home/28-suggestions-grid-evolved.png` |
| HM | IMG_7717.PNG | `home/29-day-view.png` |
| HM | IMG_7718.PNG | `home/30-inbox-reminders-banner.png` |
| HM | IMG_7719.PNG | `home/31-inbox-alarms-empty.png` |
| HM | IMG_7721.PNG | `home/32-weather-pill-drilldown.png` |
| HM | IMG_7722.PNG | `home/33-suggestion-directions-modal.png` |
| HM | IMG_7723.PNG | `home/34-suggestion-uber-request.png` |
| HM | IMG_7724.PNG | `home/35-suggestion-lyft-request.png` |
| HM | IMG_7727.PNG | `home/36-home-longform-cards-with-why.png` |
| HM | IMG_7728.PNG | `home/37-why-suggested-salmon.png` |
| HM | IMG_7729.PNG | `home/38-why-suggested-sql.png` |
| HM | IMG_7746.PNG | `home/39-deeplink-grocery-list-event.png` |
| HM | IMG_7747.PNG | `home/40-home-source-badged-cards.png` |
| HM | IMG_7748.PNG | `home/41-home-founders-day-followthrough.png` |
| HM | IMG_7749.PNG | `home/42-suggestions-grid-mode.png` |
| HM | IMG_7750.PNG | `home/43-suggestions-strikethrough-completed.png` |
| HM | IMG_7751.PNG | `home/44-suggestion-usaa-bill.png` |
| HM | IMG_7752.PNG | `home/45-suggestion-join-setup-meeting.png` |
| HM | IMG_7755.PNG | `home/46-coming-up-feed.png` |
| HM | IMG_7757.PNG | `home/47-deeplink-recipe-event.png` |
| HM | IMG_7758.PNG | `home/48-recipe-as-reminder.png` |
| HM | IMG_7761.PNG | `home/49-deeplink-directions.png` |
| HM | IMG_7762.PNG | `home/50-home-next-day-the-coven.png` |
| HM | IMG_7763.PNG | `home/51-coming-up-multiaction-drawer.png` |
| AT | IMG_7720.PNG | `agent-thread/01-first-contact-cat-image.png` |
| AT | IMG_7726.PNG | `agent-thread/02-calendar-gap-admission.png` |
| AT | IMG_7743.PNG | `agent-thread/03-recipe-list-memory-prompt.png` |
| AT | IMG_7744.PNG | `agent-thread/04-link-preview-loading.png` |
| AT | IMG_7745.PNG | `agent-thread/05-link-preview-grocery-loaded.png` |
| AT | IMG_7756.PNG | `agent-thread/06-user-asks-app-not-here.png` |
| AT | IMG_7759.PNG | `agent-thread/07-evening-checkin-moon.png` |
| AT | IMG_7760.PNG | `agent-thread/08-link-preview-directions.png` |
| MEM | IMG_7677.PNG | `memories/01-memories-hub.png` |
| MEM | IMG_7678.PNG | `memories/02-people-empty.png` |
| MEM | IMG_7679.PNG | `memories/03-calls-empty.png` |
| MEM | IMG_7680.PNG | `memories/04-likes-empty.png` |
| MEM | IMG_7681.PNG | `memories/05-dislikes-empty.png` |
| MEM | IMG_7682.PNG | `memories/06-habits-routines-empty.png` |
| MEM | IMG_7683.PNG | `memories/07-food-diet-empty.png` |
| MEM | IMG_7684.PNG | `memories/08-personal-info-locale-facts.png` |
| MEM | IMG_7685.PNG | `memories/09-places-home-work-cards.png` |
| ST | IMG_7662.PNG | `settings/01-settings-main.png` |
| ST | IMG_7663.PNG | `settings/02-settings-scrolled-signout-footer.png` |
| ST | IMG_7672.PNG | `settings/03-feedback-inline-expand.png` |
| ST | IMG_7686.PNG | `settings/04-nudges-delivery-channels.png` |
| ST | IMG_7687.PNG | `settings/05-nudges-frequency-quiet-hours.png` |
| ST | IMG_7688.PNG | `settings/06-bloom-plan-features-top.png` |
| ST | IMG_7689.PNG | `settings/07-bloom-plan-features-bottom.png` |
| ST | IMG_7690.PNG | `settings/08-edit-profile-popover.png` |
| ST | IMG_7730.PNG | `settings/09-connected-apps-required-productivity.png` |
| ST | IMG_7731.PNG | `settings/10-connected-apps-social.png` |
| ST | IMG_7732.PNG | `settings/11-connected-apps-health-home-aes256.png` |
| ST | IMG_7733.PNG | `settings/12-google-services-list.png` |
| ST | IMG_7734.PNG | `settings/13-icloud-calendar-sync.png` |
| ST | IMG_7735.PNG | `settings/14-mac-app-required-airdrop.png` |
| ST | IMG_7736.PNG | `settings/15-connected-apps-selections.png` |
| ST | IMG_7737.PNG | `settings/16-google-gmail-syncing.png` |
| ST | IMG_7738.PNG | `settings/17-google-gmail-connected.png` |
| ST | IMG_7739.PNG | `settings/18-google-oauth-web.png` |
| ST | IMG_7740.PNG | `settings/19-google-calendar-connected.png` |
| ST | IMG_7741.PNG | `settings/20-google-calendar-sync-all.png` |
| ST | IMG_7742.PNG | `settings/21-google-calendar-sync-trimmed.png` |
| EXP | IMG_7664.PNG | `experimental/01-experimental-menu.png` |
| EXP | IMG_7665.PNG | `experimental/02-lockscreen-briefing-dark.png` |
| EXP | IMG_7666.PNG | `experimental/03-lockscreen-briefing-light.png` |
| EXP | IMG_7667.PNG | `experimental/04-lockscreen-briefing-setup-instructions.png` |
| EXP | IMG_7668.PNG | `experimental/05-ios-shortcut-share.png` |
| EXP | IMG_7669.PNG | `experimental/06-ios-shortcut-actions-top.png` |
| EXP | IMG_7670.PNG | `experimental/07-ios-shortcut-actions-bottom.png` |
| EXP | IMG_7671.PNG | `experimental/08-voice-notifications-setup.png` |
| EXP | IMG_7673.PNG | `experimental/09-magic-cue-top.png` |
| EXP | IMG_7674.PNG | `experimental/10-magic-cue-dup.png` |
| EXP | IMG_7675.PNG | `experimental/11-magic-cue-dup2.png` |
| EXP | IMG_7676.PNG | `experimental/12-magic-cue-how-it-works-setup.png` |
| ES | IMG_7725.PNG | `edge-states/01-ios-wants-to-open-uber.png` |
