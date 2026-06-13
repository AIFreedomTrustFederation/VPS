#!/usr/bin/env bash
set -Eeuo pipefail

AIFT_HOME="${AIFT_HOME:-$HOME/.aift-webai}"
LOG_DIR="$AIFT_HOME/logs"
RUNTIME_URL="${WEBAI_LOCAL_MODEL_URL:-http://127.0.0.1:11434}"
MODEL_NAME="${WEBAI_LOCAL_MODEL_NAME:-llama3.2}"
RUNTIME_TYPE="${WEBAI_LOCAL_MODEL_RUNTIME:-ollama}"

mkdir -p "$LOG_DIR"

printf '\n[AIFT VPS] WebAI local open model helper\n'
printf '[AIFT VPS] Runtime type: %s\n' "$RUNTIME_TYPE"
printf '[AIFT VPS] Runtime URL:  %s\n' "$RUNTIME_URL"
printf '[AIFT VPS] Model name:   %s\n\n' "$MODEL_NAME"

if [ "$RUNTIME_TYPE" != "ollama" ]; then
  printf '[AIFT VPS] Runtime type is configured but not handled by this helper yet.\n'
  printf '[AIFT VPS] Add a helper branch for: %s\n' "$RUNTIME_TYPE"
  exit 1
fi

if ! command -v ollama >/dev/null 2>&1; then
  printf '[AIFT VPS] Ollama is not installed on this node.\n'
  printf '[AIFT VPS] Install a local open model runtime on this node, then run this helper again.\n'
  exit 1
fi

if ! pgrep -x ollama >/dev/null 2>&1; then
  printf '[AIFT VPS] Starting Ollama runtime in the background...\n'
  nohup ollama serve > "$LOG_DIR/webai-ollama.log" 2>&1 &
  sleep 3
fi

if command -v curl >/dev/null 2>&1; then
  if curl -fsS "$RUNTIME_URL/api/tags" >/dev/null 2>&1; then
    printf '[AIFT VPS] Runtime is reachable.\n'
  else
    printf '[AIFT VPS] Runtime is not reachable yet at %s.\n' "$RUNTIME_URL"
    printf '[AIFT VPS] Check log: %s\n' "$LOG_DIR/webai-ollama.log"
    exit 1
  fi
fi

if ollama list | awk '{print $1}' | grep -Eq "^${MODEL_NAME}(:|$)"; then
  printf '[AIFT VPS] Model is already present: %s\n' "$MODEL_NAME"
else
  printf '[AIFT VPS] Pulling model: %s\n' "$MODEL_NAME"
  ollama pull "$MODEL_NAME"
fi

printf '\n[AIFT VPS] Local open model path is ready.\n'
printf '[AIFT VPS] Start dashboard with:\n\n'
printf 'WEBAI_LOCAL_MODEL_URL=%s WEBAI_LOCAL_MODEL_NAME=%s WEBAI_LOCAL_MODEL_RUNTIME=%s npm run dev -- --port 3001\n\n' "$RUNTIME_URL" "$MODEL_NAME" "$RUNTIME_TYPE"
printf '[AIFT VPS] Then open /webai and choose Local open model.\n'
