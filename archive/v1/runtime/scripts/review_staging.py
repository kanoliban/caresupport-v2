from __future__ import annotations

"""
CareSupport Review Staging
===========================
The problem: every review_loop run writes lessons directly to real files.
Testing = mutating production data. Resetting means deleting real corrections.

The fix: a scratch pad. Nothing touches production until you explicitly
say "promote this." Only things that survive scrutiny become permanent.

There are two tiers of findings. The easy ones are mechanical — rule-based
checks catch "asked 2 questions" or "used forbidden phrase." The hard ones
are contextual — the agent calling Degitu both "grandmother" and "aunt" in
the same response. That needs Opus reading the full transcript, noticing
the contradiction, and writing a lesson with real clarity.

But the most valuable category isn't rule violations at all. It's things
we didn't know we needed: a missing member profile field that caused the
confusion, a flow that has no protocol, a process gap nobody thought to
codify. If we hardcode what "good output" looks like, we lose these.

proposals/ stays markdown (not structured schema) so Opus can surface
whatever it notices. The whole point is to not constrain what gets found.

Three piles with different lifecycles:

  reviews/   — disposable test output. Accumulates with each --stage run.
               Cleared on reset. You don't care about most of these.
  saved/     — curated material. Reviews you flagged as worth revisiting.
               Survives resets. This is Opus's reading pile when it writes
               proposals — the transcripts and findings worth deep analysis.
  proposals/ — where Opus writes back. (Future use.)

The cycle between tests:

  snapshot  →  lock baseline
  --stage   →  test runs accumulate in reviews/
  save      →  flag the interesting ones before they get cleared
  reset     →  restore baseline + clear reviews/ (saved/ untouched)
  promote   →  push approved lessons to production

Usage:
    python review_staging.py snapshot --family kano
    python review_staging.py restore  --family kano
    python review_staging.py reset    --family kano
    python review_staging.py diff     --family kano
    python review_staging.py list     --family kano [--source live]
    python review_staging.py save     --family kano --review 2026-02-26_063623 --name family-tree-confusion
    python review_staging.py promote  --family kano --review 2026-02-26_061700 [--items 0,1]
    python review_staging.py retract  --family kano --review corrections_20260228_194305 [--items 0]
"""

import argparse
import difflib
import json
import shutil
import sys
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent.parent / ".env")

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import paths
from learning import append_lessons, remove_lesson, _get_category, _LESSON_CONTENT_RE


SNAPSHOT_FILES = ["family.md", "lessons.md"]
SNAPSHOT_DIRS = ["members"]


def _family_dir(family_id: str) -> Path:
    return paths.families / family_id


def _staging_dir(family_id: str) -> Path:
    return _family_dir(family_id) / "staging"


def _baseline_dir(family_id: str) -> Path:
    return _staging_dir(family_id) / "baseline"


def _reviews_dir(family_id: str) -> Path:
    return _staging_dir(family_id) / "reviews"


def _graduations_dir(family_id: str) -> Path:
    return _staging_dir(family_id) / "graduations"


def _saved_dir(family_id: str) -> Path:
    return _staging_dir(family_id) / "saved"


# ─── Commands ────────────────────────────────────────────────────────────

def cmd_snapshot(family_id: str) -> None:
    """Save current state to staging/baseline/."""
    family_dir = _family_dir(family_id)
    if not family_dir.is_dir():
        print(f"Family directory not found: {family_dir}", file=sys.stderr)
        sys.exit(1)

    baseline = _baseline_dir(family_id)
    if baseline.exists():
        shutil.rmtree(baseline)
    baseline.mkdir(parents=True, exist_ok=True)

    copied = []
    for name in SNAPSHOT_FILES:
        src = family_dir / name
        if src.exists():
            shutil.copy2(src, baseline / name)
            copied.append(name)
    for name in SNAPSHOT_DIRS:
        src = family_dir / name
        if src.is_dir():
            shutil.copytree(src, baseline / name, dirs_exist_ok=True)
            count = len(list((baseline / name).glob("*.md")))
            copied.append(f"{name}/ ({count} files)")

    print(f"Baseline saved: {baseline}")
    for item in copied:
        print(f"  {item}")


