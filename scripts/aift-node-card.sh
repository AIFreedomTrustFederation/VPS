#!/usr/bin/env bash
set -Eeuo pipefail

MODE="${1:-show}"
NODE_NAME="${NODE_NAME:-$(basename "$HOME" 2>/dev/null || echo termux-node)}"
NODE_DISPLAY="${NODE_DISPLAY:-$NODE_NAME}"
APP_PORT="${APP_PORT:-3000}"
AIFT_HOME="${AIFT_HOME:-$HOME/.aift-$NODE_NAME}"
REGISTRY_DIR="$AIFT_HOME/registry"
CARDS_DIR="$AIFT_HOME/node-cards"
CARD_FILE="$CARDS_DIR/$NODE_NAME.card"

mkdir -p "$REGISTRY_DIR" "$CARDS_DIR"

write_card() {
  cat > "$CARD_FILE" <<EOF
node=$NODE_NAME
display=$NODE_DISPLAY
port=$APP_PORT
health=http://127.0.0.1:$APP_PORT/health
created=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF
}

case "$MODE" in
  export)
    write_card
    cat "$CARD_FILE"
    ;;
  import)
    IMPORT_FILE="${2:-}"
    if [ -z "$IMPORT_FILE" ] || [ ! -f "$IMPORT_FILE" ]; then
      echo "Usage: bash scripts/aift-node-card.sh import path/to/card"
      exit 1
    fi
    cp "$IMPORT_FILE" "$CARDS_DIR/$(basename "$IMPORT_FILE")"
    echo "Imported node card into $CARDS_DIR"
    ;;
  list)
    ls -1 "$CARDS_DIR" 2>/dev/null || true
    ;;
  show|*)
    echo "Node cards folder: $CARDS_DIR"
    echo "Export this node: bash scripts/aift-node-card.sh export"
    echo "Import a node:   bash scripts/aift-node-card.sh import path/to/card"
    echo "List nodes:      bash scripts/aift-node-card.sh list"
    ;;
esac
