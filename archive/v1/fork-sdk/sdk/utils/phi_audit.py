"""
PHI Audit Logger — HIPAA-compliant access logging for protected health information.

Viktor equivalent: logs/{YYYY-MM-DD}/global.log — same logging pattern,
but Viktor logs "actions" while we log "PHI access events."

HIPAA requires that every access to Protected Health Information is logged:
- WHO accessed it (phone number, role)
- WHAT was accessed (family, section, data type)
- WHEN (timestamp)
- WHY (the triggering message or scheduled task)
- WHAT HAPPENED (read, write, share)
"""

import json
from datetime import datetime


class PHIAuditLogger:
    """Log all PHI access events for HIPAA compliance."""

    def __init__(self, log_dir: str = "/care/logs"):
        self.log_dir = log_dir

    def log_access(self, family_id: str, accessor_phone: str,
                   accessor_role: str, access_type: str,
                   data_type: str, purpose: str,
                   details: str = None):
        """Log a PHI access event.

        Args:
            family_id: Which family's data was accessed
            accessor_phone: Who accessed it
            accessor_role: Their role (primary_caregiver, aide, provider, agent)
            access_type: "read" | "write" | "share" | "delete"
            data_type: "medications" | "conditions" | "insurance" | "labs" |
                      "appointments" | "full_record" | "contact_info"
            purpose: Why the access happened (e.g., "medication reminder",
                    "appointment prep", "emergency response")
            details: Optional additional context
        """
        event = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "family_id": family_id,
            "accessor": {
                "phone": accessor_phone,
                "role": accessor_role,
            },
            "access_type": access_type,
            "data_type": data_type,
            "purpose": purpose,
        }
        if details:
            event["details"] = details

        date_str = datetime.utcnow().strftime("%Y-%m-%d")
        log_path = f"{self.log_dir}/{date_str}/phi_access.log"

        # Append JSON line (each event is one line for easy parsing)
        with open(log_path, "a") as f:
            f.write(json.dumps(event) + "\n")

    def log_agent_read(self, family_id: str, sections_loaded: list[str],
                       purpose: str):
        """Convenience: log when the agent reads family.md sections."""
        self.log_access(
            family_id=family_id,
            accessor_phone="AGENT",
            accessor_role="agent",
            access_type="read",
            data_type=",".join(sections_loaded),
            purpose=purpose,
        )

    def log_agent_write(self, family_id: str, section_modified: str,
                        change_summary: str, approved_by: str):
        """Convenience: log when the agent writes to family.md."""
        self.log_access(
            family_id=family_id,
            accessor_phone="AGENT",
            accessor_role="agent",
            access_type="write",
            data_type=section_modified,
            purpose=change_summary,
            details=f"approved_by:{approved_by}",
        )
