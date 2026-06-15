#!/usr/bin/env bash
set -Eeuo pipefail

NODE_DIR="${AIFT_NODE_DIR:-$HOME/aift-termux-node-002}"
PORT_VALUE="${1:-${APP_PORT:-3001}}"
AIFT_HOME_DIR="${AIFT_HOME:-$HOME/.aift-webai}"

cd "$NODE_DIR"
node scripts/aift-phone-url.mjs "$PORT_VALUE"
node scripts/aift-node-identity.mjs
node scripts/aift-runtime-event.mjs node-status-refreshed "port=$PORT_VALUE" || true