def cmd_restore(family_id: str) -> None:
    """Revert live files to baseline snapshot."""
    baseline = _baseline_dir(family_id)
    if not baseline.exists():
        print("No baseline found. Run 'snapshot' first.", file=sys.stderr)
        sys.exit(1)

    family_dir = _family_dir(family_id)
    restored = []
    for name in SNAPSHOT_FILES:
        src = baseline / name
        if src.exists():
            shutil.copy2(src, family_dir / name)
            restored.append(name)
    for name in SNAPSHOT_DIRS:
        src = baseline / name
        if src.is_dir():
            dest = family_dir / name
            if dest.exists():
                shutil.rmtree(dest)
            shutil.copytree(src, dest)
            count = len(list(dest.glob("*.md")))
            restored.append(f"{name}/ ({count} files)")

    print(f"Restored from baseline: {baseline}")
    for item in restored:
        print(f"  {item}")


def cmd_reset(family_id: str) -> None:
    """Restore baseline + clear reviews/. saved/ is untouched.

    Use between test cycles so old test output doesn't mix with new.
    If a review has findings worth keeping, save it first.
    """
    baseline = _baseline_dir(family_id)
    if not baseline.exists():
        print("No baseline found. Run 'snapshot' first.", file=sys.stderr)
        sys.exit(1)

    # Restore live files
    cmd_restore(family_id)

    # Clear disposable test output
    reviews = _reviews_dir(family_id)
    cleared = 0
    if reviews.exists():
        review_files = list(reviews.glob("*.json"))
        cleared = len(review_files)
        shutil.rmtree(reviews)
    reviews.mkdir(parents=True, exist_ok=True)

    saved = _saved_dir(family_id)
    saved_count = len(list(saved.glob("*.json"))) if saved.exists() else 0

    print(f"Reset complete. {cleared} review(s) cleared. {saved_count} saved review(s) untouched.")


def cmd_save(family_id: str, review_name: str, save_name: str) -> None:
    """Move a review from reviews/ to saved/ with a human-readable name.

    saved/ is the curated pile — reviews you flagged as worth revisiting.
    It survives resets. When Opus sits down to write proposals, this is
    the material worth deep analysis: not the raw dump of every test run,
    but the transcripts where something interesting happened.
    """
    reviews = _reviews_dir(family_id)

    candidates = sorted(reviews.glob(f"{review_name}*.json"))
    if not candidates:
        print(f"No review matching '{review_name}' in {reviews}", file=sys.stderr)
        sys.exit(1)
    if len(candidates) > 1:
        print(f"Ambiguous: {[c.stem for c in candidates]}", file=sys.stderr)
        sys.exit(1)

    saved = _saved_dir(family_id)
    saved.mkdir(parents=True, exist_ok=True)

    src = candidates[0]
    dest = saved / f"{save_name}.json"
    if dest.exists():
        print(f"Already exists: {dest}", file=sys.stderr)
        sys.exit(1)

    shutil.move(str(src), str(dest))
    print(f"Saved: {src.name} → saved/{save_name}.json")


