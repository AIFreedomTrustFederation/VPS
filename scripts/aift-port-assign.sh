#!/usr/bin/env bash
set -Eeuo pipefail

SERVICE="${1:-dashboard}"
PREFERRED="${2:-${APP_PORT:-3001}}"
HOST="${APP_HOST:-127.0.0.1}"
MAX_SCAN="${AIFT_PORT_SCAN_LIMIT:-80}"
AIFT_HOME="${AIFT_HOME:-$HOME/.aift-webai}"
NODE_NAME="${NODE_NAME:-$(hostname 2>/dev/null || echo local-node)}"
LEASE_DIR="$AIFT_HOME/runtime/ports"
LEASE_FILE="$LEASE_DIR/$SERVICE.json"

mkdir -p "$LEASE_DIR"

port_is_busy() {
  local port="$1"
  if command -v python >/dev/null 2>&1; then
    python - "$HOST" "$port" <<'PY' >/dev/null 2>&1
import socket, sys
host = sys.argv[1]
port = int(sys.argv[2])
s = socket.socket()
s.settimeout(0.25)
try:
    s.connect((host, port))
    sys.exit(0)
except Exception:
    sys.exit(1)
finally:
    s.close()
PY
    return $?
  fi

  if command -v nc >/dev/null 2>&1; then
    nc -z "$HOST" "$port" >/dev/null 2>&1
    return $?
  fi

  (echo >/dev/tcp/$HOST/$port) >/dev/null 2>&1
}

choose_port() {
  local start="$1"
  local end=$((start + MAX_SCAN))
  local port="$start"

  while [ "$port" -le "$end" ]; do
    if ! port_is_busy "$port"; then
      echo "$port"
      return 0
    fi
    port=$((port + 1))
  done

  return 1
}

ASSIGNED="$(choose_port "$PREFERRED")"
ISSUED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
PAYLOAD="node=$NODE_NAME service=$SERVICE host=$HOST preferred=$PREFERRED assigned=$ASSIGNED issued_at=$ISSUED_AT"

if command -v sha256sum >/dev/null 2>&1; then
  SIGNATURE="$(printf '%s' "$PAYLOAD" | sha256sum | awk '{print $1}')"
else
  SIGNATURE="unsigned"
fi

cat > "$LEASE_FILE" <<JSON
{
  "node": "$NODE_NAME",
  "service": "$SERVICE",
  "host": "$HOST",
  "preferred_port": $PREFERRED,
  "assigned_port": $ASSIGNED,
  "issued_at": "$ISSUED_AT",
  "signature": "$SIGNATURE"
}
JSON

printf '%s\n' "$ASSIGNED"
