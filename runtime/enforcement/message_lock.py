"""
Per-Family Message Lock — File-Based Serialization
====================================================
Prevents concurrent message processing for the same family.
Without this, two inbound messages arriving close together could
race on family.md reads and writes (Death 2: race conditions).

Mechanism:
    - Lock file at families/{id}/.lock
    - Contains: PID, timestamp, phone number being processed
    - Stale lock (>120s) → force acquire (crash recovery)
    - Context manager API: with family_lock(family_id):

Usage:
    from enforcement.message_lock import family_lock

    with family_lock("kano-tefera"):
        result = await handle_sms(from_phone, body)
"""

import json
import os
import threading
import time
from contextlib import contextmanager
from pathlib import Path

# ─── Configuration ────────────────────────────────────────────────────────

LOCK_STALE_SECONDS = 120      # Lock older than this = crashed process
LOCK_POLL_INTERVAL = 0.5      # Seconds between lock-check polls
LOCK_TIMEOUT = 30             # Max seconds to wait for a contended lock

# Thread-local reentrant tracking: family_ids held by this thread.
# Prevents deadlock when poll_inbound → handle_sms both call family_lock
# in the same thread. Different threads track independently.
_thread_local = threading.local()


def _get_held_locks() -> set:
    """Get the set of family_ids held by the current thread."""
    if not hasattr(_thread_local, "held_locks"):
        _thread_local.held_locks = set()
    return _thread_local.held_locks


class LockTimeout(Exception):
    """Raised when a lock cannot be acquired within the timeout period."""
    pass


class LockInfo:
    """Contents of a .lock file."""
    def __init__(self, pid: int, timestamp: float, phone: str):
        self.pid = pid
        self.timestamp = timestamp
        self.phone = phone

    def to_dict(self) -> dict:
        return {"pid": self.pid, "timestamp": self.timestamp, "phone": self.phone}

    @classmethod
    def from_dict(cls, data: dict) -> "LockInfo":
        return cls(
            pid=data.get("pid", 0),
            timestamp=data.get("timestamp", 0.0),
            phone=data.get("phone", ""),
        )

    def age(self) -> float:
        """Seconds since this lock was created."""
        return time.time() - self.timestamp

    def is_stale(self) -> bool:
        """True if this lock is older than LOCK_STALE_SECONDS."""
        return self.age() > LOCK_STALE_SECONDS


def _lock_path(family_id: str, families_dir: Path | None = None) -> Path:
    """Resolve the lock file path for a family."""
    if families_dir is None:
        # Default: use CARESUPPORT_ROOT/families/
        root = Path(os.environ.get("CARESUPPORT_ROOT", "/work"))
        families_dir = root / "families"
    return families_dir / family_id / ".lock"


def _read_lock(lock_file: Path) -> LockInfo | None:
    """Read and parse a lock file. Returns None if not found or corrupt."""
    if not lock_file.exists():
        return None
    try:
        data = json.loads(lock_file.read_text())
        return LockInfo.from_dict(data)
    except (json.JSONDecodeError, OSError):
        return None


def _write_lock(lock_file: Path, phone: str) -> LockInfo:
    """Write a lock file with current PID and timestamp."""
    lock_file.parent.mkdir(parents=True, exist_ok=True)
    info = LockInfo(pid=os.getpid(), timestamp=time.time(), phone=phone)
    lock_file.write_text(json.dumps(info.to_dict()))
    return info


def _release_lock(lock_file: Path):
    """Remove the lock file."""
    try:
        lock_file.unlink(missing_ok=True)
    except OSError:
        pass  # Best-effort release


def acquire_lock(
    family_id: str,
    phone: str = "",
    families_dir: Path | None = None,
    timeout: float = LOCK_TIMEOUT,
    poll_interval: float = LOCK_POLL_INTERVAL,
) -> LockInfo:
    """Acquire the lock for a family. Blocks until acquired or timeout.

    Args:
        family_id: The family directory name
        phone: Phone number being processed (for diagnostics)
        families_dir: Override the families directory (for testing)
        timeout: Max seconds to wait
        poll_interval: Seconds between polls

    Returns:
        LockInfo for the acquired lock

    Raises:
        LockTimeout: If the lock cannot be acquired within timeout
    """
    lock_file = _lock_path(family_id, families_dir)
    deadline = time.time() + timeout

    while True:
        existing = _read_lock(lock_file)

        if existing is None:
            # No lock — acquire immediately
            return _write_lock(lock_file, phone)

        if existing.is_stale():
            # Stale lock — crash recovery, force acquire
            return _write_lock(lock_file, phone)

        # Lock is held and fresh — wait
        if time.time() >= deadline:
            raise LockTimeout(
                f"Could not acquire lock for family '{family_id}' within {timeout}s. "
                f"Held by PID {existing.pid} processing {existing.phone} "
                f"(age: {existing.age():.1f}s)"
            )

        time.sleep(poll_interval)


def release_lock(family_id: str, families_dir: Path | None = None):
    """Release the lock for a family."""
    lock_file = _lock_path(family_id, families_dir)
    _release_lock(lock_file)


@contextmanager
def family_lock(
    family_id: str,
    phone: str = "",
    families_dir: Path | None = None,
    timeout: float = LOCK_TIMEOUT,
    poll_interval: float = LOCK_POLL_INTERVAL,
):
    """Context manager for per-family message serialization.

    Reentrant: if this process already holds the lock for this family
    (e.g., poll_inbound → handle_sms both call family_lock), the nested
    call is a no-op. Only the outermost call acquires and releases.

    Usage:
        with family_lock("kano-tefera", phone="+16517037981"):
            # Process message — guaranteed no concurrent processing
            result = await handle_sms(from_phone, body)
    """
    held = _get_held_locks()
    if family_id in held:
        # Already held by this thread — reentrant, just yield
        yield None
        return

    lock_info = acquire_lock(
        family_id,
        phone=phone,
        families_dir=families_dir,
        timeout=timeout,
        poll_interval=poll_interval,
    )
    held.add(family_id)
    try:
        yield lock_info
    finally:
        held.discard(family_id)
        release_lock(family_id, families_dir)
