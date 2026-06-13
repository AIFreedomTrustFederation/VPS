#!/usr/bin/env bash
set -Eeuo pipefail

NODE_NAME="${NODE_NAME:-termux-node}"
NODE_DISPLAY="${NODE_DISPLAY:-$NODE_NAME}"
APP_PORT="${APP_PORT:-3000}"
NODE_CLASS="${NODE_CLASS:-phone-experimental}"
AIFT_HOME="${AIFT_HOME:-$HOME/.aift-$NODE_NAME}"
LOG_DIR="$AIFT_HOME/logs"
HEARTBEAT_DIR="$AIFT_HOME/heartbeats"
HEARTBEAT_FILE="$HEARTBEAT_DIR/$NODE_NAME.json"

mkdir -p "$LOG_DIR" "$HEARTBEAT_DIR"

NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
LOCAL_URL="http://127.0.0.1:$APP_PORT"
HEALTH_URL="$LOCAL_URL/health"
STATUS="online"

if command -v curl >/dev/null 2>&1; then
  curl -fsS "$HEALTH_URL" >/dev/null 2>&1 || STATUS="warning"
else
  STATUS="unknown"
fi

cat > "$HEARTBEAT_FILE" <<EOF
{
  "node_id": "$NODE_NAME",
  "display_name": "$NODE_DISPLAY",
  "node_class": "$NODE_CLASS",
  "status": "$STATUS",
  "port": $APP_PORT,
  "local_url": "$LOCAL_URL",
  "health_url": "$HEALTH_URL",
  "last_seen_at": "$NOW"
}
EOF

cat "$HEARTBEAT_FILE"
