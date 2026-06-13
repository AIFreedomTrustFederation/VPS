#!/usr/bin/env bash
set -Eeuo pipefail

AIFT_REPO_DIR="${AIFT_REPO_DIR:-/root/VPS}"
AIFT_ROOT="${AIFT_ROOT:-/opt/aift}"
AGENT_DIR="${AIFT_ROOT}/node-agent"
NODE_NAME="${AIFT_NODE_NAME:-$(hostname)-aift-node}"
CONTROL_PLANE_URL="${AIFT_CONTROL_PLANE_URL:-}"
NODE_TOKEN="${AIFT_NODE_TOKEN:-}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run with sudo or as root."
  exit 1
fi

if [[ ! -d "${AIFT_REPO_DIR}/apps/aift-node-agent" ]]; then
  echo "Node agent source not found at ${AIFT_REPO_DIR}/apps/aift-node-agent"
  exit 1
fi

mkdir -p "${AGENT_DIR}"
cp -R "${AIFT_REPO_DIR}/apps/aift-node-agent/." "${AGENT_DIR}/"

cat > "${AGENT_DIR}/.env" <<EOF
AIFT_NODE_NAME="${NODE_NAME}"
AIFT_CONTROL_PLANE_URL="${CONTROL_PLANE_URL}"
AIFT_NODE_TOKEN="${NODE_TOKEN}"
AIFT_HEARTBEAT_INTERVAL_MS="30000"
AIFT_NODE_CONFIG="${AGENT_DIR}/aift.node.yml"
EOF

cat > "${AGENT_DIR}/aift.node.yml" <<EOF
node:
  name: ${NODE_NAME}
  operator: AI Freedom Trust Federation
  operator_class: managed
  region: us-west
  trust_level: verified
  supports:
    - static
    - vite
    - nextjs
    - node
    - docker
  disclosure:
    public_node_identity: true
    public_operator_class: true
    public_region: true
EOF

cat <<EOF
AIFT Node Agent files installed at:
${AGENT_DIR}

Next manual commands:

cd ${AGENT_DIR}
npm install
npm run build
npm start

For production, run it with pm2, systemd, Docker, or the selected AIFT process manager.
EOF
