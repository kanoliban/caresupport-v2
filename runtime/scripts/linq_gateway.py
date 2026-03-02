"""
CareSupport Linq Gateway (iMessage-First)
==========================================
Sends and receives messages through Linq's Partner API V3.
Supports iMessage (primary), RCS, and SMS (fallback).

All configuration loaded from runtime/config.py — no hardcoded paths or tokens.

Usage:
    python linq_gateway.py send --chat-id "uuid" --body "Hello"
    python linq_gateway.py create --to "+16517037981" --body "Welcome to CareSupport"
    python linq_gateway.py phones
    python linq_gateway.py typing --chat-id "uuid"
    python linq_gateway.py react --message-id "uuid" --type "love"
"""

import asyncio
import json
import sys
import hmac
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# Use shared config — no hardcoded paths or tokens
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import linq


# ─── HTTP Client ──────────────────────────────────────────────────────────

def _headers() -> dict:
    return {
        "Authorization": f"Bearer {linq.api_token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


async def _request(method: str, path: str, body: Optional[dict] = None,
                   query_params: Optional[dict] = None) -> dict:
    """Make an authenticated request to the Linq API."""
    import urllib.request
    import urllib.parse
    import urllib.error

    url = f"{linq.base_url}{path}"
    if query_params:
        url += "?" + urllib.parse.urlencode(query_params)

    headers = _headers()
    req_body = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=req_body, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode()
            data = json.loads(raw) if raw else {}
            return {"status": resp.status, "data": data, "trace_id": data.get("trace_id", "")}
    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if e.fp else "{}"
        try:
            data = json.loads(error_body)
        except json.JSONDecodeError:
            data = {"error": error_body}
        return {"status": e.code, "data": data, "trace_id": ""}


# ─── Chat Operations ─────────────────────────────────────────────────────

async def create_chat(to_phone: str, initial_message: str,
                      from_phone: str = "",
                      preferred_service: Optional[str] = None,
                      effect: Optional[dict] = None) -> dict:
    """Create a new chat and send an initial message.

    Args:
        to_phone: Recipient phone in E.164 format
        initial_message: Text of the first message
        from_phone: Sender (defaults to configured Linq Blue number)
        preferred_service: "iMessage", "RCS", "SMS", or None (auto fallback)
    """
    body = {
        "from": from_phone or linq.phone_number,
        "to": [to_phone],
        "message": {"parts": [{"type": "text", "value": initial_message}]}
    }
    if preferred_service:
        body["message"]["preferred_service"] = preferred_service
    if effect:
        body["message"]["effect"] = effect

    result = await _request("POST", "/chats", body=body)

    if result["status"] in (200, 201):
        chat = result["data"].get("chat", {})
        msg = chat.get("message", {})
        return {
            "success": True,
            "chat_id": chat.get("id"),
            "message_id": msg.get("id"),
            "service": msg.get("service", "unknown"),
        }
    return {"success": False, "error": result["data"], "status": result["status"]}


async def list_chats(from_phone: str = "", limit: int = 20, cursor: str = "") -> dict:
    """List all chats for a phone number."""
    params = {"from": from_phone or linq.phone_number, "limit": str(limit)}
    if cursor:
        params["cursor"] = cursor
    result = await _request("GET", "/chats", query_params=params)
    if result["status"] == 200:
        return {"success": True, "chats": result["data"].get("chats", []),
                "next_cursor": result["data"].get("next_cursor")}
    return {"success": False, "error": result["data"]}


async def get_chat(chat_id: str) -> dict:
    """Get a specific chat by ID."""
    result = await _request("GET", f"/chats/{chat_id}")
    if result["status"] == 200:
        return {"success": True, "chat": result["data"]}
    return {"success": False, "error": result["data"]}


# ─── Message Operations ──────────────────────────────────────────────────

async def send_message(chat_id: str, text: str,
                       preferred_service: Optional[str] = None,
                       effect: Optional[dict] = None,
                       reply_to_message_id: Optional[str] = None,
                       media_url: Optional[str] = None,
                       attachment_id: Optional[str] = None) -> dict:
    """Send a message to an existing chat.

    Args:
        chat_id: UUID of the chat
        text: Message text
        preferred_service: "iMessage", "RCS", "SMS", or None (auto fallback)
        effect: iMessage screen effect (e.g., {"type": "screen", "name": "confetti"})
        reply_to_message_id: UUID of message to reply to (iMessage threading)
        media_url: URL of media to attach (up to 10MB)
        attachment_id: Pre-uploaded attachment ID (up to 100MB)
    """
    parts = []
    if text:
        parts.append({"type": "text", "value": text})
    if media_url:
        parts.append({"type": "media", "url": media_url})
    if attachment_id:
        parts.append({"type": "media", "attachment_id": attachment_id})

    message = {"parts": parts}
    if preferred_service:
        message["preferred_service"] = preferred_service
    if effect:
        message["effect"] = effect
    if reply_to_message_id:
        message["reply_to"] = {"message_id": reply_to_message_id, "part_index": 0}

    result = await _request("POST", f"/chats/{chat_id}/messages", body={"message": message})

    if result["status"] in (200, 201, 202):
        msg = result["data"].get("message", result["data"])
        return {
            "success": True,
            "message_id": msg.get("id"),
            "service": msg.get("service", "unknown"),
            "delivery_status": msg.get("delivery_status", "pending"),
        }
    return {"success": False, "error": result["data"], "status": result["status"]}


import re as _re


def split_into_bubbles(text: str, max_len: int = 450, min_len: int = 40) -> list[str]:
    """Split a message into natural bubbles for sequential sending.

    1. Split on paragraph breaks (\\n\\n) — always respected
    2. If any paragraph > max_len, split on sentence boundaries
    3. Merge tiny sentence fragments (< min_len) back into previous sentence group
    4. Cap at 5 bubbles; merge remainder into last
    """
    text = text.strip()
    if not text:
        return []

    paragraphs = [s.strip() for s in text.split("\n\n") if s.strip()]

    bubbles: list[str] = []
    for para in paragraphs:
        if len(para) <= max_len:
            bubbles.append(para)
            continue
        # Oversized paragraph: split on sentence boundaries
        sentences = _re.split(r"(?<=[.?!])\s+", para)
        current = ""
        for sentence in sentences:
            if current and len(current) + len(sentence) + 1 > max_len:
                bubbles.append(current.strip())
                current = sentence
            else:
                current = f"{current} {sentence}".strip() if current else sentence
        if current:
            if bubbles and len(current.strip()) < min_len:
                bubbles[-1] = f"{bubbles[-1]} {current.strip()}"
            else:
                bubbles.append(current.strip())

    # Cap at 5 bubbles
    if len(bubbles) > 5:
        tail = "\n\n".join(bubbles[4:])
        bubbles = bubbles[:4] + [tail]

    return bubbles or [text]


async def send_message_sequence(chat_id: str, bubbles: list[str],
                                delay: float = 0.8) -> list[dict]:
    """Send bubbles sequentially with typing indicators between them."""
    results = []
    for i, bubble in enumerate(bubbles):
        if i > 0:
            try:
                await start_typing(chat_id)
            except Exception:
                pass
            await asyncio.sleep(delay)
        try:
            result = await send_message(chat_id, bubble)
            results.append(result)
        except Exception as e:
            results.append({"success": False, "error": str(e)})
    return results


async def get_messages(chat_id: str, limit: int = 50, cursor: str = "") -> dict:
    """Get messages from a chat."""
    params = {"limit": str(limit)}
    if cursor:
        params["cursor"] = cursor
    result = await _request("GET", f"/chats/{chat_id}/messages", query_params=params)
    if result["status"] == 200:
        return {"success": True, "messages": result["data"].get("messages", [])}
    return {"success": False, "error": result["data"]}


# ─── Reactions ────────────────────────────────────────────────────────────

async def add_reaction(message_id: str, reaction_type: str = "love",
                       custom_emoji: str = "", part_index: int = 0) -> dict:
    """Add a reaction to a message.

    Types: love, like, dislike, laugh, emphasize, question, custom.
    """
    body = {"operation": "add", "type": reaction_type}
    if reaction_type == "custom" and custom_emoji:
        body["custom_emoji"] = custom_emoji
    if part_index > 0:
        body["part_index"] = part_index
    result = await _request("POST", f"/messages/{message_id}/reactions", body=body)
    return {"success": result["status"] == 200}


async def remove_reaction(message_id: str, reaction_type: str = "love") -> dict:
    """Remove a reaction from a message."""
    body = {"operation": "remove", "type": reaction_type}
    result = await _request("POST", f"/messages/{message_id}/reactions", body=body)
    return {"success": result["status"] == 200}


# ─── Typing Indicators ───────────────────────────────────────────────────

async def start_typing(chat_id: str) -> dict:
    """Start typing indicator (1:1 iMessage chats only)."""
    result = await _request("POST", f"/chats/{chat_id}/typing")
    return {"success": result["status"] == 204}


async def stop_typing(chat_id: str) -> dict:
    """Stop typing indicator."""
    result = await _request("DELETE", f"/chats/{chat_id}/typing")
    return {"success": result["status"] == 204}


# ─── Read Receipts ────────────────────────────────────────────────────────

async def mark_as_read(chat_id: str) -> dict:
    """Mark all messages in a chat as read."""
    result = await _request("POST", f"/chats/{chat_id}/read")
    return {"success": result["status"] == 204}


# ─── Contact Card ─────────────────────────────────────────────────────────

async def share_contact_card(chat_id: str) -> dict:
    """Push branded contact card (iMessage-exclusive)."""
    result = await _request("POST", f"/chats/{chat_id}/share_contact_card")
    return {"success": result["status"] in (200, 204)}


# ─── Voice Memos ──────────────────────────────────────────────────────────

async def send_voice_memo(chat_id: str, voice_memo_url: str,
                          from_phone: str = "") -> dict:
    """Send a voice memo with native iMessage playback UI.

    Supported: MP3, M4A, AAC, CAF, WAV, AIFF, AMR (max 10MB).
    """
    body = {"from": from_phone or linq.phone_number, "voice_memo_url": voice_memo_url}
    result = await _request("POST", f"/chats/{chat_id}/voicememo", body=body)
    return {"success": result["status"] in (200, 202), "data": result["data"]}


# ─── Group Chat ───────────────────────────────────────────────────────────

async def add_participant(chat_id: str, handle: str) -> dict:
    """Add a participant to a group chat (3+ existing required)."""
    result = await _request("POST", f"/chats/{chat_id}/participants", body={"handle": handle})
    return {"success": result["status"] in (200, 202)}


async def remove_participant(chat_id: str, handle: str) -> dict:
    """Remove a participant from a group chat."""
    result = await _request("DELETE", f"/chats/{chat_id}/participants", body={"handle": handle})
    return {"success": result["status"] in (200, 202)}


# ─── Attachments ──────────────────────────────────────────────────────────

async def pre_upload_attachment(filename: str, content_type: str, size_bytes: int) -> dict:
    """Pre-upload a file (>10MB, up to 100MB). Returns upload_url and attachment_id."""
    body = {"filename": filename, "content_type": content_type, "size_bytes": size_bytes}
    result = await _request("POST", "/attachments", body=body)
    if result["status"] in (200, 201):
        return {
            "success": True,
            "upload_url": result["data"].get("upload_url"),
            "attachment_id": result["data"].get("attachment_id"),
        }
    return {"success": False, "error": result["data"]}


# ─── Phone Numbers ────────────────────────────────────────────────────────

async def list_phone_numbers() -> dict:
    """List all phone numbers assigned to this account."""
    result = await _request("GET", "/phonenumbers")
    if result["status"] == 200:
        return {"success": True, "phone_numbers": result["data"].get("phone_numbers", [])}
    return {"success": False, "error": result["data"]}


# ─── Webhook Management ──────────────────────────────────────────────────

async def list_webhook_subscriptions() -> dict:
    """List all webhook subscriptions."""
    result = await _request("GET", "/webhook-subscriptions")
    if result["status"] == 200:
        return {"success": True, "subscriptions": result["data"].get("subscriptions", [])}
    return {"success": False, "error": result["data"]}


async def create_webhook_subscription(target_url: str, events: list[str],
                                       version: str = "2026-02-03") -> dict:
    """Create a webhook subscription. Store the returned signing_secret securely."""
    versioned_url = f"{target_url}{'&' if '?' in target_url else '?'}version={version}"
    body = {"target_url": versioned_url, "subscribed_events": events}
    result = await _request("POST", "/webhook-subscriptions", body=body)
    if result["status"] in (200, 201):
        sub = result["data"]
        return {
            "success": True,
            "subscription_id": sub.get("id"),
            "signing_secret": sub.get("signing_secret", ""),
        }
    return {"success": False, "error": result["data"]}


async def delete_webhook_subscription(subscription_id: str) -> dict:
    """Delete a webhook subscription."""
    result = await _request("DELETE", f"/webhook-subscriptions/{subscription_id}")
    return {"success": result["status"] in (200, 204)}


# ─── Webhook Verification ────────────────────────────────────────────────

def verify_webhook_signature(payload: bytes, timestamp: str, signature: str) -> bool:
    """Verify webhook authenticity using HMAC-SHA256.

    Uses signing_secret from config (set during webhook subscription creation).
    """
    secret = linq.webhook_signing_secret
    if not secret:
        return True  # No secret configured — skip verification (development only)

    message = f"{timestamp}.{payload.decode('utf-8')}"
    expected = hmac.new(secret.encode(), message.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


# ─── CLI ──────────────────────────────────────────────────────────────────

async def _cli():
    import argparse
    parser = argparse.ArgumentParser(description="CareSupport Linq Gateway")
    sub = parser.add_subparsers(dest="command")

    p = sub.add_parser("create", help="Create a new chat")
    p.add_argument("--to", required=True)
    p.add_argument("--body", required=True)
    p.add_argument("--service", choices=["iMessage", "RCS", "SMS"])

    p = sub.add_parser("send", help="Send to existing chat")
    p.add_argument("--chat-id", required=True)
    p.add_argument("--body", required=True)

    sub.add_parser("list-chats", help="List all chats")
    sub.add_parser("phones", help="List phone numbers")

    p = sub.add_parser("typing", help="Start typing indicator")
    p.add_argument("--chat-id", required=True)

    p = sub.add_parser("react", help="React to a message")
    p.add_argument("--message-id", required=True)
    p.add_argument("--type", default="love")

    sub.add_parser("webhooks", help="List webhook subscriptions")

    args = parser.parse_args()

    if args.command == "create":
        print(json.dumps(await create_chat(args.to, args.body, preferred_service=args.service), indent=2))
    elif args.command == "send":
        print(json.dumps(await send_message(args.chat_id, args.body), indent=2))
    elif args.command == "list-chats":
        r = await list_chats()
        for c in r.get("chats", []):
            print(f"  [{c.get('service','?')}] {c['id'][:8]}... → {c.get('display_name','?')}")
    elif args.command == "phones":
        r = await list_phone_numbers()
        for p in r.get("phone_numbers", []):
            print(f"  {p['phone_number']} ({p.get('type','?')}) — {p.get('status','?')}")
    elif args.command == "typing":
        print(json.dumps(await start_typing(args.chat_id), indent=2))
    elif args.command == "react":
        print(json.dumps(await add_reaction(args.message_id, args.type), indent=2))
    elif args.command == "webhooks":
        r = await list_webhook_subscriptions()
        for s in r.get("subscriptions", []):
            status = "✅" if s.get("is_active") else "❌"
            print(f"  {s['id'][:8]}... → {s.get('target_url','?')} ({status})")
    else:
        parser.print_help()


if __name__ == "__main__":
    asyncio.run(_cli())
