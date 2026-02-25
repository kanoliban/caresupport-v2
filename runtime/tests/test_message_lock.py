"""
Tests for per-family message lock — file-based serialization.

Covers: acquire, release, contention wait, crash recovery timeout,
context manager, concurrent safety, stale detection, lock info.
"""

import json
import os
import time
import threading
from pathlib import Path
from tempfile import TemporaryDirectory

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from enforcement.message_lock import (
    acquire_lock,
    release_lock,
    family_lock,
    LockInfo,
    LockTimeout,
    LOCK_STALE_SECONDS,
    _lock_path,
    _read_lock,
)


def _make_families_dir(tmp: str) -> Path:
    """Create a families dir inside a temp directory."""
    families = Path(tmp) / "families"
    families.mkdir(parents=True)
    (families / "test-family").mkdir()
    return families


# ═══════════════════════════════════════════════════════════════════════════
# TEST 1: Basic acquire and release
# ═══════════════════════════════════════════════════════════════════════════

def test_acquire_creates_lock_file():
    """Acquiring a lock creates the .lock file with correct contents."""
    with TemporaryDirectory() as tmp:
        families = _make_families_dir(tmp)
        lock_file = families / "test-family" / ".lock"

        assert not lock_file.exists()

        info = acquire_lock("test-family", phone="+1-555-0101", families_dir=families)

        assert lock_file.exists()
        assert info.pid == os.getpid()
        assert info.phone == "+1-555-0101"
        assert info.age() < 2  # Just created

        # Verify file contents are valid JSON
        data = json.loads(lock_file.read_text())
        assert data["pid"] == os.getpid()
        assert data["phone"] == "+1-555-0101"

        release_lock("test-family", families_dir=families)


# ═══════════════════════════════════════════════════════════════════════════
# TEST 2: Release removes lock file
# ═══════════════════════════════════════════════════════════════════════════

def test_release_removes_lock_file():
    """Releasing a lock removes the .lock file."""
    with TemporaryDirectory() as tmp:
        families = _make_families_dir(tmp)
        lock_file = families / "test-family" / ".lock"

        acquire_lock("test-family", families_dir=families)
        assert lock_file.exists()

        release_lock("test-family", families_dir=families)
        assert not lock_file.exists()


# ═══════════════════════════════════════════════════════════════════════════
# TEST 3: Contention — second acquire waits for release
# ═══════════════════════════════════════════════════════════════════════════

def test_contention_waits_for_release():
    """When a lock is held, a second acquire waits until it's released."""
    with TemporaryDirectory() as tmp:
        families = _make_families_dir(tmp)

        # First acquire
        acquire_lock("test-family", phone="+1-555-0101", families_dir=families)

        # Release after a short delay in another thread
        def delayed_release():
            time.sleep(0.3)
            release_lock("test-family", families_dir=families)

        t = threading.Thread(target=delayed_release)
        t.start()

        # Second acquire should wait and then succeed
        start = time.time()
        info = acquire_lock(
            "test-family",
            phone="+1-555-0202",
            families_dir=families,
            timeout=5,
            poll_interval=0.1,
        )
        elapsed = time.time() - start

        assert info.phone == "+1-555-0202"
        assert elapsed >= 0.2  # Had to wait
        assert elapsed < 3     # But not forever

        t.join()
        release_lock("test-family", families_dir=families)


# ═══════════════════════════════════════════════════════════════════════════
# TEST 4: Timeout — lock held too long raises LockTimeout
# ═══════════════════════════════════════════════════════════════════════════

def test_timeout_raises_lock_timeout():
    """If a lock is held and not released, acquire times out."""
    with TemporaryDirectory() as tmp:
        families = _make_families_dir(tmp)

        # Hold the lock (don't release)
        acquire_lock("test-family", phone="+1-555-0101", families_dir=families)

        try:
            acquire_lock(
                "test-family",
                phone="+1-555-0202",
                families_dir=families,
                timeout=0.5,
                poll_interval=0.1,
            )
            assert False, "Should have raised LockTimeout"
        except LockTimeout as e:
            assert "test-family" in str(e)
            assert "+1-555-0101" in str(e)  # Shows who's holding

        release_lock("test-family", families_dir=families)


