from __future__ import annotations

"""
CareSupport Review Loop — Feedback Ingestion & Learning System (CAR-61)
========================================================================
Ingests multiple signal sources, evaluates agent behavior against skill
guidance, and produces lessons + operational alerts.

Standalone script. Does NOT modify family.md directly — produces lessons
via the existing append_lessons() mechanism.

Usage:
    python review_loop.py --since 2h                     # last 2 hours
    python review_loop.py --since 24h --family kano      # specific family
    python review_loop.py --since 2h --full              # include full transcript
    python review_loop.py --since 2h --dry-run           # preview only
    python review_loop.py --since 2h --json --full       # JSON with exchanges array
    python review_loop.py --since 3h --family kano --full --stage   # findings → staging/reviews/ (no mutation)
"""

import argparse
import json
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass, asdict
from datetime import datetime, timezone, timedelta
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent.parent / ".env")

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import paths

from learning import append_lessons


# ─── Data Structures ────────────────────────────────────────────────────

@dataclass
class Signal:
    timestamp: datetime
    source: str        # conversation | phi_audit | approval | poller
    family_id: str
    event_type: str    # exchange | error | blocked | stale_approval | unknown_number
    data: dict


@dataclass
class Finding:
    severity: str       # critical | warning | info
    category: str       # skill_violation | operational | feedback | pattern
    title: str
    evidence: str
    recommendation: str
    lesson: str | None  # written to lessons.md if non-None


# ─── CLI Parsing ────────────────────────────────────────────────────────

def parse_since(value: str) -> timedelta:
    m = re.match(r"^(\d+)(m|h|d)$", value)
    if not m:
        raise ValueError(f"Invalid --since: {value}. Use format like 30m, 2h, 7d")
    num, unit = int(m.group(1)), m.group(2)
    return {"m": timedelta(minutes=num), "h": timedelta(hours=num), "d": timedelta(days=num)}[unit]


def mask_phone(phone: str) -> str:
    if len(phone) >= 10:
        return phone[:4] + "***" + phone[-4:]
    return phone


# ─── Ingestion ──────────────────────────────────────────────────────────

def _parse_log_timestamp(line: str) -> datetime | None:
    if not line.startswith("["):
        return None
    bracket_end = line.find("]")
    if bracket_end < 0:
        return None
    ts_str = line[1:bracket_end]
    try:
        return datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S %Z").replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def _parse_log_line(line: str) -> tuple[datetime, str, str] | None:
    """Parse a conversation log line into (timestamp, direction, body)."""
    ts = _parse_log_timestamp(line)
    if ts is None:
        return None
    rest = line[line.find("]") + 2:]  # after "] "
    dir_match = re.match(r"\[(INBOUND|OUTBOUND|INBOUND_APPROVAL|OUTBOUND_BLOCKED)\]\s*", rest)
    if not dir_match:
        return None
    direction = dir_match.group(1)
    body = rest[dir_match.end():]
    return ts, direction, body


def ingest_conversations(since: datetime, family_id: str = "") -> list[Signal]:
    """Read conversation logs and pair INBOUND→OUTBOUND into exchanges."""
    signals = []
    conv_dir = paths.conversations
    if not conv_dir.exists():
        return signals

    for phone_dir in conv_dir.iterdir():
        if not phone_dir.is_dir():
            continue
        phone = phone_dir.name
        for log_file in sorted(phone_dir.glob("*.log"), reverse=True):
            lines = log_file.read_text().strip().split("\n")
            pending_inbound = None
            for line in lines:
                parsed = _parse_log_line(line)
                if parsed is None:
                    continue
                ts, direction, body = parsed
                if ts < since:
                    continue
                if direction == "INBOUND":
                    pending_inbound = (ts, body, phone)
                elif direction == "OUTBOUND" and pending_inbound is not None:
                    in_ts, in_body, in_phone = pending_inbound
                    fam_id = _resolve_family_for_phone(in_phone)
                    if family_id and fam_id != family_id:
                        pending_inbound = None
                        continue
                    signals.append(Signal(
                        timestamp=in_ts,
                        source="conversation",
                        family_id=fam_id,
                        event_type="exchange",
                        data={
                            "inbound": in_body,
                            "outbound": body,
                            "phone": in_phone,
                            "outbound_ts": ts.isoformat(),
                        },
                    ))
                    pending_inbound = None
    return sorted(signals, key=lambda s: s.timestamp)