def cmd_diff(family_id: str) -> None:
    """Show unified diff between baseline and current live files."""
    baseline = _baseline_dir(family_id)
    if not baseline.exists():
        print("No baseline found. Run 'snapshot' first.", file=sys.stderr)
        sys.exit(1)

    family_dir = _family_dir(family_id)
    has_diff = False

    all_files = []
    for name in SNAPSHOT_FILES:
        all_files.append((name,))
    for name in SNAPSHOT_DIRS:
        bl_dir = baseline / name
        live_dir = family_dir / name
        names = set()
        if bl_dir.is_dir():
            names.update(f.name for f in bl_dir.glob("*.md"))
        if live_dir.is_dir():
            names.update(f.name for f in live_dir.glob("*.md"))
        for fname in sorted(names):
            all_files.append((name, fname))

    for parts in all_files:
        rel = "/".join(parts)
        bl_path = baseline / rel
        live_path = family_dir / rel

        bl_lines = bl_path.read_text().splitlines(keepends=True) if bl_path.exists() else []
        live_lines = live_path.read_text().splitlines(keepends=True) if live_path.exists() else []

        diff = list(difflib.unified_diff(
            bl_lines, live_lines,
            fromfile=f"baseline/{rel}", tofile=f"live/{rel}",
        ))
        if diff:
            has_diff = True
            sys.stdout.writelines(diff)

    if not has_diff:
        print("No differences between baseline and live files.")


def _list_json_dir(label: str, dir_path: Path, source_filter: str | None = None) -> None:
    """Print summary of JSON files in a staging subdirectory."""
    if not dir_path.exists():
        print(f"{label}: (none)")
        return
    files = sorted(dir_path.glob("*.json"))
    if not files:
        print(f"{label}: (none)")
        return

    filtered = []
    for rf in files:
        try:
            data = json.loads(rf.read_text())
        except (json.JSONDecodeError, OSError):
            filtered.append((rf, None))
            continue
        file_source = data.get("source", "batch")
        if source_filter and file_source != source_filter:
            continue
        filtered.append((rf, data))

    if not filtered:
        print(f"{label}: (none matching --source {source_filter})")
        return

    print(f"{label} ({len(filtered)}):")
    for rf, data in filtered:
        if data is None:
            print(f"  {rf.stem}  (unreadable)")
            continue
        if data.get("source") == "live":
            member = data.get("member", "?")
            n_corrections = len(data.get("corrections", []))
            trigger = data.get("trigger_message", "")[:60]
            print(f"  {rf.stem}  [live] member={member}  corrections={n_corrections}  \"{trigger}\"")
        else:
            n_findings = len(data.get("findings", []))
            n_lessons = len(data.get("lessons", []))
            n_exchanges = data.get("exchange_count", 0)
            since = data.get("since", "?")
            print(f"  {rf.stem}  since={since}  exchanges={n_exchanges}  findings={n_findings}  lessons={n_lessons}")


def cmd_list(family_id: str, source: str | None = None) -> None:
    """List baseline, pending reviews, and saved reviews."""
    baseline = _baseline_dir(family_id)

    print(f"Family: {family_id}")
    if source:
        print(f"Filter: source={source}")
    print()

    if baseline.exists():
        files = [f.name for f in baseline.iterdir() if f.is_file()]
        dirs = [f.name for f in baseline.iterdir() if f.is_dir()]
        print(f"Baseline: {baseline}")
        for f in sorted(files):
            print(f"  {f}")
        for d in sorted(dirs):
            count = len(list((baseline / d).glob("*.md")))
            print(f"  {d}/ ({count} files)")
    else:
        print("Baseline: (none)")

    print()
    _list_json_dir("Reviews (disposable test output)", _reviews_dir(family_id), source)
    print()
    _list_json_dir("Saved (curated for Opus)", _saved_dir(family_id), source)


def cmd_promote(family_id: str, review_name: str, items: list[int] | None) -> None:
    """Promote lessons from a staged review into real lessons.md."""
    reviews = _reviews_dir(family_id)

    # Find the review file (allow partial match)
    candidates = sorted(reviews.glob(f"{review_name}*.json"))
    if not candidates:
        print(f"No review matching '{review_name}' in {reviews}", file=sys.stderr)
        sys.exit(1)
    if len(candidates) > 1:
        print(f"Ambiguous: {[c.stem for c in candidates]}", file=sys.stderr)
        sys.exit(1)

    review_path = candidates[0]
    data = json.loads(review_path.read_text())
    lessons = data.get("lessons", [])

    if not lessons:
        print("No lessons in this review.")
        return

    if items is not None:
        selected = []
        for i in items:
            if 0 <= i < len(lessons):
                selected.append(lessons[i])
            else:
                print(f"Item index {i} out of range (0-{len(lessons)-1})", file=sys.stderr)
                sys.exit(1)
    else:
        selected = lessons

    family_lessons_path = _family_dir(family_id) / "lessons.md"
    written = append_lessons(family_lessons_path, selected, max_entries=30)
    print(f"Promoted {written} lesson(s) to {family_lessons_path}")
    for lesson in selected:
        print(f"  + {lesson}")


