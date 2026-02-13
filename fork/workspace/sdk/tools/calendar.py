"""
Calendar — Appointment and schedule management.

Viktor equivalent: None. Viktor manages tasks (Linear), not appointments.
Connects to: Google Calendar, Apple Calendar, or internal scheduling.
"""

from sdk.internal.client import get_client


async def list_appointments(family_id: str, start_date: str = None,
                            end_date: str = None) -> dict:
    """List upcoming appointments for the care recipient.

    Args:
        family_id: The family context
        start_date: ISO date string (default: today)
        end_date: ISO date string (default: 30 days from start)

    Returns:
        {"appointments": [{"date": str, "time": str, "type": str,
                          "provider": str, "location": str, "notes": str}]}
    """
    return await get_client().call("list_appointments", family_id=family_id,
                                   start_date=start_date, end_date=end_date)


async def create_appointment(family_id: str, date: str, time: str,
                             appointment_type: str, provider: str,
                             location: str = None, notes: str = None) -> dict:
    """Create a new appointment. Triggers day-before and morning-of reminders.

    Requires primary caregiver approval via care-plan-updates protocol.

    Args:
        family_id: Family context
        date: ISO date
        time: Time string (e.g., "2:00 PM")
        appointment_type: "cardiology", "primary care", "lab work", etc.
        provider: Doctor/facility name
        location: Address (optional, looked up from Provider Contacts if not provided)
        notes: Prep notes or questions for the visit

    Returns:
        {"success": bool, "appointment_id": str, "reminders_set": bool}
    """
    return await get_client().call("create_appointment", family_id=family_id,
                                   date=date, time=time,
                                   appointment_type=appointment_type,
                                   provider=provider, location=location,
                                   notes=notes)


async def cancel_appointment(family_id: str, appointment_id: str,
                             reason: str = None) -> dict:
    """Cancel an appointment and its associated reminders.

    Args:
        family_id: Family context
        appointment_id: The appointment to cancel
        reason: Optional reason for cancellation

    Returns:
        {"success": bool, "cancelled_reminders": int}
    """
    return await get_client().call("cancel_appointment", family_id=family_id,
                                   appointment_id=appointment_id, reason=reason)
