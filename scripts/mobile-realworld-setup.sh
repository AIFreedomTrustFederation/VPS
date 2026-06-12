#!/usr/bin/env bash
set -Eeuo pipefail

# AI Freedom Trust VPS Mobile Real-World Setup
# Run this from a phone SSH app while connected to a fresh Ubuntu VPS.
# Recommended phone apps: Termius, JuiceSSH, ConnectBot, or another SSH client.

AIFT_REPO="${AIFT_REPO:-https://github.com/AIFreedomTrustFederation/VPS.git}"
AIFT_CLONE_DIR="${AIFT_CLONE_DIR:-/root/VPS}"
AIFT_ROOT="${AIFT_ROOT:-/opt/aift}"
AIFT_USER="${AIFT_USER:-aift}"
INSTALL_COOLIFY="${INSTALL_COOLIFY:-ask}"
HARDEN_SSH="${HARDEN_SSH:-no}"

log() {
  printf '\n\033[1;35m[AIFT VPS]\033[0m %s\n' "$*"
}

warn() {
  printf '\n\033[1;33m[WARNING]\033[0m %s\n' "$*"
}

fail() {
  printf '\n\033[1;31m[ERROR]\033[0m %s\n' "$*"
  exit 1
}

require_root() {
  [[ "${EUID}" -eq 0 ]] || fail "Run as root or with sudo. Example: sudo bash scripts/mobile-realworld-setup.sh"
}

confirm() {
  local prompt="$1"
  local answer=""
  read -r -p "${prompt} [y/N]: " answer || true
  [[ "${answer}" =~ ^[Yy]$ ]]
}

install_base_packages() {
  log "Updating Ubuntu and installing baseline packages..."
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
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

  log "Installing Docker Engine and Docker Compose plugin..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list

  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable docker
  systemctl start docker
}

create_aift_user() {
  if ! id "${AIFT_USER}" >/dev/null 2>&1; then
    log "Creating ${AIFT_USER} service user..."
    useradd --system --create-home --shell /bin/bash "${AIFT_USER}"
  fi
  usermod -aG docker "${AIFT_USER}" || true
}

create_aift_folders() {
  log "Creating AI Freedom Trust folder structure at ${AIFT_ROOT}..."
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
    printf 'apps: {}\n' > "${AIFT_ROOT}/registry/apps.yml"
  fi

  touch "${AIFT_ROOT}/logs/platform.log"
  chmod 700 "${AIFT_ROOT}/secrets"
  chown -R "${AIFT_USER}:${AIFT_USER}" "${AIFT_ROOT}" || true
}

configure_firewall() {
  log "Configuring UFW firewall for SSH, HTTP, and HTTPS..."
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

clone_or_update_repo() {
  if [[ -d "${AIFT_CLONE_DIR}/.git" ]]; then
    log "Updating existing VPS repo at ${AIFT_CLONE_DIR}..."
    git -C "${AIFT_CLONE_DIR}" pull --ff-only || warn "Git pull failed. Continue manually from ${AIFT_CLONE_DIR}."
  else
    log "Cloning VPS repo to ${AIFT_CLONE_DIR}..."
    git clone "${AIFT_REPO}" "${AIFT_CLONE_DIR}"
  fi

  chmod +x "${AIFT_CLONE_DIR}/scripts/"*.sh 2>/dev/null || true
  chmod +x "${AIFT_CLONE_DIR}/bin/aift" 2>/dev/null || true

  if [[ -f "${AIFT_CLONE_DIR}/bin/aift" ]]; then
    ln -sf "${AIFT_CLONE_DIR}/bin/aift" /usr/local/bin/aift
  fi
}

maybe_harden_ssh() {
  if [[ "${HARDEN_SSH}" != "yes" ]]; then
    warn "SSH password hardening skipped. Set HARDEN_SSH=yes only after key login is confirmed."
    return
  fi

  log "Hardening SSH: disabling password auth and root password login..."
  cp /etc/ssh/sshd_config "/etc/ssh/sshd_config.aift-backup-$(date +%Y%m%d%H%M%S)"
  sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
  sed -i 's/^#\?PubkeyAuthentication .*/PubkeyAuthentication yes/' /etc/ssh/sshd_config
  sed -i 's/^#\?PermitRootLogin .*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
  systemctl restart ssh || systemctl restart sshd
}

install_coolify() {
  if [[ "${INSTALL_COOLIFY}" == "no" ]]; then
    warn "Coolify install skipped."
    return
  fi

  if [[ "${INSTALL_COOLIFY}" == "ask" ]]; then
    if ! confirm "Install Coolify now using the official installer?"; then
      warn "Coolify install skipped. You can install it later from the official Coolify docs."
      return
    fi
  fi

  log "Installing Coolify using the official installer..."
  curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
}

print_summary() {
  local public_ip="unknown"
  public_ip="$(curl -fsS https://api.ipify.org 2>/dev/null || true)"

  cat <<EOF

====================================================================
AI Freedom Trust VPS mobile setup complete.
====================================================================

VPS public IP: ${public_ip:-unknown}
AIFT root:     ${AIFT_ROOT}
Repo clone:    ${AIFT_CLONE_DIR}
AIFT CLI:      $(command -v aift || echo "not linked")

Run checks:

  docker --version
  docker compose version
  aift status
  ufw status verbose

DNS records to create next:

  vps.aifreedomtrust.com        A    ${public_ip:-YOUR_VPS_IP}
  test.aifreedomtrust.com       A    ${public_ip:-YOUR_VPS_IP}
  *.preview.aifreedomtrust.com  A    ${public_ip:-YOUR_VPS_IP}

Next real-world steps:

1. Open the Coolify URL shown by the installer.
2. Create the first admin account.
3. Connect GitHub.
4. Create AIFreedomTrustFederation/aift-launch-test.
5. Copy templates/vite-react into that repo.
6. Deploy it to test.aifreedomtrust.com.
7. Make one phone edit in GitHub and confirm rebuild.

Security reminder:
Only set HARDEN_SSH=yes after SSH key login is confirmed from a second session.

====================================================================
EOF
}

main() {
  require_root
  install_base_packages
  install_docker
  create_aift_user
  create_aift_folders
  configure_firewall
  configure_fail2ban
  clone_or_update_repo
  maybe_harden_ssh
  install_coolify
  print_summary
}

main "$@"
