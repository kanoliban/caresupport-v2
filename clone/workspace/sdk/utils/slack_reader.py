"""Slack file reader for getting new messages since a timestamp.

This module reads the local Slack history files (monthly log files and thread files)
and returns messages since a given datetime. No tool call needed - reads directly
from the workspace files.

Usage:
    from sdk.utils.slack_reader import get_new_slack_messages, get_channel_summary

    # Get messages since a specific time (grouped by channel and thread)
    messages = get_new_slack_messages(since="2024-01-15T10:30:00")
    print(messages)

    # Get messages from specific channels only (by name, not ID)
    messages = get_new_slack_messages(since="2024-01-01", channel_names=["general", "engineering"])

    # See what channels are available
    print(get_channel_summary())
"""

import re
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

SLACK_DIR = Path("/work/slack")
MESSAGE_PATTERN = re.compile(r"^\[([0-9.]+)\] @([^:]+): (.*)$")
CONTEXT_MESSAGES_BEFORE = 2


@dataclass
class SlackMessage:
    channel: str
    timestamp: str
    user: str
    text: str
    is_thread_parent: bool = False
    thread_ts: str | None = None

    @property
    def ts_float(self) -> float:
        return float(self.timestamp)

    @property
    def datetime(self) -> datetime:
        return datetime.fromtimestamp(self.ts_float, tz=UTC)

    @property
    def datetime_str(self) -> str:
        return self.datetime.strftime("%Y-%m-%d %H:%M")

    def format(self, is_old: bool = False) -> str:
        old_marker = "[old] " if is_old else ""
        return f"{old_marker}{self.datetime_str} (ts:{self.timestamp}) @{self.user}: {self.text}"


@dataclass
class ThreadMessages:
    thread_ts: str
    parent: SlackMessage | None = None
    all_replies: list[SlackMessage] = field(default_factory=list)
    new_reply_timestamps: set[str] = field(default_factory=set)

    @property
    def has_new_messages(self) -> bool:
        return len(self.new_reply_timestamps) > 0

    @property
    def new_count(self) -> int:
        return len(self.new_reply_timestamps)


@dataclass
class ChannelMessages:
    channel: str
    top_level: list[SlackMessage] = field(default_factory=list)
    threads: dict[str, ThreadMessages] = field(default_factory=dict)


def _parse_message_line(line: str, channel: str) -> SlackMessage | None:
    line = line.strip()
    if not line or line.startswith("---"):
        return None

    match = MESSAGE_PATTERN.match(line)
    if not match:
        return None

    ts = match.group(1)
    user = match.group(2)
    rest = match.group(3)

    text = rest
    is_thread_parent = False
    thread_ts = None

    metadata_match = re.search(r"\s*\[([^\]]+)\]\s*$", rest)
    if metadata_match:
        text = rest[: metadata_match.start()]
        metadata_str = metadata_match.group(1)
        for part in metadata_str.split(","):
            part = part.strip()
            if part.startswith("thread:"):
                is_thread_parent = True
                thread_ts = part[7:]
            elif part.startswith("deleted:"):
                return None

    text = text.replace("\\n", "\n")

    return SlackMessage(
        channel=channel,
        timestamp=ts,
        user=user,
        text=text,
        is_thread_parent=is_thread_parent,
        thread_ts=thread_ts,
    )


def _get_month_from_ts(ts: float) -> str:
    dt = datetime.fromtimestamp(ts, tz=UTC)
    return dt.strftime("%Y-%m")


def _get_relevant_month_files(channel_dir: Path, since_ts: float) -> list[Path]:
    since_month = _get_month_from_ts(since_ts)
    now_month = datetime.now(UTC).strftime("%Y-%m")

    month_files = []
    for f in channel_dir.iterdir():
        if f.is_file() and f.suffix == ".log" and re.match(r"\d{4}-\d{2}\.log", f.name):
            month = f.stem
            if month >= since_month and month <= now_month:
                month_files.append(f)

    return sorted(month_files)


