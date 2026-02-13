"""
Health Records — Read patient portal data, lab results, discharge summaries.

Viktor equivalent: None (closest is file_to_markdown for document parsing).
Connects to: Epic MyChart, Cerner, or generic FHIR endpoints.

HIPAA NOTE: All access to this module is logged to phi_access.log.
Every function call records: timestamp, family_id, requesting_phone,
data_type_accessed, purpose.
"""

from sdk.internal.client import get_client


async def get_recent_labs(family_id: str, days: int = 90) -> dict:
    """Retrieve recent lab results for the care recipient.

    All results are returned in consumer-friendly language, not raw LOINC codes.

    Args:
        family_id: Family context
        days: How far back to look (default 90 days)

    Returns:
        {"labs": [{"date": str, "test_name": str, "result": str,
                   "reference_range": str, "flag": "normal"|"high"|"low"|"critical",
                   "ordered_by": str}]}
    """
    return await get_client().call("get_recent_labs", family_id=family_id, days=days)


async def get_visit_summary(family_id: str, visit_date: str = None) -> dict:
    """Get the summary from a recent provider visit.

    If visit_date is None, returns the most recent visit summary.

    Args:
        family_id: Family context
        visit_date: ISO date string (optional)

    Returns:
        {"visit_date": str, "provider": str, "diagnosis": [str],
         "instructions": str, "follow_up": str, "medication_changes": [str]}
    """
    return await get_client().call("get_visit_summary", family_id=family_id,
                                   visit_date=visit_date)
