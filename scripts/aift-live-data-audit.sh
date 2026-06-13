#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="${1:-$(pwd)}"

printf '\n[AIFT VPS] Live data audit\n'
printf '[AIFT VPS] Scanning: %s\n\n' "$ROOT_DIR"

PATTERN='mock|fake|dummy|placeholder|sample data|demo data|hardcoded project|hardcoded node|test user'
EXCLUDES=(
  '--glob' '!scripts/aift-live-data-audit.sh'
  '--glob' '!docs/**'
  '--glob' '!registry-examples/**'
)

if command -v rg >/dev/null 2>&1; then
  RESULTS="$(rg -n -i "${EXCLUDES[@]}" "$PATTERN" "$ROOT_DIR/apps" "$ROOT_DIR/packages" "$ROOT_DIR/scripts" 2>/dev/null || true)"
else
  RESULTS="$(grep -RInEi "$PATTERN" "$ROOT_DIR/apps" "$ROOT_DIR/packages" "$ROOT_DIR/scripts" 2>/dev/null | grep -v 'scripts/aift-live-data-audit.sh' || true)"
fi

if [ -z "$RESULTS" ]; then
  printf '[AIFT VPS] PASS: no obvious invented data markers found in product paths.\n'
  exit 0
fi

printf '%s\n' "$RESULTS"
printf '\n[AIFT VPS] REVIEW REQUIRED: remove or clearly label anything that is not real operational data.\n'
exit 1
