"""
Insurance — Coverage verification, claims tracking, prior authorizations.

Viktor equivalent: None. Closest pattern is mcp_google_ads.py — querying
a complex external system with structured data and returning actionable results.
"""

from sdk.internal.client import get_client


async def check_coverage(family_id: str, service_type: str) -> dict:
    """Check if a service is covered under the family's insurance plan.

    Args:
        family_id: Family context (insurance info from family.md)
        service_type: "physical_therapy" | "home_health" | "durable_medical_equipment" |
                     "specialist_visit" | "lab_work" | "imaging" | "prescription" | ...

    Returns:
        {"covered": bool, "copay": float | None, "coinsurance_pct": float | None,
         "prior_auth_required": bool, "in_network_only": bool,
         "annual_limit": str | None, "notes": str}
    """
    return await get_client().call("check_coverage", family_id=family_id,
                                   service_type=service_type)


async def get_deductible_status(family_id: str) -> dict:
    """Get current deductible and out-of-pocket status.

    Returns:
        {"plan_year": str, "individual_deductible": float,
         "individual_met": float, "family_deductible": float,
         "family_met": float, "out_of_pocket_max": float,
         "out_of_pocket_used": float}
    """
    return await get_client().call("get_deductible_status", family_id=family_id)
