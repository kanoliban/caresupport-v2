"""
CareSupport Inbound Message Poller (Linq)
============================================
Polls Linq for new inbound messages and processes them through the SMS handler.
Designed to run as a cron job every 30-60 seconds.

NOTE: This is the polling fallback. The preferred path is webhook_receiver.py
(push-based, real-time). Use polling only when webhooks aren't available
(e.g., local development without a public URL).

Usage:
    python poll_inbound.py
    python poll_inbound.py --once  # Run once and exit

The script:
1. Lists recent inbound messages from the Linq API
2. Filters out already-processed messages (tracked by message ID)
3. Processes each new message through the SMS handler
4. Sends responses via Linq
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
from config import paths, linq, ensure_sdk_path
ensure_sdk_path()

PROCESSED_FILE = paths.processed_sids()


def load_processed_ids() -> set:
    """Load the set of already-processed message IDs."""
    if PROCESSED_FILE.exists():
        with open(PROCESSED_FILE) as f:
            data = json.load(f)
        return set(data.get("sids", []))  # key kept as "sids" for backward compat
    return set()


def save_processed_ids(ids: set):
    """Save processed IDs. Keep last 500 to prevent file growth."""
    id_list = sorted(ids)[-500:]  # Keep most recent 500
    with open(PROCESSED_FILE, "w") as f:
        json.dump({"sids": id_list, "updated": datetime.now(timezone.utc).isoformat()}, f)


async def poll_and_process():
    """Main polling loop: check for new messages, process them, respond."""
    from linq_gateway import list_chats, get_chat_messages, send_message, start_typing, mark_as_read
    from sms_handler import handle_sms

    now = datetime.now(timezone.utc)
    log_prefix = f"[{now.strftime('%Y-%m-%d %H:%M:%S')}]"

    # 1. Get all active chats
    chats_result = await list_chats()
    chats = chats_result.get("chats", [])

    if not chats:
        print(f"{log_prefix} No active chats")
        return

    processed_ids = load_processed_ids()
    total_new = 0

    # 2. Check each chat for new inbound messages
    for chat in chats:
        chat_id = chat.get("id", "")
        service = chat.get("service", "SMS")

        messages_result = await get_chat_messages(chat_id, limit=20)
        messages = messages_result.get("messages", [])

        # Filter to inbound, unprocessed messages
        new_messages = [
            m for m in messages
            if not m.get("is_from_me", True) and m.get("id") not in processed_ids
        ]

        if not new_messages:
            continue

        print(f"{log_prefix} Chat {chat_id[:8]}... ({service}): {len(new_messages)} new message(s)")

        # 3. Process each new message
        for msg in new_messages:
            msg_id = msg.get("id", "")
            from_phone = msg.get("from", "")
            # Extract text from parts
            parts = msg.get("parts", [])
            body = " ".join(p.get("value", "") for p in parts if p.get("type") == "text")

            if not body.strip():
                print(f"{log_prefix}   Skipping non-text message {msg_id[:8]}...")
                processed_ids.add(msg_id)
                continue

            print(f"{log_prefix}   Processing: {from_phone} -> '{body[:60]}...' (ID: {msg_id[:8]}...)")

            try:
                # Mark as read + show typing indicator
                await mark_as_read(chat_id)
                await start_typing(chat_id)

                # Run through AI handler (enforcement pipeline)
                result = await handle_sms(from_phone, body)

                if result["success"] and result["response"]:
                    # Send response via Linq
                    print(f"{log_prefix}     Responding: '{result['response'][:60]}...'")
                    send_result = await send_message(chat_id, result["response"])

                    if send_result.get("success"):
                        print(f"{log_prefix}     ✅ Sent (ID: {send_result.get('message_id', '?')[:8]}...)")
                    else:
                        print(f"{log_prefix}     ⚠️ Send failed: {json.dumps(send_result, default=str)[:200]}")

                    # Handle outreach to other family members
                    if result.get("needs_outreach"):
                        for outreach in result["needs_outreach"]:
                            phone = outreach.get("phone", "")
                            outreach_msg = outreach.get("message", "")
                            if phone and outreach_msg:
                                print(f"{log_prefix}     Outreach to {outreach.get('name', phone)}: '{outreach_msg[:60]}...'")
                                # NOTE: Outreach to other members requires finding/creating
                                # their chat_id. For now, log the intent.
                                # TODO: Implement outreach via create_chat() for new members

                    # Log family file updates
                    if result.get("family_file_updates"):
                        print(f"{log_prefix}     📝 File update: {result['family_file_updates'][:80]}...")

                elif not result["success"]:
                    if result.get("response"):
                        await send_message(chat_id, result["response"])
                    print(f"{log_prefix}     ⚠️ {result.get('error', 'Unknown error')}")

                # Mark as processed
                processed_ids.add(msg_id)
                total_new += 1

            except Exception as e:
                print(f"{log_prefix}     ❌ Error processing message: {e}")
                processed_ids.add(msg_id)

    # 4. Save processed IDs
    save_processed_ids(processed_ids)
    if total_new > 0:
        print(f"{log_prefix} Done. Processed {total_new} message(s).")
    else:
        print(f"{log_prefix} No new messages across {len(chats)} chat(s).")


if __name__ == "__main__":
    asyncio.run(poll_and_process())
