"""
CareSupport Runtime Configuration
==================================
Single source of truth for all runtime paths and settings.
Every runtime script imports from here. No hardcoded paths.

Usage:
    from config import CONFIG, paths

    family_dir = paths.family_dir("kano")
    family_file = paths.family_file("kano")
"""

import json
import os
from pathlib import Path


# ─── Base paths ──────────────────────────────────────────────────────────
# All paths derived from CARESUPPORT_ROOT (defaults to /work for Viktor's env)

ROOT = Path(os.environ.get("CARESUPPORT_ROOT", "/work"))
SDK_DIR = ROOT / "sdk"
RUNTIME_DIR = Path(__file__).parent
SCRIPTS_DIR = RUNTIME_DIR / "scripts"


class Paths:
    """Resolved paths for all CareSupport data."""

    def __init__(self, root: Path):
        self.root = root
        self.families = root / "families"
        self.conversations = root / "conversations"
        self.logs = root / "logs"
        self.protocols = root / "protocols"

    def family_dir(self, family_id: str) -> Path:
        return self.families / family_id

    def family_file(self, family_id: str) -> Path:
        return self.families / family_id / "family.md"

    def phone_routing(self, family_id: str) -> Path:
        return self.families / family_id / "phone_routing.json"

    def conversation_log(self, phone: str, year_month: str) -> Path:
        return self.conversations / phone / f"{year_month}.log"

    def family_timeline(self, family_id: str, year_month: str) -> Path:
        return self.families / family_id / "timeline" / f"{year_month}.log"

    def phi_access_log(self, date_str: str) -> Path:
        return self.logs / date_str / "phi_access.log"

    def processed_sids(self) -> Path:
        return SCRIPTS_DIR / ".processed_sids.json"

    # ─── Learning paths ──────────────────────────────────────────────────

    @property
    def _learning_dir(self) -> Path:
        return RUNTIME_DIR / "learning"

    @property
    def lessons(self) -> Path:
        return self._learning_dir / "lessons.md"

    @property
    def capabilities(self) -> Path:
        return self._learning_dir / "capabilities.md"

    @property
    def skills_dir(self) -> Path:
        return self._learning_dir / "skills"

    @property
    def agent_root(self) -> Path:
        return RUNTIME_DIR.parent / "agent_root.md"


paths = Paths(ROOT)


# ─── Twilio config ───────────────────────────────────────────────────────

_twilio_config_path = SCRIPTS_DIR / "config.json"

if _twilio_config_path.exists():
    with open(_twilio_config_path) as f:
        _twilio = json.load(f)
else:
    _twilio = {}


class TwilioConfig:
    """Twilio account and phone configuration."""
    account_sid: str = _twilio.get("twilio_account_sid", "")
    phone_number: str = _twilio.get("caresupport_phone", "")
    phone_sid: str = _twilio.get("twilio_phone_sid", "")
    base_url: str = f"https://api.twilio.com/2010-04-01/Accounts/{_twilio.get('twilio_account_sid', '')}"


twilio = TwilioConfig()


# ─── Linq config (iMessage-first, primary transport) ─────────────────────

_linq_config_path = SCRIPTS_DIR / "linq_config.json"

if _linq_config_path.exists():
    with open(_linq_config_path) as f:
        _linq = json.load(f)
else:
    _linq = {}


class LinqConfig:
    """Linq Partner API V3 configuration (iMessage-first messaging)."""
    api_token: str = _linq.get("linq_api_token", os.environ.get("LINQ_API_TOKEN", ""))
    phone_number: str = _linq.get("linq_phone", os.environ.get("LINQ_PHONE", ""))
    base_url: str = _linq.get("base_url", "https://api.linqapp.com/api/partner/v3")
    webhook_signing_secret: str = _linq.get("webhook_signing_secret", os.environ.get("LINQ_WEBHOOK_SECRET", ""))


linq = LinqConfig()


# ─── Extended paths for Linq/iMessage pipeline ──────────────────────────

class _ExtendedPaths:
    """Additional paths for chat-based (Linq) conversations and webhooks."""

    @staticmethod
    def chat_conversation_log(chat_id: str, year_month: str) -> Path:
        """Conversation log keyed by Linq chat_id (preferred over phone)."""
        return paths.conversations / "chats" / chat_id / f"{year_month}.log"

    @staticmethod
    def webhook_log(date_str: str) -> Path:
        """Daily webhook event log."""
        return paths.logs / "webhooks" / f"{date_str}.jsonl"

    @staticmethod
    def reaction_log(date_str: str) -> Path:
        """Daily reaction event log."""
        return paths.logs / "reactions" / f"{date_str}.jsonl"

    @staticmethod
    def processed_event_ids() -> Path:
        """Deduplication tracking for webhook events."""
        return SCRIPTS_DIR / ".processed_event_ids.json"


linq_paths = _ExtendedPaths()


# ─── SDK path injection ─────────────────────────────────────────────────

def ensure_sdk_path():
    """Add SDK to sys.path if not already present."""
    import sys
    sdk_str = str(SDK_DIR)
    if sdk_str not in sys.path:
        sys.path.insert(0, sdk_str)
