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
  ORIGIN_URL="$(git remote get-url origin)" || {
    echo '[AIFT VPS] Existing checkout has no usable origin remote.' >&2
    exit 1
  }
  printf '[AIFT VPS] Existing checkout origin: %s\n' "$ORIGIN_URL"
  if [ -n "${AIFT_REPO_URL:-}" ] && [ "$ORIGIN_URL" != "$REPO_URL" ]; then
    echo '[AIFT VPS] Existing checkout origin does not match AIFT_REPO_URL; refusing to pull from another repository.' >&2
    exit 1
  fi
  git pull --ff-only
else
  # Clone first: a failed fetch must not remove a working node directory.
  if [ -e "$NODE_DIR" ] && [ ! -d "$NODE_DIR" ]; then
    echo '[AIFT VPS] Node path exists but is not a directory.' >&2
    exit 1
  fi
  STAGING_DIR="$(mktemp -d "${NODE_DIR}.staging.XXXXXXXX")"
  trap 'rm -rf -- "$STAGING_DIR"' EXIT
  if ! git clone "$REPO_URL" "$STAGING_DIR"; then
    echo '[AIFT VPS] Clone failed. Existing node directory was not changed.' >&2
    exit 1
  fi
  if [ -d "$NODE_DIR" ]; then
    if [ -e "$BACKUP_DIR" ] || [ -L "$BACKUP_DIR" ]; then
      echo '[AIFT VPS] Backup destination already exists. Refusing to overwrite it.' >&2
      exit 1
    fi
    mv "$NODE_DIR" "$BACKUP_DIR"
    printf '[AIFT VPS] Backup created: %s\n' "$BACKUP_DIR"
  fi
  if ! mv "$STAGING_DIR" "$NODE_DIR"; then
    echo '[AIFT VPS] Could not activate staged checkout; attempting backup restoration.' >&2
    if [ -d "$BACKUP_DIR" ] && [ ! -e "$NODE_DIR" ]; then
      mv "$BACKUP_DIR" "$NODE_DIR" || true
    fi
    exit 1
  fi
  trap - EXIT
fi

printf '\n[AIFT VPS] Done. Next run:\n'
printf 'cd %s/apps/aift-dashboard\n' "$NODE_DIR"
printf 'npm install\n'
printf 'npx next dev --webpack --hostname 127.0.0.1 --port 3001\n'
