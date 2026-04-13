#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-}"

if [[ "$TARGET" != "dev" && "$TARGET" != "prod" ]]; then
  echo "Usage: scripts/reset-convex.sh <dev|prod>"
  exit 1
fi

EMPTY_JSON="$(mktemp)"
trap 'rm -f "$EMPTY_JSON"' EXIT
printf '[]' > "$EMPTY_JSON"

TABLES=(
  families
  members
  messages
  medications
  scheduleItems
  approvals
  auditLogs
  lessons
  careTeam
  outreachThreads
)

PROD_FLAG=()
if [[ "$TARGET" == "prod" ]]; then
  PROD_FLAG=(--prod)
fi

echo "Resetting Convex tables for $TARGET..."
for table in "${TABLES[@]}"; do
  echo "  - $table"
  npx convex import --table "$table" --replace "${PROD_FLAG[@]}" -y "$EMPTY_JSON"
done

echo "Reset complete for $TARGET."
