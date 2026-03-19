#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SONOS_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BRIDGE_DIR="${BRIDGE_DIR:-$HOME/node-sonos-http-api}"
NPM_BIN="$(command -v npm || true)"
DOMAIN="gui/$(id -u)"

API_LABEL="com.chadmueller.sonos-api"
UI_LABEL="com.chadmueller.sonos-ui"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
LOG_DIR="$HOME/Library/Logs/sonos-remote"
API_PLIST="${LAUNCH_AGENTS_DIR}/${API_LABEL}.plist"
UI_PLIST="${LAUNCH_AGENTS_DIR}/${UI_LABEL}.plist"

if [[ -z "${NPM_BIN}" ]]; then
  echo "npm not found. Install Node.js first."
  exit 1
fi

if [[ ! -d "${BRIDGE_DIR}" ]]; then
  echo "Bridge directory not found at: ${BRIDGE_DIR}"
  echo "Clone it first:"
  echo "  git clone https://github.com/jishi/node-sonos-http-api.git \"${BRIDGE_DIR}\""
  exit 1
fi

mkdir -p "${LAUNCH_AGENTS_DIR}" "${LOG_DIR}"

if [[ ! -f "${SONOS_DIR}/.env" ]]; then
  cat > "${SONOS_DIR}/.env" <<'EOF'
VITE_SONOS_API_URL=http://localhost:5005
EOF
  echo "Created ${SONOS_DIR}/.env with localhost Sonos API."
fi

echo "Installing dependencies and building UI..."
"${NPM_BIN}" --prefix "${SONOS_DIR}" install
"${NPM_BIN}" --prefix "${SONOS_DIR}" run build
"${NPM_BIN}" --prefix "${BRIDGE_DIR}" install

cat > "${API_PLIST}" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${API_LABEL}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>-lc</string>
    <string>cd "${BRIDGE_DIR}" &amp;&amp; "${NPM_BIN}" start</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${BRIDGE_DIR}</string>
  <key>StandardOutPath</key>
  <string>${LOG_DIR}/sonos-api.out.log</string>
  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/sonos-api.err.log</string>
</dict>
</plist>
EOF

cat > "${UI_PLIST}" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${UI_LABEL}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>-lc</string>
    <string>cd "${SONOS_DIR}" &amp;&amp; "${NPM_BIN}" run preview -- --host 0.0.0.0 --port 3003</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${SONOS_DIR}</string>
  <key>StandardOutPath</key>
  <string>${LOG_DIR}/sonos-ui.out.log</string>
  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/sonos-ui.err.log</string>
</dict>
</plist>
EOF

launchctl bootout "${DOMAIN}" "${API_PLIST}" >/dev/null 2>&1 || true
launchctl bootout "${DOMAIN}" "${UI_PLIST}" >/dev/null 2>&1 || true

launchctl bootstrap "${DOMAIN}" "${API_PLIST}"
launchctl bootstrap "${DOMAIN}" "${UI_PLIST}"
launchctl enable "${DOMAIN}/${API_LABEL}" || true
launchctl enable "${DOMAIN}/${UI_LABEL}" || true
launchctl kickstart -k "${DOMAIN}/${API_LABEL}"
launchctl kickstart -k "${DOMAIN}/${UI_LABEL}"

START_SHORTCUT="$HOME/Desktop/Start Sonos Remote.command"
STOP_SHORTCUT="$HOME/Desktop/Stop Sonos Remote.command"
STATUS_SHORTCUT="$HOME/Desktop/Sonos Remote Status.command"

cat > "${START_SHORTCUT}" <<EOF
#!/usr/bin/env bash
set -euo pipefail
"${SONOS_DIR}/ops/mini/start.sh"
echo
echo "Press any key to close..."
read -n 1
EOF

cat > "${STOP_SHORTCUT}" <<EOF
#!/usr/bin/env bash
set -euo pipefail
"${SONOS_DIR}/ops/mini/stop.sh"
echo
echo "Press any key to close..."
read -n 1
EOF

cat > "${STATUS_SHORTCUT}" <<EOF
#!/usr/bin/env bash
set -euo pipefail
"${SONOS_DIR}/ops/mini/status.sh"
echo
echo "Press any key to close..."
read -n 1
EOF

chmod +x "${START_SHORTCUT}" "${STOP_SHORTCUT}" "${STATUS_SHORTCUT}"
chmod +x "${SONOS_DIR}/ops/mini/"*.sh

MINI_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"

echo
echo "Installed and started:"
echo "  - ${API_LABEL}"
echo "  - ${UI_LABEL}"
echo
echo "UI URL: http://${MINI_IP:-<mini-ip>}:3003"
echo "API URL: http://${MINI_IP:-<mini-ip>}:5005"
echo
echo "Desktop shortcuts created:"
echo "  - ${START_SHORTCUT}"
echo "  - ${STOP_SHORTCUT}"
echo "  - ${STATUS_SHORTCUT}"
