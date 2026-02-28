"""CareSupport Learning System — shared persistence for lessons."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from pathlib import Path


MAX_LESSONS = 50

_CATEGORIES = ("behavioral", "factual", "operational")
_CATEGORY_RE = re.compile(r"^\- \[\d{4}-\d{2}-\d{2}\] \[(behavioral|factual|operational)\]", re.IGNORECASE)


def _get_category(line: str) -> str:
    m = _CATEGORY_RE.match(line)
    return m.group(1).lower() if m else "behavioral"


def _evict_by_category(entries: list[str], max_entries: int) -> list[str]:
    """Evict oldest entries while preserving category diversity.

    Distributes slots proportionally to how many entries each category has,
    with a minimum of 1 slot per category that has entries.
    """
    if len(entries) <= max_entries:
        return entries

    by_cat: dict[str, list[str]] = {}
    for e in entries:
        cat = _get_category(e)
        by_cat.setdefault(cat, []).append(e)

    active_cats = [c for c in _CATEGORIES if c in by_cat]
    if len(active_cats) <= 1:
        return entries[-max_entries:]

    total = len(entries)
    slots: dict[str, int] = {}
    remaining = max_entries
    for cat in active_cats:
        proportion = len(by_cat[cat]) / total
        slots[cat] = max(1, int(proportion * max_entries))
        remaining -= slots[cat]

    if remaining > 0:
        largest = max(active_cats, key=lambda c: len(by_cat[c]))
        slots[largest] += remaining
    elif remaining < 0:
        largest = max(active_cats, key=lambda c: slots[c])
        slots[largest] += remaining

    kept: dict[str, list[str]] = {}
    for cat in active_cats:
        kept[cat] = by_cat[cat][-slots[cat]:]

    result = []
    for e in entries:
        cat = _get_category(e)
        if cat in kept and e in kept[cat]:
            result.append(e)
    return result


def append_lessons(lessons_path: Path, new_entries: list[str], max_entries: int = MAX_LESSONS) -> int:
    """Append lesson entries to lessons.md, capping at max_entries.

    Uses category-aware eviction to preserve diversity across
    [behavioral], [factual], and [operational] lessons.

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
        entry_lines = _evict_by_category(entry_lines, max_entries)

    lessons_path.write_text("\n".join(header_lines) + "\n" + "\n".join(entry_lines) + "\n")
    return len(new_lines)


# ── Lesson content regex: everything after "- [YYYY-MM-DD] " ──
_LESSON_CONTENT_RE = re.compile(r"^\- \[\d{4}-\d{2}-\d{2}\] (.+)$")


def remove_lesson(lessons_path: Path, lesson_text: str) -> bool:
    """Remove a lesson from lessons.md by matching on content (ignoring date prefix).

    Returns True if found and removed.
    """
    if not lessons_path.exists():
        return False

    content = lessons_path.read_text()
    lines = content.strip().split("\n")
    header_lines = [l for l in lines if not l.startswith("- [")]
    entry_lines = [l for l in lines if l.startswith("- [")]

    needle = lesson_text.strip()
    remaining = []
    removed = False
    for entry in entry_lines:
        m = _LESSON_CONTENT_RE.match(entry)
        entry_content = m.group(1).strip() if m else entry.strip()
        if not removed and entry_content == needle:
            removed = True
            continue
        remaining.append(entry)

    if removed:
        lessons_path.write_text("\n".join(header_lines) + "\n" + "\n".join(remaining) + "\n")
    return removed
