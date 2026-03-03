#!/usr/bin/env bash
set -euo pipefail

SRC="${1:-/Users/libankano/Desktop/CareSupport.com/CareSupport-original}"
REPO_ROOT="${2:-$(cd "$(dirname "$0")/.." && pwd)}"
BRANCH="${3:-import/local-v2}"
LOG="${4:-$REPO_ROOT/logs/watch_and_import_local_v2.log}"

IMPORT_SCRIPT="$REPO_ROOT/scripts/import_local_v2.sh"
mkdir -p "$(dirname "$LOG")"

echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] watch started" >> "$LOG"
echo "src=$SRC repo_root=$REPO_ROOT branch=$BRANCH" >> "$LOG"

while true; do
  count="$(find "$SRC" -flags +dataless | wc -l | tr -d ' ')"
  echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] dataless=$count" >> "$LOG"

  if [[ "$count" == "0" ]]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] hydration complete, importing" >> "$LOG"
    "$IMPORT_SCRIPT" "$SRC" "$REPO_ROOT" "$BRANCH" >> "$LOG" 2>&1

    cd "$REPO_ROOT"
    if ! gh pr view "$BRANCH" --json number >/dev/null 2>&1; then
      gh pr create \
        --base main \
        --head "$BRANCH" \
        --title "Import local CareSupport v2 state" \
        --body "Automated import from local source after iCloud hydration completed." \
        >> "$LOG" 2>&1
    fi

    echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] completed" >> "$LOG"
    exit 0
  fi

  sleep 60
done
