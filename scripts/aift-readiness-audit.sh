#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

FAIL=0

need_file() {
  local file="$1"
  if [ -f "$file" ]; then
    echo "[AIFT] OK $file"
  else
    echo "[AIFT] MISSING $file"
    FAIL=1
  fi
}

echo "[AIFT] Production readiness audit"

need_file docs/production-readiness-rules.md
need_file docs/live-data-policy.md
need_file apps/aift-dashboard/app/api/app-sources/route.ts
need_file apps/aift-dashboard/app/api/app-profiles/generate/route.ts
need_file apps/aift-dashboard/app/api/workspaces/prepare/route.ts
need_file apps/aift-dashboard/app/api/local-actions/route.ts
need_file apps/aift-dashboard/app/api/local-action-logs/route.ts
need_file apps/aift-dashboard/app/app-profiles/page.tsx
need_file apps/aift-dashboard/app/logs/page.tsx
need_file apps/aift-dashboard/lib/app-profile-generator.ts
need_file apps/aift-dashboard/lib/engine-records.ts

if [ "$FAIL" -eq 0 ]; then
  echo "[AIFT] PASS"
else
  echo "[AIFT] FAIL"
  exit 1
fi