def cmd_retract(family_id: str, review_name: str, items: list[int] | None) -> None:
    """Retract live corrections: remove from lessons.md and archive the staged record."""
    reviews = _reviews_dir(family_id)

    candidates = sorted(reviews.glob(f"{review_name}*.json"))
    if not candidates:
        candidates = sorted(_saved_dir(family_id).glob(f"{review_name}*.json")) if _saved_dir(family_id).exists() else []
    if not candidates:
        print(f"No review matching '{review_name}' in {reviews}", file=sys.stderr)
        sys.exit(1)
    if len(candidates) > 1:
        print(f"Ambiguous: {[c.stem for c in candidates]}", file=sys.stderr)
        sys.exit(1)

    review_path = candidates[0]
    data = json.loads(review_path.read_text())

    corrections = data.get("corrections", [])
    if not corrections:
        print("No corrections in this record.")
        return

    if items is not None:
        selected = []
        for i in items:
            if 0 <= i < len(corrections):
                selected.append(corrections[i])
            else:
                print(f"Item index {i} out of range (0-{len(corrections)-1})", file=sys.stderr)
                sys.exit(1)
    else:
        selected = corrections

    family_lessons_path = _family_dir(family_id) / "lessons.md"
    retracted = 0
    for correction in selected:
        if remove_lesson(family_lessons_path, correction):
            retracted += 1
            print(f"  - Retracted: {correction}")
        else:
            print(f"  ? Not found in lessons.md (may have been evicted): {correction}")

    saved = _saved_dir(family_id)
    saved.mkdir(parents=True, exist_ok=True)
    dest = saved / f"retracted_{review_path.stem}.json"
    shutil.move(str(review_path), str(dest))

    print(f"\nRetracted {retracted}/{len(selected)} lesson(s). Record archived to saved/{dest.name}")


# ─── Graduation Pipeline ─────────────────────────────────────────────────

import re
from datetime import datetime, timezone, timedelta

_DATE_RE = re.compile(r"^\- \[(\d{4}-\d{2}-\d{2})\]")

# Keywords that signal scheduling/task-related behavioral lessons
_SCHEDULING_KEYWORDS = (
    "schedule", "shift", "ride", "drive", "appointment", "availability",
    "relay", "outreach", "needs_outreach", "confirm",
)


def _parse_lesson_entry(line: str) -> dict | None:
    """Parse a lessons.md line into structured data."""
    date_m = _DATE_RE.match(line)
    if not date_m:
        return None
    content_m = _LESSON_CONTENT_RE.match(line)
    content = content_m.group(1).strip() if content_m else line.split("] ", 1)[-1].strip()
    category = _get_category(line)
    try:
        age_days = (datetime.now(timezone.utc).date() - datetime.strptime(date_m.group(1), "%Y-%m-%d").date()).days
    except ValueError:
        age_days = 0
    return {
        "raw": line,
        "date": date_m.group(1),
        "category": category,
        "content": content,
        "age_days": age_days,
    }


def _content_exists_in_file(content: str, file_path: Path) -> bool:
    """Check if the lesson content (or close match) already exists in a target file."""
    if not file_path.exists():
        return False
    file_text = file_path.read_text().lower()
    words = [w for w in content.lower().split() if len(w) > 4]
    if not words:
        return False
    matches = sum(1 for w in words if w in file_text)
    return matches / len(words) > 0.6


