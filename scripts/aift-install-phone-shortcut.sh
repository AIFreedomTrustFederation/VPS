#!/usr/bin/env bash
set -u

NODE_DIR="${AIFT_NODE_DIR:-$HOME/aift-termux-node-002}"
SHORTCUT_DIR="$HOME/.shortcuts"
LAUNCHER="$SHORTCUT_DIR/AIFT Cloud.sh"

mkdir -p "$SHORTCUT_DIR"

cat > "$LAUNCHER" <<EOF
#!/usr/bin/env bash
cd "$NODE_DIR" || exit 1
AIFT_NODE_DIR="$NODE_DIR" bash scripts/aift-phone-launch.sh
EOF

chmod +x "$LAUNCHER"

printf 'AIFT Cloud shortcut installed at: %s\n' "$LAUNCHER"
printf 'Add a Termux widget or shortcut to your Android home screen and choose AIFT Cloud.\n'
