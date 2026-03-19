#!/usr/bin/env bash
set -euo pipefail

DOMAIN="gui/$(id -u)"
API_LABEL="com.chadmueller.sonos-api"
UI_LABEL="com.chadmueller.sonos-ui"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
API_PLIST="${LAUNCH_AGENTS_DIR}/${API_LABEL}.plist"
UI_PLIST="${LAUNCH_AGENTS_DIR}/${UI_LABEL}.plist"

launchctl bootout "${DOMAIN}" "${API_PLIST}" >/dev/null 2>&1 || true
launchctl bootout "${DOMAIN}" "${UI_PLIST}" >/dev/null 2>&1 || true

echo "Stopped Sonos services."
