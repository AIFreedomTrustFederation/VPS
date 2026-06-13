#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="${1:-$(pwd)}"

printf '\n[AIFT VPS] Live data audit\n'
printf '[AIFT VPS] Scanning: %s\n\n' "$ROOT_DIR"

PATTERN='mock|fake|dummy|placeholder|sample data|demo data|hardcoded project|hardcoded node|test user'

if command -v rg >/dev/null 2>&1; then
  RESULTS="$(rg -n -i "$PATTERN" "$ROOT_DIR/apps" "$ROOT_DIR/packages" "$ROOT_DIR/scripts" 2>/dev/null || true)"
else
  RESULTS="$(grep -RInEi "$PATTERN" "$ROOT_DIR/apps" "$ROOT_DIR/packages" "$ROOT_DIR/scripts" 2>/dev/null || true)"
fi

if [ -z "$RESULTS" ]; then
  printf '[AIFT VPS] PASS: no obvious mock data markers found in product paths.\n'
  exit 0
fi

printf '%s\n' "$RESULTS"
printf '\n[AIFT VPS] REVIEW REQUIRED: remove or clearly label anything that is not real data.\n'
exit 1
