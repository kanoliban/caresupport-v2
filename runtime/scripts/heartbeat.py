"""
CareSupport Heartbeat Cron
===========================
A 48-hour lookahead scanner that reads family.md and returns alerts for:
  - Uncovered shifts (no one assigned, or status=uncovered)
  - Shifts with morning_meds/evening_meds tasks but no med_admin capable caregiver
  - Appointments within 48h missing transport or escort
  - Tentative shifts that haven't been confirmed

Self-contained: reads family.md, parses YAML schedule blocks, evaluates
rules, returns structured alerts. Does NOT use AI — this is deterministic.

Usage:
    python heartbeat.py --family-dir /path/to/family/dir [--hours 48] [--now "2026-02-18T10:00"]

Per the "description = brain" insight: the logic lives here, not in a prompt.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Use shared config
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import paths

# ─── Alert Types ──────────────────────────────────────────────────────────

@dataclass
class Alert:
    """A single heartbeat alert."""
    severity: str       # "high" | "medium" | "low"
    category: str       # "uncovered_shift" | "unconfirmed_shift" | "med_coverage_gap" | "appointment_logistics"
    summary: str        # Human-readable one-liner
    date: str           # ISO date (YYYY-MM-DD)
    window: str         # Time window (e.g., "07:00-12:00")
    details: dict       # Category-specific details
    hours_until: float  # Hours from now until this event


@dataclass
class HeartbeatResult:
    """Result of a heartbeat scan."""
    family_id: str
    scan_time: str
    lookahead_hours: int
    alerts: list[Alert] = field(default_factory=list)
    all_clear: bool = True


# ─── YAML Parsing (lightweight, no yaml dependency) ───────────────────────

def _extract_yaml_block(section_content: str) -> str:
    """Extract content between ```yaml and ``` markers."""
    match = re.search(r'```yaml\s*\n(.*?)```', section_content, re.DOTALL)
    return match.group(1) if match else ""


def _parse_shifts(yaml_text: str) -> list[dict]:
    """Parse shift entries from YAML-like text.

    Simple parser: looks for '  - date:' blocks and extracts key-value pairs.
    """
    shifts = []
    current = None

    for line in yaml_text.split("\n"):
        stripped = line.strip()
        if stripped.startswith("- date:"):
            if current:
                shifts.append(current)
            current = {"date": stripped.split(":", 1)[1].strip().strip('"')}
        elif current and ":" in stripped and not stripped.startswith("-"):
            key, value = stripped.split(":", 1)
            key = key.strip()
            value = value.strip().strip('"')
            if key == "tasks":
                # Parse [task1, task2] format
                value = [t.strip() for t in value.strip("[]").split(",")]
            current[key] = value

    if current:
        shifts.append(current)

    return shifts


def _parse_members_capabilities(members_content: str) -> dict[str, list[str]]:
    """Parse member capabilities from the Members section.

    Returns: {member_name: [capabilities]}
    """
    capabilities = {}
    current_name = None

    for line in members_content.split("\n"):
        if line.startswith("### "):
            current_name = line[4:].strip()
            capabilities[current_name] = []
        elif current_name and "Capabilities:" in line:
            caps_text = line.split("Capabilities:", 1)[1].strip().strip("[]")
            if caps_text:
                capabilities[current_name] = [c.strip() for c in caps_text.split(",")]

    return capabilities


# ─── Appointment Parsing ──────────────────────────────────────────────────

def _parse_appointments(appointments_content: str, reference_year: int = 2026) -> list[dict]:
    """Parse appointment entries from markdown.

    Appointments are in format:
    - **Feb 18, 10:00 AM** — Description
      - Transport: ...
      - Escort: ...
    """
    appointments = []
    current = None

    for line in appointments_content.split("\n"):
        # Match: - **Month Day, Time** — Description
        match = re.match(r'^- \*\*(.+?)\*\* — (.+)', line)
        if match:
            if current:
                appointments.append(current)
            date_str = match.group(1).strip()
            description = match.group(2).strip()
            current = {
                "date_str": date_str,
                "description": description,
                "transport": None,
                "escort": None,
            }
        elif current and line.strip().startswith("- Transport:"):
            current["transport"] = line.strip().split("Transport:", 1)[1].strip()
        elif current and line.strip().startswith("- Escort:"):
            current["escort"] = line.strip().split("Escort:", 1)[1].strip()

    if current:
        appointments.append(current)

    return appointments


def _parse_appointment_date(date_str: str, reference_year: int = 2026) -> datetime | None:
    """Parse 'Feb 18, 10:00 AM' into a datetime."""
    # Try common formats
    for fmt in ["%b %d, %I:%M %p", "%B %d, %I:%M %p", "%b %d, %H:%M", "%B %d, %H:%M"]:
        try:
            dt = datetime.strptime(date_str, fmt)
            return dt.replace(year=reference_year, tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


# ─── Heartbeat Scanner ────────────────────────────────────────────────────

def scan_family(
    family_dir: Path,
    lookahead_hours: int = 48,
    now: datetime | None = None,
) -> HeartbeatResult:
    """Scan family.md for the next N hours and return alerts.

    This is the main entry point for the heartbeat cron.
    """
    if now is None:
        now = datetime.now(timezone.utc)

    cutoff = now + timedelta(hours=lookahead_hours)

    # Load family.md
    family_md_path = family_dir / "family.md"
    if not family_md_path.exists():
        return HeartbeatResult(
            family_id=family_dir.name,
            scan_time=now.isoformat() + "Z",
            lookahead_hours=lookahead_hours,
            alerts=[Alert(
                severity="high", category="system_error",
                summary="family.md not found",
                date=now.strftime("%Y-%m-%d"), window="",
                details={}, hours_until=0,
            )],
            all_clear=False,
        )

    content = family_md_path.read_text()

    # Parse sections
    from enforcement.role_filter import parse_family_sections
    _, sections = parse_family_sections(content)
    section_map = {s.key: s.content for s in sections}

    # Extract member capabilities
    member_caps = _parse_members_capabilities(section_map.get("members", ""))

    alerts = []

    # ─── Check shifts ──────────────────────────────────────────────────
    schedule_yaml = _extract_yaml_block(section_map.get("schedule", ""))
    if schedule_yaml:
        shifts = _parse_shifts(schedule_yaml)

        for shift in shifts:
            shift_date_str = shift.get("date", "")
            shift_window = shift.get("window", "")

            # Parse shift datetime
            try:
                start_time = shift_window.split("-")[0].strip() if "-" in shift_window else "00:00"
                shift_dt = datetime.strptime(f"{shift_date_str} {start_time}", "%Y-%m-%d %H:%M")
                shift_dt = shift_dt.replace(tzinfo=timezone.utc)
            except (ValueError, IndexError):
                continue

            # Skip if outside lookahead window
            if shift_dt < now or shift_dt > cutoff:
                continue

            hours_until = (shift_dt - now).total_seconds() / 3600
            assigned = shift.get("assigned", "null")
            status = shift.get("status", "")
            tasks = shift.get("tasks", [])
            if isinstance(tasks, str):
                tasks = [t.strip() for t in tasks.strip("[]").split(",")]

            # CHECK 1: Uncovered shift
            if assigned in ("null", "None", "") or status == "uncovered":
                severity = "high" if hours_until < 24 else "medium"
                alerts.append(Alert(
                    severity=severity,
                    category="uncovered_shift",
                    summary=f"Uncovered {shift.get('type', 'shift')} on {shift_date_str} ({shift_window})",
                    date=shift_date_str,
                    window=shift_window,
                    details={"tasks": tasks, "type": shift.get("type", "")},
                    hours_until=round(hours_until, 1),
                ))

            # CHECK 2: Tentative/unconfirmed shift
            elif status == "tentative":
                alerts.append(Alert(
                    severity="medium",
                    category="unconfirmed_shift",
                    summary=f"Tentative shift: {assigned} on {shift_date_str} ({shift_window})",
                    date=shift_date_str,
                    window=shift_window,
                    details={
                        "assigned": assigned,
                        "notes": shift.get("notes", ""),
                    },
                    hours_until=round(hours_until, 1),
                ))

            # CHECK 3: Med coverage gap
            # Does this shift include med tasks but the assigned person can't do med_admin?
            elif assigned not in ("null", "None", ""):
                med_tasks = [t for t in tasks if "med" in t.lower()]
                if med_tasks:
                    person_caps = member_caps.get(assigned, [])
                    if "med_admin" not in person_caps:
                        alerts.append(Alert(
                            severity="high",
                            category="med_coverage_gap",
                            summary=f"{assigned} assigned med tasks on {shift_date_str} but lacks med_admin capability",
                            date=shift_date_str,
                            window=shift_window,
                            details={
                                "assigned": assigned,
                                "med_tasks": med_tasks,
                                "capabilities": person_caps,
                            },
                            hours_until=round(hours_until, 1),
                        ))

    # ─── Check appointments ────────────────────────────────────────────
    appointments_content = section_map.get("appointments", "")
    if appointments_content:
        appointments = _parse_appointments(appointments_content)

        for appt in appointments:
            appt_dt = _parse_appointment_date(appt["date_str"])
            if appt_dt is None:
                continue

            if appt_dt < now or appt_dt > cutoff:
                continue

            hours_until = (appt_dt - now).total_seconds() / 3600

            # CHECK 4: Missing transport
            transport = appt.get("transport", "")
            if transport and ("needed" in transport.lower() or "book" in transport.lower()):
                alerts.append(Alert(
                    severity="high" if hours_until < 24 else "medium",
                    category="appointment_logistics",
                    summary=f"Appointment {appt['date_str']}: transport still needed — {appt['description']}",
                    date=appt_dt.strftime("%Y-%m-%d"),
                    window=appt["date_str"],
                    details={
                        "description": appt["description"],
                        "transport": transport,
                        "escort": appt.get("escort", ""),
                    },
                    hours_until=round(hours_until, 1),
                ))

            # CHECK 5: Missing escort
            escort = appt.get("escort", "")
            if not escort or "needed" in escort.lower() or "tbd" in escort.lower():
                alerts.append(Alert(
                    severity="medium",
                    category="appointment_logistics",
                    summary=f"Appointment {appt['date_str']}: escort not confirmed — {appt['description']}",
                    date=appt_dt.strftime("%Y-%m-%d"),
                    window=appt["date_str"],
                    details={
                        "description": appt["description"],
                        "escort": escort,
                    },
                    hours_until=round(hours_until, 1),
                ))

    # Sort alerts by severity (high first) then by hours_until
    severity_order = {"high": 0, "medium": 1, "low": 2}
    alerts.sort(key=lambda a: (severity_order.get(a.severity, 9), a.hours_until))

    return HeartbeatResult(
        family_id=family_dir.name,
        scan_time=now.isoformat() + "Z",
        lookahead_hours=lookahead_hours,
        alerts=alerts,
        all_clear=len(alerts) == 0,
    )


# ─── SMS Formatting ───────────────────────────────────────────────────────

def format_alerts_sms(result: HeartbeatResult) -> str:
    """Format heartbeat alerts as an SMS to the coordinator."""
    if result.all_clear:
        return f"✅ All clear for the next {result.lookahead_hours}h. No gaps or issues found."

    lines = [f"⚠️ {len(result.alerts)} alert(s) for the next {result.lookahead_hours}h:\n"]

    for i, alert in enumerate(result.alerts, 1):
        icon = "🔴" if alert.severity == "high" else "🟡"
        lines.append(f"{icon} {alert.summary}")
        if alert.hours_until < 24:
            lines.append(f"   ↳ {alert.hours_until:.0f}h away")

    return "\n".join(lines)


# ─── CLI ──────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CareSupport Heartbeat Scanner")
    parser.add_argument("--family-dir", required=True, help="Path to the family directory")
    parser.add_argument("--hours", type=int, default=48, help="Lookahead hours (default 48)")
    parser.add_argument("--now", help="Override 'now' for testing (ISO format)")
    parser.add_argument("--json", action="store_true", help="Output as JSON")

    args = parser.parse_args()

    now = None
    if args.now:
        now = datetime.fromisoformat(args.now).replace(tzinfo=timezone.utc)

    result = scan_family(Path(args.family_dir), args.hours, now)

    if args.json:
        print(json.dumps({
            "family_id": result.family_id,
            "scan_time": result.scan_time,
            "lookahead_hours": result.lookahead_hours,
            "all_clear": result.all_clear,
            "alerts": [asdict(a) for a in result.alerts],
        }, indent=2))
    else:
        print(format_alerts_sms(result))
