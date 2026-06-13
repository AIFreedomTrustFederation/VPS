#!/usr/bin/env bash
set -Eeuo pipefail

REPO_URL="${REPO_URL:-https://github.com/AIFreedomTrustFederation/VPS.git}"
WORK_DIR="${WORK_DIR:-$HOME/aift-vps}"
NODE_NAME="${NODE_NAME:-sacramento-node-001}"
NODE_DISPLAY="${NODE_DISPLAY:-Sacramento Node 001}"
DASHBOARD_DOMAIN="${DASHBOARD_DOMAIN:-vps.aifreedomtrust.com}"

say() { printf '\n[AIFT] %s\n' "$*"; }

if command -v pkg >/dev/null 2>&1; then
  say "Preparing Termux packages"
  pkg update -y
  pkg install -y git curl openssh nano
fi

if [ ! -d "$WORK_DIR/.git" ]; then
  say "Cloning AIFT VPS repo to $WORK_DIR"
  git clone "$REPO_URL" "$WORK_DIR"
else
  say "Updating AIFT VPS repo at $WORK_DIR"
  cd "$WORK_DIR"
  git pull --ff-only || true
fi

mkdir -p "$HOME/.aift"
cat > "$HOME/.aift/provider-node.env" <<EOF
AIFT_NODE_NAME=$NODE_NAME
AIFT_NODE_DISPLAY=$NODE_DISPLAY
AIFT_DASHBOARD_DOMAIN=$DASHBOARD_DOMAIN
AIFT_REPO_PATH=/root/VPS
AIFT_ROOT_PATH=/opt/aift
EOF

cat <<EOF

============================================================
AIFT MOBILE PROVIDER CONTROL
============================================================
Provider: AI Freedom Trust
Node display: $NODE_DISPLAY
Node machine: $NODE_NAME
Dashboard domain: $DASHBOARD_DOMAIN

This phone is now prepared as the mobile command center.
Repo copy on phone:
$WORK_DIR

Next: connect this phone to the Linux machine that will become $NODE_NAME.

When you are inside that Linux machine, run:

  git clone $REPO_URL /root/VPS || true
  cd /root/VPS
  git pull --ff-only || true
  chmod +x scripts/phase-zero-mobile-live.sh scripts/print-mobile-urls.sh
  sudo bash scripts/phase-zero-mobile-live.sh
  bash scripts/print-mobile-urls.sh

If this phone is the only device available, it can control the node by SSH once the node has an address.
============================================================
EOF
