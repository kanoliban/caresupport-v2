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


# ─── SDK path injection ─────────────────────────────────────────────────

def ensure_sdk_path():
    """Add SDK to sys.path if not already present."""
    import sys
    sdk_str = str(SDK_DIR)
    if sdk_str not in sys.path:
        sys.path.insert(0, sdk_str)
