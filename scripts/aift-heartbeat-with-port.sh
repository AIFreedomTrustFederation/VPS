#!/usr/bin/env bash
set -Eeuo pipefail

NODE_NAME="${NODE_NAME:-termux-node}"
NODE_DISPLAY="${NODE_DISPLAY:-$NODE_NAME}"
NODE_CLASS="${NODE_CLASS:-phone-experimental}"
AIFT_HOME="${AIFT_HOME:-$HOME/.aift-$NODE_NAME}"
LEASE_FILE="${PORT_LEASE_FILE:-$AIFT_HOME/runtime/ports/dashboard.json}"
APP_PORT="${APP_PORT:-3000}"

if [ -f "$LEASE_FILE" ]; then
  PORT_FROM_FILE="$(grep -m1 '"assigned_port"' "$LEASE_FILE" | sed 's/[^0-9]//g' || true)"
  if [ -n "$PORT_FROM_FILE" ]; then
    APP_PORT="$PORT_FROM_FILE"
  fi
fi

export NODE_NAME NODE_DISPLAY NODE_CLASS AIFT_HOME APP_PORT
bash "$(dirname "$0")/aift-heartbeat.sh"