def _classify_lesson(entry: dict, family_id: str, member_names: list[str]) -> dict:
    """Classify a lesson entry into a graduation proposal."""
    content = entry["content"]
    category = entry["category"]
    content_lower = content.lower()

    proposal = {
        "lesson": content,
        "source": f"families/{family_id}/lessons.md",
        "date": entry["date"],
        "age_days": entry["age_days"],
        "target": None,
        "section": None,
        "action": "append",
        "content": f"- {content}",
        "remove_from_lessons": True,
        "reason": None,
    }

    if entry["age_days"] < 2:
        proposal["action"] = "skip"
        proposal["reason"] = f"Too recent ({entry['age_days']}d old, min 2d)"
        proposal["remove_from_lessons"] = False
        return proposal

    if category == "factual":
        mentioned_member = None
        for name in member_names:
            if name.lower() in content_lower:
                mentioned_member = name
                break

        if mentioned_member:
            member_path = _family_dir(family_id) / "members" / f"{mentioned_member.lower()}.md"
            if _content_exists_in_file(content, member_path):
                proposal["action"] = "skip"
                proposal["reason"] = f"Already in members/{mentioned_member.lower()}.md"
            else:
                proposal["target"] = f"members/{mentioned_member.lower()}.md"
                proposal["section"] = "Personal Context"
        else:
            family_md = _family_dir(family_id) / "family.md"
            if _content_exists_in_file(content, family_md):
                proposal["action"] = "skip"
                proposal["reason"] = "Already in family.md"
            else:
                proposal["target"] = "family.md"
                proposal["section"] = "Care Preferences & Personality"

    elif category == "operational":
        caps_path = paths.capabilities if hasattr(paths, "capabilities") else Path()
        if caps_path.exists() and _content_exists_in_file(content, caps_path):
            proposal["action"] = "skip"
            proposal["reason"] = "Already in capabilities.md"
        else:
            proposal["target"] = "capabilities.md"
            proposal["section"] = "KNOWN LIMITATIONS (testing mode)"

    elif category == "behavioral":
        social_path = paths.skills_dir / "social.md" if hasattr(paths, "skills_dir") else Path()
        scheduling_path = paths.skills_dir / "scheduling.md" if hasattr(paths, "skills_dir") else Path()
        soul_path = Path(__file__).parent.parent.parent / "SOUL.md"

        if _content_exists_in_file(content, social_path):
            proposal["action"] = "skip"
            proposal["reason"] = "Already in skills/social.md"
        elif _content_exists_in_file(content, scheduling_path):
            proposal["action"] = "skip"
            proposal["reason"] = "Already in skills/scheduling.md"
        elif _content_exists_in_file(content, soul_path):
            proposal["action"] = "skip"
            proposal["reason"] = "Already in SOUL.md"
        elif any(kw in content_lower for kw in _SCHEDULING_KEYWORDS):
            proposal["target"] = "skills/scheduling.md"
        else:
            proposal["target"] = "skills/social.md"

    else:
        proposal["target"] = "skills/social.md"

    return proposal


