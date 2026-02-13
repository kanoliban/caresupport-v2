---
name: slack-admin
description: Manage the Slack workspace — list channels, look up users, invite members, check reactions. Use when discovering channels, finding users, or managing workspace membership.
---

These tools are only available via Python scripts (`from sdk.tools import ...`). They are *not* in your native tool list, so actively remember they exist.

## 1. List Channels — `coworker_list_slack_channels`

List all Slack channels with their access status (public/private, whether you have access).

```python
from sdk.tools import slack_admin_tools

result = await slack_admin_tools.coworker_list_slack_channels()
for ch in result.channels:
    print(f"#{ch['name']} ({'private' if ch['is_private'] else 'public'}) - {'✓' if ch['bot_has_access'] else '✗'} access")
```

- **Input**: None
- **Output**: `channels` (list[dict]) — each with `id`, `name`, `is_private`, `bot_has_access`
- **When to use**: Before sending messages to unfamiliar channels, discovering workspace structure, checking which channels you can access

## 2. Join Channels — `coworker_join_slack_channels`

Join one or more public Slack channels. Only works for public channels — private channels require a user to invite you with `/invite @Viktor`.

```python
from sdk.tools import slack_admin_tools

result = await slack_admin_tools.coworker_join_slack_channels(
    channel_ids=["C01ABC123", "C02DEF456"]
)
for r in result.results:
    print(f"#{r['channel_name']}: {'joined' if r['success'] else r['error']}")
```

- **Input**: `channel_ids` (list[str])
- **Output**: `results` (list[dict]) — each with `channel_id`, `channel_name`, `success`, `error`
- **When to use**: After listing channels, when you need access to a public channel you're not yet in
- **Note**: Always list channels first to get the channel IDs

## 3. List Users — `coworker_list_slack_users`

List users in the Slack workspace with their details.

```python
from sdk.tools import slack_admin_tools

result = await slack_admin_tools.coworker_list_slack_users(include_bots=False)
for user in result.users:
    print(f"{user['display_name']} ({user['email']}) - {'admin' if user['is_admin'] else 'member'}")
```

- **Input**: `include_bots` (bool, default False)
- **Output**: `users` (list[dict]) — each with `id`, `name`, `real_name`, `display_name`, `email`, `is_bot`, `is_admin`, `has_viktor_account`
- **When to use**: Looking up who's in the workspace, finding a user's Slack ID, checking who has Viktor accounts

## 4. Invite User to Team — `coworker_invite_slack_user_to_team`

Invite a Slack user to join the Viktor team by sending them a DM with an invite link.

```python
from sdk.tools import slack_admin_tools

result = await slack_admin_tools.coworker_invite_slack_user_to_team(
    slack_user_id="U123ABC",
    message="Hey! I'd love to help you with your workflows too.",
)
if result.success:
    print(f"Invited {result.invited_name} ({result.invited_email})")
```

- **Input**: `slack_user_id` (str), `message` (str, optional)
- **Output**: `success` (bool), `invite_id`, `invited_email`, `invited_name`, `error`
- **When to use**: When a user asks to invite a colleague, or when onboarding is needed

## 5. Get Reactions — `coworker_get_slack_reactions`

Get emoji reactions on a specific Slack message.

```python
from sdk.tools import slack_admin_tools

result = await slack_admin_tools.coworker_get_slack_reactions(
    channel_id="C01ABC123",
    message_ts="1234567890.123456",
)
if result.found:
    for r in result.reactions:
        print(f":{r['name']}: × {r['count']}")
```

- **Input**: `channel_id` (str), `message_ts` (str)
- **Output**: `found` (bool), `reactions` (list[dict]) — each with `name`, `count`, optional `users`
- **When to use**: Checking approval/feedback on messages, counting votes, monitoring engagement

## Common Workflows

### Discover and join relevant channels

```python
from sdk.tools import slack_admin_tools

channels = await slack_admin_tools.coworker_list_slack_channels()
public_no_access = [c for c in channels.channels if not c['is_private'] and not c['bot_has_access']]

if public_no_access:
    ids = [c['id'] for c in public_no_access[:5]]  # Join up to 5
    await slack_admin_tools.coworker_join_slack_channels(channel_ids=ids)
```

### Find and invite a user

```python
from sdk.tools import slack_admin_tools

users = await slack_admin_tools.coworker_list_slack_users()
target = next((u for u in users.users if "john" in u['display_name'].lower()), None)
if target and not target['has_viktor_account']:
    await slack_admin_tools.coworker_invite_slack_user_to_team(slack_user_id=target['id'])
```

## Quick Reference

| Need                 | Tool                                                          |
| -------------------- | ------------------------------------------------------------- |
| List all channels    | `coworker_list_slack_channels()`                              |
| Join public channels | `coworker_join_slack_channels(channel_ids)`                   |
| List workspace users | `coworker_list_slack_users(include_bots)`                     |
| Invite user to team  | `coworker_invite_slack_user_to_team(slack_user_id, message)`  |
| Check reactions      | `coworker_get_slack_reactions(channel_id, message_ts)`        |

All tools are async. Run scripts with `uv run python script.py`.
<!-- ══════════════════════════════════════════════════════════════════════════
