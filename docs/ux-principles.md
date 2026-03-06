# CareSupport UX Principles

## Core Philosophy

CareSupport slows down for the user's sake.

Caregivers are busy, tired, and often stressed. They're checking messages between tasks, during commutes, in waiting rooms. The agent should feel like communicating with a responsible, patient individual — not a system that dumps information at machine speed.

Patience goes both ways: CareSupport is patient with the user (never rushes them, never overwhelms), and signals patience *to* the user (by not replying instantly, by keeping messages short, by matching their energy).

## Principles

### 1. Brevity is respect

A caregiver scanning texts between med doses doesn't need five bubbles. They need the answer.

- 1-2 bubbles for most replies. 3 only for genuinely complex answers (full med list, weekly schedule).
- Match input energy: short question = short answer. "When's the next appointment?" deserves one sentence, not a paragraph.
- If you can say it in one bubble, never use two.

### 2. Plain text only

iMessage renders markdown as literal characters. `**bold**` shows as `**bold**` — it looks broken and robotic.

- No bold, no headers, no bullet lists, no numbered lists.
- Structure through natural language and line breaks, not formatting syntax.
- This is a text conversation, not a document.

### 3. Pacing signals humanity

Instant replies at machine speed break the illusion. A wall of bubbles arriving in 3 seconds feels like talking to a bot.

- First response delay: enough to feel like someone reading and thinking.
- Inter-bubble delay: enough that each bubble arrives as its own thought, not a burst.
- Longer messages warrant longer "thinking" time.
- The goal is conversational cadence, not throughput.

### 4. Empathy through restraint

Showing you understand someone's situation means not overwhelming them.

- Don't volunteer information they didn't ask for.
- Don't explain how you work unless asked.
- Don't list every capability when they asked about one.
- When someone says "say more about this," expand on *that* — don't give a tour.

## Known Violations (2026-03-06)

These were observed in live pilot testing:

| Issue | Example | Root Cause |
|-------|---------|------------|
| Markdown in SMS | `**Schedule:**` renders as literal asterisks | Claude ignores "plain text only" prompt instruction |
| Response length | 5 bubbles for "tell me about your capabilities" | Claude over-answers; prompt says max 3 but model ignores |
| Rapid-fire bubbles | All bubbles arrive within ~6 seconds | 800ms inter-bubble delay too short for 5 bubbles |
| No reply threading | "Say more about this" (reply to bubble) answered everything | Fixed in 8ea6bb3 — reply_to now extracted from Linq payload |

## Design Decisions for Fixes

### Prompt reinforcement
The prompt already contains the right instructions. The model isn't following them. Options:
- Move critical constraints (plain text, brevity, max bubbles) to a separate system block with higher salience
- Add a post-processing strip for markdown syntax (mechanical safety net)
- Reduce `sms_response` field description max char guidance from 450 to 320

### Pacing model
Current: flat 3s initial delay + 800ms between bubbles.
Better: scale delay with message complexity and bubble count. A 3-bubble response should take longer to "compose" than a 1-liner. Consider 1.5-2s per bubble for inter-bubble pacing.

### Mechanical enforcement
Don't rely solely on prompt compliance:
- Strip `**`, `##`, `- ` prefixes from outbound messages before sending
- Enforce max bubble count (3) in `splitIntoBubbles`, not just in the prompt
- Truncate individual bubbles that exceed 320 chars
