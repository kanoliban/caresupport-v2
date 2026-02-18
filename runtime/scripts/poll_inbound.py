"""
CareSupport Inbound Message Poller
====================================
Polls Twilio for new inbound messages and processes them through the SMS handler.
Designed to run as a cron job every 30-60 seconds.

Usage:
    python poll_inbound.py

The script:
1. Lists recent inbound messages to the CareSupport number
2. Filters out already-processed messages (tracked by SID)
3. Processes each new message through the SMS handler
4. Sends responses and outreach via Twilio
5. Logs everything
"""

import asyncio
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

# Use shared config — no hardcoded paths
sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent))
from config import paths, ensure_sdk_path
ensure_sdk_path()

PROCESSED_FILE = paths.processed_sids()


def load_processed_sids() -> set:
    """Load the set of already-processed message SIDs."""
    if PROCESSED_FILE.exists():
        with open(PROCESSED_FILE) as f:
            data = json.load(f)
        return set(data.get("sids", []))
    return set()


def save_processed_sids(sids: set):
    """Save processed SIDs. Keep last 500 to prevent file growth."""
    sid_list = sorted(sids)[-500:]  # Keep most recent 500
    with open(PROCESSED_FILE, "w") as f:
        json.dump({"sids": sid_list, "updated": datetime.now(timezone.utc).isoformat()}, f)


async def poll_and_process():
    """Main polling loop: check for new messages, process them, respond."""
    from twilio_proxy import list_inbound_messages, send_sms
    from sms_handler import handle_sms
    
    now = datetime.now(timezone.utc)
    log_prefix = f"[{now.strftime('%Y-%m-%d %H:%M:%S')}]"
    
    # 1. Get recent inbound messages
    messages = await list_inbound_messages(limit=20)
    
    if not messages:
        print(f"{log_prefix} No messages found")
        return
    
    # 2. Filter to unprocessed
    processed_sids = load_processed_sids()
    new_messages = [m for m in messages if m.get("sid") not in processed_sids]
    
    if not new_messages:
        print(f"{log_prefix} No new messages (checked {len(messages)})")
        return
    
    print(f"{log_prefix} Found {len(new_messages)} new message(s)")
    
    # 3. Process each new message
    for msg in new_messages:
        sid = msg.get("sid", "")
        from_phone = msg.get("from", "")
        body = msg.get("body", "")
        
        print(f"{log_prefix} Processing: {from_phone} -> '{body[:60]}...' (SID: {sid})")
        
        try:
            # Run through AI handler
            result = await handle_sms(from_phone, body)
            
            if result["success"] and result["response"]:
                # Send response
                print(f"{log_prefix}   Responding: '{result['response'][:60]}...'")
                send_result = await send_sms(to=from_phone, body=result["response"])
                
                if isinstance(send_result, dict) and send_result.get("sid"):
                    print(f"{log_prefix}   ✅ Sent (SID: {send_result['sid']})")
                else:
                    print(f"{log_prefix}   ⚠️ Send result: {json.dumps(send_result, default=str)[:200]}")
                
                # Handle outreach to other family members
                if result.get("needs_outreach"):
                    for outreach in result["needs_outreach"]:
                        phone = outreach.get("phone", "")
                        outreach_msg = outreach.get("message", "")
                        if phone and outreach_msg:
                            print(f"{log_prefix}   Outreach to {outreach.get('name', phone)}: '{outreach_msg[:60]}...'")
                            await send_sms(to=phone, body=outreach_msg)
                
                # Log family file updates
                if result.get("family_file_updates"):
                    print(f"{log_prefix}   📝 File update: {result['family_file_updates'][:80]}...")
            
            elif not result["success"]:
                # Unknown number or error — still send the response
                if result.get("response"):
                    await send_sms(to=from_phone, body=result["response"])
                print(f"{log_prefix}   ⚠️ {result.get('error', 'Unknown error')}")
            
            # Mark as processed
            processed_sids.add(sid)
            
        except Exception as e:
            print(f"{log_prefix}   ❌ Error processing message: {e}")
            # Still mark as processed to avoid infinite retry
            processed_sids.add(sid)
    
    # 4. Save processed SIDs
    save_processed_sids(processed_sids)
    print(f"{log_prefix} Done. Processed {len(new_messages)} message(s).")


if __name__ == "__main__":
    asyncio.run(poll_and_process())
