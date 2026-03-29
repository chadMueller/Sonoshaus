#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Sonohaus Bridge Uninstaller
# Removes the Sonos bridge service and optionally its files.
# Double-click this file to run.
# ============================================================================

BRIDGE_DIR="$HOME/Library/Application Support/Sonohaus/bridge"
LABEL="com.sonohaus.bridge"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
TOKEN_LABEL="com.sonohaus.token-server"
TOKEN_PLIST="$HOME/Library/LaunchAgents/${TOKEN_LABEL}.plist"
LOG_DIR="$HOME/Library/Logs/Sonohaus"

echo ""
echo "  Sonohaus Bridge Uninstaller"
echo "  ==========================="
echo ""

if [ ! -f "$PLIST" ]; then
  echo "  Bridge is not installed. Nothing to do."
  echo ""
  read -n 1 -s -r -p "  Press any key to close..."
  exit 0
fi

# --- Stop services ---
echo "  Stopping bridge and token server..."
launchctl bootout "gui/$(id -u)" "$PLIST" >/dev/null 2>&1 || true
launchctl bootout "gui/$(id -u)" "$TOKEN_PLIST" >/dev/null 2>&1 || true
rm -f "$PLIST" "$TOKEN_PLIST"
echo "  Services removed."

# --- Ask about files ---
echo ""
echo "  Remove bridge files at:"
echo "    ${BRIDGE_DIR}"
echo ""
read -p "  Delete bridge files? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  rm -rf "$BRIDGE_DIR"
  echo "  Bridge files deleted."
else
  echo "  Bridge files kept."
fi

# --- Clean up logs ---
read -p "  Delete log files? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  rm -rf "$LOG_DIR"
  echo "  Logs deleted."
else
  echo "  Logs kept."
fi

echo ""
echo "  Bridge uninstalled."
echo ""
read -n 1 -s -r -p "  Press any key to close..."
