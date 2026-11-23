#!/usr/bin/env bash
set -euo pipefail
# Local-only check; no tokens, prompt text or secrets emitted.
body="$(curl --noproxy '*' --silent --show-error --fail --max-time 5 http://127.0.0.1:8080/health)"
python3 -c 'import json,sys; body=json.loads(sys.argv[1]); sys.exit(0 if body.get("status")=="ok" else 1)' "$body"
echo "aetherion_health=ready"
