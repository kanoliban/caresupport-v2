"""Focused workspace tree generator.

Generates a compact workspace tree that limits noise while preserving important context.

Rules:
- Show all sdk/tools files (important for knowing available tools)
- Show slack channel names only (no month logs or thread contents)
- Show slack/dm person names only (no thread folders)
- Show skills folder names only (not internal files)
- Hide repos/ contents (just show folder exists)
- Hide sdk/internal and sdk/utils contents
- Hide .lock files
- For cron tasks: show LEARNINGS.md, mark task folder with "your task"
- For slack threads: mark the slack conversation folder with "your thread"
- Hide agent_runs thread folders (just archives)
- Show logs/today's date folder only
- At depth 2+, show max N items per folder (default 3)

Usage:
    uv run python -m sdk.utils.workspace_tree --current-thread daily_pr_summary/threads/2026-01-12_08-00-30
"""

import argparse
import os
from datetime import UTC, datetime

WORK_DIR = "/work"
EXCLUDE = {".git", "__pycache__", ".venv", "node_modules", ".cache", ".local", "temp", "tmp"}
EXCLUDE_FILES = {".lock", "uv.lock", "poetry.lock", "package-lock.json"}


def get_focused_tree(
    current_thread_path: str | None = None,
    max_items_per_folder: int = 3,
    root: str = WORK_DIR,
) -> str:
    today = datetime.now(UTC).strftime("%Y-%m-%d")

    # Parse current_thread_path to determine what to mark in the tree
    # - For crons: /weather/munich/threads/2026-01-21_10-00-00 → mark /crons/weather/munich/
    # - For slack: /slack/Toni/1768983751_527139 → mark /slack/Toni/ (the conversation source)
    current_cron_path = None  # Path within /crons/ to mark as "your task"
    current_slack_path = None  # Path within /slack/ to mark as "your thread"
    current_thread = None  # Thread timestamp for crons
    if current_thread_path:
        path_clean = current_thread_path.strip("/")

        # Slack threads: mark the slack log location
        if path_clean.startswith("slack/"):
            # Extract the slack path (e.g., "slack/Toni" from "slack/Toni/1768983751_527139")
            parts = path_clean.split("/")
            if len(parts) >= 2:
                current_slack_path = "/".join(parts[:2])  # "slack/Toni" or "slack/general"
        # Cron threads: extract cron path before /threads/
        elif "/threads/" in path_clean:
            parts = path_clean.split("/threads/")
            current_cron_path = parts[0]  # e.g., "weather/munich" or "daily_manager"
            if len(parts) > 1:
                current_thread = parts[1]  # e.g., "2026-01-21_10-00-00"

    ctx = {
        "today": today,
        "current_cron_path": current_cron_path,  # Full cron path like "weather/munich"
        "current_slack_path": current_slack_path,  # Slack path like "slack/Toni"
        "current_thread": current_thread,
        "max_items": max_items_per_folder,
    }

    tree = _build_node(root, "", 0, ctx)
    if tree is None:
        return "(empty workspace)"

    return _render(tree, ctx)


def _build_node(path: str, rel: str, depth: int, ctx: dict) -> dict | None:
    if not os.path.exists(path):
        return None

    name = os.path.basename(path) or "."
    if name in EXCLUDE:
        return None

    if os.path.isfile(path):
        if name in EXCLUDE_FILES or name.endswith(".lock"):
            return None
        return {"name": name, "type": "file", "rel": rel}

    # Special handling for different paths
    handling = _get_special_handling(rel, ctx)

    if handling == "skip":
        return None
    if handling == "summary":
        return _build_summary_node(path, name, rel)
    if handling == "names_only":
        return _build_names_only_node(path, name, rel)
    if handling == "slack_channels":
        return _build_slack_node(path, name, rel, ctx)

    # Standard directory handling
    try:
        entries = sorted(os.listdir(path))
    except PermissionError:
        return {"name": name, "type": "dir", "children": []}

    entries = [
        e
        for e in entries
        if e not in EXCLUDE and e not in EXCLUDE_FILES and not e.endswith(".lock")
    ]

    children = []
    hidden = 0
    show_all = handling == "show_all" or depth < 2

    # Prioritize LEARNINGS.md only for the current cron task folder
    priority_files = set()
    current_cron = ctx.get("current_cron_path")
    if current_cron and rel == f"crons/{current_cron}" and "LEARNINGS.md" in entries:
        priority_files.add("LEARNINGS.md")

    shown_entries = []
    for entry in entries:
        if entry in priority_files:
            shown_entries.append(entry)
        elif show_all or len(shown_entries) < ctx["max_items"]:
            shown_entries.append(entry)

    hidden = len(entries) - len(shown_entries)

    for entry in shown_entries:
        child_path = os.path.join(path, entry)
        child_rel = f"{rel}/{entry}".lstrip("/")
        child = _build_node(child_path, child_rel, depth + 1, ctx)
        if child:
            children.append(child)

    result = {"name": name, "type": "dir", "children": children, "rel": rel}
    if hidden > 0:
        result["hidden"] = hidden
    return result


