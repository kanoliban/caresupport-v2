---
name: integrations
description: Check, connect, and configure third-party integrations. Use when managing integrations or adding custom API connections.
---

When you need to use an integration that the user hasn't connected yet, or when a user asks about available integrations, use this skill to guide them to the appropriate connection page.

## Reference Files

- **Available integrations**: See `/work/sdk/docs/available_integrations.json` for the complete list of integrations that CAN be connected. One integration per line (JSON format) with name, slug, description, connect_url, integration_type, and auth_type. Use `grep` to search by name or description.
- **Connected integrations**:
  - MCP integrations have dedicated files under `/work/sdk/tools/` (e.g., `mcp_linear.py`, `mcp_hubspot.py`).
  - Pipedream integrations have dedicated files under `/work/sdk/tools/` using `pd_<slug>.py` (e.g., `pd_attio.py`).
  - Custom API integrations have dedicated files under `/work/sdk/tools/` using `custom_api_<id>.py`.
  - Built-in OAuth integrations (e.g., Google Drive, OneDrive, Notion) are grouped into service modules like `google_drive_tools.py`, `onedrive_tools.py`, `notion_tools.py`.
  - Use `/work/sdk/docs/tools.md` as the source of truth for currently available tool functions.
- **Custom API integrations**: See `references/custom-api-integration.md` for adding direct HTTP API connections. **Only use this if the service is NOT in the 3000+ integrations listed in `available_integrations.json`** - always check there first!

## Checking Connection Status

To see which integrations are currently connected:

```bash
# 1) Full callable tool list (authoritative)
cat /work/sdk/docs/tools.md

# 2) Optional: quickly check for a specific integration/tool prefix
grep -nE "mcp_linear|pd_attio|custom_api_" /work/sdk/docs/tools.md || true
```

## When to Use

- A tool call fails because the required integration isn't connected
- The user asks what integrations are available to connect
- The user asks what integrations are already connected
- The user asks how to connect a specific service (e.g., "How do I connect Linear?")
- You need access to a service that requires user authorization
- The user needs a custom API integration (only if the service is NOT in `available_integrations.json`)

## Checking if User Has a Viktor Account

Before sharing a connect URL with a Slack user, check if they have a Viktor account (`has_viktor_account` field). If not, use `coworker_invite_slack_user_to_team` to invite them first.

```bash
uv run python -c "import asyncio; from sdk.tools import slack_admin_tools; print(asyncio.run(slack_admin_tools.coworker_list_slack_users()))"
```

## How to Request Connection

1. **Check if user has Viktor account**: Use `coworker_list_slack_users` to verify the user has `has_viktor_account: true`
2. **Invite if needed**: If they don't have a Viktor account, use `coworker_invite_slack_user_to_team` first
3. **Check if already connected**: Verify from `/work/sdk/docs/tools.md` (source of truth). Optionally use `grep` on that file for a specific slug/tool prefix.
4. **Explain the need**: Tell the user what you're trying to do and why the integration is needed
5. **Provide the direct link**: Give them the connection URL from `/work/sdk/docs/available_integrations.json`
6. **Add a confirmation button**: Always include a button so the user can confirm when they've connected it
7. **Wait for confirmation**: Don't proceed until the user confirms they've connected it

## Example Response Format

When an integration needs to be connected, format your message like this:

```
I'd love to help you create that issue in Linear! However, I notice that Linear
isn't connected to your account yet.

Please connect it here: https://app.getviktor.com/integrations/linear

[I've connected the integration]
```

The button text should be "I've connected the integration" so the user can click it after completing the OAuth flow.

## Important Notes

- Use the exact connection URLs from `/work/sdk/docs/available_integrations.json`
- The user must complete the OAuth flow in their browser
- Some integrations (like Salesforce) have additional setup steps
- After connection, the SDK is regenerated and new tool files appear in `/work/sdk/tools/`
- Always include the "I've connected the integration" button when requesting a connection
- Only users with Viktor accounts can connect integrations - check `has_viktor_account` first
<!-- ══════════════════════════════════════════════════════════════════════════
