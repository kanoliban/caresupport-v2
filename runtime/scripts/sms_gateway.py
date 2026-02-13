"""
CareSupport SMS Gateway (V2 — Custom API Direct)
==================================================
Sends and receives SMS through Twilio's REST API using the custom API integration.

Note: All POST operations (send SMS) create drafts that require user approval.
For V1 this means the coordinator (Liban) reviews and approves outgoing messages
in Slack before they're sent. This is appropriate for healthcare.

Usage:
    # Send SMS (returns draft_id for approval)
    python sms_gateway.py send --to "+16517037981" --body "Hello"
    
    # List inbound messages
    python sms_gateway.py poll
    
    # Check a specific message
    python sms_gateway.py check --sid "SMxxxxx"
    
    # Full flow: poll → process → queue responses
    python sms_gateway.py process
"""

import asyncio
import json
import sys
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode

sys.path.insert(0, '/work/sdk')
sys.path.insert(0, '/work/scripts/caresupport')

# Load config
_config_path = Path("/work/scripts/caresupport/config.json")
with open(_config_path) as f:
    CONFIG = json.load(f)

ACCOUNT_SID = CONFIG["twilio_account_sid"]
CARESUPPORT_PHONE = CONFIG["caresupport_phone"]


def _parse_response(result: dict) -> dict:
    """Parse custom API response into usable data."""
    content = result.get("content", "")
    if isinstance(content, str):
        try:
            content = json.loads(content)
        except json.JSONDecodeError:
            return {"raw": content[:500]}
    
    body = content.get("body", {})
    if isinstance(body, str):
        try:
            body = json.loads(body)
        except json.JSONDecodeError:
            return {"raw_body": body[:500]}
    
    return body


