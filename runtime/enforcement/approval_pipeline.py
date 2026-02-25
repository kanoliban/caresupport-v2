from __future__ import annotations

"""
Approval Pipeline — Mechanical enforcement of coordinator confirmation.

Hard rule from system prompt:
  "Make permanent decisions (add/remove members, change medications)
   without coordinator confirmation" → NEVER.

This module enforces that rule in code. Certain file updates require
explicit YES/NO approval from a member with `can_approve` access before
they are applied to family.md.

Flow:
  1. Handler generates family_file_updates
  2. approval_pipeline.classify() splits updates into auto-apply vs. needs-approval
  3. Auto-apply updates go to family_editor immediately
  4. Needs-approval updates are stored as PendingApproval in a durable JSON file
  5. A confirmation SMS is sent to approver(s)
  6. When an approver replies YES/NO, the handler detects it early
  7. approval_pipeline.resolve() applies or rejects the change

Storage: {family_dir}/pending_approvals.json — survives restarts, not in memory.
"""

import hashlib
import json
import re
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone, timedelta
from pathlib import Path

from enforcement.family_editor import FileUpdate, apply_updates


# ─── What Requires Approval ──────────────────────────────────────────────
# Mechanical rule: these section+operation pairs ALWAYS require confirmation.
# To change this policy, edit THIS set. The agent has no say.

APPROVAL_REQUIRED = {
    ("medications", "append"),      # Adding a new medication
    ("medications", "prepend"),     # Adding a new medication
    ("medications", "replace"),     # Changing dosage, schedule, etc.
    ("care_recipient", "replace"),  # Changing conditions, emergency contact, etc.
    ("members", "append"),          # Adding a new member
    ("members", "replace"),         # Changing member details
}

EXPIRY_HOURS = 24


# ─── Data Structures ─────────────────────────────────────────────────────

@dataclass
class PendingApproval:
    id: str
    created_at: str
    expires_at: str
    status: str                     # pending | approved | rejected | expired
    requester_phone: str
    requester_name: str
    approver_phones: list[str]      # Members with can_approve access
    description: str                # Human-readable description for SMS
    update: dict                    # The FileUpdate as a serializable dict
    resolved_at: str | None = None
    resolved_by: str | None = None


@dataclass
class ClassifiedUpdates:
    """Result of classifying a batch of updates."""
    auto_apply: list[FileUpdate]            # Safe to apply immediately
    needs_approval: list[tuple[FileUpdate, str]]  # (update, reason) pairs


# ─── Classification ───────────────────────────────────────────────────────

def requires_approval(section: str, operation: str) -> bool:
    """Check if a section+operation pair requires confirmation."""
    return (section, operation) in APPROVAL_REQUIRED


def classify_updates(updates: list[FileUpdate]) -> ClassifiedUpdates:
    """Split updates into auto-apply and needs-approval.

    This is the gatekeeper. Updates that touch medications, care_recipient
    details, or member lists require explicit confirmation.
    """
    result = ClassifiedUpdates(auto_apply=[], needs_approval=[])

    for update in updates:
        if requires_approval(update.section, update.operation):
            reason = f"{update.operation} on {update.section}"
            result.needs_approval.append((update, reason))
        else:
            result.auto_apply.append(update)

    return result


# ─── Durable Storage ──────────────────────────────────────────────────────

def _approvals_path(family_dir: Path) -> Path:
    return family_dir / "pending_approvals.json"


def _generate_id() -> str:
    """Short, unique approval ID (8 hex chars from timestamp + random)."""
    now = datetime.now(timezone.utc).isoformat()
    return hashlib.sha256(now.encode()).hexdigest()[:8]


def load_pending(family_dir: Path) -> list[PendingApproval]:
    """Load all pending approvals from durable storage."""
    path = _approvals_path(family_dir)
    if not path.exists():
        return []

    with open(path) as f:
        data = json.load(f)

    approvals = []
    for entry in data.get("pending", []):
        approvals.append(PendingApproval(**entry))
    return approvals


def save_pending(family_dir: Path, approvals: list[PendingApproval]):
    """Save approvals to durable storage."""
    path = _approvals_path(family_dir)
    path.parent.mkdir(parents=True, exist_ok=True)

    data = {"pending": [asdict(a) for a in approvals]}
    with open(path, "w") as f:
        json.dump(data, f, indent=2)


# ─── Create Pending Approval ─────────────────────────────────────────────

def create_pending(
    family_dir: Path,
    update: FileUpdate,
    description: str,
    requester_phone: str,
    requester_name: str,
    approver_phones: list[str],
    expiry_hours: int = EXPIRY_HOURS,
) -> PendingApproval:
    """Create a new pending approval and store it durably.

    Returns the PendingApproval object (with id for SMS reference).
    """
    now = datetime.now(timezone.utc)
    expires = now + timedelta(hours=expiry_hours)

    approval = PendingApproval(
        id=_generate_id(),
        created_at=now.isoformat() + "Z",
        expires_at=expires.isoformat() + "Z",
        status="pending",
        requester_phone=requester_phone,
        requester_name=requester_name,
        approver_phones=approver_phones,
        description=description,
        update={
            "section": update.section,
            "operation": update.operation,
            "content": update.content,
            "old_content": update.old_content,
        },
    )

    # Load existing, append, save
    approvals = load_pending(family_dir)
    approvals.append(approval)
    save_pending(family_dir, approvals)

    return approval


