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

from __future__ import annotations

import asyncio
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

# Load .env before config so CARESUPPORT_ROOT is available
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent.parent / ".env")

sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent))
from config import paths, linq

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


def _auto_register_outreach_recipient(family_dir: Path, phone: str, name: str,
                                       chat_id: str, service: str) -> None:
    """Register an outreach recipient in routing.json so their replies route back."""
    routing_path = family_dir / "routing.json"
    if not routing_path.exists():
        routing_path = family_dir / "phone_routing.json"
    if not routing_path.exists():
        return

    routing = json.loads(routing_path.read_text())
    members = routing.get("members", {})

    if isinstance(members, dict) and phone in members:
        if chat_id and not members[phone].get("chat_id"):
            members[phone]["chat_id"] = chat_id
            routing_path.write_text(json.dumps(routing, indent=2) + "\n")
        return

    new_entry = {
        "name": name,
        "role": "family_caregiver",
        "access_level": "limited",
        "active": True,
        "relationship": "contacted via outreach",
    }
    if chat_id:
        new_entry["chat_id"] = chat_id
    if service:
        new_entry["service"] = service

    if isinstance(members, dict):
        members[phone] = new_entry
    elif isinstance(members, list):
        members.append({"phone": phone, **new_entry})
    routing["members"] = members

    routing_path.write_text(json.dumps(routing, indent=2) + "\n")
    print(f"[CareSupport]     📋 Auto-registered {name} ({phone}) for reply routing")


def _resolve_outreach_phone(family_dir: Path, name: str, ai_phone: str) -> str | None:
    """Resolve an outreach recipient's phone from routing.json by name.

    Returns the verified phone if the name matches a known member,
    the AI-provided phone if it's already in routing.json,
    or None if unresolvable.
    """
    routing_path = family_dir / "routing.json"
    if not routing_path.exists():
        routing_path = family_dir / "phone_routing.json"
    if not routing_path.exists():
        return ai_phone

    routing = json.loads(routing_path.read_text())
    members = routing.get("members", {})
    name_lower = name.lower().strip()

    if isinstance(members, dict):
        # Verify AI phone matches the claimed name (prevent misdirected outreach)
        if ai_phone in members:
            existing = members[ai_phone].get("name", "").lower().strip()
            existing_first = existing.split()[0] if existing else ""
            if name_lower == existing or name_lower == existing_first:
                return ai_phone

        for phone, member in members.items():
            member_name = member.get("name", "").lower().strip()
            member_first = member_name.split()[0] if member_name else ""
            if name_lower == member_name or name_lower == member_first:
                return phone
    elif isinstance(members, list):
        for member in members:
            member_name = member.get("name", "").lower().strip()
            member_first = member_name.split()[0] if member_name else ""
            if name_lower == member_name or name_lower == member_first:
                return member.get("phone")

    return None