def _resolve_family_for_phone(phone: str) -> str:
    """Quick lookup: phone → family_id. Scans routing files."""
    families_dir = paths.families
    if not families_dir.exists():
        return ""
    for family_dir in families_dir.iterdir():
        if not family_dir.is_dir():
            continue
        for name in ("routing.json", "phone_routing.json"):
            routing_file = family_dir / name
            if not routing_file.exists():
                continue
            try:
                routing = json.loads(routing_file.read_text())
            except (json.JSONDecodeError, OSError):
                continue
            members = routing.get("members", {})
            if isinstance(members, dict):
                if phone in members:
                    return family_dir.name
            elif isinstance(members, list):
                for m in members:
                    if m.get("phone") == phone:
                        return family_dir.name
    return ""


def ingest_phi_audit(since: datetime) -> list[Signal]:
    """Read PHI audit logs for blocked responses and unknown numbers."""
    signals = []
    now = datetime.now(timezone.utc)
    date = since.date()
    while date <= now.date():
        date_str = date.strftime("%Y-%m-%d")
        log_path = paths.phi_access_log(date_str)
        if log_path.exists():
            for line in log_path.read_text().strip().split("\n"):
                if not line.strip():
                    continue
                try:
                    event = json.loads(line)
                except json.JSONDecodeError:
                    continue
                ts_str = event.get("timestamp", "")
                try:
                    ts = datetime.fromisoformat(ts_str.rstrip("Z")).replace(tzinfo=timezone.utc)
                except ValueError:
                    continue
                if ts < since:
                    continue
                event_type = event.get("event", "")
                if event_type == "response_blocked":
                    signals.append(Signal(
                        timestamp=ts,
                        source="phi_audit",
                        family_id=event.get("family_id", ""),
                        event_type="blocked",
                        data=event,
                    ))
                elif event_type == "unknown_number":
                    signals.append(Signal(
                        timestamp=ts,
                        source="phi_audit",
                        family_id="",
                        event_type="unknown_number",
                        data=event,
                    ))
        date += timedelta(days=1)
    return signals


def ingest_pending_approvals(family_id: str = "") -> list[Signal]:
    """Check for stale pending approvals (>18h old)."""
    signals = []
    families_dir = paths.families
    if not families_dir.exists():
        return signals
    now = datetime.now(timezone.utc)
    stale_threshold = timedelta(hours=18)

    dirs = [families_dir / family_id] if family_id else list(families_dir.iterdir())
    for fdir in dirs:
        if not fdir.is_dir():
            continue
        approvals_path = fdir / "pending_approvals.json"
        if not approvals_path.exists():
            continue
        try:
            data = json.loads(approvals_path.read_text())
        except (json.JSONDecodeError, OSError):
            continue
        for entry in data.get("pending", []):
            if entry.get("status") != "pending":
                continue
            created_str = entry.get("created_at", "")
            try:
                created = datetime.fromisoformat(created_str.rstrip("Z")).replace(tzinfo=timezone.utc)
            except ValueError:
                continue
            age = now - created
            if age > stale_threshold:
                signals.append(Signal(
                    timestamp=created,
                    source="approval",
                    family_id=fdir.name,
                    event_type="stale_approval",
                    data={
                        "id": entry.get("id", "?"),
                        "description": entry.get("description", ""),
                        "age_hours": round(age.total_seconds() / 3600, 1),
                        "expires_at": entry.get("expires_at", ""),
                    },
                ))
    return signals


def ingest_poller_stdout(since: datetime) -> list[Signal]:
    """Capture poller stdout from tmux for errors and failures."""
    signals = []
    try:
        raw = subprocess.run(
            ["tmux", "capture-pane", "-t", "caresupport", "-p", "-S", "-200"],
            capture_output=True, text=True, timeout=5,
        )
        if raw.returncode != 0:
            return signals
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return signals

    for line in raw.stdout.strip().split("\n"):
        if not line.strip():
            continue
        ts = _parse_log_timestamp(line)
        if ts is None or ts < since:
            continue
        if "❌" in line or "⚠️" in line:
            event_type = "error" if "❌" in line else "warning"
            signals.append(Signal(
                timestamp=ts,
                source="poller",
                family_id="",
                event_type=event_type,
                data={"line": line.strip()[:200]},
            ))
    return signals


# ─── Rule-Based Analysis ────────────────────────────────────────────────

def load_skill_rules() -> dict:
    """Extract checkable patterns from skill files."""
    rules: dict = {"forbidden_phrases": [], "max_questions_per_response": 1}
    social_path = paths.skills_dir / "social.md"
    if social_path.exists():
        text = social_path.read_text()
        # "before I can proceed" and variants from social.md conversation flow
        rules["forbidden_phrases"] = [
            "before i can proceed",
            "before i save",
            "before i can help",
            "i need to know",
        ]
    return rules