# ═══════════════════════════════════════════════════════════════════════════
# TEST 5: Crash recovery — stale lock force-acquired
# ═══════════════════════════════════════════════════════════════════════════

def test_crash_recovery_force_acquires_stale_lock():
    """A lock older than LOCK_STALE_SECONDS is force-acquired (crash recovery)."""
    with TemporaryDirectory() as tmp:
        families = _make_families_dir(tmp)
        lock_file = families / "test-family" / ".lock"

        # Write a stale lock (pretend it's from a crashed process)
        stale_info = LockInfo(
            pid=99999,
            timestamp=time.time() - LOCK_STALE_SECONDS - 10,
            phone="+1-555-DEAD",
        )
        lock_file.write_text(json.dumps(stale_info.to_dict()))

        # Should force-acquire immediately (no waiting)
        start = time.time()
        info = acquire_lock("test-family", phone="+1-555-0101", families_dir=families)
        elapsed = time.time() - start

        assert info.pid == os.getpid()
        assert info.phone == "+1-555-0101"
        assert elapsed < 1  # Force-acquired, no polling wait

        release_lock("test-family", families_dir=families)


# ═══════════════════════════════════════════════════════════════════════════
# TEST 6: Context manager acquire and release
# ═══════════════════════════════════════════════════════════════════════════

def test_context_manager_acquires_and_releases():
    """The family_lock context manager acquires on enter, releases on exit."""
    with TemporaryDirectory() as tmp:
        families = _make_families_dir(tmp)
        lock_file = families / "test-family" / ".lock"

        assert not lock_file.exists()

        with family_lock("test-family", phone="+1-555-0101", families_dir=families) as info:
            assert lock_file.exists()
            assert info.pid == os.getpid()
            assert info.phone == "+1-555-0101"

        # After exiting context, lock should be released
        assert not lock_file.exists()


# ═══════════════════════════════════════════════════════════════════════════
# TEST 7: Context manager releases on exception
# ═══════════════════════════════════════════════════════════════════════════

def test_context_manager_releases_on_exception():
    """Lock is released even if the body raises an exception."""
    with TemporaryDirectory() as tmp:
        families = _make_families_dir(tmp)
        lock_file = families / "test-family" / ".lock"

        try:
            with family_lock("test-family", families_dir=families):
                assert lock_file.exists()
                raise ValueError("simulated crash")
        except ValueError:
            pass

        # Lock must be released despite the exception
        assert not lock_file.exists()


# ═══════════════════════════════════════════════════════════════════════════
# TEST 8: Concurrent safety — two threads serialize
# ═══════════════════════════════════════════════════════════════════════════

def test_concurrent_threads_serialize():
    """Two threads processing the same family serialize correctly."""
    with TemporaryDirectory() as tmp:
        families = _make_families_dir(tmp)
        results = []
        errors = []

        def worker(worker_id: str, phone: str):
            try:
                with family_lock(
                    "test-family",
                    phone=phone,
                    families_dir=families,
                    timeout=10,
                    poll_interval=0.05,
                ):
                    results.append(f"{worker_id}-start")
                    time.sleep(0.1)  # Simulate processing
                    results.append(f"{worker_id}-end")
            except Exception as e:
                errors.append(str(e))

        t1 = threading.Thread(target=worker, args=("A", "+1-555-0001"))
        t2 = threading.Thread(target=worker, args=("B", "+1-555-0002"))

        t1.start()
        time.sleep(0.02)  # Ensure A starts first
        t2.start()

        t1.join(timeout=15)
        t2.join(timeout=15)

        assert not errors, f"Errors: {errors}"
        assert len(results) == 4

        # Must be serialized: A-start, A-end, B-start, B-end
        # (or B-start, B-end, A-start, A-end if B got in first — 
        # but since A starts 20ms earlier, should be A first)
        # Key invariant: no interleaving (start-start-end-end)
        starts = [i for i, r in enumerate(results) if r.endswith("-start")]
        ends = [i for i, r in enumerate(results) if r.endswith("-end")]
        
        # First worker's end must come before second worker's start
        assert results[1].endswith("-end"), f"Expected serialization, got: {results}"
        assert results[2].endswith("-start"), f"Expected serialization, got: {results}"


