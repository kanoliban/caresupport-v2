# Rob Multiplayer Activation Checklist

Status: Phase 2G preparation.

This checklist activates the first Rob-style multiplayer loop in the safest
order:

1. Pick the target Convex deployment explicitly.
2. Seed Rob's coordinator care case in the selected deployment.
3. Verify the care graph state in Convex.
4. Run controlled outreach with test numbers.
5. Confirm replies update Convex without UI intervention.
6. Only then replace test numbers with Rob-approved real caregiver numbers.

Do not use real caregiver numbers until the controlled test passes.
Do not target production until Rob's coordinator phone, Rob's Linq chat ID, and
the approved controlled test numbers are confirmed.

## Operator Runner

After the target Convex deployment is resumed, the safe preflight sequence can be
run with:

```bash
ROB_PHONE="+1REPLACE_WITH_ROB_TEST_OR_APPROVED_PHONE" \
ROB_CHAT_ID="REPLACE_WITH_ROB_LINQ_CHAT_ID" \
JIM_TEST_PHONE="+1TEST_NUMBER_1" \
JENNIFER_TEST_PHONE="+1TEST_NUMBER_2" \
npm run rob:activate:controlled
```

Optional:

```bash
JIM_TEST_LINQ_CHAT_ID="TEST_CHAT_1"
JENNIFER_TEST_LINQ_CHAT_ID="TEST_CHAT_2"
CONVEX_DEPLOYMENT_NAME="dev:REPLACE_WITH_DEPLOYMENT"
CONVEX_ENV_FILE=".env.local"
```

For production, use `--prod` or `CONVEX_PROD=true` instead of
`CONVEX_DEPLOYMENT_NAME`:

```bash
ROB_PHONE="+1REPLACE_WITH_ROB_TEST_OR_APPROVED_PHONE" \
ROB_CHAT_ID="REPLACE_WITH_ROB_LINQ_CHAT_ID" \
JIM_TEST_PHONE="+1TEST_NUMBER_1" \
JENNIFER_TEST_PHONE="+1TEST_NUMBER_2" \
npm run rob:activate:controlled -- --prod
```

The runner does not send Linq/iMessage traffic. It checks that the deployment is
runnable, seeds Rob with the approved test contacts, runs readiness, runs the
no-Linq dry run, verifies the report, resets dry-run state, and verifies
readiness again. After it passes, continue with the live test-number outreach
from Rob's coordinator thread.

After the test-number replies arrive, verify the live run with:

```bash
ROB_PHONE="+1REPLACE_WITH_ROB_TEST_OR_APPROVED_PHONE" \
npm run rob:verify:controlled -- --prod
```

The verifier requires `admin:getRobControlledLoopReport` to pass with live
reply-audit evidence for Jim/Jennifer and a fresh Rob status message after the
latest controlled caregiver reply.

## Seed Dev Fixture

Use a dev Convex deployment, not production.

```bash
npx convex run admin:seedRobMultiplayerFixture '{
  "robPhone": "+1REPLACE_WITH_ROB_TEST_OR_APPROVED_PHONE",
  "robChatId": "REPLACE_WITH_ROB_LINQ_CHAT_ID",
  "useTestContactPhones": true
}'
```

The fixture is idempotent. Running it again updates the same Rob care case when
`robPhone` already exists.

After seeding, run the readiness check:

```bash
npx convex run admin:getRobMultiplayerReadiness '{
  "robPhone": "+1REPLACE_WITH_ROB_TEST_OR_APPROVED_PHONE"
}'
```

The first seed with `useTestContactPhones: true` should show the fixture exists
but is **not** ready for controlled Linq outreach, because Jim/Jennifer still use
generated placeholder fixture numbers. That is intentional.

## Seeded State

The fixture creates:

- one active `careCases` row for `Rob Wudlick`
- one active primary `users` row for Rob
- 15 `careContacts`
- 5 recurring `scheduleItems`
- one controlled `coordinationEvents` row titled
  `Rob schedule confirmation controlled test`
- one durable `memoryEntries` note describing the multiplayer activation purpose

Controlled pending contacts:

- Jim Nelson
- Jennifer

Routine schedule rows:

- Jim Nelson coverage: Monday-Friday 9am-5pm
- Jennifer overnight coverage: Monday/Tuesday 8pm-8am
- Sarah overnight coverage: Wednesday/Thursday 8pm-8am
- Ella weekend overnight coverage: Friday/Saturday/Sunday 8pm-9am
- Olena weekend daytime coverage: Saturday/Sunday 9am-1pm

Sensitive handling:

- Luann is included as family/care context but is not textable by default.
- Grace is included but not textable by default because she is on summer break.

## Controlled Outreach Test

