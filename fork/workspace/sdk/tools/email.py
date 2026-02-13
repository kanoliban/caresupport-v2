"""
Email — Send emails for provider communication and care documentation.

Viktor equivalent: email_tools.py (coworker_send_email, coworker_get_attachment).
Same pattern, restricted to provider/insurance communication. Family communication
happens over SMS, not email.

Every outgoing email includes:
"Sent via CareSupport on behalf of the {family_name} family"
"""

from sdk.internal.client import get_client


async def send_email(to: list[str], subject: str, body: str,
                     family_id: str, cc: list[str] = None,
                     attachments: list[str] = None) -> dict:
    """Send an email (typically to providers or insurance).

    REQUIRES family approval before sending. The provider-communication
    protocol enforces this.

    Args:
        to: Recipient email addresses
        subject: Email subject
        body: Email body (plain text)
        family_id: Family context (for audit logging)
        cc: CC addresses (optional)
        attachments: Local file paths to attach (optional)

    Returns:
        {"success": bool, "email_id": str}
    """
    return await get_client().call("send_email", to=to, subject=subject,
                                   body=body, family_id=family_id, cc=cc,
                                   attachments=attachments)
