"""
CareSupport Twilio Proxy
=========================
Wraps Twilio proxy endpoints for SMS operations.
Uses pd_twilio_proxy_* instead of built-in actions (which have a caching issue).

Usage:
    from twilio_proxy import send_sms, list_inbound_messages, get_account_balance
"""

import json
import sys
from urllib.parse import urlencode
from pathlib import Path

sys.path.insert(0, '/work/sdk')

# Load config
_config = {}
_config_path = Path("/work/scripts/caresupport/config.json")
if _config_path.exists():
    with open(_config_path) as f:
        _config = json.load(f)

ACCOUNT_SID = _config.get("twilio_account_sid", "")
CARESUPPORT_PHONE = _config.get("caresupport_phone", "")
BASE_URL = f"https://api.twilio.com/2010-04-01/Accounts/{ACCOUNT_SID}"


def _parse_response(result: dict) -> dict:
    """Parse the Pipedream proxy response into usable data."""
    content = result.get("content", "")
    if isinstance(content, str):
        try:
            content = json.loads(content)
        except json.JSONDecodeError:
            return {"error": "Failed to parse response", "raw": content[:500]}
    
    body = content.get("body", "")
    if isinstance(body, str):
        try:
            body = json.loads(body)
        except json.JSONDecodeError:
            return {"raw_body": body[:500]}
    
    return body


async def send_sms(to: str, body: str, from_phone: str = "") -> dict:
    """Send SMS via Twilio REST API proxy.
    
    Args:
        to: Recipient phone in E.164 format
        body: Message text (max 1600 chars)
        from_phone: Sender phone (defaults to CareSupport number)
    
    Returns:
        Twilio message resource dict with sid, status, etc.
    """
    from sdk.tools.pd_twilio import pd_twilio_proxy_post
    
    if not from_phone:
        from_phone = CARESUPPORT_PHONE
    
    params = urlencode({
        "To": to,
        "From": from_phone,
        "Body": body
    })
    
    result = await pd_twilio_proxy_post(
        url=f"{BASE_URL}/Messages.json",
        text_body=params,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    
    return _parse_response(result)


async def list_inbound_messages(limit: int = 20, to_phone: str = "") -> list:
    """List inbound messages to the CareSupport number.
    
    Args:
        limit: Max messages to return
        to_phone: Filter by recipient (defaults to CareSupport number)
    
    Returns:
        List of message dicts
    """
    from sdk.tools.pd_twilio import pd_twilio_proxy_get
    
    if not to_phone:
        to_phone = CARESUPPORT_PHONE
    
    result = await pd_twilio_proxy_get(
        url=f"{BASE_URL}/Messages.json",
        query_params={
            "To": to_phone,
            "PageSize": str(limit)
        }
    )
    
    body = _parse_response(result)
    return body.get("messages", [])


async def list_outbound_messages(limit: int = 20, from_phone: str = "") -> list:
    """List outbound messages from the CareSupport number."""
    from sdk.tools.pd_twilio import pd_twilio_proxy_get
    
    if not from_phone:
        from_phone = CARESUPPORT_PHONE
    
    result = await pd_twilio_proxy_get(
        url=f"{BASE_URL}/Messages.json",
        query_params={
            "From": from_phone,
            "PageSize": str(limit)
        }
    )
    
    body = _parse_response(result)
    return body.get("messages", [])


async def get_message(message_sid: str) -> dict:
    """Get a specific message by SID."""
    from sdk.tools.pd_twilio import pd_twilio_proxy_get
    
    result = await pd_twilio_proxy_get(
        url=f"{BASE_URL}/Messages/{message_sid}.json"
    )
    
    return _parse_response(result)


async def get_account_balance() -> dict:
    """Check account balance."""
    from sdk.tools.pd_twilio import pd_twilio_proxy_get
    
    result = await pd_twilio_proxy_get(
        url=f"{BASE_URL}/Balance.json"
    )
    
    return _parse_response(result)


async def update_phone_webhook(sms_url: str, sms_method: str = "POST") -> dict:
    """Update the SMS webhook URL for the CareSupport phone number.
    
    This sets where Twilio sends inbound SMS notifications.
    
    Args:
        sms_url: The webhook URL to receive inbound SMS
        sms_method: HTTP method for webhook (POST or GET)
    """
    from sdk.tools.pd_twilio import pd_twilio_proxy_post
    
    phone_sid = _config.get("twilio_phone_sid", "")
    if not phone_sid:
        return {"error": "Phone SID not configured"}
    
    params = urlencode({
        "SmsUrl": sms_url,
        "SmsMethod": sms_method
    })
    
    result = await pd_twilio_proxy_post(
        url=f"{BASE_URL}/IncomingPhoneNumbers/{phone_sid}.json",
        text_body=params,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    
    return _parse_response(result)


# ─── CLI ──────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import asyncio
    
    async def main():
        print("=== Account Balance ===")
        balance = await get_account_balance()
        print(json.dumps(balance, indent=2, default=str))
        
        print("\n=== Recent Inbound Messages ===")
        messages = await list_inbound_messages(limit=5)
        for msg in messages:
            print(f"  {msg.get('from', '?')} → {msg.get('to', '?')}: {msg.get('body', '')[:80]}")
        if not messages:
            print("  (none)")
    
    asyncio.run(main())