def _count_questions(text: str) -> int:
    return text.count("?")


def check_multi_question(exchanges: list[Signal]) -> list[Finding]:
    findings = []
    for ex in exchanges:
        outbound = ex.data.get("outbound", "")
        q_count = _count_questions(outbound)
        if q_count > 1:
            findings.append(Finding(
                severity="critical",
                category="skill_violation",
                title=f"Agent asked {q_count} questions in one response",
                evidence=outbound[:120],
                recommendation="Follow social.md: one question at a time, always",
                lesson="One question per response, always. Never stack multiple questions in a single message.",
            ))
    return findings


def check_forbidden_phrases(exchanges: list[Signal], rules: dict) -> list[Finding]:
    findings = []
    for ex in exchanges:
        outbound = ex.data.get("outbound", "").lower()
        for phrase in rules.get("forbidden_phrases", []):
            if phrase in outbound:
                findings.append(Finding(
                    severity="critical",
                    category="skill_violation",
                    title=f'Used forbidden phrase: "{phrase}"',
                    evidence=ex.data.get("outbound", "")[:120],
                    recommendation=f'social.md prohibits "{phrase}". Proceed with what you have.',
                    lesson=f'Never say "{phrase}". Act on available information per social.md.',
                ))
    return findings


def check_user_feedback(exchanges: list[Signal]) -> list[Finding]:
    """Detect user corrections and feedback in inbound messages."""
    findings = []
    feedback_patterns = [
        (r"\b(that'?s wrong|that'?s not right|incorrect)\b", "correction"),
        (r"\b(don'?t do that|stop doing|never do)\b", "critical"),
        (r"\b(remember that|keep in mind|note that)\b", "constructive"),
        (r"\b(good job|perfect|that'?s right|exactly)\b", "positive"),
        (r"\b(i told you|i already said|i said)\b", "correction"),
    ]
    for ex in exchanges:
        inbound = ex.data.get("inbound", "").lower()
        for pattern, feedback_type in feedback_patterns:
            if re.search(pattern, inbound):
                findings.append(Finding(
                    severity="info",
                    category="feedback",
                    title=f"User feedback detected ({feedback_type})",
                    evidence=ex.data.get("inbound", "")[:120],
                    recommendation=f"Review this {feedback_type} feedback for lessons",
                    lesson=None,  # AI pass should generate specific lessons
                ))
                break  # one finding per exchange
    return findings


def check_response_length(exchanges: list[Signal]) -> list[Finding]:
    findings = []
    for ex in exchanges:
        outbound = ex.data.get("outbound", "")
        if len(outbound) > 500:
            findings.append(Finding(
                severity="info",
                category="pattern",
                title=f"Response too long ({len(outbound)} chars)",
                evidence=outbound[:120],
                recommendation="Keep SMS responses under 320 chars (2 segments) when possible",
                lesson=None,
            ))
    return findings


def check_stale_approvals(signals: list[Signal]) -> list[Finding]:
    findings = []
    for s in signals:
        if s.event_type == "stale_approval":
            age = s.data.get("age_hours", 0)
            findings.append(Finding(
                severity="warning",
                category="operational",
                title=f"Stale approval {s.data.get('id', '?')} ({age:.0f}h old)",
                evidence=s.data.get("description", "")[:120],
                recommendation="Resolve or re-send confirmation SMS",
                lesson=None,
            ))
    return findings


def check_phi_blocks(signals: list[Signal]) -> list[Finding]:
    findings = []
    for s in signals:
        if s.event_type == "blocked":
            findings.append(Finding(
                severity="critical",
                category="operational",
                title="PHI leakage blocked",
                evidence=f"Response blocked for {mask_phone(s.data.get('accessor', {}).get('phone', '?'))}",
                recommendation="Review agent prompt for leakage patterns",
                lesson="Agent attempted to share restricted information. Review context filtering.",
            ))
    return findings


def check_poller_errors(signals: list[Signal]) -> list[Finding]:
    findings = []
    for s in signals:
        if s.source == "poller" and s.event_type == "error":
            findings.append(Finding(
                severity="warning",
                category="operational",
                title="Poller error",
                evidence=s.data.get("line", "")[:120],
                recommendation="Check poll_inbound.py logs for root cause",
                lesson=None,
            ))
    return findings


