#!/usr/bin/env bash
set -Eeuo pipefail

ZIP_URL="${ZIP_URL:-https://codeload.github.com/AIFreedomTrustFederation/VPS/zip/refs/heads/main}"
NODE_NAME="${NODE_NAME:-termux-node-$(date +%H%M)}"
NODE_DISPLAY="${NODE_DISPLAY:-Termux Node $NODE_NAME}"
APP_PORT="${APP_PORT:-3000}"
WORK_DIR="${WORK_DIR:-$HOME/aift-$NODE_NAME}"
ZIP_FILE="$HOME/aift-vps-main.zip"
AIFT_HOME="$HOME/.aift-$NODE_NAME"
LOG_DIR="$AIFT_HOME/logs"
REGISTRY_DIR="$AIFT_HOME/registry"

say() { printf '\n[AIFT] %s\n' "$*"; }

say "Preparing Termux provider node without git: $NODE_NAME"
if command -v pkg >/dev/null 2>&1; then
  pkg update -y
  pkg install -y curl unzip nodejs nano
fi

mkdir -p "$AIFT_HOME" "$LOG_DIR" "$REGISTRY_DIR"
rm -rf "$WORK_DIR" "$HOME/VPS-main" "$ZIP_FILE"

say "Downloading public repo zip"
curl -fL "$ZIP_URL" -o "$ZIP_FILE"

say "Unpacking repo"
unzip -q "$ZIP_FILE" -d "$HOME"
mv "$HOME/VPS-main" "$WORK_DIR"

cd "$WORK_DIR"

cat > "$AIFT_HOME/node.env" <<EOF
AIFT_NODE_NAME=$NODE_NAME
AIFT_NODE_DISPLAY=$NODE_DISPLAY
AIFT_NODE_KIND=termux-provider-node-zip
AIFT_REPO_PATH=$WORK_DIR
AIFT_REGISTRY_PATH=$REGISTRY_DIR/apps.yml
AIFT_NODES_PATH=$REGISTRY_DIR/nodes.yml
AIFT_TEMPLATES_PATH=$REGISTRY_DIR/templates.yml
AIFT_BUILDS_PATH=$REGISTRY_DIR/builds.yml
AIFT_DEPLOYMENTS_PATH=$REGISTRY_DIR/deployments.yml
AIFT_LOG_PATH=$LOG_DIR
AIFT_PORT=$APP_PORT
EOF

say "Preparing local registry files"
cp -f registry-examples/nodes.yml "$REGISTRY_DIR/nodes.yml"
cp -f registry-examples/templates.yml "$REGISTRY_DIR/templates.yml"
cp -f registry-examples/builds.yml "$REGISTRY_DIR/builds.yml"
cp -f registry-examples/deployments.yml "$REGISTRY_DIR/deployments.yml"
cat > "$REGISTRY_DIR/apps.yml" <<EOF
apps:
  aift-dashboard:
    repo: local-termux-node-zip
    branch: main
    domain: localhost
    framework: nextjs
    status: running
    node: $NODE_NAME
    trust_class: four-hour-test
EOF

cd "$WORK_DIR/apps/aift-dashboard"

say "Installing dashboard dependencies"
npm install

say "Starting dashboard with Webpack on port $APP_PORT"
export AIFT_REGISTRY_PATH="$REGISTRY_DIR/apps.yml"
export AIFT_NODES_PATH="$REGISTRY_DIR/nodes.yml"
export AIFT_TEMPLATES_PATH="$REGISTRY_DIR/templates.yml"
export AIFT_BUILDS_PATH="$REGISTRY_DIR/builds.yml"
export AIFT_DEPLOYMENTS_PATH="$REGISTRY_DIR/deployments.yml"
export AIFT_LOG_PATH="$LOG_DIR"
export AIFT_DASHBOARD_TOKEN="termux-node"
export AIFT_NODE_TOKEN="termux-node"

nohup npx next dev --webpack --hostname 127.0.0.1 --port "$APP_PORT" > "$LOG_DIR/dashboard.log" 2>&1 &

sleep 10

cat <<EOF

============================================================
AIFT NO-GIT TERMUX NODE LIVE REPORT
============================================================
Node display: $NODE_DISPLAY
Node name:    $NODE_NAME
Port:         $APP_PORT
Work dir:     $WORK_DIR
Log file:     $LOG_DIR/dashboard.log

Open on this device:
http://127.0.0.1:$APP_PORT/health
http://127.0.0.1:$APP_PORT/connect-node
http://127.0.0.1:$APP_PORT/nodes
http://127.0.0.1:$APP_PORT/deployments

If it refuses connection, run:
tail -120 $LOG_DIR/dashboard.log
============================================================
EOF
