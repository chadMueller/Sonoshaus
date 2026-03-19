# Sonos Receiver UI

Retro Sonos controller UI built with React + Vite.

## 1) Configure Sonos API URL

Copy `.env.example` to `.env` and set your bridge host:

```bash
cp .env.example .env
```

If the Sonos bridge runs on your Mac mini:

```dotenv
VITE_SONOS_API_URL=http://<MAC_MINI_IP>:5005
```

Optional:

```dotenv
# Force fullscreen after first interaction + auto-reload after idle period
VITE_KIOSK_FULLSCREEN=true
VITE_KIOSK_IDLE_MINUTES=45
```

## 2) Run locally

```bash
npm install
npm run dev
```

Open the URL shown in terminal (for example `http://localhost:3003`).

## Media Stack tabs

The lower stack supports:
- Favorites
- Playlists
- Queue (if your bridge exposes queue endpoints)

`Play next` is enabled for Favorites/Playlists and automatically degrades if unsupported by your current bridge endpoint.

## 3) Mac mini Sonos bridge

Run `node-sonos-http-api` on the mini:

```bash
git clone https://github.com/jishi/node-sonos-http-api.git
cd node-sonos-http-api
npm install
npm start
```

Verify:

```bash
curl http://localhost:5005/zones
```

## 4) Tablet / Raspberry Pi usage

- Keep Sonos bridge running on the Mac mini.
- Run this UI on the device or on the mini.
- Make sure the device can reach `http://<MAC_MINI_IP>:5005`.
- Since Vite is set with `host: true`, the dev server is reachable over LAN.

For production on a Pi, build and serve static files:

```bash
npm run build
npx vite preview --host
```

## 5) Set-and-forget on Mac mini (no terminal daily)

If you want this to run automatically after reboot and manage it with desktop shortcuts:

```bash
cd "/Users/chadmueller/vibing/sonos"
./ops/mini/install.sh
```

What this does:
- Installs/builds the UI
- Installs bridge deps (from `~/node-sonos-http-api`)
- Creates macOS LaunchAgents that auto-run:
  - Sonos bridge on port `5005`
  - Sonos UI on port `3003`
- Creates desktop shortcuts:
  - `Start Sonos Remote.command`
  - `Stop Sonos Remote.command`
  - `Sonos Remote Status.command`

If your bridge repo is in a different path:

```bash
BRIDGE_DIR="/path/to/node-sonos-http-api" ./ops/mini/install.sh
```

### Later (everyday)
- Do nothing. Services restart automatically after reboot/login.
- If needed, use the desktop shortcuts to start/stop/check status.

### Uninstall

```bash
./ops/mini/uninstall.sh
```

## 6) macOS desktop app wrapper

This project includes an Electron wrapper so you can run it as a native macOS app.

Dev mode:

```bash
npm install
npm run desktop:dev
```

Build a macOS app installer:

```bash
npm run desktop:build
```

Output goes to `release/` (DMG target).