def _get_special_handling(rel: str, ctx: dict) -> str | None:
    """Determine special handling for a path."""
    # Skip old log folders
    if rel.startswith("logs/") and rel != "logs" and not rel.startswith(f"logs/{ctx['today']}"):
        return "skip"

    # Skip threads folders in agent_runs (just noise, messages.jsonl is the only content)
    if "/threads" in rel or rel.endswith("/threads"):
        return "skip"

    # Repos: just show it exists
    if rel == "repos":
        return "summary"
    if rel.startswith("repos/"):
        return "skip"

    # SDK internal and utils: just show folder name, not contents
    if rel in ("sdk/internal", "sdk/utils"):
        return "summary"
    if rel.startswith("sdk/internal/") or rel.startswith("sdk/utils/"):
        return "skip"

    # SDK tools: show all
    if rel == "sdk/tools" or rel.startswith("sdk/tools/"):
        return "show_all"

    # Slack DM: show person names
    if rel == "slack/dm":
        return "names_only"

    # Slack: show channel names only, skip all contents inside channels
    if rel == "slack":
        return "slack_channels"
    if rel.startswith("slack/"):
        return "skip"

    # Skills: show skill names only
    if rel == "skills":
        return "names_only"

    # Emails: show structure only, not individual sent emails
    if rel == "emails":
        return "names_only"

    return None


def _build_summary_node(path: str, name: str, rel: str) -> dict:
    """Build a summary node that just counts contents."""
    try:
        entries = [e for e in os.listdir(path) if e not in EXCLUDE]
        count = len(entries)
        return {
            "name": name,
            "type": "dir",
            "summary": f"{count} items",
            "children": [],
            "rel": rel,
        }
    except (PermissionError, OSError):
        return {"name": name, "type": "dir", "children": [], "rel": rel}


def _build_names_only_node(path: str, name: str, rel: str) -> dict:
    """Build a node showing only subdirectory/file names, no recursion."""
    try:
        entries = sorted(os.listdir(path))
        entries = [e for e in entries if e not in EXCLUDE]

        children = []
        for entry in entries:
            entry_path = os.path.join(path, entry)
            child_rel = f"{rel}/{entry}".lstrip("/")
            if os.path.isdir(entry_path):
                children.append({"name": entry, "type": "dir", "children": [], "rel": child_rel})
            else:
                children.append({"name": entry, "type": "file", "rel": child_rel})

        return {"name": name, "type": "dir", "children": children, "rel": rel}
    except (PermissionError, OSError):
        return {"name": name, "type": "dir", "children": [], "rel": rel}


def _build_slack_node(path: str, name: str, rel: str, ctx: dict) -> dict:
    """Build slack node: show channel names, but expand dm to show person names."""
    try:
        entries = sorted(os.listdir(path))
        entries = [e for e in entries if e not in EXCLUDE]

        children = []
        for entry in entries:
            entry_path = os.path.join(path, entry)
            child_rel = f"{rel}/{entry}".lstrip("/")
            if os.path.isdir(entry_path):
                if entry == "dm":
                    dm_children = []
                    try:
                        dm_entries = sorted(os.listdir(entry_path))
                        for dm_entry in dm_entries:
                            if dm_entry not in EXCLUDE:
                                dm_rel = f"{child_rel}/{dm_entry}"
                                dm_children.append(
                                    {"name": dm_entry, "type": "dir", "children": [], "rel": dm_rel}
                                )
                    except (PermissionError, OSError):
                        pass
                    children.append(
                        {"name": entry, "type": "dir", "children": dm_children, "rel": child_rel}
                    )
                else:
                    children.append(
                        {"name": entry, "type": "dir", "children": [], "rel": child_rel}
                    )
            else:
                children.append({"name": entry, "type": "file", "rel": child_rel})

        return {"name": name, "type": "dir", "children": children, "rel": rel}
    except (PermissionError, OSError):
        return {"name": name, "type": "dir", "children": [], "rel": rel}


def _render(
    node: dict | None, ctx: dict, prefix: str = "", is_last: bool = True, is_root: bool = True
) -> str:
    if node is None:
        return ""

    lines = []
    name = node["name"]
    rel = node.get("rel", "")

    # Mark current cron task folder (e.g., crons/weather/munich/ → "your task")
    # Only mark the exact cron folder, not parent folders
    if not is_root and ctx["current_cron_path"]:
        expected_cron_rel = f"crons/{ctx['current_cron_path']}"
        if rel == expected_cron_rel:
            name = f"{name} ← (your task)"

    # Mark current slack conversation (e.g., slack/Toni → "your thread")
    if not is_root and ctx["current_slack_path"]:
        if rel == ctx["current_slack_path"]:
            name = f"{name} ← (your thread)"

    # Add summary suffix
    if "summary" in node:
        name = f"{name} ({node['summary']})"

    if is_root:
        lines.append(".")
    else:
        connector = "└── " if is_last else "├── "
        lines.append(f"{prefix}{connector}{name}")

    if node["type"] == "dir":
        children = node.get("children", [])
        hidden = node.get("hidden", 0)

        new_prefix = prefix + ("    " if is_last else "│   ") if not is_root else ""

        for i, child in enumerate(children):
            child_is_last = (i == len(children) - 1) and hidden == 0
            lines.append(_render(child, ctx, new_prefix, child_is_last, False))

        if hidden > 0:
            lines.append(f"{new_prefix}└── ... ({hidden} more items)")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Generate focused workspace tree")
    parser.add_argument(
        "--current-thread",
        type=str,
        default=None,
        help="Path of the current thread (e.g., daily_pr_summary/threads/2026-01-12_08-00-30)",
    )
    parser.add_argument(
        "--max-items",
        type=int,
        default=3,
        help="Maximum items to show per folder at depth 2+ (default: 3)",
    )
    args = parser.parse_args()

    print(
        get_focused_tree(
            current_thread_path=args.current_thread, max_items_per_folder=args.max_items
        )
    )


if __name__ == "__main__":
    main()
