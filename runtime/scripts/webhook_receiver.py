"""
CareSupport Webhook Receiver
==============================
Receives real-time events from Linq's Partner API via webhooks.
Replaces poll_inbound.py's cron-based Twilio polling with push-based delivery.

CRITICAL: This module routes inbound messages through sms_handler.handle_sms(),
which means ALL enforcement is preserved:
  - role_filter pre-filters context by access level
  - phi_audit logs every PHI access
  - leakage post-check scans outbound messages
  - approval_pipeline gates medication/member changes

The handler doesn't care whether the message arrived via iMessage or SMS.
This module handles the transport differences; the handler handles the intelligence.

Usage:
    # Standalone test server
    python webhook_receiver.py --port 8080

    # Import as handler (for Vercel/Viktor Spaces/ASGI)
    from webhook_receiver import handle_webhook_event
"""

import json
import sys
import hmac
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent.parent / ".env")

sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent))
from config import linq, linq_paths, paths

from enforcement.phi_audit import PHIAuditLogger

_audit = PHIAuditLogger(log_dir=paths.logs)


# ─── Webhook Signature Verification ──────────────────────────────────────

def verify_signature(payload: bytes, timestamp: str, signature: str) -> bool:
    """Verify webhook authenticity using HMAC-SHA256.

    Rejects webhooks older than 5 minutes to prevent replay attacks.
    """
    secret = linq.webhook_signing_secret
    if not secret:
        return True  # No secret — skip verification (development only)

    try:
        webhook_time = int(timestamp)
        now = int(datetime.now(timezone.utc).timestamp())
        if abs(now - webhook_time) > 300:
            return False
    except (ValueError, TypeError):
        return False

    message = f"{timestamp}.{payload.decode('utf-8')}"
    expected = hmac.new(secret.encode(), message.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


# ─── Event Logging ────────────────────────────────────────────────────────

def _log_event(event_type: str, data: dict):
    """Log webhook event for audit trail."""
    now = datetime.now(timezone.utc)
    log_file = linq_paths.webhook_log(now.strftime("%Y-%m-%d"))
    log_file.parent.mkdir(parents=True, exist_ok=True)

    entry = {"timestamp": now.isoformat(), "event_type": event_type, "data": data}
    with open(log_file, "a") as f:
        f.write(json.dumps(entry) + "\n")


# ─── Field Extraction ─────────────────────────────────────────────────────

def _extract_sender_phone(event_data: dict) -> str:
    """Extract sender phone from webhook event (handles multiple V3 formats)."""
    for key in ("sender_handle", "from_handle"):
        handle = event_data.get(key, {})
        if handle and handle.get("handle"):
            return handle["handle"]
    msg = event_data.get("message", {})
    for key in ("sender_handle", "from_handle"):
        handle = msg.get(key, {})
        if handle and handle.get("handle"):
            return handle["handle"]
    return ""


def _extract_message_text(event_data: dict) -> str:
    """Extract text content from message event."""
    parts = event_data.get("parts", []) or event_data.get("message", {}).get("parts", [])
    return " ".join(p.get("value", "") for p in parts if p.get("type") == "text")


def _extract_chat_id(event_data: dict) -> str:
    return event_data.get("chat_id", "") or event_data.get("chat", {}).get("id", "")


def _extract_message_id(event_data: dict) -> str:
    return event_data.get("id", "") or event_data.get("message", {}).get("id", "")


def _extract_service(event_data: dict) -> str:
    return event_data.get("service", "") or event_data.get("message", {}).get("service", "unknown")


# ─── Deduplication ────────────────────────────────────────────────────────

def _load_processed_ids() -> set:
    path = linq_paths.processed_event_ids()
    if path.exists():
        try:
            with open(path) as f:
                return set(json.load(f).get("ids", []))
        except (json.JSONDecodeError, IOError):
            pass
    return set()


def _save_processed_ids(ids: set):
    path = linq_paths.processed_event_ids()
    path.parent.mkdir(parents=True, exist_ok=True)
    id_list = sorted(ids)[-1000:]
    with open(path, "w") as f:
        json.dump({"ids": id_list, "updated": datetime.now(timezone.utc).isoformat()}, f)


def _is_duplicate(event_id: str) -> bool:
    return event_id in _load_processed_ids()


def _mark_processed(event_id: str):
    ids = _load_processed_ids()
    ids.add(event_id)
    _save_processed_ids(ids)


# ─── Event Handlers ───────────────────────────────────────────────────────

async def _handle_message_received(event_data: dict) -> dict:
    """Handle inbound message — route through sms_handler WITH enforcement.

    This is the key integration point: the handler's full enforcement pipeline
    (role_filter, phi_audit, leakage check, approval_pipeline) runs on every
    inbound message regardless of whether it arrived via iMessage or SMS.
    """
    from sms_handler import handle_sms
    from linq_gateway import (send_message, start_typing, share_contact_card,
                               split_into_bubbles, send_message_sequence)

    sender_phone = _extract_sender_phone(event_data)
    message_text = _extract_message_text(event_data)
    chat_id = _extract_chat_id(event_data)
    message_id = _extract_message_id(event_data)
    service = _extract_service(event_data)

    _log_event("message.received", {
        "from": sender_phone, "chat_id": chat_id,
        "service": service, "text": message_text[:200],
    })

    if not sender_phone:
        return {"handled": False, "reason": "no sender phone"}

    # Start typing indicator (caregiver sees "..." while agent processes)
    if chat_id and service == "iMessage":
        try:
            await start_typing(chat_id)
        except Exception:
            pass  # Non-critical

    # Route through the EXISTING handler — enforcement is wired in
    result = await handle_sms(sender_phone, message_text)

    # Send response via Linq (split into natural bubbles)
    if result.get("success") and result.get("response") and chat_id:
        bubbles = split_into_bubbles(result["response"])
        send_results = await send_message_sequence(chat_id, bubbles)
        send_result = send_results[0] if send_results else {"success": False}

        if not send_result.get("success"):
            _log_event("message.send_failed", {
                "chat_id": chat_id, "error": send_result.get("error"),
            })

    # Handle outreach to other family members
    for outreach in result.get("needs_outreach", []):
        out_phone = outreach.get("phone", "")
        out_msg = outreach.get("message", "")
        if out_phone and out_msg:
            # Resolve outreach recipient's chat_id
            out_chat_id = _resolve_chat_id_for_phone(out_phone)
            if out_chat_id:
                await send_message(out_chat_id, out_msg)
            else:
                # First contact — create new chat
                from linq_gateway import create_chat
                cr = await create_chat(out_phone, out_msg)
                if cr.get("success") and cr.get("chat_id"):
                    _save_new_chat_id(out_phone, cr["chat_id"], cr.get("service", ""))

            # Audit outreach
            _audit.log_outreach_sent(
                family_id=result.get("member", {}).get("family_id", ""),
                from_phone=sender_phone,
                to_phone=out_phone,
                to_name=outreach.get("name", ""),
                purpose=out_msg[:200],
            )

    # Handle pending confirmations (send approval requests)
    for confirmation in result.get("pending_confirmations", []):
        for approver_phone in confirmation.get("approver_phones", []):
            approver_chat_id = _resolve_chat_id_for_phone(approver_phone)
            if approver_chat_id:
                await send_message(approver_chat_id, confirmation["confirmation_sms"])

    # Push contact card on first interaction (iMessage only)
    if chat_id and service == "iMessage":
        member = result.get("member")
        if member and not member.get("contact_card_sent"):
            try:
                await share_contact_card(chat_id)
            except Exception:
                pass

    # Save chat_id mapping if this is a new contact
    if chat_id and sender_phone:
        _save_new_chat_id(sender_phone, chat_id, service)

    return {"handled": True, "event": "message.received", "response_sent": bool(result.get("response"))}


async def _handle_message_read(event_data: dict) -> dict:
    """Handle read receipt — caregiver SAW the message."""
    _log_event("message.read", {
        "chat_id": _extract_chat_id(event_data),
        "message_id": _extract_message_id(event_data),
        "read_at": event_data.get("read_at", ""),
    })
    return {"handled": True, "event": "message.read"}


async def _handle_message_delivered(event_data: dict) -> dict:
    """Handle delivery confirmation — message hit the device."""
    _log_event("message.delivered", {
        "chat_id": _extract_chat_id(event_data),
        "message_id": _extract_message_id(event_data),
    })
    return {"handled": True, "event": "message.delivered"}


async def _handle_message_sent(event_data: dict) -> dict:
    """Handle outbound send confirmation (including which service delivered)."""
    _log_event("message.sent", {
        "chat_id": _extract_chat_id(event_data),
        "message_id": _extract_message_id(event_data),
        "service": _extract_service(event_data),
    })
    return {"handled": True, "event": "message.sent"}


async def _handle_message_failed(event_data: dict) -> dict:
    """Handle delivery failure — log for escalation."""
    _log_event("message.failed", {
        "chat_id": _extract_chat_id(event_data),
        "message_id": _extract_message_id(event_data),
        "error": event_data.get("error", {}),
    })
    # TODO: Send alert to coordinator via fallback channel
    return {"handled": True, "event": "message.failed"}


async def _handle_reaction_added(event_data: dict) -> dict:
    """Handle reaction/tapback — potential confirmation signal."""
    from reaction_handler import handle_reaction

    result = await handle_reaction(
        message_id=event_data.get("message_id", ""),
        reaction_type=event_data.get("type", ""),
        custom_emoji=event_data.get("custom_emoji", ""),
        sender_phone=event_data.get("handle", {}).get("handle", ""),
    )
    return result


async def _handle_reaction_removed(event_data: dict) -> dict:
    """Handle reaction removal."""
    _log_event("reaction.removed", event_data)
    return {"handled": True, "event": "reaction.removed"}


# ─── Chat ID Resolution Helpers ──────────────────────────────────────────

def _resolve_chat_id_for_phone(phone: str) -> str:
    """Look up the Linq chat_id for a phone number across all families."""
    families_dir = paths.families
    if not families_dir.exists():
        return ""
    for family_dir in families_dir.iterdir():
        routing_file = family_dir / "phone_routing.json"
        if not routing_file.exists():
            continue
        with open(routing_file) as f:
            routing = json.load(f)
        for member in routing.get("members", []):
            if member.get("phone") == phone and member.get("chat_id"):
                return member["chat_id"]
    return ""


def _save_new_chat_id(phone: str, chat_id: str, service: str):
    """Save a newly discovered chat_id to the member's routing entry."""
    families_dir = paths.families
    if not families_dir.exists():
        return
    for family_dir in families_dir.iterdir():
        routing_file = family_dir / "phone_routing.json"
        if not routing_file.exists():
            continue
        with open(routing_file) as f:
            routing = json.load(f)
        updated = False
        for member in routing.get("members", []):
            if member.get("phone") == phone and not member.get("chat_id"):
                member["chat_id"] = chat_id
                member["service"] = service
                member["first_contact"] = datetime.now(timezone.utc).isoformat()
                updated = True
        if updated:
            with open(routing_file, "w") as f:
                json.dump(routing, f, indent=2)
            return


# ─── Main Dispatcher ─────────────────────────────────────────────────────

EVENT_HANDLERS = {
    "message.received": _handle_message_received,
    "message.read": _handle_message_read,
    "message.delivered": _handle_message_delivered,
    "message.sent": _handle_message_sent,
    "message.failed": _handle_message_failed,
    "reaction.added": _handle_reaction_added,
    "reaction.removed": _handle_reaction_removed,
}

CHAT_EVENTS = {
    "chat.created", "chat.group_name_updated", "chat.group_icon_updated",
    "chat.typing_indicator.started", "chat.typing_indicator.stopped",
    "participant.added", "participant.removed",
}


async def handle_webhook_event(event_type: str, event_data: dict,
                                event_id: str = "") -> dict:
    """Main entry point: dispatch a webhook event to the appropriate handler."""
    if event_id:
        if _is_duplicate(event_id):
            return {"handled": False, "reason": "duplicate"}
        _mark_processed(event_id)

    if event_type in EVENT_HANDLERS:
        try:
            return await EVENT_HANDLERS[event_type](event_data)
        except ImportError as e:
            _log_event(event_type, {"warning": f"Handler not implemented: {e}"})
            return {"handled": False, "reason": f"handler_not_implemented: {e}"}
        except Exception as e:
            _log_event(f"{event_type}.error", {"error": str(e)})
            return {"handled": False, "error": str(e)}

    if event_type in CHAT_EVENTS:
        _log_event(event_type, event_data)
        return {"handled": True, "event": event_type}

    _log_event(f"unknown.{event_type}", event_data)
    return {"handled": False, "reason": f"unknown_event_type: {event_type}"}


# ─── HTTP Server (Development) ───────────────────────────────────────────

def _run_server(port: int = 8080):
    """Simple HTTP server for webhook development/testing."""
    import asyncio
    from http.server import HTTPServer, BaseHTTPRequestHandler

    class WebhookHandler(BaseHTTPRequestHandler):
        def do_POST(self):
            content_length = int(self.headers.get('Content-Length', 0))
            raw_body = self.rfile.read(content_length)

            timestamp = self.headers.get('X-Webhook-Timestamp', '')
            signature = self.headers.get('X-Webhook-Signature', '')

            if linq.webhook_signing_secret and not verify_signature(raw_body, timestamp, signature):
                self.send_response(401)
                self.end_headers()
                return

            try:
                event_data = json.loads(raw_body)
            except json.JSONDecodeError:
                self.send_response(400)
                self.end_headers()
                return

            event_type = self.headers.get('X-Webhook-Event', '')
            event_id = event_data.get("event_id", "")

            result = asyncio.get_event_loop().run_until_complete(
                handle_webhook_event(event_type, event_data, event_id)
            )

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())

        def log_message(self, format, *args):
            now = datetime.now(timezone.utc).strftime("%H:%M:%S")
            print(f"[{now}] {args[0]}")

    server = HTTPServer(('0.0.0.0', port), WebhookHandler)
    print(f"🔔 Webhook receiver on port {port}")
    print(f"   Signature verification: {'enabled' if linq.webhook_signing_secret else 'disabled'}")
    server.serve_forever()


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="CareSupport Webhook Receiver")
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()
    _run_server(args.port)