def cmd_graduate(family_id: str, dry_run: bool = False) -> None:
    """Classify lessons and write graduation proposal."""
    family_dir = _family_dir(family_id)
    if not family_dir.is_dir():
        print(f"Family directory not found: {family_dir}", file=sys.stderr)
        sys.exit(1)

    family_lessons_path = family_dir / "lessons.md"
    entries = []
    if family_lessons_path.exists():
        for line in family_lessons_path.read_text().strip().split("\n"):
            parsed = _parse_lesson_entry(line)
            if parsed:
                parsed["source"] = "family"
                entries.append(parsed)

    if paths.lessons.exists():
        for line in paths.lessons.read_text().strip().split("\n"):
            parsed = _parse_lesson_entry(line)
            if parsed:
                parsed["source"] = "global"
                entries.append(parsed)

    if not entries:
        print("No lessons to graduate.")
        return

    members_dir = family_dir / "members"
    member_names = [f.stem.title() for f in members_dir.glob("*.md")] if members_dir.exists() else []

    proposals = []
    for entry in entries:
        proposal = _classify_lesson(entry, family_id, member_names)
        proposal["source"] = f"families/{family_id}/lessons.md" if entry["source"] == "family" else "runtime/learning/lessons.md"
        proposals.append(proposal)

    by_target: dict[str, list] = {}
    for i, p in enumerate(proposals):
        key = p["target"] or ("SKIP" if p["action"] == "skip" else "UNKNOWN")
        by_target.setdefault(key, []).append((i, p))

    print(f"\nGraduation proposal for {family_id} ({len(entries)} lessons reviewed):\n")

    target_labels = {
        "family.md": "FAMILY.MD",
        "capabilities.md": "CAPABILITIES.MD",
        "SKIP": "NO ACTION",
    }

    for target, items in sorted(by_target.items()):
        label = target_labels.get(target, target.upper())
        print(f"  {label} ({len(items)}):")
        for idx, p in items:
            if p["action"] == "skip":
                print(f"    [{idx}] {p['lesson'][:70]}  ← {p['reason']}")
            else:
                section = f" → {p['section']}" if p["section"] else ""
                print(f"    [{idx}] {p['lesson'][:70]}{section}")
        print()

    if dry_run:
        print("(dry run — no files written)")
        return

    graduations = _graduations_dir(family_id)
    graduations.mkdir(parents=True, exist_ok=True)

    now = datetime.now(timezone.utc)
    ts = now.strftime("%Y-%m-%d_%H%M%S")

    record = {
        "timestamp": now.isoformat(),
        "family_id": family_id,
        "proposals": proposals,
    }

    out_path = graduations / f"{ts}.json"
    with open(out_path, "w") as f:
        json.dump(record, f, indent=2)

    print(f"Saved to: {out_path}")
    print(f"Review and apply: python review_staging.py merge --family {family_id} --graduation {ts}")


def cmd_merge(family_id: str, graduation_name: str, items: list[int] | None, force: bool = False) -> None:
    """Apply graduation proposals: write to target files, remove from lessons.md."""
    graduations = _graduations_dir(family_id)

    candidates = sorted(graduations.glob(f"{graduation_name}*.json"))
    if not candidates:
        print(f"No graduation matching '{graduation_name}' in {graduations}", file=sys.stderr)
        sys.exit(1)
    if len(candidates) > 1:
        print(f"Ambiguous: {[c.stem for c in candidates]}", file=sys.stderr)
        sys.exit(1)

    grad_path = candidates[0]
    data = json.loads(grad_path.read_text())
    proposals = data.get("proposals", [])

    if not proposals:
        print("No proposals in this graduation.")
        return

    if items is not None:
        selected_indices = items
    else:
        selected_indices = list(range(len(proposals)))

    family_dir = _family_dir(family_id)
    merged = 0
    skipped = 0
    removed = 0

    for i in selected_indices:
        if i < 0 or i >= len(proposals):
            print(f"  Index {i} out of range (0-{len(proposals)-1})", file=sys.stderr)
            continue

        p = proposals[i]

        if p["action"] == "skip":
            print(f"  [{i}] SKIP: {p['lesson'][:60]}  ({p.get('reason', '')})")
            skipped += 1
            continue

        target = p.get("target")
        if not target:
            print(f"  [{i}] SKIP: no target for {p['lesson'][:60]}")
            skipped += 1
            continue

        if "SOUL" in target and not force:
            print(f"  [{i}] BLOCKED: {target} is protected. Use --force to merge into SOUL.md")
            skipped += 1
            continue

        if target.startswith("members/"):
            target_path = family_dir / target
        elif target == "family.md":
            target_path = family_dir / "family.md"
        elif target.startswith("skills/"):
            target_path = paths.skills_dir / target.replace("skills/", "")
        elif target == "capabilities.md":
            target_path = paths.capabilities if hasattr(paths, "capabilities") else None
        elif target == "SOUL.md":
            target_path = Path(__file__).parent.parent.parent / "SOUL.md"
        else:
            print(f"  [{i}] SKIP: unknown target {target}")
            skipped += 1
            continue

        if target_path is None or not target_path.exists():
            print(f"  [{i}] SKIP: target file not found: {target}")
            skipped += 1
            continue

        content_to_add = p.get("content", f"- {p['lesson']}")
        section = p.get("section")

        if section and target in ("family.md",) or target.startswith("members/"):
            from enforcement.family_editor import apply_updates, FileUpdate
            updates = [FileUpdate(
                section=section,
                operation="append",
                content=content_to_add,
            )]
            result = apply_updates(target_path, updates)
            if result.updates_applied > 0:
                print(f"  [{i}] MERGED → {target} ({section}): {p['lesson'][:50]}")
                merged += 1
            else:
                print(f"  [{i}] FAILED → {target}: {result.errors}")
                skipped += 1
                continue
        else:
            existing = target_path.read_text()
            if not existing.endswith("\n"):
                existing += "\n"
            target_path.write_text(existing + content_to_add + "\n")
            print(f"  [{i}] MERGED → {target}: {p['lesson'][:50]}")
            merged += 1

        if p.get("remove_from_lessons"):
            source = p.get("source", "")
            if "families/" in source:
                lessons_path = family_dir / "lessons.md"
            else:
                lessons_path = paths.lessons
            if remove_lesson(lessons_path, p["lesson"]):
                removed += 1

    saved = _saved_dir(family_id)
    saved.mkdir(parents=True, exist_ok=True)
    dest = saved / f"graduated_{grad_path.stem}.json"
    shutil.move(str(grad_path), str(dest))

    print(f"\nMerged: {merged}  Skipped: {skipped}  Removed from lessons: {removed}")
    print(f"Archived to: saved/{dest.name}")


