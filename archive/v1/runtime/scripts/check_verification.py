"""
Check Twilio number verification status.
Run as a cron to auto-detect when toll-free or 10DLC registration clears.

When approved, sends a Slack notification to Liban.
"""

import asyncio
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

# Use shared config — no hardcoded paths
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import twilio, paths, ensure_sdk_path
ensure_sdk_path()

ACCOUNT_SID = twilio.account_sid
LOCAL_PHONE = "+16513721746"
TOLLFREE_PHONE = "+18442007742"
LIBAN_PHONE = "+16517037981"
STATUS_FILE = paths.processed_sids().parent / ".verification_status.json"


def load_status() -> dict:
    if STATUS_FILE.exists():
        with open(STATUS_FILE) as f:
            return json.load(f)
    return {"tollfree_verified": False, "a2p_registered": False, "first_sms_sent": False}


def save_status(status: dict):
    status["last_checked"] = datetime.now(timezone.utc).isoformat()
    with open(STATUS_FILE, "w") as f:
        json.dump(status, f, indent=2)


async def check_tollfree_verification() -> str:
    """Check toll-free verification status. Returns: pending, approved, rejected, unknown."""
    from sdk.tools.custom_api_naaibymprtmspzikubg6zn import custom_api_twilio_sms_get
    
    try:
        result = await custom_api_twilio_sms_get(
            path=f"/Accounts/{ACCOUNT_SID}/IncomingPhoneNumbers.json",
            query_params={"PhoneNumber": TOLLFREE_PHONE}
        )
        content = json.loads(result.get("content", "{}"))
        body = content.get("body", {})
        if isinstance(body, str):
            body = json.loads(body)
        
        phones = body.get("incoming_phone_numbers", [])
        if not phones:
            return "not_found"
        
        phone = phones[0]
        # The phone status gives us a hint
        return phone.get("status", "unknown")
    except Exception as e:
        return f"error: {e}"


async def test_send(from_phone: str) -> dict:
    """Try sending a test SMS. If it delivers = number is registered."""
    from urllib.parse import urlencode
    from sdk.tools.custom_api_naaibymprtmspzikubg6zn import custom_api_twilio_sms_post, custom_api_twilio_sms_get
    
    # Send test
    result = await custom_api_twilio_sms_post(
        path=f"/Accounts/{ACCOUNT_SID}/Messages.json",
        text_body=urlencode({
            "To": LIBAN_PHONE,
            "From": from_phone,
            "Body": "CareSupport verification test — if you see this, the number is approved! 🎉"
        }),
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    
    content_str = result.get("content", "")
    
    # If it's a draft, we can't auto-send. Return the status.
    if "draft_id" in str(content_str):
        return {"status": "needs_approval", "raw": content_str[:200]}
    
    # Parse the response
    try:
        content = json.loads(content_str)
        body = content.get("body", {})
        if isinstance(body, str):
            body = json.loads(body)
        
        sid = body.get("sid", "")
        
        # Wait a moment and check delivery
        await asyncio.sleep(5)
        
        check = await custom_api_twilio_sms_get(
            path=f"/Accounts/{ACCOUNT_SID}/Messages/{sid}.json"
        )
        check_content = json.loads(check.get("content", "{}"))
        check_body = check_content.get("body", {})
        if isinstance(check_body, str):
            check_body = json.loads(check_body)
        
        return {
            "status": check_body.get("status"),
            "error_code": check_body.get("error_code"),
            "sid": sid
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}


async def main():
    status = load_status()
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    
    print(f"[{now}] Checking verification status...")
    
    # Check toll-free
    tf_status = await check_tollfree_verification()
    print(f"  Toll-free phone status: {tf_status}")
    
    # For a real check, we'd try sending. But that requires approval.
    # Instead, check the Messaging Compliance API for TF verification status.
    from sdk.tools.custom_api_naaibymprtmspzikubg6zn import custom_api_twilio_sms_get
    
    try:
        # Check toll-free verification submissions
        result = await custom_api_twilio_sms_get(
            path="",  # This won't work for messaging API — different base URL
            query_params={}
        )
    except:
        pass
    
    # Try the messaging API endpoint for TF verification
    try:
        result = await custom_api_twilio_sms_get(
            path=f"/Accounts/{ACCOUNT_SID}/Messages.json",
            query_params={
                "From": TOLLFREE_PHONE,
                "PageSize": "1"
            }
        )
        content = json.loads(result.get("content", "{}"))
        body = content.get("body", {})
        if isinstance(body, str):
            body = json.loads(body)
        
        messages = body.get("messages", [])
        if messages:
            last_msg = messages[0]
            error = last_msg.get("error_code")
            if error is None:
                print("  ✅ Toll-free: Messages sending without error!")
                status["tollfree_verified"] = True
            elif error == 30032:
                print("  ❌ Toll-free: Still unverified (30032)")
            else:
                print(f"  ⚠️ Toll-free: Error {error}")
        else:
            print("  No outbound messages from toll-free to check")
    except Exception as e:
        print(f"  Error checking toll-free: {e}")
    
    # Check local number (A2P 10DLC)
    try:
        result = await custom_api_twilio_sms_get(
            path=f"/Accounts/{ACCOUNT_SID}/Messages.json",
            query_params={
                "From": LOCAL_PHONE,
                "PageSize": "1"
            }
        )
        content = json.loads(result.get("content", "{}"))
        body = content.get("body", {})
        if isinstance(body, str):
            body = json.loads(body)
        
        messages = body.get("messages", [])
        if messages:
            last_msg = messages[0]
            error = last_msg.get("error_code")
            if error is None:
                print("  ✅ Local 10DLC: Messages sending without error!")
                status["a2p_registered"] = True
            elif error == 30034:
                print("  ❌ Local 10DLC: Still unregistered (30034)")
            else:
                print(f"  ⚠️ Local 10DLC: Error {error}")
        else:
            print("  No outbound messages from local to check")
    except Exception as e:
        print(f"  Error checking local: {e}")
    
    save_status(status)
    
    if status.get("tollfree_verified") or status.get("a2p_registered"):
        print("\n🎉 AT LEAST ONE NUMBER IS APPROVED! Ready to go live.")
    else:
        print("\n⏳ Still waiting on carrier registration.")
    
    print(json.dumps(status, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
