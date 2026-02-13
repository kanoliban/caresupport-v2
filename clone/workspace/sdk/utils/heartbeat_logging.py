"""Logging utilities for AI coworker agents.

Provides functions for logging to execution logs and global logs.
These run inside the sandbox and write directly to the workspace files.

Usage:
    from sdk.utils.heartbeat_logging import log_action, log_heartbeat

    # Log an action to both execution log and global log
    log_action("Spawned thread for weekly report analysis", cron_name="heartbeat")

    # Log a heartbeat check result
    log_heartbeat("Checked 3 channels, no action needed")

    # Log with global only (no cron context)
    log_action("Completed onboarding setup", global_only=True)
"""

from datetime import UTC, datetime
from pathlib import Path

WORK_DIR = Path("/work")
LOGS_DIR = WORK_DIR / "logs"
CRONS_DIR = WORK_DIR / "crons"


def _get_timestamp() -> str:
    """Get current timestamp in ISO format."""
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def _get_today() -> str:
    """Get today's date as YYYY-MM-DD."""
    return datetime.now(UTC).strftime("%Y-%m-%d")


def _ensure_parent_dir(path: Path) -> None:
    """Ensure parent directory exists."""
    path.parent.mkdir(parents=True, exist_ok=True)


def _append_to_file(path: Path, content: str) -> None:
    """Append content to a file, creating parent dirs if needed."""
    _ensure_parent_dir(path)
    with open(path, "a", encoding="utf-8") as f:
        f.write(content)


def log_action(
    message: str,
    cron_name: str | None = None,
    global_only: bool = False,
) -> None:
    """Log an action to execution log and global log.

    Args:
        message: The log message (should be concise and informative)
        cron_name: The cron/task name (e.g., "heartbeat", "workflow_discovery").
                   If provided, logs to crons/{cron_name}/execution.log.
                   If None, only logs to global log.
        global_only: If True, only log to global log (skip execution log even if cron_name given)
    """
    timestamp = _get_timestamp()
    log_line = f"[{timestamp}] {message}\n"

    # Always log to global log
    global_log_path = LOGS_DIR / _get_today() / "global.log"
    _append_to_file(global_log_path, log_line)

    # Log to execution log if cron_name provided and not global_only
    if cron_name and not global_only:
        execution_log_path = CRONS_DIR / cron_name / "execution.log"
        _append_to_file(execution_log_path, log_line)


def log_heartbeat(
    message: str,
    also_global: bool = True,
) -> None:
    """Log a heartbeat check result.

    Convenience function for heartbeat logging.

    Args:
        message: The log message (e.g., "Checked 3 channels, spawned 1 thread, no other action")
        also_global: If True (default), also log to global log
    """
    if also_global:
        log_action(message, cron_name="heartbeat")
    else:
        # Only log to execution log
        timestamp = _get_timestamp()
        log_line = f"[{timestamp}] {message}\n"
        execution_log_path = CRONS_DIR / "heartbeat" / "execution.log"
        _append_to_file(execution_log_path, log_line)


def log_to_execution(
    message: str,
    cron_name: str,
) -> None:
    """Log only to execution log (not global log).

    Use this for detailed/verbose logging that doesn't need to be in global log.

    Args:
        message: The log message
        cron_name: The cron/task name
    """
    timestamp = _get_timestamp()
    log_line = f"[{timestamp}] {message}\n"
    execution_log_path = CRONS_DIR / cron_name / "execution.log"
    _append_to_file(execution_log_path, log_line)


def log_to_global(message: str) -> None:
    """Log only to global log.

    Use for cross-cutting actions that aren't tied to a specific cron.

    Args:
        message: The log message
    """
    timestamp = _get_timestamp()
    log_line = f"[{timestamp}] {message}\n"
    global_log_path = LOGS_DIR / _get_today() / "global.log"
    _append_to_file(global_log_path, log_line)


def get_last_heartbeat_time() -> str | None:
    """Get the timestamp of the last heartbeat from execution.log.

    Useful for determining what's new since last check.

    Returns:
        ISO timestamp string of last heartbeat, or None if no previous heartbeat found.
    """
    execution_log_path = CRONS_DIR / "heartbeat" / "execution.log"

    if not execution_log_path.exists():
        return None

    try:
        content = execution_log_path.read_text(encoding="utf-8")
        lines = content.strip().split("\n")

        # Find the last line with a timestamp
        for line in reversed(lines):
            if line.startswith("[") and "]" in line:
                # Extract timestamp: [2024-01-15T10:30:00Z] message
                timestamp = line[1 : line.index("]")]
                return timestamp

    except Exception:
        pass

    return None


def get_execution_log(cron_name: str, max_lines: int = 50) -> str:
    """Read recent entries from an execution log.

    Args:
        cron_name: The cron/task name
        max_lines: Maximum number of lines to return (default 50)

    Returns:
        Recent log entries as a string, or empty string if log doesn't exist.
    """
    execution_log_path = CRONS_DIR / cron_name / "execution.log"

    if not execution_log_path.exists():
        return ""

    try:
        content = execution_log_path.read_text(encoding="utf-8")
        lines = content.strip().split("\n")
        recent_lines = lines[-max_lines:]
        return "\n".join(recent_lines)
    except Exception:
        return ""
