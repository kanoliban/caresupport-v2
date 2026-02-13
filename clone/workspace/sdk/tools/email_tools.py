"""Auto-generated tool module for email_tools."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel

from sdk.internal.client import get_client

async def coworker_send_email(to: list[str], subject: str, body: str, cc: list[str] = None, bcc: list[str] = None, reply_to_email_id: str | None = None, attachments: list[str] = None) -> CoworkerSendEmailResponse:
    """Send an email from the coworker's email address.

    The email will be sent via the configured email service and a copy
    will be saved to /work/emails/sent/.

    Args:
        to: Recipient email addresses
        subject: Email subject line
        body: Email body in markdown format
        cc: CC recipients
        bcc: BCC recipients
        reply_to_email_id: Email ID to reply to (will set In-Reply-To header and prepend Re: to subject)
        attachments: List of local file paths to attach (from /work/)

    Returns:
        CoworkerSendEmailResponse: Response from sending an email.
    """
    return CoworkerSendEmailResponse.model_validate(await get_client().call("coworker_send_email", to=to, cc=cc, bcc=bcc, subject=subject, body=body, reply_to_email_id=reply_to_email_id, attachments=attachments))

class CoworkerSendEmailResponse(BaseModel):
    """Response from sending an email."""

    success: bool
    email_id: str | None = None  # ID of sent email
    error: str | None = None  # Error message if send failed


async def coworker_get_attachment(internal_url: str, filename: str, save_path: str | None = None) -> CoworkerGetAttachmentResponse:
    """Download an email attachment to local storage.

    Attachments in received emails have an `_internal_url` field that requires
    API authentication. Pass the `_internal_url` and `filename` from the email
    frontmatter to download the attachment.

    Args:
        internal_url: The _internal_url from the email attachment metadata
        filename: Filename to save as (e.g. 'report.pdf')
        save_path: Custom save path (default: /work/emails/attachments/{filename})

    Returns:
        CoworkerGetAttachmentResponse: Response from downloading an attachment.
    """
    return CoworkerGetAttachmentResponse.model_validate(await get_client().call("coworker_get_attachment", internal_url=internal_url, filename=filename, save_path=save_path))

class CoworkerGetAttachmentResponse(BaseModel):
    """Response from downloading an attachment."""

    file_path: str | None = None  # Path where attachment was saved
    error: str | None = None  # Error message if download failed
