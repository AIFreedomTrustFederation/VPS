#!/usr/bin/env bash
set -Eeuo pipefail

NODE_NAME="${NODE_NAME:-termux-node}"
NODE_DISPLAY="${NODE_DISPLAY:-$NODE_NAME}"
APP_PORT="${APP_PORT:-3000}"
NODE_CLASS="${NODE_CLASS:-phone-experimental}"
AIFT_HOME="${AIFT_HOME:-$HOME/.aift-$NODE_NAME}"
REPO_DIR="${REPO_DIR:-$PWD}"

say() { printf '\n[AIFT VPS] %s\n' "$*"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd 2>/dev/null || pwd)"

HEARTBEAT_SCRIPT="$SCRIPT_DIR/aift-heartbeat.sh"
NODE_CARD_SCRIPT="$SCRIPT_DIR/aift-node-card.sh"

if [ ! -f "$HEARTBEAT_SCRIPT" ]; then
  HEARTBEAT_SCRIPT="$REPO_DIR/scripts/aift-heartbeat.sh"
fi

if [ ! -f "$NODE_CARD_SCRIPT" ]; then
  NODE_CARD_SCRIPT="$REPO_DIR/scripts/aift-node-card.sh"
fi

if [ ! -f "$HEARTBEAT_SCRIPT" ]; then
  HEARTBEAT_SCRIPT="$AIFT_HOME/aift-heartbeat.sh"
  mkdir -p "$AIFT_HOME"
  curl -fsSL https://raw.githubusercontent.com/AIFreedomTrustFederation/VPS/main/scripts/aift-heartbeat.sh -o "$HEARTBEAT_SCRIPT"
fi

if [ ! -f "$NODE_CARD_SCRIPT" ]; then
  NODE_CARD_SCRIPT="$AIFT_HOME/aift-node-card.sh"
  mkdir -p "$AIFT_HOME"
  curl -fsSL https://raw.githubusercontent.com/AIFreedomTrustFederation/VPS/main/scripts/aift-node-card.sh -o "$NODE_CARD_SCRIPT"
fi

chmod +x "$HEARTBEAT_SCRIPT" "$NODE_CARD_SCRIPT" 2>/dev/null || true

say "Writing heartbeat for $NODE_DISPLAY on port $APP_PORT"
NODE_NAME="$NODE_NAME" NODE_DISPLAY="$NODE_DISPLAY" APP_PORT="$APP_PORT" NODE_CLASS="$NODE_CLASS" AIFT_HOME="$AIFT_HOME" bash "$HEARTBEAT_SCRIPT"

say "Exporting node card for $NODE_DISPLAY"
NODE_NAME="$NODE_NAME" NODE_DISPLAY="$NODE_DISPLAY" APP_PORT="$APP_PORT" AIFT_HOME="$AIFT_HOME" bash "$NODE_CARD_SCRIPT" export > "$AIFT_HOME/node-cards/$NODE_NAME.card"
cat "$AIFT_HOME/node-cards/$NODE_NAME.card"

say "Discovery files"
printf 'Heartbeat: %s\n' "$AIFT_HOME/heartbeats/$NODE_NAME.json"
printf 'Node card: %s\n' "$AIFT_HOME/node-cards/$NODE_NAME.card"
printf 'Dashboard: http://127.0.0.1:%s/discovered-nodes\n' "$APP_PORT"