def cmd_export_training(family_id: str) -> None:
    """Export graduated corrections and saved reviews as fine-tuning JSONL."""
    family_staging = _staging_dir(family_id)
    if not family_staging.is_dir():
        print(f"No staging directory for family '{family_id}'", file=sys.stderr)
        sys.exit(1)

    examples: list[dict] = []

    graduations_dir = _graduations_dir(family_id)
    if graduations_dir.exists():
        for gfile in sorted(graduations_dir.glob("*.json")):
            try:
                data = json.loads(gfile.read_text())
            except (json.JSONDecodeError, OSError) as e:
                print(f"  Skipping {gfile.name}: {e}", file=sys.stderr)
                continue
            for proposal in data.get("proposals", []):
                if proposal.get("action") == "skip":
                    continue
                examples.append({
                    "source": "graduation",
                    "lesson": proposal["lesson"],
                    "target": proposal.get("target", "unknown"),
                    "category": proposal.get("section", "general"),
                })

    saved_dir = _saved_dir(family_id)
    if saved_dir.exists():
        for sfile in sorted(saved_dir.glob("*.json")):
            try:
                data = json.loads(sfile.read_text())
            except (json.JSONDecodeError, OSError) as e:
                print(f"  Skipping {sfile.name}: {e}", file=sys.stderr)
                continue
            for finding in data.get("findings", []):
                lesson = finding.get("lesson") or finding.get("title", "")
                if not lesson:
                    continue
                examples.append({
                    "source": "review",
                    "lesson": lesson,
                    "category": finding.get("category", "unknown"),
                    "evidence": finding.get("evidence", ""),
                })

    output_dir = Path(__file__).parent.parent.parent / "fine-tuning" / "examples" / family_id
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "training.jsonl"

    training_lines = []
    for ex in examples:
        training_lines.append(json.dumps({
            "messages": [
                {"role": "system", "content": "You are CareSupport, a care coordination agent."},
                {"role": "user", "content": f"Correction: {ex['lesson']}"},
                {"role": "assistant", "content": f"Understood. I will {ex['lesson']}"},
            ],
            "metadata": {"source": ex["source"], "category": ex.get("category")},
        }))

    output_path.write_text(("\n".join(training_lines) + "\n") if training_lines else "")
    print(f"Exported {len(training_lines)} examples to {output_path}")
    print(f"Target: 100+ examples. Current: {len(training_lines)}. Gap: {max(0, 100 - len(training_lines))}")


