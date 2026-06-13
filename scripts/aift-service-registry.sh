#!/usr/bin/env bash
set -Eeuo pipefail

COMMAND="${1:-list}"
SERVICE="${2:-dashboard}"
PORT="${3:-}"
AIFT_HOME="${AIFT_HOME:-$HOME/.aift-webai}"
REGISTRY_DIR="$AIFT_HOME/runtime/services"
REGISTRY_FILE="$REGISTRY_DIR/services.jsonl"

mkdir -p "$REGISTRY_DIR"
touch "$REGISTRY_FILE"

now() {
  date -u +%Y-%m-%dT%H:%M:%SZ
}

case "$COMMAND" in
  register)
    if [ -z "$PORT" ]; then
      echo "Usage: aift-service-registry.sh register <service> <port>" >&2
      exit 1
    fi
    printf '{"service":"%s","port":%s,"host":"%s","updated_at":"%s"}\n' "$SERVICE" "$PORT" "${APP_HOST:-127.0.0.1}" "$(now)" >> "$REGISTRY_FILE"
    tail -n 1 "$REGISTRY_FILE"
    ;;
  list)
    cat "$REGISTRY_FILE"
    ;;
  path)
    echo "$REGISTRY_FILE"
    ;;
  *)
    echo "Usage: aift-service-registry.sh [register|list|path]" >&2
    exit 1
    ;;
esac
