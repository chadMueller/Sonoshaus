#!/usr/bin/env bash
set -euo pipefail

DOMAIN="gui/$(id -u)"
API_LABEL="com.chadmueller.sonos-api"
UI_LABEL="com.chadmueller.sonos-ui"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
API_PLIST="${LAUNCH_AGENTS_DIR}/${API_LABEL}.plist"
UI_PLIST="${LAUNCH_AGENTS_DIR}/${UI_LABEL}.plist"

if [[ ! -f "${API_PLIST}" || ! -f "${UI_PLIST}" ]]; then
  echo "LaunchAgents not installed yet."
  echo "Run: ./ops/mini/install.sh"
  exit 1
fi

launchctl bootout "${DOMAIN}" "${API_PLIST}" >/dev/null 2>&1 || true
launchctl bootout "${DOMAIN}" "${UI_PLIST}" >/dev/null 2>&1 || true

launchctl bootstrap "${DOMAIN}" "${API_PLIST}"
launchctl bootstrap "${DOMAIN}" "${UI_PLIST}"
launchctl kickstart -k "${DOMAIN}/${API_LABEL}"
launchctl kickstart -k "${DOMAIN}/${UI_LABEL}"

echo "Started Sonos services."
