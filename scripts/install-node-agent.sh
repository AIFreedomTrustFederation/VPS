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

# Reject physical line breaks before interpolating values into line-oriented
# .env and YAML configuration files. Do this before filesystem side effects.
for field in NODE_NAME CONTROL_PLANE_URL NODE_TOKEN AGENT_DIR; do
  value="${!field}"
  if [[ "$value" == *
  echo "Node agent source not found at ${AIFT_REPO_DIR}/apps/aift-node-agent"
  exit 1
fi

mkdir -p "${AGENT_DIR}"
cp -R "${AIFT_REPO_DIR}/apps/aift-node-agent/." "${AGENT_DIR}/"

# Stage bearer credentials in a private file and replace the target atomically.
# Direct redirection would reuse permissive modes and follow existing symlinks.
umask 077
ENV_TEMP="$(mktemp "${AGENT_DIR}/.env.tmp.XXXXXXXX")"
trap 'rm -f -- "${ENV_TEMP}"' EXIT
cat > "${ENV_TEMP}" <<EOF2
AIFT_NODE_NAME="${NODE_NAME}"
AIFT_CONTROL_PLANE_URL="${CONTROL_PLANE_URL}"
AIFT_NODE_TOKEN="${NODE_TOKEN}"
AIFT_HEARTBEAT_INTERVAL_MS="30000"
AIFT_NODE_CONFIG="${AGENT_DIR}/aift.node.yml"
EOF2
chmod 600 "${ENV_TEMP}"
mv -f -- "${ENV_TEMP}" "${AGENT_DIR}/.env"
trap - EXIT

cat > "${AGENT_DIR}/aift.node.yml" <<EOF2
node:
  name: "${yaml_node_name}"
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
EOF2

cat <<EOF2
AIFT Node Agent files installed at:
${AGENT_DIR}

Next manual commands:

cd ${AGENT_DIR}
npm install
npm run build
npm start

For production, run it with pm2, systemd, Docker, or the selected AIFT process manager.
EOF2
\n'* || "$value" == *
  echo "Node agent source not found at ${AIFT_REPO_DIR}/apps/aift-node-agent"
  exit 1
fi

mkdir -p "${AGENT_DIR}"
cp -R "${AIFT_REPO_DIR}/apps/aift-node-agent/." "${AGENT_DIR}/"

# Stage bearer credentials in a private file and replace the target atomically.
# Direct redirection would reuse permissive modes and follow existing symlinks.
umask 077
ENV_TEMP="$(mktemp "${AGENT_DIR}/.env.tmp.XXXXXXXX")"
trap 'rm -f -- "${ENV_TEMP}"' EXIT
cat > "${ENV_TEMP}" <<EOF2
AIFT_NODE_NAME="${NODE_NAME}"
AIFT_CONTROL_PLANE_URL="${CONTROL_PLANE_URL}"
AIFT_NODE_TOKEN="${NODE_TOKEN}"
AIFT_HEARTBEAT_INTERVAL_MS="30000"
AIFT_NODE_CONFIG="${AGENT_DIR}/aift.node.yml"
EOF2
chmod 600 "${ENV_TEMP}"
mv -f -- "${ENV_TEMP}" "${AGENT_DIR}/.env"
trap - EXIT

cat > "${AGENT_DIR}/aift.node.yml" <<EOF2
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
EOF2

cat <<EOF2
AIFT Node Agent files installed at:
${AGENT_DIR}

Next manual commands:

cd ${AGENT_DIR}
npm install
npm run build
npm start

For production, run it with pm2, systemd, Docker, or the selected AIFT process manager.
EOF2
\r'* ]]; then
    echo "Invalid line break in ${field}" >&2
    exit 1
  fi
done
# Quote and escape the node name as a YAML string scalar.
yaml_node_name="${NODE_NAME//\\/\\\\}"
yaml_node_name="${yaml_node_name//\"/\\\"}"

if [[ ! -d "${AIFT_REPO_DIR}/apps/aift-node-agent" ]]; then
  echo "Node agent source not found at ${AIFT_REPO_DIR}/apps/aift-node-agent"
  exit 1
fi

mkdir -p "${AGENT_DIR}"
cp -R "${AIFT_REPO_DIR}/apps/aift-node-agent/." "${AGENT_DIR}/"

# Stage bearer credentials in a private file and replace the target atomically.
# Direct redirection would reuse permissive modes and follow existing symlinks.
umask 077
ENV_TEMP="$(mktemp "${AGENT_DIR}/.env.tmp.XXXXXXXX")"
trap 'rm -f -- "${ENV_TEMP}"' EXIT
cat > "${ENV_TEMP}" <<EOF2
AIFT_NODE_NAME="${NODE_NAME}"
AIFT_CONTROL_PLANE_URL="${CONTROL_PLANE_URL}"
AIFT_NODE_TOKEN="${NODE_TOKEN}"
AIFT_HEARTBEAT_INTERVAL_MS="30000"
AIFT_NODE_CONFIG="${AGENT_DIR}/aift.node.yml"
EOF2
chmod 600 "${ENV_TEMP}"
mv -f -- "${ENV_TEMP}" "${AGENT_DIR}/.env"
trap - EXIT

cat > "${AGENT_DIR}/aift.node.yml" <<EOF2
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
EOF2

cat <<EOF2
AIFT Node Agent files installed at:
${AGENT_DIR}

Next manual commands:

cd ${AGENT_DIR}
npm install
npm run build
npm start

For production, run it with pm2, systemd, Docker, or the selected AIFT process manager.
EOF2