def run_rule_checks(exchanges: list[Signal], all_signals: list[Signal]) -> list[Finding]:
    rules = load_skill_rules()
    findings = []
    findings.extend(check_multi_question(exchanges))
    findings.extend(check_forbidden_phrases(exchanges, rules))
    findings.extend(check_user_feedback(exchanges))
    findings.extend(check_response_length(exchanges))
    findings.extend(check_stale_approvals(all_signals))
    findings.extend(check_phi_blocks(all_signals))
    findings.extend(check_poller_errors(all_signals))
    return findings


# ─── Output ─────────────────────────────────────────────────────────────

def _format_transcript(exchanges: list[Signal]) -> str:
    """Format exchanges as a readable transcript block."""
    lines = [
        f"  📜 TRANSCRIPT ({len(exchanges)} exchanges)",
        "  " + "─" * 40,
    ]
    for ex in exchanges:
        ts = ex.timestamp.strftime("%H:%M:%S")
        inbound = ex.data.get("inbound", "")
        outbound = ex.data.get("outbound", "")
        out_ts_str = ex.data.get("outbound_ts", "")
        out_ts = ""
        if out_ts_str:
            try:
                out_ts = datetime.fromisoformat(out_ts_str).strftime("%H:%M:%S")
            except ValueError:
                out_ts = ts
        lines.append(f"  [{ts}] USER: {inbound}")
        lines.append(f"  [{out_ts or ts}] AGENT: {outbound}")
        lines.append("")
    return "\n".join(lines)


def format_digest(findings: list[Finding], exchange_count: int,
                  family_id: str, since_label: str,
                  exchanges: list[Signal] | None = None) -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    scope = family_id if family_id else "all families"

    lines = [
        "=" * 55,
        f"  CareSupport Review — Last {since_label} ({scope})",
        f"  {now}",
        "=" * 55,
        "",
        f"  {exchange_count} exchange(s) reviewed",
        "",
    ]

    by_severity = {"critical": [], "warning": [], "info": []}
    for f in findings:
        by_severity.get(f.severity, by_severity["info"]).append(f)

    labels = {"critical": "CRITICAL", "warning": "WARNINGS", "info": "INFO"}
    icons = {"critical": "🔴", "warning": "🟡", "info": "ℹ️ "}

    for sev in ("critical", "warning", "info"):
        items = by_severity[sev]
        if not items:
            continue
        lines.append(f"  {icons[sev]} {labels[sev]} ({len(items)})")
        lines.append("  " + "─" * 40)
        for f in items:
            lines.append(f"  {f.title}")
            if f.evidence:
                lines.append(f"    Evidence: {f.evidence}")
            if f.lesson:
                lines.append(f"    → Lesson: {f.lesson}")
        lines.append("")

    seen_lessons: set[str] = set()
    unique_lessons: list[str] = []
    for f in findings:
        if f.lesson and f.lesson not in seen_lessons:
            seen_lessons.add(f.lesson)
            unique_lessons.append(f.lesson)
    if unique_lessons:
        lines.append(f"  📝 LESSONS ({len(unique_lessons)} unique)")
        lines.append("  " + "─" * 40)
        for lesson in unique_lessons:
            lines.append(f"  → {lesson}")
        lines.append("")

    if exchanges:
        lines.append(_format_transcript(exchanges))

    return "\n".join(lines)


def write_lessons(findings: list[Finding], family_id: str, dry_run: bool) -> int:
    """Write generated lessons via append_lessons(). Returns count written."""
    seen = set()
    lessons = []
    for f in findings:
        if f.lesson and f.lesson not in seen:
            seen.add(f.lesson)
            lessons.append(f.lesson)
    if not lessons:
        return 0
    if dry_run:
        return len(lessons)

    # Family-specific lessons (default: route to family if family_id known)
    if family_id:
        family_lessons_path = paths.families / family_id / "lessons.md"
        written = append_lessons(family_lessons_path, lessons, max_entries=10)
    else:
        written = append_lessons(paths.lessons, lessons)
    return written


def format_json_output(findings: list[Finding], exchange_count: int,
                       exchanges: list[Signal] | None = None) -> str:
    unique_lessons = list(dict.fromkeys(f.lesson for f in findings if f.lesson))
    output: dict = {
        "exchange_count": exchange_count,
        "findings": [asdict(f) for f in findings],
        "unique_lessons": unique_lessons,
        "lesson_count": len(unique_lessons),
        "phi_present": True,
    }
    if exchanges is not None:
        output["exchanges"] = [
            {
                "timestamp": ex.timestamp.isoformat(),
                "user": ex.data.get("inbound", ""),
                "agent": ex.data.get("outbound", ""),
            }
            for ex in exchanges
        ]
    return json.dumps(output, indent=2)