# ─── Resolve Approval ────────────────────────────────────────────────────

def resolve_approval(
    family_dir: Path,
    approval_id: str,
    approved: bool,
    by_phone: str,
) -> dict:
    """Resolve a pending approval (approve or reject).

    If approved: applies the update to family.md via family_editor.
    If rejected: marks as rejected, no changes applied.

    Returns:
        {
            "success": bool,
            "action": "approved" | "rejected" | "not_found" | "already_resolved" | "expired",
            "description": str,
            "edit_result": dict | None,  # family_editor result if approved
        }
    """
    approvals = load_pending(family_dir)

    # Find the approval
    target = None
    target_idx = None
    for i, a in enumerate(approvals):
        if a.id == approval_id:
            target = a
            target_idx = i
            break

    if target is None:
        return {"success": False, "action": "not_found", "description": "", "edit_result": None}

    if target.status != "pending":
        return {
            "success": False,
            "action": "already_resolved",
            "description": target.description,
            "edit_result": None,
        }

    # Check expiration
    expires = datetime.fromisoformat(target.expires_at.rstrip("Z")).replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires:
        target.status = "expired"
        save_pending(family_dir, approvals)
        return {"success": False, "action": "expired", "description": target.description, "edit_result": None}

    # Check that resolver is authorized
    if by_phone not in target.approver_phones:
        return {
            "success": False,
            "action": "unauthorized",
            "description": target.description,
            "edit_result": None,
        }

    now = datetime.now(timezone.utc).isoformat() + "Z"

    if approved:
        # Apply the change via family_editor
        update = FileUpdate(
            section=target.update["section"],
            operation=target.update["operation"],
            content=target.update["content"],
            old_content=target.update.get("old_content", ""),
        )
        family_md_path = family_dir / "family.md"
        edit_result = apply_updates(family_md_path, [update])

        target.status = "approved"
        target.resolved_at = now
        target.resolved_by = by_phone
        save_pending(family_dir, approvals)

        return {
            "success": edit_result.success,
            "action": "approved",
            "description": target.description,
            "edit_result": {
                "updates_applied": edit_result.updates_applied,
                "backup_path": edit_result.backup_path,
                "errors": edit_result.errors,
            },
        }
    else:
        target.status = "rejected"
        target.resolved_at = now
        target.resolved_by = by_phone
        save_pending(family_dir, approvals)

        return {
            "success": True,
            "action": "rejected",
            "description": target.description,
            "edit_result": None,
        }


# ─── Query Pending Approvals ─────────────────────────────────────────────

def get_pending_for_approver(family_dir: Path, phone: str) -> list[PendingApproval]:
    """Get all pending (non-expired) approvals that this phone can resolve."""
    approvals = load_pending(family_dir)
    now = datetime.now(timezone.utc)

    results = []
    for a in approvals:
        if a.status != "pending":
            continue
        if phone not in a.approver_phones:
            continue
        expires = datetime.fromisoformat(a.expires_at.rstrip("Z")).replace(tzinfo=timezone.utc)
        if now > expires:
            continue
        results.append(a)

    return results


# ─── Expire Stale ─────────────────────────────────────────────────────────

def expire_stale(family_dir: Path) -> int:
    """Mark all expired pending approvals. Returns count of newly expired."""
    approvals = load_pending(family_dir)
    now = datetime.now(timezone.utc)
    count = 0

    for a in approvals:
        if a.status != "pending":
            continue
        expires = datetime.fromisoformat(a.expires_at.rstrip("Z")).replace(tzinfo=timezone.utc)
        if now > expires:
            a.status = "expired"
            count += 1

    if count > 0:
        save_pending(family_dir, approvals)

    return count


# ─── Detect Approval Response ────────────────────────────────────────────

_YES_PATTERNS = re.compile(
    r"^\s*(yes|y|approve|confirm|ok|go ahead|do it|approved|yes\s+\w+)\s*$",
    re.IGNORECASE,
)
_NO_PATTERNS = re.compile(
    r"^\s*(no|n|reject|deny|cancel|don'?t|nope|no\s+\w+)\s*$",
    re.IGNORECASE,
)


def detect_approval_response(message: str) -> tuple[bool | None, str | None]:
    """Detect if a message is a YES/NO approval response.

    Returns:
        (is_approved, approval_id_or_none)
        - (True, id)  → approved, possibly with a specific ID
        - (False, id) → rejected, possibly with a specific ID
        - (None, None) → not an approval response
    """
    text = message.strip()

    # Check for "YES abc123" or "NO abc123" pattern
    parts = text.split()
    approval_id = None

    if len(parts) == 2:
        response_word = parts[0]
        approval_id = parts[1]
    elif len(parts) == 1:
        response_word = parts[0]
    else:
        return None, None

    if _YES_PATTERNS.match(text):
        return True, approval_id
    if _NO_PATTERNS.match(text):
        return False, approval_id

    return None, None


# ─── Confirmation SMS Text ────────────────────────────────────────────────

def format_confirmation_sms(approval: PendingApproval) -> str:
    """Format the SMS to send to the approver requesting confirmation.

    Keeps it under 320 chars (2 SMS segments) when possible.
    """
    desc = approval.description
    if len(desc) > 180:
        desc = desc[:177] + "..."

    return (
        f"⚠️ Approval needed: {desc}\n"
        f"Requested by {approval.requester_name}.\n"
        f"Reply YES or NO (ref: {approval.id})"
    )
