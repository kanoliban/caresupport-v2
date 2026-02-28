"""
Session management — lightweight in-memory sessions for CareSupport.

A session groups messages from the same member within a time window,
enabling prompt cache reuse across consecutive messages.

Sessions live in the poller process memory. No persistence needed —
cache TTL (5 min) matches session TTL, so stale sessions have no
cached prefix to reuse anyway.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field

SESSION_TTL = 300  # 5 minutes — matches Claude's cache expiry


@dataclass
class Session:
    session_id: str
    member_phone: str
    family_id: str
    created_at: float
    last_active: float
    message_count: int = 1


_sessions: dict[str, Session] = {}


def get_or_create(member_phone: str, family_id: str, ttl: int = SESSION_TTL) -> Session:
    """Return an active session or create a new one.

    Key is member_phone. Session expires after `ttl` seconds of inactivity.
    """
    existing = _sessions.get(member_phone)
    if existing and (time.time() - existing.last_active) < ttl:
        existing.last_active = time.time()
        existing.message_count += 1
        return existing

    session = Session(
        session_id=f"{member_phone}_{int(time.time())}",
        member_phone=member_phone,
        family_id=family_id,
        created_at=time.time(),
        last_active=time.time(),
    )
    _sessions[member_phone] = session
    return session


def get_active_count() -> int:
    """Return count of sessions active within TTL."""
    now = time.time()
    return sum(1 for s in _sessions.values() if (now - s.last_active) < SESSION_TTL)
