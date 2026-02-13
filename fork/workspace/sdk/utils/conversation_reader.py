"""
Conversation Reader — Read and search SMS/iMessage conversation history.

Viktor equivalent: sdk/utils/slack_reader.py — reads Slack message logs
from flat files. Same pattern, adapted for SMS conversation logs.

Conversation logs live at:
  conversations/{phone_number}/{YYYY-MM}.log

Log format (each line):
  [{ISO_timestamp}] [{direction}] [{family_id}] {message_body}

Example:
  [2026-02-13T08:00:00Z] [out] [kano] Time for Mom's Lisinopril 10mg. Reply DONE when taken ✅
  [2026-02-13T08:15:00Z] [in]  [kano] Done
"""

import os
from datetime import datetime, timedelta


class ConversationReader:
    """Read conversation logs for a phone number or family."""

    def __init__(self, base_dir: str = "/care/conversations"):
        self.base_dir = base_dir

    def read_recent(self, phone: str, hours: int = 24) -> list[dict]:
        """Read recent messages from a phone number.

        Args:
            phone: Phone number (used as directory name, e.g., "+15551234567")
            hours: How many hours back to read

        Returns:
            List of {"timestamp": str, "direction": "in"|"out",
                     "family_id": str, "body": str}
        """
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        messages = []
        log_dir = os.path.join(self.base_dir, phone)

        if not os.path.exists(log_dir):
            return messages

        # Read current month's log
        current_month = datetime.utcnow().strftime("%Y-%m")
        log_file = os.path.join(log_dir, f"{current_month}.log")

        if os.path.exists(log_file):
            with open(log_file, "r") as f:
                for line in f:
                    parsed = self._parse_line(line)
                    if parsed and parsed["timestamp"] >= cutoff.isoformat():
                        messages.append(parsed)

        return messages

    def search_family(self, family_id: str, query: str,
                      days: int = 30) -> list[dict]:
        """Search all conversations for a family by keyword.

        Viktor equivalent: grep on slack/{channel}/*.log

        Args:
            family_id: The family to search
            query: Text to search for (case-insensitive)
            days: How far back to search

        Returns:
            List of matching messages with context
        """
        # Walk all phone directories, filter by family_id in log content
        raise NotImplementedError("Platform implements indexed search")

    def _parse_line(self, line: str) -> dict | None:
        """Parse a log line into structured data."""
        try:
            # Format: [{timestamp}] [{direction}] [{family_id}] {body}
            parts = line.strip().split("] ")
            timestamp = parts[0].lstrip("[")
            direction = parts[1].lstrip("[")
            family_id = parts[2].lstrip("[")
            body = "] ".join(parts[3:]) if len(parts) > 3 else ""
            return {
                "timestamp": timestamp,
                "direction": direction,
                "family_id": family_id,
                "body": body,
            }
        except (IndexError, ValueError):
            return None