async def poll_and_process():
    """Main polling loop: check for new messages, process them, respond."""
    from linq_gateway import (list_chats, get_messages, send_message, start_typing,
                               mark_as_read, create_chat, split_into_bubbles,
                               send_message_sequence)
    from sms_handler import handle_sms
    from session import get_or_create as get_or_create_session

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

        messages_result = await get_messages(chat_id, limit=20)
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

                # Track session for cache reuse observability
                sess = get_or_create_session(from_phone, family_id="kano")
                if sess.message_count > 1:
                    print(f"{log_prefix}     Session {sess.session_id[:16]}... msg #{sess.message_count} (cache likely warm)")

                # Run through AI handler (enforcement pipeline)
                result = await handle_sms(from_phone, body, service=service)

                if result["success"] and result.get("response"):
                    response_text = result["response"]

                    # Debug receipt: append model tier to message
                    _TIER_RECEIPTS = {"fast": "H-4.5", "reason": "S-4.6", "critical": "O-4.6"}
                    tier = result.get("_routed_tier")
                    if tier and os.environ.get("CARESUPPORT_DEBUG_RECEIPTS"):
                        response_text = f"{response_text}\n· {_TIER_RECEIPTS.get(tier, tier)}"

                    # Send response via Linq (split into natural bubbles)
                    print(f"{log_prefix}     Responding: '{response_text[:60]}...'")
                    bubbles = split_into_bubbles(response_text)
                    send_results = await send_message_sequence(chat_id, bubbles)
                    send_result = send_results[0] if send_results else {"success": False}

                    if send_result.get("success"):
                        print(f"{log_prefix}     ✅ Sent (ID: {send_result.get('message_id', '?')[:8]}...)")
                    else:
                        print(f"{log_prefix}     ⚠️ Send failed: {json.dumps(send_result, default=str)[:200]}")

                    # Detect promise-without-action: agent said "I'll reach out" but needs_outreach is empty
                    _OUTREACH_PHRASES = [
                        "i'll reach out", "i'll queue", "i'll contact", "i'll text",
                        "i'll message", "i'll send", "i'll let them know",
                        "i'll let her know", "i'll let him know",
                    ]
                    sms_lower = result["response"].lower()
                    if any(p in sms_lower for p in _OUTREACH_PHRASES) and not result.get("needs_outreach"):
                        print(f"{log_prefix}     ⚠️ PROMISE-WITHOUT-ACTION: response says '{result['response'][:80]}...' but needs_outreach is empty")

                    # Handle outreach to other family members
                    sent_names = []
                    if result.get("needs_outreach"):
                        for outreach in result["needs_outreach"]:
                            raw_phone = outreach.get("phone", "")
                            digits = re.sub(r"\D", "", raw_phone)
                            if len(digits) == 10:
                                phone = "+1" + digits
                            elif len(digits) == 11 and digits.startswith("1"):
                                phone = "+" + digits
                            else:
                                phone = raw_phone  # already E.164 or international
                            outreach_msg = outreach.get("message", "")
                            name = outreach.get("name", raw_phone)

                            # Resolve phone against routing.json (don't trust AI blindly)
                            verified_phone = _resolve_outreach_phone(
                                Path(result["member"]["family_dir"]), name, phone
                            )
                            if not verified_phone:
                                print(f"{log_prefix}     ⚠️ Cannot resolve {name} to a phone number — skipping outreach")
                                continue
                            phone = verified_phone

                            if phone and outreach_msg:
                                print(f"{log_prefix}     Outreach to {name} ({phone}): '{outreach_msg[:60]}...'")
                                outreach_result = await create_chat(phone, outreach_msg)
                                if outreach_result.get("success"):
                                    print(f"{log_prefix}     ✅ Outreach sent to {name}")
                                    sent_names.append(name)
                                    _auto_register_outreach_recipient(
                                        family_dir=Path(result["member"]["family_dir"]),
                                        phone=phone,
                                        name=name,
                                        chat_id=outreach_result.get("chat_id", ""),
                                        service=outreach_result.get("service", "unknown"),
                                    )
                                else:
                                    print(f"{log_prefix}     ⚠️ Outreach failed for {name}: {json.dumps(outreach_result, default=str)[:200]}")

                    if sent_names:
                        await asyncio.sleep(3)
                        confirm = "Messaged " + " and ".join(sent_names) + " ✓"
                        await send_message(chat_id, confirm)
                        print(f"{log_prefix}     📨 Confirmation: '{confirm}'")

                    # Log family file updates
                    if result.get("family_file_updates"):
                        print(f"{log_prefix}     📝 File update: {json.dumps(result['family_file_updates'], default=str)[:120]}...")

                elif result["success"] and not result.get("response"):
                    # AI returned empty sms_response — still process outreach
                    print(f"{log_prefix}     ⚠️ EMPTY RESPONSE from AI — processing outreach only")
                    if result.get("needs_outreach"):
                        sent_names = []
                        for outreach in result["needs_outreach"]:
                            raw_phone = outreach.get("phone", "")
                            digits = re.sub(r"\D", "", raw_phone)
                            if len(digits) == 10:
                                phone = "+1" + digits
                            elif len(digits) == 11 and digits.startswith("1"):
                                phone = "+" + digits
                            else:
                                phone = raw_phone
                            outreach_msg = outreach.get("message", "")
                            name = outreach.get("name", raw_phone)

                            verified_phone = _resolve_outreach_phone(
                                Path(result["member"]["family_dir"]), name, phone
                            )
                            if not verified_phone:
                                print(f"{log_prefix}     ⚠️ Cannot resolve {name} to a phone number — skipping outreach")
                                continue
                            phone = verified_phone

                            if phone and outreach_msg:
                                print(f"{log_prefix}     Outreach to {name} ({phone}): '{outreach_msg[:60]}...'")
                                outreach_result = await create_chat(phone, outreach_msg)
                                if outreach_result.get("success"):
                                    print(f"{log_prefix}     ✅ Outreach sent to {name}")
                                    sent_names.append(name)
                                    _auto_register_outreach_recipient(
                                        family_dir=Path(result["member"]["family_dir"]),
                                        phone=phone,
                                        name=name,
                                        chat_id=outreach_result.get("chat_id", ""),
                                        service=outreach_result.get("service", "unknown"),
                                    )

                        if sent_names:
                            await asyncio.sleep(3)
                            confirm = "Messaged " + " and ".join(sent_names) + " ✓"
                            await send_message(chat_id, confirm)
                            print(f"{log_prefix}     📨 Confirmation: '{confirm}'")
                        else:
                            await send_message(chat_id, "Got it — working on that.")
                    else:
                        await send_message(chat_id, "Got it — working on that.")

                elif not result["success"]:
                    if result.get("response"):
                        await send_message(chat_id, result["response"])
                    print(f"{log_prefix}     ⚠️ {result.get('error', 'Unknown error')}")

                # Mark as processed
                processed_ids.add(msg_id)
                total_new += 1

                # Rate limit buffer between messages
                if len(new_messages) > 1:
                    await asyncio.sleep(2)

            except Exception as e:
                print(f"{log_prefix}     ❌ Error processing message: {e}")
                processed_ids.add(msg_id)

    # 4. Save processed IDs
    save_processed_ids(processed_ids)
    if total_new > 0:
        print(f"{log_prefix} Done. Processed {total_new} message(s).")
    else:
        print(f"{log_prefix} No new messages across {len(chats)} chat(s).")


async def poll_loop(interval: int = 30):
    """Continuous polling loop."""
    print(f"[CareSupport] Polling every {interval}s. Ctrl+C to stop.")
    while True:
        try:
            await poll_and_process()
        except KeyboardInterrupt:
            raise
        except Exception as e:
            print(f"[CareSupport] Error in poll cycle: {e}")
        await asyncio.sleep(interval)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="CareSupport Inbound Poller")
    parser.add_argument("--once", action="store_true", help="Run once and exit")
    parser.add_argument("--interval", type=int, default=15, help="Seconds between polls (default: 15)")
    args = parser.parse_args()

    if args.once:
        asyncio.run(poll_and_process())
    else:
        asyncio.run(poll_loop(args.interval))
