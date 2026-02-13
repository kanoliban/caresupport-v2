# Available Tools (Factory Default)

## Usage Examples (grep tool definitions before using)

```python
from sdk.tools import default_tools

# Read a file
content = await default_tools.file_read(file_path="data.csv")

# Send a Slack message
await default_tools.send_slack_message(channel_id="C123456", text="Hello!")
```

## browser_tools

- `browser_create_session`
- `browser_download_files`
- `browser_close_session`

## default_tools

- `bash`
- `file_edit`
- `file_read`
- `file_write`
- `glob`
- `grep`
- `view_image`
- `coworker_send_slack_message`
- `coworker_slack_react`
- `coworker_delete_slack_message`
- `coworker_upload_to_slack`
- `coworker_download_from_slack`
- `coworker_report_error`
- `create_thread`
- `send_message_to_thread`
- `wait_for_paths`

## docs_tools

- `resolve_library_id`
- `query_library_docs`

## email_tools

- `coworker_send_email`
- `coworker_get_attachment`

## scheduled_crons

- `create_agent_cron`
- `create_script_cron`
- `delete_cron`
- `trigger_cron`

## slack_admin_tools

- `coworker_list_slack_channels`
- `coworker_join_slack_channels`
- `coworker_list_slack_users`
- `coworker_invite_slack_user_to_team`
- `coworker_get_slack_reactions`

## thread_orchestration_tools

- `list_running_paths`
- `get_path_info`

## utils_tools

- `quick_ai_search`
- `ai_structured_output`
- `file_to_markdown`
- `coworker_text2im`
- `create_custom_api_integration`
- `resolve_library_id`
- `query_library_docs`

## viktor_spaces_tools

- `init_app_project`
- `deploy_app`
- `list_apps`
- `get_app_status`
- `query_app_database`
- `delete_app_project`

# NOTE: Integration-specific modules (mcp_linear, mcp_google_ads, github_tools, etc.)
# are added to this list when a workspace connects those integrations.
# A fresh Viktor with no integrations connected has only the modules above.
