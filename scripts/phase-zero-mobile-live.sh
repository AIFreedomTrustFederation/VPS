#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/root/VPS}"
APP_PORT="${APP_PORT:-3000}"
DASHBOARD_DIR="$APP_DIR/apps/aift-dashboard"
REGISTRY_DIR="/opt/aift/registry"
LOG_DIR="/opt/aift/logs"
SECRET_DIR="/opt/aift/secrets"

say() { printf '\n[AIFT] %s\n' "$*"; }

if [ ! -d "$APP_DIR/.git" ]; then
  say "Repository not found at $APP_DIR"
  say "Clone the repository first, then run this script again."
  exit 1
fi

cd "$APP_DIR"
say "Updating repository"
git pull --ff-only || true

say "Preparing local folders"
mkdir -p "$REGISTRY_DIR" "$LOG_DIR" "$SECRET_DIR"

say "Preparing registry files"
[ -f "$REGISTRY_DIR/nodes.yml" ] || cp registry-examples/nodes.yml "$REGISTRY_DIR/nodes.yml"
[ -f "$REGISTRY_DIR/templates.yml" ] || cp registry-examples/templates.yml "$REGISTRY_DIR/templates.yml"
[ -f "$REGISTRY_DIR/builds.yml" ] || cp registry-examples/builds.yml "$REGISTRY_DIR/builds.yml"
[ -f "$REGISTRY_DIR/deployments.yml" ] || cp registry-examples/deployments.yml "$REGISTRY_DIR/deployments.yml"
if [ ! -f "$REGISTRY_DIR/apps.yml" ]; then
  cat > "$REGISTRY_DIR/apps.yml" <<'EOF'
apps:
  aift-dashboard:
    repo: https://github.com/AIFreedomTrustFederation/VPS
    branch: main
    domain: vps.aifreedomtrust.com
    framework: nextjs
    status: running
    node: sacramento-node-001
    trust_class: business-app
EOF
fi

cd "$DASHBOARD_DIR"

say "Building and starting dashboard"
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  docker compose -f compose.yml up -d --build
else
  say "Docker Compose is not available. Falling back to npm dev server."
  npm install
  nohup npm run dev > "$LOG_DIR/aift-dashboard-dev.log" 2>&1 &
fi

sleep 5

HOST_IP=""
if command -v curl >/dev/null 2>&1; then
  HOST_IP="$(curl -fsS https://api.ipify.org || true)"
fi
if [ -z "$HOST_IP" ]; then
  HOST_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
fi
if [ -z "$HOST_IP" ]; then
  HOST_IP="127.0.0.1"
fi

LOCAL_URL="http://127.0.0.1:$APP_PORT"
MOBILE_URL="http://$HOST_IP:$APP_PORT"

say "Checking local dashboard"
if command -v curl >/dev/null 2>&1; then
  curl -fsS "$LOCAL_URL/api/health" >/dev/null && HEALTH="ok" || HEALTH="check-needed"
else
  HEALTH="curl-not-available"
fi

cat <<EOF

============================================================
AIFT PHASE ZERO LIVE REPORT
============================================================
Local URL:  $LOCAL_URL
Mobile URL: $MOBILE_URL
Health:     $HEALTH

Open from your phone:
$MOBILE_URL/health
$MOBILE_URL/connect-node
$MOBILE_URL/nodes
$MOBILE_URL/deployments

If it does not load from mobile, open firewall port $APP_PORT.
============================================================
EOF
