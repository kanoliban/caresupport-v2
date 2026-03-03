#!/usr/bin/env bash
set -euo pipefail

SRC="${1:-/Users/libankano/Desktop/CareSupport.com/CareSupport-original}"
DST="${2:-$(cd "$(dirname "$0")/.." && pwd)}"
BRANCH="${3:-import/local-v2}"

if [[ ! -d "$SRC" ]]; then
  echo "Source path not found: $SRC" >&2
  exit 1
fi

if [[ ! -d "$DST/.git" ]]; then
  echo "Destination repo not found: $DST" >&2
  exit 1
fi

offloaded_count="$(find "$SRC" -flags +dataless | wc -l | tr -d ' ')"
if [[ "$offloaded_count" != "0" ]]; then
  echo "Blocked: source contains ${offloaded_count} offloaded (dataless) files." >&2
  echo "In Finder, run 'Download Now' on: $SRC" >&2
  echo "Then rerun this script." >&2
  exit 2
fi

cd "$DST"
git checkout "$BRANCH"

rsync -a --delete \
  --exclude '.git' \
  --exclude '.DS_Store' \
  --exclude 'v2/node_modules' \
  "$SRC"/ "$DST"/

git add -A
if git diff --cached --quiet; then
  echo "No changes to commit."
  exit 0
fi

stamp="$(date '+%Y-%m-%d %H:%M:%S %Z')"
git commit -m "Import local CareSupport state (${stamp})"
git push -u origin "$BRANCH"

echo "Import complete. Open PR from ${BRANCH} -> main."