def _read_thread_file(
    thread_file: Path, channel: str
) -> tuple[SlackMessage | None, list[SlackMessage]]:
    """Read a thread file and return (parent, all_replies)."""
    try:
        content = thread_file.read_text(encoding="utf-8")
        lines = content.split("\n")
        parent = None
        replies = []
        for i, line in enumerate(lines):
            msg = _parse_message_line(line, channel)
            if msg:
                if i == 0:
                    parent = msg
                else:
                    replies.append(msg)
        return parent, replies
    except Exception:
        return None, []


def get_new_slack_messages(
    since: str | datetime,
    channel_names: list[str] | None = None,
    include_threads: bool = True,
    max_messages: int = 1000,
) -> str:
    """Get new Slack messages since a given datetime, grouped by channel and thread.

    Reads from local workspace files - no tool call needed.
    Returns a formatted string with messages grouped by channel, then by thread.

    For threads with new replies:
    - The parent message is always included, marked [old] if before cutoff
    - Up to 2 previous replies are shown for context, marked [old]
    - If there are more old messages not shown, a gap indicator is displayed

    Args:
        since: ISO datetime string (e.g., "2024-01-15T10:30:00") or datetime object.
               Also accepts just a date like "2024-01-15" (uses start of day).
        channel_names: List of channel names (e.g., ["general", "engineering"]).
                       These are the human-readable names, not channel IDs.
                       If None, checks all channels.
        include_threads: Whether to include thread replies (default True)
        max_messages: Maximum total messages to return (default 1000)

    Returns:
        Formatted string with messages grouped by channel and thread.
        Returns empty string if no new messages.
    """
    if isinstance(since, str):
        if "T" in since:
            since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
        else:
            since_dt = datetime.strptime(since, "%Y-%m-%d").replace(tzinfo=UTC)
    else:
        since_dt = since

    if since_dt.tzinfo is None:
        since_dt = since_dt.replace(tzinfo=UTC)

    since_ts = since_dt.timestamp()

    if not SLACK_DIR.exists():
        return ""

    channel_data: dict[str, ChannelMessages] = {}

    channel_dirs = sorted([d for d in SLACK_DIR.iterdir() if d.is_dir()])
    if channel_names:
        channel_dirs = [d for d in channel_dirs if d.name in channel_names]

    for channel_dir in channel_dirs:
        channel_name = channel_dir.name
        channel_msgs = ChannelMessages(channel=channel_name)

        month_files = _get_relevant_month_files(channel_dir, since_ts)
        for month_file in month_files:
            try:
                content = month_file.read_text(encoding="utf-8")
                for line in content.split("\n"):
                    msg = _parse_message_line(line, channel_name)
                    if msg and msg.ts_float >= since_ts:
                        if msg.is_thread_parent:
                            if msg.thread_ts not in channel_msgs.threads:
                                channel_msgs.threads[msg.thread_ts] = ThreadMessages(
                                    thread_ts=msg.thread_ts
                                )
                            channel_msgs.threads[msg.thread_ts].parent = msg
                        else:
                            channel_msgs.top_level.append(msg)
            except Exception:
                continue

        if include_threads:
            threads_dir = channel_dir / "threads"
            if threads_dir.exists():
                for thread_file in threads_dir.iterdir():
                    if thread_file.is_file() and thread_file.suffix == ".log":
                        thread_ts = thread_file.stem
                        parent, all_replies = _read_thread_file(thread_file, channel_name)

                        new_reply_ts = {r.timestamp for r in all_replies if r.ts_float >= since_ts}
                        if new_reply_ts:
                            if thread_ts not in channel_msgs.threads:
                                channel_msgs.threads[thread_ts] = ThreadMessages(
                                    thread_ts=thread_ts
                                )
                            thread_data = channel_msgs.threads[thread_ts]
                            if parent and thread_data.parent is None:
                                thread_data.parent = parent
                            thread_data.all_replies = all_replies
                            thread_data.new_reply_timestamps = new_reply_ts

        has_messages = channel_msgs.top_level or any(
            t.has_new_messages for t in channel_msgs.threads.values()
        )
        if has_messages:
            channel_data[channel_name] = channel_msgs

    if not channel_data:
        return ""

    output_lines = []
    total_count = 0

    for channel_name in sorted(channel_data.keys()):
        channel_msgs = channel_data[channel_name]

        channel_count = len(channel_msgs.top_level)
        for thread in channel_msgs.threads.values():
            channel_count += thread.new_count

        total_count += channel_count
        output_lines.append(
            f"## #{channel_name} ({channel_count} new message{'s' if channel_count != 1 else ''})"
        )
        output_lines.append("")

        for msg in sorted(channel_msgs.top_level, key=lambda m: m.ts_float):
            output_lines.append(msg.format())

        threads_with_replies = [t for t in channel_msgs.threads.values() if t.has_new_messages]
        for thread in sorted(threads_with_replies, key=lambda t: float(t.thread_ts)):
            output_lines.append("")

            parent_is_old = thread.parent and thread.parent.ts_float < since_ts
            if thread.parent:
                parent_preview = (
                    thread.parent.text[:60] + "..."
                    if len(thread.parent.text) > 60
                    else thread.parent.text
                )
                parent_preview = parent_preview.replace("\n", " ")
                old_marker = " [old]" if parent_is_old else ""
                output_lines.append(
                    f"### Thread{old_marker}: {thread.parent.datetime_str} @{thread.parent.user}: {parent_preview}"
                )
            else:
                output_lines.append(f"### Thread (ts: {thread.thread_ts})")

            sorted_replies = sorted(thread.all_replies, key=lambda m: m.ts_float)

            first_new_idx = None
            for i, reply in enumerate(sorted_replies):
                if reply.timestamp in thread.new_reply_timestamps:
                    first_new_idx = i
                    break

            if first_new_idx is not None:
                context_start = max(0, first_new_idx - CONTEXT_MESSAGES_BEFORE)
                skipped_old = context_start

                if skipped_old > 0:
                    output_lines.append(f"  ... ({skipped_old} older replies not shown)")

                for i in range(context_start, len(sorted_replies)):
                    reply = sorted_replies[i]
                    is_old = reply.timestamp not in thread.new_reply_timestamps
                    output_lines.append(f"  {reply.format(is_old=is_old)}")

        output_lines.append("")

        if total_count >= max_messages:
            output_lines.append(f"(Truncated at {max_messages} messages)")
            break

    return "\n".join(output_lines).strip()


