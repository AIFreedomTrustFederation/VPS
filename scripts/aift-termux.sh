#!/usr/bin/env bash
set -Eeuo pipefail

MODE="${1:-join}"
NODE_NAME="${NODE_NAME:-}"
NODE_DISPLAY="${NODE_DISPLAY:-}"
APP_PORT="${APP_PORT:-}"

say() { printf '\n[AIFT] %s\n' "$*"; }

if [ "$MODE" = "primary" ]; then
  export NODE_NAME="${NODE_NAME:-sacramento-node-001}"
  export NODE_DISPLAY="${NODE_DISPLAY:-Sacramento Node 001}"
  export APP_PORT="${APP_PORT:-3000}"
  say "Starting primary Termux provider node"
  exec bash <(curl -fsSL https://raw.githubusercontent.com/AIFreedomTrustFederation/VPS/main/scripts/termux-phone-provider-node.sh)
fi

if [ "$MODE" = "join" ]; then
  export NODE_NAME="${NODE_NAME:-termux-node-$(date +%H%M)}"
  export NODE_DISPLAY="${NODE_DISPLAY:-Termux Node $NODE_NAME}"
  export APP_PORT="${APP_PORT:-3001}"
  say "Starting join Termux provider node"
  exec bash <(curl -fsSL https://raw.githubusercontent.com/AIFreedomTrustFederation/VPS/main/scripts/termux-join-provider-node-zip.sh)
fi

cat <<EOF
Usage:

Primary node:
  bash aift-termux.sh primary

Join node:
  NODE_NAME=termux-node-002 NODE_DISPLAY="Termux Node 002" APP_PORT=3001 bash aift-termux.sh join
EOF
exit 1
