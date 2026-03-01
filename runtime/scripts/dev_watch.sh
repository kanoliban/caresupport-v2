#!/usr/bin/env bash
# Dev-only: restart poller on code changes
# Usage: ./dev_watch.sh [poll_interval]
# Watches .py files in this directory; restarts poll_inbound.py on change.

DIR="$(cd "$(dirname "$0")" && pwd)"
INTERVAL="${1:-15}"

cleanup() { kill "$PID" 2>/dev/null; wait "$PID" 2>/dev/null; exit 0; }
trap cleanup INT TERM

while true; do
  python3 "$DIR/poll_inbound.py" --interval "$INTERVAL" &
  PID=$!
  echo "[dev_watch] Poller started (PID $PID, interval ${INTERVAL}s)"

  # Block until a .py file changes (stat-based, no external deps)
  BEFORE=$(find "$DIR" -name "*.py" -exec stat -f '%m' {} + | md5)
  while sleep 2; do
    AFTER=$(find "$DIR" -name "*.py" -exec stat -f '%m' {} + | md5)
    [ "$BEFORE" != "$AFTER" ] && break
    BEFORE="$AFTER"
  done

  echo "[dev_watch] Code change detected, restarting poller..."
  kill "$PID" 2>/dev/null
  wait "$PID" 2>/dev/null
done