# ─── Staging ─────────────────────────────────────────────────────────────

SNAPSHOT_FILES = ["family.md", "lessons.md"]
SNAPSHOT_DIRS = ["members"]


def _staging_dir(family_id: str) -> Path:
    return paths.families / family_id / "staging"


def _ensure_baseline(family_id: str) -> None:
    """Create baseline snapshot if it doesn't exist yet (first-run safety net)."""
    baseline = _staging_dir(family_id) / "baseline"
    if baseline.exists():
        return
    family_dir = paths.families / family_id
    baseline.mkdir(parents=True, exist_ok=True)
    for name in SNAPSHOT_FILES:
        src = family_dir / name
        if src.exists():
            shutil.copy2(src, baseline / name)
    for name in SNAPSHOT_DIRS:
        src = family_dir / name
        if src.is_dir():
            shutil.copytree(src, baseline / name, dirs_exist_ok=True)


def _write_staging_review(family_id: str, findings: list[Finding],
                          exchanges: list[Signal], since_label: str) -> Path:
    """Write findings + lessons + exchanges to staging/reviews/{ts}.json."""
    reviews_dir = _staging_dir(family_id) / "reviews"
    reviews_dir.mkdir(parents=True, exist_ok=True)

    ts = datetime.now(timezone.utc)
    filename = ts.strftime("%Y-%m-%d_%H%M%S") + ".json"

    unique_lessons = list(dict.fromkeys(f.lesson for f in findings if f.lesson))
    payload = {
        "timestamp": ts.isoformat(),
        "family_id": family_id,
        "since": since_label,
        "exchange_count": len(exchanges),
        "findings": [asdict(f) for f in findings],
        "lessons": unique_lessons,
        "exchanges": [
            {
                "timestamp": ex.timestamp.isoformat(),
                "user": ex.data.get("inbound", ""),
                "agent": ex.data.get("outbound", ""),
            }
            for ex in exchanges
        ],
    }

    out_path = reviews_dir / filename
    out_path.write_text(json.dumps(payload, indent=2))
    return out_path


# ─── Main ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="CareSupport Review Loop — Evaluate agent behavior and generate lessons"
    )
    parser.add_argument("--since", default="24h", help="Time window: 30m, 2h, 7d (default: 24h)")
    parser.add_argument("--family", default="", help="Review specific family (e.g., kano)")
    parser.add_argument("--full", action="store_true", help="Include full transcript for deep analysis")
    parser.add_argument("--dry-run", action="store_true", help="Show findings without writing lessons")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--stage", action="store_true", help="Write findings to staging/ instead of real files")
    args = parser.parse_args()

    if args.stage and not args.family:
        print("--stage requires --family", file=sys.stderr)
        sys.exit(1)

    try:
        delta = parse_since(args.since)
    except ValueError as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)

    since = datetime.now(timezone.utc) - delta

    # Ingest all sources
    exchanges = ingest_conversations(since, family_id=args.family)
    phi_signals = ingest_phi_audit(since)
    approval_signals = ingest_pending_approvals(family_id=args.family)
    poller_signals = ingest_poller_stdout(since)

    all_signals = phi_signals + approval_signals + poller_signals

    # Rule-based analysis
    findings = run_rule_checks(exchanges, all_signals)

    # Operational alerts to stderr
    for f in findings:
        if f.category == "operational":
            print(f"[ALERT] {f.title}: {f.evidence}", file=sys.stderr)

    # Output to stdout (unchanged regardless of --stage)
    full_exchanges = exchanges if args.full else None
    if args.json:
        print(format_json_output(findings, len(exchanges), exchanges=full_exchanges))
    else:
        print(format_digest(findings, len(exchanges), args.family, args.since,
                            exchanges=full_exchanges))

    # Staging mode: write to staging dir, skip lesson mutation
    if args.stage:
        _ensure_baseline(args.family)
        review_path = _write_staging_review(
            args.family, findings, exchanges, args.since,
        )
        print(f"  📂 Staged to {review_path}", file=sys.stderr)
        return

    # Write lessons (only when NOT staging)
    lesson_count = write_lessons(findings, args.family, dry_run=args.dry_run)
    if lesson_count and not args.json:
        suffix = " (dry-run, not written)" if args.dry_run else ""
        print(f"  ✏️  {lesson_count} lesson(s) generated{suffix}")


if __name__ == "__main__":
    main()
