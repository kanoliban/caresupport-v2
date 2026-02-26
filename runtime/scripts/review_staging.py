from __future__ import annotations

"""
CareSupport Review Staging — Snapshot, Promote & Restore
=========================================================
Manages the staging buffer for the review loop. Test runs produce findings
in scratch space; good findings get promoted to real files; bad ones get
discarded.

Usage:
    python review_staging.py snapshot --family kano
    python review_staging.py restore  --family kano
    python review_staging.py diff     --family kano
    python review_staging.py list     --family kano
    python review_staging.py promote  --family kano --review 2026-02-26_061700 [--items 0,1]
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
from learning import append_lessons


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


def cmd_list(family_id: str) -> None:
    """List baseline status and pending review files."""
    baseline = _baseline_dir(family_id)
    reviews = _reviews_dir(family_id)

    print(f"Family: {family_id}")
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

    if reviews.exists():
        review_files = sorted(reviews.glob("*.json"))
        if review_files:
            print(f"Reviews ({len(review_files)}):")
            for rf in review_files:
                try:
                    data = json.loads(rf.read_text())
                except (json.JSONDecodeError, OSError):
                    print(f"  {rf.stem}  (unreadable)")
                    continue
                n_findings = len(data.get("findings", []))
                n_lessons = len(data.get("lessons", []))
                n_exchanges = data.get("exchange_count", 0)
                since = data.get("since", "?")
                print(f"  {rf.stem}  since={since}  exchanges={n_exchanges}  findings={n_findings}  lessons={n_lessons}")
        else:
            print("Reviews: (none)")
    else:
        print("Reviews: (none)")


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
    written = append_lessons(family_lessons_path, selected, max_entries=10)
    print(f"Promoted {written} lesson(s) to {family_lessons_path}")
    for lesson in selected:
        print(f"  + {lesson}")


# ─── CLI ─────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="CareSupport Review Staging — Snapshot, Promote & Restore"
    )
    sub = parser.add_subparsers(dest="command", required=True)

    for name in ("snapshot", "restore", "diff", "list"):
        p = sub.add_parser(name)
        p.add_argument("--family", required=True, help="Family ID (e.g., kano)")

    promote_p = sub.add_parser("promote")
    promote_p.add_argument("--family", required=True, help="Family ID")
    promote_p.add_argument("--review", required=True, help="Review timestamp (e.g., 2026-02-26_061700)")
    promote_p.add_argument("--items", default=None, help="Comma-separated lesson indices (default: all)")

    args = parser.parse_args()

    if args.command == "snapshot":
        cmd_snapshot(args.family)
    elif args.command == "restore":
        cmd_restore(args.family)
    elif args.command == "diff":
        cmd_diff(args.family)
    elif args.command == "list":
        cmd_list(args.family)
    elif args.command == "promote":
        item_list = None
        if args.items is not None:
            item_list = [int(x.strip()) for x in args.items.split(",")]
        cmd_promote(args.family, args.review, item_list)


if __name__ == "__main__":
    main()
