#!/usr/bin/env bash
set -Eeuo pipefail

APP_PORT="${APP_PORT:-3000}"

first_lan_ip() {
  hostname -I 2>/dev/null | tr ' ' '\n' | grep -E '^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)' | head -n 1 || true
}

first_host_ip() {
  hostname -I 2>/dev/null | awk '{print $1}' || true
}

public_ip() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsS https://api.ipify.org || true
  fi
}

PUBLIC_IP="$(public_ip)"
LAN_IP="$(first_lan_ip)"
HOST_IP="$(first_host_ip)"
HOSTNAME_VALUE="$(hostname 2>/dev/null || echo localhost)"

[ -n "$HOST_IP" ] || HOST_IP="127.0.0.1"
[ -n "$LAN_IP" ] || LAN_IP="$HOST_IP"
[ -n "$PUBLIC_IP" ] || PUBLIC_IP="$HOST_IP"

cat <<EOF

============================================================
AIFT MOBILE URL REPORT
============================================================
Local only:       http://127.0.0.1:$APP_PORT
LAN mobile:       http://$LAN_IP:$APP_PORT
Host IP:          http://$HOST_IP:$APP_PORT
Public mobile:    http://$PUBLIC_IP:$APP_PORT
Local name try:   http://$HOSTNAME_VALUE.local:$APP_PORT

Best phone options:
1. Same Wi-Fi / same LAN: http://$LAN_IP:$APP_PORT
2. Public VPS access:     http://$PUBLIC_IP:$APP_PORT
3. On the VPS itself:     http://127.0.0.1:$APP_PORT

Core mobile pages:
http://$LAN_IP:$APP_PORT/health
http://$LAN_IP:$APP_PORT/connect-node
http://$LAN_IP:$APP_PORT/nodes
http://$LAN_IP:$APP_PORT/deployments
============================================================
EOF
