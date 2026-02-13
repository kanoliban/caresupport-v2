"""
Messaging — Send and receive iMessage/SMS via Twilio or Apple Business Chat.

Viktor equivalent: default_tools.py (Slack messaging functions)

Key differences:
- Slack has channels and threads. SMS has phone numbers and conversations.
- Slack messages are free. SMS costs ~$0.0079/segment (160 chars).
- Slack has rich formatting. SMS is plain text only.
- iMessage is free but requires Apple Business Chat enrollment.
- Slack identity is resolved by platform. SMS identity requires phone→family→member lookup.
"""

from sdk.internal.client import get_client


async def send_message(phone: str, body: str, family_id: str) -> dict:
    """Send an SMS/iMessage to a care team member.

    Automatically applies:
    - Role-based content filtering (strips PHI if member lacks access)
    - Quiet hours check (queues non-emergency messages for morning)
    - Conversation logging to conversations/{phone}/{YYYY-MM}.log

    Args:
        phone: Recipient phone number (E.164 format, e.g., "+15551234567")
        body: Message text (keep under 320 chars / 2 SMS segments when possible)
        family_id: Family context for role filtering and logging

    Returns:
        {"success": bool, "message_id": str, "segments": int, "cost": float,
         "channel": "sms" | "imessage", "filtered": bool}
    """
    return await get_client().call("send_message", phone=phone, body=body, family_id=family_id)


async def send_group_message(family_id: str, body: str, min_access_level: str = "full") -> dict:
    """Send a message to all care team members at or above an access level.

    Useful for announcements, emergency notifications, and schedule changes.

    Args:
        family_id: The family to message
        body: Message text
        min_access_level: Minimum access level to receive this message.
            "full" = only primary/secondary caregivers
            "schedule+meds" = caregivers + aides
            "schedule" = everyone except providers
            "all" = entire care team including providers

    Returns:
        {"success": bool, "sent_to": [{"phone": str, "name": str, "delivered": bool}]}
    """
    return await get_client().call("send_group_message", family_id=family_id, body=body,
                                   min_access_level=min_access_level)


async def send_confirmation_request(phone: str, family_id: str, change_description: str,
                                     change_type: str) -> dict:
    """Send a care plan change for approval. Waits for YES/NO reply.

    This is the care equivalent of Viktor's draft/approval system.
    Viktor uses Slack buttons (Approve/Reject). We use SMS reply parsing.

    Args:
        phone: Primary caregiver phone (only full-access members can approve)
        family_id: The family context
        change_description: Human-readable description of the change
        change_type: "medication" | "schedule" | "team" | "preference" | "emergency_protocol"

    Returns:
        {"success": bool, "confirmation_id": str, "message": str}
    """
    return await get_client().call("send_confirmation_request", phone=phone,
                                   family_id=family_id,
                                   change_description=change_description,
                                   change_type=change_type)


async def read_conversation(phone: str, since: str = None, limit: int = 50) -> dict:
    """Read conversation history with a family member.

    Viktor equivalent: reading slack/{user}/{YYYY-MM}.log files

    Args:
        phone: Phone number to read history for
        since: ISO timestamp to read from (default: last 24 hours)
        limit: Max messages to return

    Returns:
        {"messages": [{"timestamp": str, "direction": "in"|"out",
                       "body": str, "family_id": str}]}
    """
    return await get_client().call("read_conversation", phone=phone, since=since, limit=limit)
