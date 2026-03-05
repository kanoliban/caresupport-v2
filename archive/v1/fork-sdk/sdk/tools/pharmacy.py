"""
Pharmacy — Medication lookup, interaction checking, and refill management.

Viktor equivalent: None. This is new to CareSupport.
Connects to: Surescripts (e-prescribing network), pharmacy APIs, drug databases.
"""

from sdk.internal.client import get_client


async def lookup_medication(name: str) -> dict:
    """Look up medication information — uses, dosing, side effects, interactions.

    Source: DailyMed (NIH), DrugBank, or equivalent authoritative database.
    Results are consumer-friendly, not clinical.

    Args:
        name: Medication name (brand or generic, e.g., "lisinopril" or "Prinivil")

    Returns:
        {"name": str, "generic": str, "brand": str, "drug_class": str,
         "common_uses": [str], "common_doses": [str], "side_effects": [str],
         "warnings": [str], "interactions_note": str}
    """
    return await get_client().call("lookup_medication", name=name)


async def check_interactions(medications: list[str]) -> dict:
    """Check for drug-drug interactions across a list of medications.

    CRITICAL: Must be called before adding any new medication to family.md.
    This is a HARD RULE in the medication-management protocol.

    Args:
        medications: List of medication names (all active meds + proposed new med)

    Returns:
        {"interactions_found": bool,
         "interactions": [{"drug_a": str, "drug_b": str,
                          "severity": "major"|"moderate"|"minor",
                          "description": str}],
         "safe_to_proceed": bool}
    """
    return await get_client().call("check_interactions", medications=medications)


async def check_refill_status(family_id: str, medication: str) -> dict:
    """Check if a prescription refill is available and when it's due.

    Requires pharmacy integration (Surescripts or pharmacy-specific API).

    Args:
        family_id: Family context (to look up pharmacy info from family.md)
        medication: Medication name

    Returns:
        {"refill_available": bool, "last_filled": str, "days_supply_remaining": int,
         "refills_remaining": int, "pharmacy": str, "pharmacy_phone": str}
    """
    return await get_client().call("check_refill_status", family_id=family_id,
                                   medication=medication)


async def request_refill(family_id: str, medication: str) -> dict:
    """Request a prescription refill at the family's pharmacy.

    Requires primary caregiver approval BEFORE calling this function.
    The medication-management protocol enforces this.

    Args:
        family_id: Family context
        medication: Medication name

    Returns:
        {"success": bool, "refill_id": str, "estimated_ready": str,
         "pharmacy": str, "pharmacy_phone": str}
    """
    return await get_client().call("request_refill", family_id=family_id,
                                   medication=medication)
