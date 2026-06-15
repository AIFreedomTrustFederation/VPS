#!/usr/bin/env bash
set -u

TERMUX_DIR="$HOME/.termux"
PROPS="$TERMUX_DIR/termux.properties"
mkdir -p "$TERMUX_DIR"
touch "$PROPS"

if grep -q '^allow-external-apps' "$PROPS"; then
  sed -i 's/^allow-external-apps.*/allow-external-apps = true/' "$PROPS"
else
  printf '\nallow-external-apps = true\n' >> "$PROPS"
fi

if command -v termux-reload-settings >/dev/null 2>&1; then
  termux-reload-settings >/dev/null 2>&1 || true
fi

printf 'AIFT Termux bridge enabled in %s\n' "$PROPS"
printf 'Restart Termux if Android does not apply the setting immediately.\n'
