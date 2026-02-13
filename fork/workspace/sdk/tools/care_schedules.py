"""
Care Schedules — Create and manage recurring care reminders and check-ins.

Viktor equivalent: scheduled_crons.py (create_agent_cron, create_script_cron,
delete_cron, trigger_cron).

Same cron system, specialized for care timing. Two types:
- Agent schedule: needs reasoning (check-ins, assessments)
- Reminder schedule: deterministic (medication time, appointment alert)
"""

from sdk.internal.client import get_client


async def create_care_schedule(family_id: str, schedule_type: str,
                                title: str, description: str,
                                cron: str, notify: str = None,
                                trigger_now: bool = False) -> dict:
    """Create a recurring care schedule that runs an agent.

    Viktor equivalent: create_agent_cron()

    Use for tasks requiring reasoning: daily check-ins, pattern analysis,
    needs assessment. The agent reads family.md and adapts its behavior.

    Args:
        family_id: Family context
        schedule_type: "agent" (always, for this function)
        title: Short title (e.g., "Morning Check-In")
        description: Complete instructions for the agent. MUST include everything
                    the agent needs — it has no context from previous conversations.
        cron: Cron expression (e.g., "0 8 * * *" for 8am daily)
        notify: Phone number to message (if applicable)
        trigger_now: Run immediately in addition to schedule

    Returns:
        {"success": bool, "schedule_id": str}
    """
    return await get_client().call("create_care_schedule", family_id=family_id,
                                   schedule_type=schedule_type, title=title,
                                   description=description, cron=cron,
                                   notify=notify, trigger_now=trigger_now)


async def create_reminder(family_id: str, title: str, message: str,
                           cron: str, notify: str,
                           wait_for_confirmation: bool = False,
                           escalate_after_minutes: int = None,
                           trigger_now: bool = False) -> dict:
    """Create a recurring reminder that sends a fixed message.

    Viktor equivalent: create_script_cron()

    Use for deterministic tasks: medication reminders, appointment alerts,
    shift change notifications. No reasoning needed — same message each time.

    Args:
        family_id: Family context
        title: Short title (e.g., "Evening Lisinopril")
        message: Exact message to send. Supports {recipient} placeholder.
        cron: Cron expression
        notify: Phone number to send the reminder to
        wait_for_confirmation: If True, watch for DONE/YES reply
        escalate_after_minutes: If set and no confirmation received,
                               notify primary caregiver after N minutes
        trigger_now: Send immediately in addition to schedule

    Returns:
        {"success": bool, "schedule_id": str}
    """
    return await get_client().call("create_reminder", family_id=family_id,
                                   title=title, message=message, cron=cron,
                                   notify=notify,
                                   wait_for_confirmation=wait_for_confirmation,
                                   escalate_after_minutes=escalate_after_minutes,
                                   trigger_now=trigger_now)


async def list_schedules(family_id: str) -> dict:
    """List all active schedules for a family.

    Returns:
        {"schedules": [{"schedule_id": str, "title": str, "type": "agent"|"reminder",
                        "cron": str, "notify": str, "active": bool,
                        "last_run": str, "next_run": str}]}
    """
    return await get_client().call("list_schedules", family_id=family_id)


async def delete_schedule(family_id: str, schedule_id: str) -> dict:
    """Delete a care schedule. Requires primary caregiver approval.

    Returns:
        {"success": bool}
    """
    return await get_client().call("delete_schedule", family_id=family_id,
                                   schedule_id=schedule_id)


async def trigger_schedule(family_id: str, schedule_id: str) -> dict:
    """Manually trigger a schedule to run now (in addition to its cron).

    Returns:
        {"success": bool, "run_id": str}
    """
    return await get_client().call("trigger_schedule", family_id=family_id,
                                   schedule_id=schedule_id)