Use test numbers first. The test numbers can be installed by passing
`contactOverrides`:

```bash
npx convex run admin:seedRobMultiplayerFixture '{
  "robPhone": "+1REPLACE_WITH_ROB_TEST_OR_APPROVED_PHONE",
  "robChatId": "REPLACE_WITH_ROB_LINQ_CHAT_ID",
  "useTestContactPhones": false,
  "contactOverrides": [
    { "key": "jim", "phone": "+1TEST_NUMBER_1", "linqChatId": "TEST_CHAT_1" },
    { "key": "jennifer", "phone": "+1TEST_NUMBER_2", "linqChatId": "TEST_CHAT_2" }
  ]
}'
```

Then run readiness again:

```bash
npx convex run admin:getRobMultiplayerReadiness '{
  "robPhone": "+1REPLACE_WITH_ROB_TEST_OR_APPROVED_PHONE"
}'
```

Do not proceed until `readyForControlledOutreach` is `true` and `blockers` is an
empty array.

## No-Linq Dry Run

Before sending real Linq/iMessage traffic, run the no-Linq dry run against the
same seeded fixture:

```bash
npx convex run admin:runRobControlledLoopDryRun '{
  "robPhone": "+1REPLACE_WITH_ROB_TEST_OR_APPROVED_PHONE"
}'
```

This writes controlled outreach/reply/status rows into Convex without calling
Linq. It should return `ran: true` and `replyStatus: "confirmed"` for Jim and
Jennifer. Use this to verify the deployed care graph before the real test-number
outreach.

After the dry run, run the post-run report:

```bash
npx convex run admin:getRobControlledLoopReport '{
  "robPhone": "+1REPLACE_WITH_ROB_TEST_OR_APPROVED_PHONE"
}'
```

Do not proceed to live test-number outreach until `passed` is `true`. A dry run
may still include `live_reply_audit_missing:*` warnings because it does not enter
through the Linq webhook path. Those warnings should disappear during real
test-number outreach.

Because the dry run writes simulated confirmations, reset the controlled event
before sending real test-number messages:

```bash
npx convex run admin:resetRobControlledLoopAfterDryRun '{
  "robPhone": "+1REPLACE_WITH_ROB_TEST_OR_APPROVED_PHONE"
}'
```

Then run readiness again:

```bash
npx convex run admin:getRobMultiplayerReadiness '{
  "robPhone": "+1REPLACE_WITH_ROB_TEST_OR_APPROVED_PHONE"
}'
```

Only proceed when `readyForControlledOutreach` is back to `true`. The reset
cancels dry-run outreach attempts and restores Jim/Jennifer as pending contacts;
it does not send Linq/iMessage traffic.

Then initiate the test through Rob's coordinator thread:

```text
CareSupport, confirm Jim and Jennifer's schedule for the controlled Rob test.
```

Expected behavior:

- CareSupport proposes exact outreach and asks Rob for approval.
- Rob approves one exact outreach.
- CareSupport texts the selected test contact one-on-one.
- The caregiver/test contact replies by text.
- The reply maps to the existing Rob care case, care contact, coordination
  event, and outreach attempt.
- The event's confirmed/pending/declined arrays update in Convex.
- Rob receives a concise status update.
- If the caregiver does not reply, the follow-up scanner sends one lightweight
  reminder after the due time.

After both test contacts reply, run:

```bash
ROB_PHONE="+1REPLACE_WITH_ROB_TEST_OR_APPROVED_PHONE" \
npm run rob:verify:controlled
```

Do not move to real Rob caregiver numbers until this verifier succeeds.

## Pass Criteria

Controlled test passes when Convex shows:

- Rob's care case remains active.
- No new care case was created for the caregiver reply.
- The caregiver reply message has `careContactId`, `coordinationEventId`, and
  `outreachAttemptId`.
- The controlled event reflects the reply state.
- The outreach attempt remains source-linked and its follow-up clock is cleared
  or deferred.
- Rob's status message/audit is newer than the latest controlled caregiver
  reply, so stale dry-run updates do not count as live pass evidence.
- Audit logs include request, approval, sent, reply, and follow-up/status events
  as applicable.

Use `admin:getRobControlledLoopReport` as the authoritative pass/fail summary for
these criteria. The report must have `passed: true` before real Rob caregiver
numbers are used.

## Real Rob Activation

Move from test numbers to real caregiver numbers only after the controlled test
passes. For real activation:

1. Get Rob's explicit approval for the first real contacts.
2. Seed only those real contacts through `contactOverrides`.
3. Start with two caregivers, not the whole network.
4. Confirm replies update Convex correctly.
5. Expand to the rest of the network in small batches.

Do not bulk-message the whole care network on the first real run.
