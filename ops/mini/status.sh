#!/usr/bin/env bash
set -euo pipefail

DOMAIN="gui/$(id -u)"
API_LABEL="com.chadmueller.sonos-api"
UI_LABEL="com.chadmueller.sonos-ui"

echo "=== Sonos API ==="
launchctl print "${DOMAIN}/${API_LABEL}" 2>/dev/null | sed -n '1,40p' || echo "Not loaded"
echo
echo "=== Sonos UI ==="
launchctl print "${DOMAIN}/${UI_LABEL}" 2>/dev/null | sed -n '1,40p' || echo "Not loaded"
echo
echo "=== Health checks ==="
curl -sS "http://localhost:5005/zones" >/dev/null && echo "API: reachable" || echo "API: unreachable"
curl -sS "http://localhost:3003" >/dev/null && echo "UI: reachable" || echo "UI: unreachable"
