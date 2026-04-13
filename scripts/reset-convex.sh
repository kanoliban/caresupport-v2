#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-}"

if [[ "$TARGET" != "dev" && "$TARGET" != "prod" ]]; then
  echo "Usage: scripts/reset-convex.sh <dev|prod>"
  exit 1
fi

if [[ -z "${CONVEX_OVERRIDE_ACCESS_TOKEN:-}" && -f "$HOME/.convex/config.json" ]]; then
  export CONVEX_OVERRIDE_ACCESS_TOKEN="$(
    node -e "const fs=require('fs');const p=process.env.HOME + '/.convex/config.json';const data=JSON.parse(fs.readFileSync(p,'utf8'));process.stdout.write(data.accessToken || '')"
  )"
fi

if [[ "$TARGET" == "prod" ]]; then
  DEPLOYMENT_NAME="$(
    sed -n 's/^export CONVEX_DEPLOYMENT="prod:\([^"]*\)".*/\1/p' .envrc
  )"
else
  DEPLOYMENT_NAME="$(
    sed -n 's/^CONVEX_DEPLOYMENT=dev:\([^[:space:]#]*\).*/\1/p' .env.local
  )"
fi

if [[ -z "$DEPLOYMENT_NAME" ]]; then
  echo "Could not determine Convex deployment name for $TARGET"
  exit 1
fi

echo "Resetting Convex app data for $TARGET..."
npx convex run admin:clearAppData --deployment-name "$DEPLOYMENT_NAME"
echo "Reset complete for $TARGET."
