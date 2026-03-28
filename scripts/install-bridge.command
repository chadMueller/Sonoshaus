#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Sonohaus Bridge Installer
# Installs node-sonos-http-api as a background service on macOS.
# Double-click this file to run.
# ============================================================================

BRIDGE_DIR="$HOME/Library/Application Support/Sonohaus/bridge"
BRIDGE_REPO="https://github.com/jishi/node-sonos-http-api.git"
LABEL="com.sonohaus.bridge"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
LOG_DIR="$HOME/Library/Logs/Sonohaus"

echo ""
echo "  Sonohaus Bridge Installer"
echo "  ========================="
echo ""

# --- Check for Node.js ---
if ! command -v node >/dev/null 2>&1; then
  echo "  Node.js is required but not installed."
  echo ""
  echo "  Install it from: https://nodejs.org"
  echo "  Or with Homebrew: brew install node"
  echo ""
  echo "  After installing Node.js, run this installer again."
  echo ""
  read -n 1 -s -r -p "  Press any key to close..."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "  npm is required but not found."
  echo "  It usually comes with Node.js: https://nodejs.org"
  echo ""
  read -n 1 -s -r -p "  Press any key to close..."
  exit 1
fi

NODE_BIN="$(command -v node)"
NPM_BIN="$(command -v npm)"
echo "  Found Node.js: $NODE_BIN"
echo "  Found npm:     $NPM_BIN"
echo ""

# --- Check if already installed ---
if [ -f "$PLIST" ]; then
  echo "  Bridge is already installed."
  echo ""
  echo "  To reinstall, run the uninstall script first:"
  echo "    scripts/uninstall-bridge.command"
  echo ""
  # Check if it's running
  if curl -s --max-time 2 http://localhost:5005/zones >/dev/null 2>&1; then
    echo "  Bridge is running and healthy on localhost:5005"
  else
    echo "  Bridge may not be running. Trying to start it..."
    launchctl bootout "gui/$(id -u)" "$PLIST" >/dev/null 2>&1 || true
    launchctl bootstrap "gui/$(id -u)" "$PLIST"
    sleep 3
    if curl -s --max-time 2 http://localhost:5005/zones >/dev/null 2>&1; then
      echo "  Bridge is now running on localhost:5005"
    else
      echo "  Bridge may still be starting. Give it 10-15 seconds."
    fi
  fi
  echo ""
  read -n 1 -s -r -p "  Press any key to close..."
  exit 0
fi

# --- Clone bridge ---
echo "  Downloading Sonos bridge..."
mkdir -p "$(dirname "$BRIDGE_DIR")"
if [ -d "$BRIDGE_DIR" ]; then
  rm -rf "$BRIDGE_DIR"
fi
git clone --depth 1 "$BRIDGE_REPO" "$BRIDGE_DIR" 2>&1 | sed 's/^/  /'
echo ""

# --- Install dependencies ---
echo "  Installing dependencies (this may take a minute)..."
cd "$BRIDGE_DIR"
"$NPM_BIN" install --production --no-optional 2>&1 | tail -3 | sed 's/^/  /'
echo ""

# --- Create LaunchAgent ---
echo "  Setting up auto-start..."
mkdir -p "$HOME/Library/LaunchAgents" "$LOG_DIR"

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ProgramArguments</key>
  <array>
    <string>${NODE_BIN}</string>
    <string>${BRIDGE_DIR}/server.js</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${BRIDGE_DIR}</string>
  <key>StandardOutPath</key>
  <string>${LOG_DIR}/bridge.out.log</string>
  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/bridge.err.log</string>
</dict>
</plist>
EOF

# --- Start the bridge ---
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "  Bridge installed and starting..."
echo ""

# --- Verify ---
sleep 4
if curl -s --max-time 3 http://localhost:5005/zones >/dev/null 2>&1; then
  ROOM_COUNT=$(curl -s http://localhost:5005/zones | python3 -c "import sys,json; zones=json.load(sys.stdin); print(sum(len(z.get('members',[])) for z in zones))" 2>/dev/null || echo "?")
  echo "  SUCCESS! Bridge is running on localhost:5005"
  echo "  Found ${ROOM_COUNT} Sonos speakers on your network."
else
  echo "  Bridge is starting up. It may take 10-15 seconds to"
  echo "  discover all your Sonos speakers."
  echo ""
  echo "  If it doesn't work, check the logs at:"
  echo "    ${LOG_DIR}/bridge.err.log"
fi

echo ""
echo "  The bridge will start automatically when you log in."
echo "  Open the Sonohaus app and your speakers should appear."
echo ""
read -n 1 -s -r -p "  Press any key to close..."
