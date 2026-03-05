from __future__ import annotations

"""
PHI Audit Logger — Mechanical enforcement of HIPAA access logging.

Every interaction that touches Protected Health Information gets logged:
  WHO accessed it (phone number, role, access level)
  WHAT was accessed (family_id, sections loaded, data types)
  WHEN (UTC timestamp)
  WHY (the triggering message or scheduled task)
  WHAT HAPPENED (read, share, write, filtered, blocked)

This is not optional. The SMS handler calls this on every invocation.
If it fails to log, the interaction should not proceed.
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path


class PHIAuditLogger:
    """Log all PHI access events for HIPAA compliance."""

    def __init__(self, log_dir: str | Path):
        self.log_dir = Path(log_dir)

    def _write_event(self, event: dict):
        """Append a JSON-line event to today's PHI access log."""
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        log_path = self.log_dir / date_str / "phi_access.log"
        log_path.parent.mkdir(parents=True, exist_ok=True)

        with open(log_path, "a") as f:
            f.write(json.dumps(event) + "\n")

    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat() + "Z"

    def log_context_load(self, family_id: str, accessor_phone: str,
                         accessor_role: str, access_level: str,
                         sections_loaded: list[str],
                         trigger_message: str):
        """Log when the handler loads family.md context for a member.

        This fires on EVERY inbound SMS that resolves to a family.
        """
        self._write_event({
            "timestamp": self._now(),
            "event": "context_load",
            "family_id": family_id,
            "accessor": {
                "phone": accessor_phone,
                "role": accessor_role,
                "access_level": access_level,
            },
            "sections_loaded": sections_loaded,
            "trigger": trigger_message[:200],  # Truncate for log size
        })

    def log_response_sent(self, family_id: str, recipient_phone: str,
                          recipient_role: str, access_level: str,
                          response_length: int,
                          leakage_clean: bool):
        """Log when a response is sent to a member.

        This fires on EVERY outbound SMS.
        """
        self._write_event({
            "timestamp": self._now(),
            "event": "response_sent",
            "family_id": family_id,
            "recipient": {
                "phone": recipient_phone,
                "role": recipient_role,
                "access_level": access_level,
            },
            "response_length": response_length,
            "leakage_check_passed": leakage_clean,
        })

    def log_response_blocked(self, family_id: str, recipient_phone: str,
                             access_level: str,
                             leaked_categories: list[str],
                             leaked_terms: list[str]):
        """Log when a response is BLOCKED due to detected PHI leakage.

        This is a safety event — it means the agent tried to share
        information the member shouldn't see, and the filter caught it.
        """
        self._write_event({
            "timestamp": self._now(),
            "event": "response_blocked",
            "severity": "HIGH",
            "family_id": family_id,
            "recipient_phone": recipient_phone,
            "access_level": access_level,
            "leaked_categories": leaked_categories,
            "leaked_terms": leaked_terms,
        })

    def log_outreach_sent(self, family_id: str, from_phone: str,
                          to_phone: str, to_name: str,
                          purpose: str):
        """Log when the agent sends an outreach message to another member."""
        self._write_event({
            "timestamp": self._now(),
            "event": "outreach_sent",
            "family_id": family_id,
            "initiated_by": from_phone,
            "sent_to": {
                "phone": to_phone,
                "name": to_name,
            },
            "purpose": purpose[:200],
        })

    def log_unknown_number(self, phone: str):
        """Log when an unrecognized phone number contacts CareSupport.

        Per hard rules: zero PHI disclosed. This logs the attempt.
        """
        self._write_event({
            "timestamp": self._now(),
            "event": "unknown_number",
            "phone": phone,
            "phi_disclosed": False,
        })

    def get_today_log_path(self) -> Path:
        """Return path to today's log file (for testing)."""
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        return self.log_dir / date_str / "phi_access.log"

    def read_today_events(self) -> list[dict]:
        """Read all events from today's log (for testing/inspection)."""
        log_path = self.get_today_log_path()
        if not log_path.exists():
            return []
        events = []
        with open(log_path) as f:
            for line in f:
                line = line.strip()
                if line:
                    events.append(json.loads(line))
        return events