# ─── CLI ─────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="CareSupport Review Staging — Snapshot, Promote & Restore"
    )
    sub = parser.add_subparsers(dest="command", required=True)

    for name in ("snapshot", "restore", "reset", "diff"):
        p = sub.add_parser(name)
        p.add_argument("--family", required=True, help="Family ID (e.g., kano)")

    list_p = sub.add_parser("list")
    list_p.add_argument("--family", required=True, help="Family ID (e.g., kano)")
    list_p.add_argument("--source", default=None, help="Filter by source: 'live' or 'batch'")

    save_p = sub.add_parser("save")
    save_p.add_argument("--family", required=True, help="Family ID")
    save_p.add_argument("--review", required=True, help="Review timestamp (e.g., 2026-02-26_063623)")
    save_p.add_argument("--name", required=True, help="Human-readable name (e.g., family-tree-confusion)")

    promote_p = sub.add_parser("promote")
    promote_p.add_argument("--family", required=True, help="Family ID")
    promote_p.add_argument("--review", required=True, help="Review timestamp (e.g., 2026-02-26_061700)")
    promote_p.add_argument("--items", default=None, help="Comma-separated lesson indices (default: all)")

    retract_p = sub.add_parser("retract")
    retract_p.add_argument("--family", required=True, help="Family ID")
    retract_p.add_argument("--review", required=True, help="Review name (e.g., corrections_20260228_194305)")
    retract_p.add_argument("--items", default=None, help="Comma-separated correction indices (default: all)")

    graduate_p = sub.add_parser("graduate")
    graduate_p.add_argument("--family", required=True, help="Family ID")
    graduate_p.add_argument("--dry-run", action="store_true", help="Classify only, don't write proposal")

    merge_p = sub.add_parser("merge")
    merge_p.add_argument("--family", required=True, help="Family ID")
    merge_p.add_argument("--graduation", required=True, help="Graduation timestamp (e.g., 2026-02-28_210000)")
    merge_p.add_argument("--items", default=None, help="Comma-separated proposal indices (default: all)")
    merge_p.add_argument("--force", action="store_true", help="Allow merging into SOUL.md (protected)")

    export_p = sub.add_parser("export-training")
    export_p.add_argument("--family", required=True, help="Family ID")

    args = parser.parse_args()

    if args.command == "snapshot":
        cmd_snapshot(args.family)
    elif args.command == "restore":
        cmd_restore(args.family)
    elif args.command == "reset":
        cmd_reset(args.family)
    elif args.command == "diff":
        cmd_diff(args.family)
    elif args.command == "list":
        cmd_list(args.family, source=args.source)
    elif args.command == "save":
        cmd_save(args.family, args.review, args.name)
    elif args.command == "promote":
        item_list = None
        if args.items is not None:
            item_list = [int(x.strip()) for x in args.items.split(",")]
        cmd_promote(args.family, args.review, item_list)
    elif args.command == "retract":
        item_list = None
        if args.items is not None:
            item_list = [int(x.strip()) for x in args.items.split(",")]
        cmd_retract(args.family, args.review, item_list)
    elif args.command == "graduate":
        cmd_graduate(args.family, dry_run=args.dry_run)
    elif args.command == "merge":
        item_list = None
        if args.items is not None:
            item_list = [int(x.strip()) for x in args.items.split(",")]
        cmd_merge(args.family, args.graduation, item_list, force=args.force)
    elif args.command == "export-training":
        cmd_export_training(args.family)


if __name__ == "__main__":
    main()
