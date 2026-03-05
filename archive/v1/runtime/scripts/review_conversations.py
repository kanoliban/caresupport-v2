"""
CareSupport Conversation Reviewer
===================================
Review recent conversations and add lessons from the command line.

Usage:
    python review_conversations.py              # Last 24h
    python review_conversations.py --hours 48   # Last 48h
    python review_conversations.py --add-lesson "Don't assume medication times"
"""

import argparse
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Load .env before config
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent.parent / ".env")

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import paths


def review_conversations(hours: int = 24) -> None:
    """Print conversations from the last N hours."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    conv_dir = paths.conversations
    if not conv_dir.exists():
        print("No conversations directory found.")
        return

    found = 0
    for phone_dir in sorted(conv_dir.iterdir()):
        if not phone_dir.is_dir():
            continue
        for log_file in sorted(phone_dir.glob("*.log"), reverse=True):
            lines = log_file.read_text().strip().split("\n")
            recent = []
            for line in lines:
                # Parse timestamp: [2026-02-25 05:00:00 UTC]
                if line.startswith("[") and "]" in line:
                    try:
                        ts_str = line[1:line.index("]")]
                        ts = datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S %Z").replace(tzinfo=timezone.utc)
                        if ts >= cutoff:
                            recent.append(line)
                    except (ValueError, IndexError):
                        pass

            if recent:
                found += len(recent)
                print(f"\n{'='*60}")
                print(f"  {phone_dir.name}")
                print(f"{'='*60}")
                for line in recent:
                    print(f"  {line}")

    if found == 0:
        print(f"No conversations in the last {hours} hours.")
    else:
        print(f"\n--- {found} message(s) in the last {hours} hours ---")


def add_lesson(lesson: str) -> None:
    """Append a lesson to lessons.md via shared learning module."""
    from learning import append_lessons
    count = append_lessons(paths.lessons, [lesson])
    if count:
        print(f"Added lesson: {lesson.strip()}")
    else:
        print("No lesson added (empty input).")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CareSupport Conversation Reviewer")
    parser.add_argument("--hours", type=int, default=24, help="Hours to look back (default: 24)")
    parser.add_argument("--add-lesson", type=str, help="Add a lesson to lessons.md")
    args = parser.parse_args()

    if args.add_lesson:
        add_lesson(args.add_lesson)
    else:
        review_conversations(args.hours)
