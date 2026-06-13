#!/usr/bin/env bash
set -Eeuo pipefail

REPO_URL="${REPO_URL:-https://github.com/AIFreedomTrustFederation/VPS.git}"
WORK_DIR="${WORK_DIR:-$HOME/aift-vps}"
APP_PORT="${APP_PORT:-3000}"
NODE_NAME="${NODE_NAME:-sacramento-node-001}"
NODE_DISPLAY="${NODE_DISPLAY:-Sacramento Node 001}"
AIFT_HOME="$HOME/.aift"
LOG_DIR="$AIFT_HOME/logs"
REGISTRY_DIR="$AIFT_HOME/registry"

say() { printf '\n[AIFT] %s\n' "$*"; }

say "Preparing Termux provider node"
if command -v pkg >/dev/null 2>&1; then
  pkg update -y
  pkg install -y git curl nodejs nano
fi

mkdir -p "$AIFT_HOME" "$LOG_DIR" "$REGISTRY_DIR"

if [ ! -d "$WORK_DIR/.git" ]; then
  say "Cloning AIFT VPS repo to $WORK_DIR"
  git clone "$REPO_URL" "$WORK_DIR"
else
  say "Updating AIFT VPS repo at $WORK_DIR"
  cd "$WORK_DIR"
  git pull --ff-only || true
fi

cd "$WORK_DIR"

say "Writing phone provider node profile"
cat > "$AIFT_HOME/provider-node.env" <<EOF
AIFT_NODE_NAME=$NODE_NAME
AIFT_NODE_DISPLAY=$NODE_DISPLAY
AIFT_NODE_KIND=termux-phone-provider-node
AIFT_REPO_PATH=$WORK_DIR
AIFT_REGISTRY_PATH=$REGISTRY_DIR/apps.yml
AIFT_NODES_PATH=$REGISTRY_DIR/nodes.yml
AIFT_TEMPLATES_PATH=$REGISTRY_DIR/templates.yml
AIFT_BUILDS_PATH=$REGISTRY_DIR/builds.yml
AIFT_DEPLOYMENTS_PATH=$REGISTRY_DIR/deployments.yml
AIFT_LOG_PATH=$LOG_DIR
EOF

say "Preparing local registry files"
cp -f registry-examples/nodes.yml "$REGISTRY_DIR/nodes.yml"
cp -f registry-examples/templates.yml "$REGISTRY_DIR/templates.yml"
cp -f registry-examples/builds.yml "$REGISTRY_DIR/builds.yml"
cp -f registry-examples/deployments.yml "$REGISTRY_DIR/deployments.yml"
cat > "$REGISTRY_DIR/apps.yml" <<'EOF'
apps:
  aift-dashboard:
    repo: local-phone-provider-node
    branch: main
    domain: localhost
    framework: nextjs
    status: running
    node: sacramento-node-001
    trust_class: phase-zero
EOF

cd "$WORK_DIR/apps/aift-dashboard"

say "Installing dashboard dependencies"
npm install

say "Starting dashboard on Termux phone provider node"
export AIFT_REGISTRY_PATH="$REGISTRY_DIR/apps.yml"
export AIFT_NODES_PATH="$REGISTRY_DIR/nodes.yml"
export AIFT_TEMPLATES_PATH="$REGISTRY_DIR/templates.yml"
export AIFT_BUILDS_PATH="$REGISTRY_DIR/builds.yml"
export AIFT_DEPLOYMENTS_PATH="$REGISTRY_DIR/deployments.yml"
export AIFT_LOG_PATH="$LOG_DIR"
export AIFT_DASHBOARD_TOKEN="termux-phase-zero"
export AIFT_NODE_TOKEN="termux-node-token"

if pgrep -f "next dev" >/dev/null 2>&1; then
  say "Existing dashboard dev process detected. Leaving it running."
else
  nohup npm run dev -- --port "$APP_PORT" > "$LOG_DIR/aift-dashboard-termux.log" 2>&1 &
fi

sleep 8

LAN_IP="$(ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if ($i=="src") print $(i+1)}' | head -n 1 || true)"
[ -n "$LAN_IP" ] || LAN_IP="127.0.0.1"

cat <<EOF

============================================================
AIFT TERMUX PROVIDER NODE LIVE REPORT
============================================================
Provider node: $NODE_DISPLAY
Machine name:  $NODE_NAME
Node kind:     Termux phone provider node

Local phone URL:
http://127.0.0.1:$APP_PORT

LAN URL, if reachable from another device:
http://$LAN_IP:$APP_PORT

Open on this phone:
http://127.0.0.1:$APP_PORT/health
http://127.0.0.1:$APP_PORT/connect-node
http://127.0.0.1:$APP_PORT/nodes
http://127.0.0.1:$APP_PORT/deployments

Log file:
$LOG_DIR/aift-dashboard-termux.log
============================================================
EOF