# ═══════════════════════════════════════════════════════════════════════════
# TEST 9: Lock info round-trip
# ═══════════════════════════════════════════════════════════════════════════

def test_lock_info_roundtrip():
    """LockInfo serializes and deserializes correctly."""
    original = LockInfo(pid=12345, timestamp=1700000000.0, phone="+1-555-0101")
    data = original.to_dict()
    restored = LockInfo.from_dict(data)

    assert restored.pid == 12345
    assert restored.timestamp == 1700000000.0
    assert restored.phone == "+1-555-0101"


# ═══════════════════════════════════════════════════════════════════════════
# TEST 10: Stale detection threshold
# ═══════════════════════════════════════════════════════════════════════════

def test_stale_detection_boundary():
    """Lock exactly at stale boundary is not stale; over it is."""
    now = time.time()

    # Just under the threshold — not stale
    fresh = LockInfo(pid=1, timestamp=now - LOCK_STALE_SECONDS + 5, phone="")
    assert not fresh.is_stale()

    # Over the threshold — stale
    stale = LockInfo(pid=1, timestamp=now - LOCK_STALE_SECONDS - 5, phone="")
    assert stale.is_stale()


# ═══════════════════════════════════════════════════════════════════════════
# TEST 11: Different families don't contend
# ═══════════════════════════════════════════════════════════════════════════

def test_different_families_independent():
    """Locks for different families are independent — no contention."""
    with TemporaryDirectory() as tmp:
        families = Path(tmp) / "families"
        families.mkdir(parents=True)
        (families / "family-a").mkdir()
        (families / "family-b").mkdir()

        # Lock family A
        acquire_lock("family-a", phone="+1-555-0001", families_dir=families)

        # Should immediately acquire family B (no contention)
        start = time.time()
        info = acquire_lock("family-b", phone="+1-555-0002", families_dir=families)
        elapsed = time.time() - start

        assert info.phone == "+1-555-0002"
        assert elapsed < 0.5  # Immediate

        release_lock("family-a", families_dir=families)
        release_lock("family-b", families_dir=families)


# ═══════════════════════════════════════════════════════════════════════════
# TEST 12: Corrupt lock file is treated as no lock
# ═══════════════════════════════════════════════════════════════════════════

def test_reentrant_lock_does_not_deadlock():
    """Nested family_lock calls for the same family don't deadlock."""
    with TemporaryDirectory() as tmp:
        families = _make_families_dir(tmp)

        with family_lock("test-family", phone="+1-555-0001", families_dir=families) as outer:
            assert outer is not None  # First acquire returns LockInfo
            assert outer.phone == "+1-555-0001"

            # Nested call for the same family — should be a no-op (reentrant)
            with family_lock("test-family", phone="+1-555-0002", families_dir=families) as inner:
                assert inner is None  # Reentrant call yields None

        # After both exits, lock should be released
        lock_file = families / "test-family" / ".lock"
        assert not lock_file.exists()


def test_corrupt_lock_file_treated_as_no_lock():
    """A corrupt .lock file doesn't block acquisition."""
    with TemporaryDirectory() as tmp:
        families = _make_families_dir(tmp)
        lock_file = families / "test-family" / ".lock"

        # Write garbage to the lock file
        lock_file.write_text("not valid json {{{")

        # Should acquire immediately (corrupt = no lock)
        info = acquire_lock("test-family", phone="+1-555-0101", families_dir=families)
        assert info.pid == os.getpid()

        release_lock("test-family", families_dir=families)
