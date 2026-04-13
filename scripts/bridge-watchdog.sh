#!/usr/bin/env bash
# Sonohaus Bridge Watchdog
# Runs on a timer via LaunchAgent. Checks if the bridge is healthy
# and restarts it when it returns errors (e.g. lost speaker discovery).

LABEL="com.sonohaus.bridge"
LOG_DIR="$HOME/Library/Logs/Sonohaus"
LOG_FILE="${LOG_DIR}/watchdog.log"
BRIDGE_URL="http://localhost:5005/zones"
MAX_LOG_LINES=500

mkdir -p "$LOG_DIR"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG_FILE"
}

trim_log() {
  if [ -f "$LOG_FILE" ] && [ "$(wc -l < "$LOG_FILE")" -gt "$MAX_LOG_LINES" ]; then
    tail -n "$MAX_LOG_LINES" "$LOG_FILE" > "${LOG_FILE}.tmp"
    mv "${LOG_FILE}.tmp" "$LOG_FILE"
  fi
}

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$BRIDGE_URL" 2>/dev/null) || RESPONSE="000"

if [ "$RESPONSE" = "200" ]; then
  exit 0
fi

if [ "$RESPONSE" = "000" ]; then
  log "WARN bridge unreachable (no response) — skipping restart (process may be down, launchd KeepAlive handles this)"
  trim_log
  exit 0
fi

log "RESTART bridge returned HTTP ${RESPONSE} — restarting via launchctl"
launchctl kickstart -k "gui/$(id -u)/${LABEL}" 2>> "$LOG_FILE"

sleep 8

RETRY=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$BRIDGE_URL" 2>/dev/null) || RETRY="000"
if [ "$RETRY" = "200" ]; then
  log "OK bridge recovered (HTTP ${RETRY})"
else
  log "WARN bridge still unhealthy after restart (HTTP ${RETRY})"
fi

trim_log
