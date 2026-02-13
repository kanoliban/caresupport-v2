"""
Emergency — Urgent situation routing and mass notification.

Viktor equivalent: None. Viktor has no concept of emergency.
This module exists because latency matters when someone falls.
"""

from sdk.internal.client import get_client


async def trigger_emergency_alert(family_id: str, emergency_type: str,
                                   reporter_phone: str, details: str) -> dict:
    """Immediately notify all full-access care team members of an emergency.

    Bypasses quiet hours. Bypasses all approval flows.
    Sends SMS to all full-access members simultaneously.

    Args:
        family_id: The family context
        emergency_type: "fall" | "chest_pain" | "breathing" | "unresponsive" |
                       "seizure" | "choking" | "bleeding" | "confusion" | "other"
        reporter_phone: Who reported the emergency
        details: What happened (from the reporter's message)

    Returns:
        {"success": bool, "notified": [{"name": str, "phone": str}],
         "home_address": str, "incident_id": str}
    """
    return await get_client().call("trigger_emergency_alert", family_id=family_id,
                                   emergency_type=emergency_type,
                                   reporter_phone=reporter_phone,
                                   details=details)


async def notify_provider_urgent(family_id: str, provider_role: str,
                                  message: str) -> dict:
    """Send an urgent message to a care provider (doctor, specialist).

    Uses email + phone (if available) for urgent reach. Logs in PHI access log.

    Args:
        family_id: Family context
        provider_role: Which provider to contact (e.g., "primary_physician", "cardiologist")
        message: The urgent message

    Returns:
        {"success": bool, "provider_name": str, "contact_method": "email"|"phone"|"both"}
    """
    return await get_client().call("notify_provider_urgent", family_id=family_id,
                                   provider_role=provider_role, message=message)
