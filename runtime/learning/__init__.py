"""CareSupport Learning System — shared persistence for lessons."""

from datetime import datetime, timezone
from pathlib import Path


MAX_LESSONS = 20


def append_lessons(lessons_path: Path, new_entries: list[str], max_entries: int = MAX_LESSONS) -> int:
    """Append lesson entries to lessons.md, capping at max_entries.

    Returns the number of entries actually written.
    """
    lessons_path.parent.mkdir(parents=True, exist_ok=True)

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    new_lines = [f"- [{now}] {c.strip()}" for c in new_entries if isinstance(c, str) and c.strip()]
    if not new_lines:
        return 0

    content = lessons_path.read_text() if lessons_path.exists() else "# Lessons\n"
    lines = content.strip().split("\n")
    header_lines = [l for l in lines if not l.startswith("- [")]
    entry_lines = [l for l in lines if l.startswith("- [")]

    entry_lines.extend(new_lines)
    if len(entry_lines) > max_entries:
        entry_lines = entry_lines[-max_entries:]

    lessons_path.write_text("\n".join(header_lines) + "\n" + "\n".join(entry_lines) + "\n")
    return len(new_lines)
