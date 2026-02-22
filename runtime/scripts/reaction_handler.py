"""
CareSupport Reaction Handler
==============================
Handles iMessage tapback reactions as confirmation signals.

Integrates with the existing approval_pipeline:
  - 👍 (like) or ❤️ (love) on a pending approval message = approved
  - 👎 (dislike) on a pending approval message = rejected
  - ❓ (question) = needs follow-up

This is the iMessage-native equivalent of "Reply YES or NO."
The approval_pipeline.py already handles the durable storage, expiration,
and authorization checks — this module just maps reactions to approvals.

Usage:
    from reaction_handler import handle_reaction

    result = await handle_reaction(
        message_id="uuid",
        reaction_type="like",
        sender_phone="+16517037981",
    )
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import paths, linq_paths

from enforcement.phi_audit import PHIAuditLogger
from enforcement.approval_pipeline import (
    resolve_approval,
    load_pending,
    PendingApproval,
)

_audit = PHIAuditLogger(log_dir=paths.logs)

# ─── Reaction → Action Mapping ────────────────────────────────────────────

CONFIRMATION_REACTIONS = {"like", "love"}        # 👍 ❤️ = approved
DECLINE_REACTIONS = {"dislike"}                   # 👎 = rejected
QUESTION_REACTIONS = {"question"}                 # ❓ = needs follow-up
URGENT_REACTIONS = {"emphasize"}                  # ‼️ = urgent / acknowledged


# ─── Logging ──────────────────────────────────────────────────────────────

def _log_reaction(data: dict):
    now = datetime.now(timezone.utc)
    log_file = linq_paths.reaction_log(now.strftime("%Y-%m-%d"))
    log_file.parent.mkdir(parents=True, exist_ok=True)
    entry = {"timestamp": now.isoformat(), **data}
    with open(log_file, "a") as f:
        f.write(json.dumps(entry) + "\n")


# ─── Pending Message → Approval Mapping ──────────────────────────────────
# When CareSupport sends an approval request via iMessage, we track which
# Linq message_id maps to which approval_id so reactions can be resolved.

_MSG_TO_APPROVAL_FILE = paths.logs / ".message_approval_map.json"


def register_message_approval(message_id: str, approval_id: str, family_dir: str):
    """Register a mapping: Linq message_id → approval_id + family_dir.

    Call this when sending a confirmation SMS via Linq (webhook_receiver.py
    sends the approval request and records the message_id).
    """
    data = _load_message_map()
    data[message_id] = {
        "approval_id": approval_id,
        "family_dir": family_dir,
        "registered_at": datetime.now(timezone.utc).isoformat(),
    }
    # Keep last 500 entries
    if len(data) > 500:
        items = sorted(data.items(), key=lambda x: x[1].get("registered_at", ""))
        data = dict(items[-500:])
    _save_message_map(data)


def _load_message_map() -> dict:
    if _MSG_TO_APPROVAL_FILE.exists():
        try:
            with open(_MSG_TO_APPROVAL_FILE) as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    return {}


def _save_message_map(data: dict):
    _MSG_TO_APPROVAL_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(_MSG_TO_APPROVAL_FILE, "w") as f:
        json.dump(data, f, indent=2)


# ─── Main Handler ─────────────────────────────────────────────────────────

async def handle_reaction(
    message_id: str,
    reaction_type: str,
    custom_emoji: str = "",
    sender_phone: str = "",
) -> dict:
    """Handle a tapback reaction event.

    Checks if the reacted-to message is a pending approval request.
    If so, resolves the approval using the existing approval_pipeline.

    Returns:
        {"handled": True, "action": "approved" | "rejected" | "follow_up" | "logged"}
    """
    action = "logged"
    approval_result = None

    # Check if this message has a pending approval mapping
    msg_map = _load_message_map()
    mapping = msg_map.get(message_id)

    if mapping:
        approval_id = mapping["approval_id"]
        family_dir = Path(mapping["family_dir"])

        if reaction_type in CONFIRMATION_REACTIONS:
            # 👍 or ❤️ = approve
            approval_result = resolve_approval(
                family_dir=family_dir,
                approval_id=approval_id,
                approved=True,
                by_phone=sender_phone,
            )
            if approval_result.get("success"):
                action = "approved"
                # Clean up mapping
                del msg_map[message_id]
                _save_message_map(msg_map)

        elif reaction_type in DECLINE_REACTIONS:
            # 👎 = reject
            approval_result = resolve_approval(
                family_dir=family_dir,
                approval_id=approval_id,
                approved=False,
                by_phone=sender_phone,
            )
            if approval_result.get("success"):
                action = "rejected"
                del msg_map[message_id]
                _save_message_map(msg_map)

        elif reaction_type in QUESTION_REACTIONS:
            action = "follow_up_needed"
            # TODO: Send follow-up message asking what needs clarification

        elif reaction_type in URGENT_REACTIONS:
            action = "urgent_acknowledged"
            # TODO: Escalate to coordinator

    # Log the reaction
    _log_reaction({
        "message_id": message_id,
        "reaction_type": reaction_type,
        "custom_emoji": custom_emoji,
        "sender_phone": sender_phone,
        "action": action,
        "had_approval_mapping": mapping is not None,
        "approval_result": approval_result,
    })

    return {
        "handled": True,
        "event": "reaction.added",
        "action": action,
        "message_id": message_id,
        "reaction_type": reaction_type,
    }
