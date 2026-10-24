#!/usr/bin/env bash
set -Eeuo pipefail

NODE_NAME="${NODE_NAME:-termux-node}"
NODE_DISPLAY="${NODE_DISPLAY:-$NODE_NAME}"
APP_PORT="${APP_PORT:-3000}"
NODE_CLASS="${NODE_CLASS:-phone-experimental}"
AIFT_HOME="${AIFT_HOME:-$HOME/.aift-$NODE_NAME}"
# NODE_NAME is both a registry identifier and a filename component.
if [[ ! "$NODE_NAME" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]; then
  printf 'Invalid NODE_NAME: expected a single alphanumeric-leading filename component.\n' >&2
  exit 2
fi
if [[ ! "$APP_PORT" =~ ^[1-9][0-9]{0,4}$ ]] || (( APP_PORT > 65535 )); then
  printf 'Invalid APP_PORT: expected an integer from 1 to 65535.\n' >&2
  exit 2
fi
if ! command -v node >/dev/null 2>&1; then
  printf 'Node.js is required to serialize heartbeat JSON safely.\n' >&2
  exit 1
fi

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

node --input-type=module - "$HEARTBEAT_FILE" "$NODE_NAME" "$NODE_DISPLAY" "$NODE_CLASS" "$STATUS" "$APP_PORT" "$LOCAL_URL" "$HEALTH_URL" "$NOW" <<'JS'
import fs from 'node:fs';

const [file, nodeId, displayName, nodeClass, status, port, localUrl, healthUrl, lastSeen] = process.argv.slice(2);
const heartbeat = {
  node_id: nodeId,
  display_name: displayName,
  node_class: nodeClass,
  status,
  port: Number(port),
  local_url: localUrl,
  health_url: healthUrl,
  last_seen_at: lastSeen,
};
const json = JSON.stringify(heartbeat, null, 2) + '\n';
fs.writeFileSync(file, json, { encoding: 'utf8', mode: 0o600 });
process.stdout.write(json);
JS
