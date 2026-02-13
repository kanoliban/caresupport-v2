"""
Family Admin — Manage care team membership and roles.

Viktor equivalent: slack_admin_tools.py (list channels, join channels, list users,
invite users, get reactions).

Same workspace management pattern, adapted from Slack workspace → care team.
"""

from sdk.internal.client import get_client


async def list_family_members(family_id: str) -> dict:
    """List all members of a care team with their roles and access levels.

    Viktor equivalent: coworker_list_slack_users()

    Args:
        family_id: The family to list

    Returns:
        {"members": [{"name": str, "phone": str, "role": str,
                      "access_level": str, "hours": str, "active": bool}]}
    """
    return await get_client().call("list_family_members", family_id=family_id)


async def add_family_member(family_id: str, name: str, phone: str,
                            role: str, access_level: str,
                            hours: str = None) -> dict:
    """Add a new member to the care team.

    Viktor equivalent: coworker_invite_slack_user_to_team()

    Requires primary caregiver approval. After approval:
    1. Adds member to family.md Care Team
    2. Sends intro message to new member
    3. Sets up relevant schedules/reminders

    Args:
        family_id: Family context
        name: Member's name
        phone: Phone number (E.164)
        role: "primary_caregiver" | "secondary_caregiver" | "aide" | "provider" | "family"
        access_level: "full" | "schedule+meds" | "schedule" | "provider"
        hours: When they're active (e.g., "M-F 8a-4p")

    Returns:
        {"success": bool, "member_id": str, "onboarding_sent": bool}
    """
    return await get_client().call("add_family_member", family_id=family_id,
                                   name=name, phone=phone, role=role,
                                   access_level=access_level, hours=hours)


async def update_member_role(family_id: str, phone: str,
                             role: str = None, access_level: str = None) -> dict:
    """Update a care team member's role or access level.

    Requires primary caregiver approval.

    Args:
        family_id: Family context
        phone: Member's phone number
        role: New role (optional, keeps current if None)
        access_level: New access level (optional)

    Returns:
        {"success": bool, "old_role": str, "new_role": str,
         "old_access": str, "new_access": str}
    """
    return await get_client().call("update_member_role", family_id=family_id,
                                   phone=phone, role=role, access_level=access_level)


async def remove_family_member(family_id: str, phone: str) -> dict:
    """Remove a member from the care team (mark inactive, preserve for audit).

    Requires primary caregiver approval. Cancels all their schedules/reminders.

    Args:
        family_id: Family context
        phone: Member's phone number

    Returns:
        {"success": bool, "schedules_cancelled": int}
    """
    return await get_client().call("remove_family_member", family_id=family_id, phone=phone)


async def get_confirmations(family_id: str, confirmation_id: str = None) -> dict:
    """Check status of pending confirmation requests (YES/NO replies).

    Viktor equivalent: coworker_get_slack_reactions() — checking approval status.
    Viktor uses emoji reactions. We use text replies (YES/NO).

    Args:
        family_id: Family context
        confirmation_id: Specific confirmation to check (optional, lists all pending if None)

    Returns:
        {"pending": [{"confirmation_id": str, "change_type": str,
                      "description": str, "sent_to": str, "sent_at": str,
                      "response": str | None}]}
    """
    return await get_client().call("get_confirmations", family_id=family_id,
                                   confirmation_id=confirmation_id)
