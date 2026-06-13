#!/usr/bin/env bash
set -Eeuo pipefail

REPO_URL="${AIFT_REPO_URL:-https://github.com/AIFreedomTrustFederation/VPS.git}"
NODE_DIR="${AIFT_NODE_DIR:-$HOME/aift-termux-node-002}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$NODE_DIR-backup-$STAMP"

printf '\n[AIFT VPS] Refresh node folder from GitHub\n'
printf '[AIFT VPS] Node dir: %s\n' "$NODE_DIR"
printf '[AIFT VPS] Repo: %s\n\n' "$REPO_URL"

if ! command -v git >/dev/null 2>&1; then
  if command -v pkg >/dev/null 2>&1; then
    pkg install git -y
  else
    echo 'git is required.'
    exit 1
  fi
fi

if [ -d "$NODE_DIR/.git" ]; then
  cd "$NODE_DIR"
  git pull --ff-only
else
  if [ -d "$NODE_DIR" ]; then
    mv "$NODE_DIR" "$BACKUP_DIR"
    printf '[AIFT VPS] Backup created: %s\n' "$BACKUP_DIR"
  fi
  git clone "$REPO_URL" "$NODE_DIR"
fi

printf '\n[AIFT VPS] Done. Next run:\n'
printf 'cd %s/apps/aift-dashboard\n' "$NODE_DIR"
printf 'npm install\n'
printf 'npx next dev --webpack --hostname 127.0.0.1 --port 3001\n'