async def send_sms(to: str, body: str, from_phone: str = "") -> dict:
    """Send SMS. Returns draft_id for approval or direct result.
    
    Returns:
        {"draft_id": "xxx"} if approval needed
        {"sid": "SMxxx", "status": "queued"} if sent directly
        {"error": "..."} on failure
    """
    from sdk.tools.custom_api_naaibymprtmspzikubg6zn import custom_api_twilio_sms_post
    
    if not from_phone:
        from_phone = CARESUPPORT_PHONE
    
    result = await custom_api_twilio_sms_post(
        path=f"/Accounts/{ACCOUNT_SID}/Messages.json",
        text_body=urlencode({
            "To": to,
            "From": from_phone,
            "Body": body
        }),
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    
    content_str = result.get("content", "")
    
    # Check if it's a draft requiring approval
    if "draft_id" in str(content_str):
        match = re.search(r'draft_id: (\S+?)\.', str(content_str))
        if not match:
            match = re.search(r'draft_id: (\S+)', str(content_str))
        draft_id = match.group(1).rstrip('.') if match else None
        return {"draft_id": draft_id, "to": to, "body": body, "needs_approval": True}
    
    # Direct result
    parsed = _parse_response(result)
    return {
        "sid": parsed.get("sid"),
        "status": parsed.get("status"),
        "to": to,
        "body": body,
        "needs_approval": False
    }


async def list_inbound(limit: int = 20) -> list:
    """List inbound messages to the CareSupport number. No approval needed."""
    from sdk.tools.custom_api_naaibymprtmspzikubg6zn import custom_api_twilio_sms_get
    
    result = await custom_api_twilio_sms_get(
        path=f"/Accounts/{ACCOUNT_SID}/Messages.json",
        query_params={
            "To": CARESUPPORT_PHONE,
            "PageSize": str(limit)
        }
    )
    
    body = _parse_response(result)
    return body.get("messages", [])


async def list_outbound(limit: int = 20) -> list:
    """List outbound messages from the CareSupport number."""
    from sdk.tools.custom_api_naaibymprtmspzikubg6zn import custom_api_twilio_sms_get
    
    result = await custom_api_twilio_sms_get(
        path=f"/Accounts/{ACCOUNT_SID}/Messages.json",
        query_params={
            "From": CARESUPPORT_PHONE,
            "PageSize": str(limit)
        }
    )
    
    body = _parse_response(result)
    return body.get("messages", [])


async def get_message(sid: str) -> dict:
    """Get details of a specific message."""
    from sdk.tools.custom_api_naaibymprtmspzikubg6zn import custom_api_twilio_sms_get
    
    result = await custom_api_twilio_sms_get(
        path=f"/Accounts/{ACCOUNT_SID}/Messages/{sid}.json"
    )
    
    return _parse_response(result)


async def get_balance() -> dict:
    """Check account balance."""
    from sdk.tools.custom_api_naaibymprtmspzikubg6zn import custom_api_twilio_sms_get
    
    result = await custom_api_twilio_sms_get(
        path=f"/Accounts/{ACCOUNT_SID}/Balance.json"
    )
    
    return _parse_response(result)


async def process_inbound():
    """Poll for new inbound messages, process through AI handler, queue responses.
    
    Returns list of pending responses (each with draft_id for approval).
    """
    from sms_handler import handle_sms
    
    PROCESSED_FILE = Path("/work/scripts/caresupport/.processed_sids.json")
    
    # Load processed SIDs
    processed_sids = set()
    if PROCESSED_FILE.exists():
        with open(PROCESSED_FILE) as f:
            processed_sids = set(json.load(f).get("sids", []))
    
    # Get recent inbound
    messages = await list_inbound(limit=20)
    new_messages = [m for m in messages if m.get("sid") not in processed_sids]
    
    if not new_messages:
        return {"new_count": 0, "responses": []}
    
    pending_responses = []
    
    for msg in new_messages:
        sid = msg.get("sid", "")
        from_phone = msg.get("from", "")
        body = msg.get("body", "")
        
        # Process through AI handler
        result = await handle_sms(from_phone, body)
        
        if result["success"] and result["response"]:
            # Queue response SMS (creates draft)
            send_result = await send_sms(to=from_phone, body=result["response"])
            
            pending = {
                "inbound_sid": sid,
                "from": from_phone,
                "from_name": result.get("member", {}).get("name", "Unknown"),
                "inbound_body": body,
                "response": result["response"],
                "send_result": send_result
            }
            
            # Also queue outreach messages
            if result.get("needs_outreach"):
                outreach_drafts = []
                for o in result["needs_outreach"]:
                    phone = o.get("phone", "")
                    outreach_msg = o.get("message", "")
                    if phone and outreach_msg:
                        o_result = await send_sms(to=phone, body=outreach_msg)
                        outreach_drafts.append({
                            "to": phone,
                            "to_name": o.get("name", ""),
                            "message": outreach_msg,
                            "send_result": o_result
                        })
                pending["outreach"] = outreach_drafts
            
            pending_responses.append(pending)
        
        # Mark as processed
        processed_sids.add(sid)
    
    # Save processed SIDs
    sid_list = sorted(processed_sids)[-500:]
    with open(PROCESSED_FILE, "w") as f:
        json.dump({"sids": sid_list, "updated": datetime.now(timezone.utc).isoformat()}, f)
    
    return {"new_count": len(new_messages), "responses": pending_responses}


# ─── CLI ──────────────────────────────────────────────────────────────────

async def _cli():
    import argparse
    parser = argparse.ArgumentParser(description="CareSupport SMS Gateway")
    sub = parser.add_subparsers(dest="command")
    
    send_p = sub.add_parser("send")
    send_p.add_argument("--to", required=True)
    send_p.add_argument("--body", required=True)
    
    poll_p = sub.add_parser("poll")
    poll_p.add_argument("--limit", type=int, default=10)
    
    check_p = sub.add_parser("check")
    check_p.add_argument("--sid", required=True)
    
    sub.add_parser("process")
    sub.add_parser("balance")
    
    args = parser.parse_args()
    
    if args.command == "send":
        result = await send_sms(args.to, args.body)
        print(json.dumps(result, indent=2))
    
    elif args.command == "poll":
        messages = await list_inbound(args.limit)
        for m in messages:
            print(f"  {m.get('from', '?')} → {m.get('body', '')[:80]}")
        if not messages:
            print("  (no messages)")
    
    elif args.command == "check":
        msg = await get_message(args.sid)
        print(json.dumps(msg, indent=2))
    
    elif args.command == "process":
        result = await process_inbound()
        print(json.dumps(result, indent=2, default=str))
    
    elif args.command == "balance":
        bal = await get_balance()
        print(f"${bal.get('balance')} {bal.get('currency')}")
    
    else:
        parser.print_help()

if __name__ == "__main__":
    asyncio.run(_cli())
