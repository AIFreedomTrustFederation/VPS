#!/usr/bin/env bash
set -Eeuo pipefail

AIFT_ROOT="${AIFT_ROOT:-/opt/aift}"
AIFT_USER="${AIFT_USER:-aift}"
INSTALL_COOLIFY="${INSTALL_COOLIFY:-true}"

log() {
  echo "[AIFT VPS] $*"
}

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    echo "Run this script with sudo or as root."
    exit 1
  fi
}

install_base_packages() {
  log "Updating server packages..."
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

  log "Installing baseline tools..."
  DEBIAN_FRONTEND=noninteractive apt-get install -y \
    ca-certificates \
    curl \
    git \
    gnupg \
    lsb-release \
    ufw \
    fail2ban \
    unzip \
    htop \
    nano \
    jq
}

install_docker() {
  if command -v docker >/dev/null 2>&1; then
    log "Docker already installed."
    return
  fi

  log "Installing Docker Engine..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list

  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  systemctl enable docker
  systemctl start docker
}

create_deploy_user() {
  if ! id "${AIFT_USER}" >/dev/null 2>&1; then
    log "Creating ${AIFT_USER} system user..."
    useradd --system --create-home --shell /bin/bash "${AIFT_USER}"
  fi

  usermod -aG docker "${AIFT_USER}" || true
}

configure_firewall() {
  log "Configuring firewall..."
  ufw allow OpenSSH
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
}

configure_fail2ban() {
  log "Enabling Fail2ban..."
  systemctl enable fail2ban
  systemctl restart fail2ban
}

create_folders() {
  log "Creating /opt/aift folder standard..."
  bash "$(dirname "$0")/create-aift-folders.sh"
}

install_coolify_hint() {
  if [[ "${INSTALL_COOLIFY}" != "true" ]]; then
    log "Skipping Coolify install because INSTALL_COOLIFY is not true."
    return
  fi

  cat <<'NOTE'

[AIFT VPS] Coolify should be installed from the official current installer after DNS and firewall are ready.
[AIFT VPS] Run this on the VPS when ready:

  curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

[AIFT VPS] After installation, open the Coolify URL shown by the installer, connect GitHub, and deploy the first test app.
NOTE
}

print_next_steps() {
  cat <<EOF

AI Freedom Trust VPS baseline complete.

Next steps:
1. Point DNS records to this VPS IP.
2. Install Coolify using the official installer command printed above.
3. Connect GitHub to Coolify.
4. Import a template app repo.
5. Deploy to HTTPS.
6. Confirm rebuild after a GitHub change.

AIFT root: ${AIFT_ROOT}
Deploy user: ${AIFT_USER}

EOF
}

main() {
  require_root
  install_base_packages
  install_docker
  create_deploy_user
  configure_firewall
  configure_fail2ban
  create_folders
  install_coolify_hint
  print_next_steps
}

main "$@"
