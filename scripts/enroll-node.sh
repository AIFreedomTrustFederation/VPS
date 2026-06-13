#!/usr/bin/env bash
set -Eeuo pipefail

TENANT_NAME="${TENANT_NAME:-AI Freedom Trust}"
TENANT_ID="${TENANT_ID:-ai-freedom-trust}"
NODE_NAME="${NODE_NAME:-sacramento-node-001}"
NODE_DISPLAY_NAME="${NODE_DISPLAY_NAME:-Sacramento Node 001}"
AIFT_ROOT="${AIFT_ROOT:-/opt/aift}"
AIFT_PROFILE_DIR="$AIFT_ROOT/node-profile"
AIFT_PROFILE_FILE="$AIFT_PROFILE_DIR/$NODE_NAME.env"
KEY_DIR="${HOME}/.ssh"
KEY_FILE="$KEY_DIR/aift_${NODE_NAME}_deploy"
SSH_PORT="${SSH_PORT:-22}"
SSH_USER="${SSH_USER:-$(id -un)}"

mkdir -p "$AIFT_PROFILE_DIR" "$KEY_DIR"
chmod 700 "$KEY_DIR"

if command -v curl >/dev/null 2>&1; then
  PUBLIC_HOST="${PUBLIC_HOST:-$(curl -fsS https://api.ipify.org || true)}"
else
  PUBLIC_HOST="${PUBLIC_HOST:-}"
fi

if [ -z "${PUBLIC_HOST:-}" ]; then
  PUBLIC_HOST="SET_PUBLIC_IP_OR_HOSTNAME"
fi

if [ ! -f "$KEY_FILE" ]; then
  ssh-keygen -t ed25519 -C "aift-${TENANT_ID}-${NODE_NAME}" -f "$KEY_FILE" -N ""
fi

AUTHORIZED_KEYS="$KEY_DIR/authorized_keys"
touch "$AUTHORIZED_KEYS"
chmod 600 "$AUTHORIZED_KEYS"
if ! grep -q "$(cat "$KEY_FILE.pub")" "$AUTHORIZED_KEYS"; then
  cat "$KEY_FILE.pub" >> "$AUTHORIZED_KEYS"
fi

cat > "$AIFT_PROFILE_FILE" <<EOF
TENANT_NAME="$TENANT_NAME"
TENANT_ID="$TENANT_ID"
NODE_NAME="$NODE_NAME"
NODE_DISPLAY_NAME="$NODE_DISPLAY_NAME"
VPS_HOST="$PUBLIC_HOST"
VPS_USER="$SSH_USER"
VPS_PORT="$SSH_PORT"
VPS_APP_PATH="/root/VPS"
EOF
chmod 600 "$AIFT_PROFILE_FILE"

echo "AIFT node enrollment profile created: $AIFT_PROFILE_FILE"
echo ""
echo "Add these GitHub repository secrets:"
echo "VPS_HOST=$PUBLIC_HOST"
echo "VPS_USER=$SSH_USER"
echo "VPS_PORT=$SSH_PORT"
echo "VPS_SSH_KEY=<paste the private key from $KEY_FILE>"
echo ""
echo "Private key path on this node: $KEY_FILE"
echo "Public key path on this node: $KEY_FILE.pub"
