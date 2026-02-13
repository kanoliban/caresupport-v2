"""Auto-generated tool module for default_tools."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel

from sdk.internal.client import get_client

async def bash(command: str, timeout: int | None = None, description: str | None = None) -> BashResponse:
    """Executes bash commands in a persistent shell session with optional timeout.

    Args:
        command: The command to execute
        timeout: Optional timeout in milliseconds (max 600000)
        description: Clear, concise description of what this command does in 5-10 words, in active voice. Examples: 'List files in current directory', 'Show working tree status', 'Install package dependencies'

    Returns:
        BashResponse: Response from bash command execution.
    """
    return BashResponse.model_validate(await get_client().call("bash", command=command, timeout=timeout, description=description))

class BashResponse(BaseModel):
    """Response from bash command execution."""

    content: str  # Command output (stdout and/or stderr)
    exit_code: int  # Exit code of the command


async def file_edit(file_path: str, old_string: str, new_string: str, replace_all: bool = False) -> FileEditResponse:
    """Performs exact string replacements in files.

    Args:
        file_path: The absolute path to the file to modify
        old_string: The text to replace
        new_string: The text to replace it with (must be different from old_string)
        replace_all: Replace all occurrences of old_string (default false)

    Returns:
        FileEditResponse: Response from file edit operation.
    """
    return FileEditResponse.model_validate(await get_client().call("file_edit", file_path=file_path, old_string=old_string, new_string=new_string, replace_all=replace_all))

class FileEditResponse(BaseModel):
    """Response from file edit operation."""

    content: str  # Status message
    success: bool  # Whether the edit succeeded


async def file_read(file_path: str, offset: int | None = None, limit: int | None = None) -> FileReadResponse:
    """Reads files from the local filesystem, including text, images, PDFs, and Jupyter notebooks.

    Args:
        file_path: The absolute path to the file to read
        offset: The line number to start reading from. Only provide if the file is too large to read at once
        limit: The number of lines to read. Only provide if the file is too large to read at once. Note: output is truncated to ~32KB regardless of limit, so for files with large lines (like JSONL), use a smaller limit (e.g., 10-20 lines)

    Returns:
        FileReadResponse: Response from file read operation.
    """
    return FileReadResponse.model_validate(await get_client().call("file_read", file_path=file_path, offset=offset, limit=limit))

class FileReadResponse(BaseModel):
    """Response from file read operation."""

    content: str  # File content or error message


async def file_write(file_path: str, content: str) -> FileWriteResponse:
    """Writes a file to the local filesystem, overwriting if it exists.

    Args:
        file_path: The absolute path to the file to write (must be absolute, not relative)
        content: The content to write to the file

    Returns:
        FileWriteResponse: Response from file write operation.
    """
    return FileWriteResponse.model_validate(await get_client().call("file_write", file_path=file_path, content=content))

class FileWriteResponse(BaseModel):
    """Response from file write operation."""

    content: str  # Status message
    success: bool  # Whether the write succeeded


async def glob(pattern: str, path: str | None = None) -> GlobResponse:
    """Fast file pattern matching that works with any codebase size.

    Args:
        pattern: The glob pattern to match files against
        path: The directory to search in. If not specified, the current working directory will be used. Must be a valid directory path if provided.

    Returns:
        GlobResponse: Response from glob pattern matching.
    """
    return GlobResponse.model_validate(await get_client().call("glob", pattern=pattern, path=path))

class GlobResponse(BaseModel):
    """Response from glob pattern matching."""

    content: str  # Matched file paths, one per line


async def grep(pattern: str, path: str | None = None, glob: str | None = None, output_mode: Literal['content', 'files_with_matches', 'count'] | None = None, context_before: int | None = None, context_after: int | None = None, context: int | None = None, line_numbers: bool | None = None, case_insensitive: bool | None = None, file_type: str | None = None, head_limit: int | None = None, skip_offset: int | None = None, multiline: bool | None = None) -> GrepResponse:
    """Searches for a regular expression pattern in files.

    Args:
        pattern: The regular expression pattern to search for in file contents
        path: File or directory to search in. Defaults to current working directory.
        glob: Glob pattern to filter files (e.g. "*.js", "*.{ts,tsx}")
        output_mode: Output mode: "content" shows matching lines (supports -A/-B/-C context, -n line numbers, head_limit), "files_with_matches" shows file paths (supports head_limit), "count" shows match counts (supports head_limit). Defaults to "files_with_matches".
        context_before: Number of lines to show before each match (rg -B). Requires output_mode: "content".
        context_after: Number of lines to show after each match (rg -A). Requires output_mode: "content".
        context: Number of lines to show before and after each match (rg -C). Requires output_mode: "content".
        line_numbers: Show line numbers in output (rg -n). Requires output_mode: "content". Defaults to true.
        case_insensitive: Case insensitive search (rg -i)
        file_type: File type to search (rg --type). Common types: js, py, rust, go, java, etc.
        head_limit: Limit output to first N lines/entries, equivalent to "| head -N". Works across all output modes. Defaults to 0 (unlimited).
        skip_offset: Skip first N lines/entries before applying head_limit. Works across all output modes. Defaults to 0.
        multiline: Enable multiline mode where . matches newlines and patterns can span lines. Default: false.

    Returns:
        GrepResponse: Response from grep search.
    """
    return GrepResponse.model_validate(await get_client().call("grep", pattern=pattern, path=path, glob=glob, output_mode=output_mode, context_before=context_before, context_after=context_after, context=context, line_numbers=line_numbers, case_insensitive=case_insensitive, file_type=file_type, head_limit=head_limit, skip_offset=skip_offset, multiline=multiline))

class GrepResponse(BaseModel):
    """Response from grep search."""

    content: str  # Search results


async def view_image(file_path: str) -> ViewImageResponse:
    """View an image file from the local filesystem. The image will be displayed to the AI for visual analysis.

    Args:
        file_path: The absolute path to the image file to view (supports jpg, jpeg, png, gif, webp)

    Returns:
        ViewImageResponse: Response from view image operation.
    """
    return ViewImageResponse.model_validate(await get_client().call("view_image", file_path=file_path))

class ViewImageResponse(BaseModel):
    """Response from view image operation."""

    content: str  # Status message about the image
    error: str | None = None  # Error message if failed


async def coworker_send_slack_message(channel_id: str, blocks: list[dict], reflection: str, do_send: bool, thread_ts: str | None = None, message_type: Literal['regular', 'permission_request'] = "regular", permission_request_draft_ids: list[str] | None = None, detailed_approval_context: str | None = None, replace_message_ts: str | None = None) -> CoworkerSendSlackMessageResponse:
    """Send a Slack message using Block Kit blocks.

    Block types: section, header, divider, context, actions, image. @display name will be converted to <@USER_ID> format.

    Example with markdown, button, and image:
    [
        {"type": "section", "text": {"type": "mrkdwn", "text": "Hey @peter, please review this *report*"}},
        {"type": "image", "image_url": "https://example.com/img.png", "alt_text": "description"},
        {"type": "actions", "elements": [{"type": "button", "text": {"type": "plain_text", "text": "Click"}, "action_id": "btn1"}]}
    ]

    Args:
        channel_id: Channel ID to send to
        blocks: Slack Block Kit blocks
        reflection: Before sending, reflect: Is this message helpful? Is the tone appropriate? Is the content accurate?
        do_send: After reflection, set True to send or False to skip. Allows reconsidering before sending
        thread_ts: Thread timestamp to reply to
        message_type: 'regular' for normal messages, 'permission_request' to add Approve/Reject buttons for drafts approval
        permission_request_draft_ids: Required when message_type='permission_request'. The draft IDs that will be approved/rejected
        detailed_approval_context: Additional context shown when user approves. Helps agent understand what was approved
        replace_message_ts: If set, updates an existing message instead of posting new. Use the message_ts from a previous send

    Returns:
        CoworkerSendSlackMessageResponse: Response from sending Slack message.
    """
    return CoworkerSendSlackMessageResponse.model_validate(await get_client().call("coworker_send_slack_message", channel_id=channel_id, thread_ts=thread_ts, blocks=blocks, message_type=message_type, permission_request_draft_ids=permission_request_draft_ids, detailed_approval_context=detailed_approval_context, replace_message_ts=replace_message_ts, reflection=reflection, do_send=do_send))

class CoworkerSendSlackMessageResponse(BaseModel):
    """Response from sending Slack message."""

    success: bool
    message_ts: str | None = None  # Timestamp of sent message
    error: str | None = None  # Error if send failed
    modifications: str | None = None  # Info about automatic modifications made (action_ids, file uploads)


async def coworker_slack_react(channel_id: str, message_ts: str, emoji: str) -> CoworkerSlackReactResponse:
    """Add an emoji reaction to a Slack message.

    Args:
        channel_id: Channel ID
        message_ts: Message timestamp
        emoji: Emoji name without colons (e.g., 'eyes')

    Returns:
        CoworkerSlackReactResponse: Response from adding reaction.
    """
    return CoworkerSlackReactResponse.model_validate(await get_client().call("coworker_slack_react", channel_id=channel_id, message_ts=message_ts, emoji=emoji))

class CoworkerSlackReactResponse(BaseModel):
    """Response from adding reaction."""

    success: bool
    error: str | None = None


async def coworker_delete_slack_message(channel_id: str, message_ts: str) -> CoworkerDeleteSlackMessageResponse:
    """Delete a Slack message sent by the bot.

    Args:
        channel_id: Channel ID
        message_ts: Timestamp of message to delete

    Returns:
        CoworkerDeleteSlackMessageResponse: Response from deleting Slack message.
    """
    return CoworkerDeleteSlackMessageResponse.model_validate(await get_client().call("coworker_delete_slack_message", channel_id=channel_id, message_ts=message_ts))

class CoworkerDeleteSlackMessageResponse(BaseModel):
    """Response from deleting Slack message."""

    success: bool
    error: str | None = None


async def coworker_upload_to_slack(file_path: str) -> CoworkerUploadToSlackResponse:
    """Upload a local file to Slack's file storage and get a permalink, that can be used in a coworker_send_slack_message block to share it with users.

    Args:
        file_path: Local file path to upload

    Returns:
        CoworkerUploadToSlackResponse: Response from file upload.
    """
    return CoworkerUploadToSlackResponse.model_validate(await get_client().call("coworker_upload_to_slack", file_path=file_path))

class CoworkerUploadToSlackResponse(BaseModel):
    """Response from file upload."""

    permalink: str | None = None
    info: str | None = None
    error: str | None = None


async def coworker_download_from_slack(slack_file_url: str, filename: str | None = None) -> CoworkerDownloadFromSlackResponse:
    """Download a Slack file to local storage.

    Args:
        slack_file_url: Slack file URL
        filename: Optional filename

    Returns:
        CoworkerDownloadFromSlackResponse: Response from file download.
    """
    return CoworkerDownloadFromSlackResponse.model_validate(await get_client().call("coworker_download_from_slack", slack_file_url=slack_file_url, filename=filename))

class CoworkerDownloadFromSlackResponse(BaseModel):
    """Response from file download."""

    file_path: str | None = None  # Local file path where the file was saved
    error: str | None = None


async def coworker_report_error(text: str) -> CoworkerReportErrorResponse:
    """Report an error or unexpected behavior to the team.

    Use this when something doesn't work as expected, you encounter errors,
    or notice unexpected behavior that the team should investigate.

    Args:
        text: Description of the error or unexpected behavior

    Returns:
        CoworkerReportErrorResponse: Response from reporting an error.
    """
    return CoworkerReportErrorResponse.model_validate(await get_client().call("coworker_report_error", text=text))

class CoworkerReportErrorResponse(BaseModel):
    """Response from reporting an error."""

    success: bool
    error: str | None = None


async def create_thread(path: str, title: str, initial_prompt: str, dependent_paths: list[str] | None = None) -> CreateThreadResponse:
    """Creates a new thread for ad-hoc work. Always starts execution immediately.

    Args:
        path: Path for the thread, e.g. '/slack/general/budget_question'
        title: Title for the thread
        initial_prompt: Initial prompt/context for the thread
        dependent_paths: Paths to wait for before starting

    Returns:
        CreateThreadResponse: 
    """
    return CreateThreadResponse.model_validate(await get_client().call("create_thread", path=path, title=title, initial_prompt=initial_prompt, dependent_paths=dependent_paths))

class CreateThreadResponse(BaseModel):
    status: str
    thread_id: str | None = None
    path: str | None = None


async def send_message_to_thread(content: str, thread_id: str | None = None, agent_runs_path: str | None = None, trigger_reply: bool = True) -> SendMessageToThreadResponse:
    """Sends a message to another agent thread and optionally triggers a reply.

    Use this to forward messages to threads with more context - especially when users
    reply outside a Slack thread and you need to route their response to the original
    conversation. Find the target via `[origin:...]` tags in Slack logs. Use
    `trigger_reply=True` to reactivate that thread's agent so it can respond with full context.

    Args:
        content: The message content to send
        thread_id: The thread ID to send the message to
        agent_runs_path: Alternative: the agent_runs path from an [origin:...] tag in Slack logs (e.g., /agent_runs/slack/Toni/threads/1768561579_387979)
        trigger_reply: Whether to trigger an agent reply after sending the message

    Returns:
        SendMessageToThreadResponse: 
    """
    return SendMessageToThreadResponse.model_validate(await get_client().call("send_message_to_thread", thread_id=thread_id, agent_runs_path=agent_runs_path, content=content, trigger_reply=trigger_reply))

class SendMessageToThreadResponse(BaseModel):
    status: str
    message_id: str | None = None


async def wait_for_paths(paths: list[str], timeout_minutes: int = 30) -> WaitForPathsResponse:
    """Wait for specified paths to finish execution. Works for cron paths (waits for any running thread) and thread paths.

    Args:
        paths: List of paths to wait for
        timeout_minutes: Maximum minutes to wait

    Returns:
        WaitForPathsResponse: Response from waiting for paths.
    """
    return WaitForPathsResponse.model_validate(await get_client().call("wait_for_paths", paths=paths, timeout_minutes=timeout_minutes))

class WaitForPathsResponse(BaseModel):
    """Response from waiting for paths."""

    waited_seconds: int  # How long we waited in seconds
    paths_waited_for: list[str]  # Which paths we waited for
    timed_out: bool  # Whether we timed out waiting
