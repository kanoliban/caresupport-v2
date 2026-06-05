# Rob Multiplayer Activation Checklist

Status: Phase 2G preparation.

This checklist activates the first Rob-style multiplayer loop in the safest
order:

1. Seed Rob's coordinator care case in dev.
2. Verify the care graph state in Convex.
3. Run controlled outreach with test numbers.
4. Confirm replies update Convex without UI intervention.
5. Only then replace test numbers with Rob-approved real caregiver numbers.

Do not use real caregiver numbers until the controlled test passes.

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

## Pass Criteria

Controlled test passes when Convex shows:

- Rob's care case remains active.
- No new care case was created for the caregiver reply.
- The caregiver reply message has `careContactId`, `coordinationEventId`, and
  `outreachAttemptId`.
- The controlled event reflects the reply state.
- The outreach attempt remains source-linked and its follow-up clock is cleared
  or deferred.
- Audit logs include request, approval, sent, reply, and follow-up/status events
  as applicable.

## Real Rob Activation

Move from test numbers to real caregiver numbers only after the controlled test
passes. For real activation:

1. Get Rob's explicit approval for the first real contacts.
2. Seed only those real contacts through `contactOverrides`.
3. Start with two caregivers, not the whole network.
4. Confirm replies update Convex correctly.
5. Expand to the rest of the network in small batches.

Do not bulk-message the whole care network on the first real run.