def get_channel_summary(channel_names: list[str] | None = None) -> str:
    """Get a summary of available Slack channels and their message counts.

    Args:
        channel_names: List of channel names (e.g., ["general"]). If None, lists all channels.

    Returns:
        Formatted string with channel names and message counts.
    """
    if not SLACK_DIR.exists():
        return "No Slack data found in /work/slack/"

    lines = ["Available Slack channels:"]

    channel_dirs = sorted([d for d in SLACK_DIR.iterdir() if d.is_dir()])
    if channel_names:
        channel_dirs = [d for d in channel_dirs if d.name in channel_names]

    for channel_dir in channel_dirs:
        channel_name = channel_dir.name

        msg_count = 0
        thread_count = 0
        oldest_month = None
        newest_month = None

        for f in channel_dir.iterdir():
            if f.is_file() and f.suffix == ".log" and re.match(r"\d{4}-\d{2}\.log", f.name):
                month = f.stem
                if oldest_month is None or month < oldest_month:
                    oldest_month = month
                if newest_month is None or month > newest_month:
                    newest_month = month
                try:
                    content = f.read_text(encoding="utf-8")
                    msg_count += len(
                        [
                            line
                            for line in content.split("\n")
                            if line.strip() and not line.startswith("---")
                        ]
                    )
                except Exception:
                    pass

        threads_dir = channel_dir / "threads"
        if threads_dir.exists():
            thread_count = len([f for f in threads_dir.iterdir() if f.is_file()])

        range_str = f" ({oldest_month} to {newest_month})" if oldest_month else ""
        lines.append(f"  #{channel_name}: {msg_count} messages, {thread_count} threads{range_str}")

    return "\n".join(lines)
