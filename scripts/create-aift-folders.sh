#!/usr/bin/env bash
set -Eeuo pipefail

AIFT_ROOT="${AIFT_ROOT:-/opt/aift}"
AIFT_USER="${AIFT_USER:-aift}"
AIFT_GROUP="${AIFT_GROUP:-aift}"

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    echo "Run this script with sudo or as root."
    exit 1
  fi
}

create_user_if_missing() {
  if ! id "${AIFT_USER}" >/dev/null 2>&1; then
    useradd --system --create-home --shell /bin/bash "${AIFT_USER}"
  fi
}

main() {
  require_root
  create_user_if_missing

  mkdir -p \
    "${AIFT_ROOT}/apps" \
    "${AIFT_ROOT}/builder/templates" \
    "${AIFT_ROOT}/registry" \
    "${AIFT_ROOT}/proxy" \
    "${AIFT_ROOT}/logs" \
    "${AIFT_ROOT}/backups" \
    "${AIFT_ROOT}/secrets" \
    "${AIFT_ROOT}/scripts" \
    "${AIFT_ROOT}/shared"

  if [[ ! -f "${AIFT_ROOT}/registry/apps.yml" ]]; then
    cat > "${AIFT_ROOT}/registry/apps.yml" <<'YAML'
apps: {}
YAML
  fi

  touch "${AIFT_ROOT}/logs/platform.log"
  chmod 700 "${AIFT_ROOT}/secrets"
  chown -R "${AIFT_USER}:${AIFT_GROUP}" "${AIFT_ROOT}" || chown -R "${AIFT_USER}:${AIFT_USER}" "${AIFT_ROOT}"

  echo "AI Freedom Trust VPS folders created at ${AIFT_ROOT}"
}

main "$@"
