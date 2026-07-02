# Incident: Group-Chat Auto-Onboarding & Credit Exhaustion

Date: 2026-06-28 → 2026-07-02 · Severity: SEV-1 (full AI outage ~14h) ·
Author: Claude Code session with Liban, 2026-07-02

## Summary

The CareSupport Linq number (+16504415695) was added to a 14-person iMessage
group chat ("222 curation group") containing humans and at least one other AI
agent (Tomo, tomo.ai, +14157700508). The runtime had no group-chat gate: it
auto-onboarded 11 group participants as separate users with care cases and
replied to every message from anyone in the group. Over 4 days this consumed
~1,500 full-pipeline AI calls, exhausting the OpenRouter credit balance. After
credits died, the unbounded failure fallback sent 63 identical apology texts
into the group — the exact spam pattern iMessage flags numbers for.

## Verified timeline (UTC)

| When | What | Evidence |
|------|------|----------|
| Jun 28 05:09:49 | Group chat created; our number added at creation with 13 others | Linq API `GET /chats/861da4a2…`: `is_group: true`, all `joined_at` identical |
| Jun 28 05:09:52–05:10:41 | Runtime auto-onboards 11 group participants as users + care cases | `users` table: 11 rows sharing chatId `861da4a2…` |
| Jun 28 → Jul 2 | 1,498 inbound → 1,498 assistant replies in group care cases | 2,996 of last 3,000 `messages` rows |
| Jul 2 00:14 | First `402 Insufficient credits` (OpenRouter) | auditLogs `j973h9sw…` |
| Jul 2 00:14 → 07:05 | Fallback "system issue" sent repeatedly, 63× to one thread, 5 in 3s at peak | Linq chat transcript |
| Jul 2 07:05 | Group participant +14155057855 sends "Your account has been banned. Thanks for being part of Series." ×4 — a Series-platform notice/joke, NOT a Linq ban | Linq messages `65715174…`, `67dbee11…`; Linq API healthy |
| Jul 2 08:02 | Founder's CTA test gets fallback → investigation begins | messages table |
| Jul 2 ~09:00 | Prod flipped to direct `ANTHROPIC_API_KEY` (OpenRouter key removed, backed up to Keychain) | convex env |
| Jul 2 09:18 | Left the group via Linq `/leave`; 11 junk users/cases archived; group registered in blocklist | Linq API `left_at`, `groupChats` table |

## Root causes

1. **No group-chat gate** — identity resolution assumed phone = person =
   1:1 care relationship. A group exploded that into N junk care cases and
   N-way public replies.
2. **No cost triage** — every message from anyone paid for a fully-loaded
   context + Sonnet call. No cheap tier in front.
3. **Unbounded failure fallback** — the error handler texted an apology per
   failed message with no dedup or budget, turning a quiet outage into a
   public spam loop.
4. **No alerting** — credits died at 00:14; discovered by accident at 08:02.

## What held

Care-case scoping is mechanical (`careCaseId`), so 4 days of strangers and a
foreign AI interrogating the agent leaked nothing: every junk user got an
isolated, empty care case. "Safety enforced mechanically, not by model
instruction" passed a live test.

## Fixes shipped (all 2026-07-02, branch liban/distribution)

- `e79cbc7` group-chat gate (webhook registry drop + Linq `is_group`
  verification for unfamiliar chats) + failure-fallback budget (1 per care
  case per 15 min, then quiet)
- `4c0eb8b` sentinel: ai_failure / user_burst / outbound_velocity alerts
  texted to founder with per-type cooldowns
- `809ca69` founder feedback loop (founder mode, dev_feedback → GitHub issues)
- `73d735f` doorman: strangers screened by a Haiku-tier first-contact agent
  (no tools, no PHI); knownAgents registry (Tomo seeded) + velocity
  heuristic, go-quiet on agent detection; daily reply budget per stranger

## Follow-ups

- Interaction/execution split (cost architecture):
  `docs/interaction-execution-split.md` — design written, not built.
- Fine-grained GitHub token for the feedback bridge (current one is repo-wide).
- Inbound rate-limiting on the webhook (beyond doorman budgets).
- Group chat as a *product* (multiplayer runtime) remains the roadmap; the
  gate is a pause, not a position.

## Lessons

1. Agent-to-agent contact is already routine on iMessage; every reply to a
   bot is a coin fed into a loop. Detect, go quiet, tell the founder.
2. Creating a care case must be earned through onboarding, not a side effect
   of receiving a text.
3. When degraded, go quiet — a chatty failure mode is worse than silence.
4. The system must tell the founder when it's sick; silence for 8 hours is a
   design defect, not bad luck.
