# Sonoshaus

A retro stereo receiver UI for controlling Sonos speakers on your home network.

## Install (macOS)

Two things to install: the **bridge** (talks to your Sonos speakers) and the **app** (the UI).

### 1. Install the Sonos bridge

The bridge is a small background service that discovers and controls your Sonos speakers. It runs on the same Mac as the app.

**Requires [Node.js](https://nodejs.org) (v18 or later).**

```bash
git clone https://github.com/chadMueller/Sonoshaus.git
cd Sonoshaus
./scripts/install-bridge.command
```

Or just double-click `scripts/install-bridge.command` in Finder.

The installer will:
- Download the Sonos bridge
- Install its dependencies
- Set it up to start automatically when you log in
- Verify it found your speakers

Once installed, the bridge runs in the background on `localhost:5005`. You don't need to think about it again.

**To uninstall:** double-click `scripts/uninstall-bridge.command`.

### 2. Install the Sonohaus app

1. Download **Sonohaus-x.x.x-arm64.dmg** from the [Releases page](../../releases)
2. Open the disk image, drag **Sonohaus** into **Applications**
3. If macOS blocks the app, go to **System Settings > Privacy & Security** and click **Open Anyway**, or right-click the app and choose **Open**
4. Launch the app. Your Sonos speakers should appear within a few seconds.

## How it works

```
Sonohaus app  --HTTP-->  bridge (localhost:5005)  --LAN-->  Sonos speakers
```

The bridge ([node-sonos-http-api](https://github.com/jishi/node-sonos-http-api)) translates HTTP calls into the protocol Sonos speakers understand. The Sonohaus app is just a UI that talks to the bridge.

## Spotify album browsing (optional)

Browse your saved Spotify albums and queue them directly to Sonos. This feature currently works in the **web version** (`npm run dev`), not the packaged DMG app.

### Setup

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and create an app
2. Under **Redirect URIs**, add the URL you use to open Sonohaus (e.g. `http://localhost:3000/` or `http://192.168.x.x:3000/`)
3. Copy your **Client ID**
4. In Sonohaus, go to the Library rack and enter your Client ID in the setup panel
5. Click **Connect** to sign in with Spotify

No client secret is needed (OAuth PKCE). Your Client ID is stored locally and never sent anywhere except Spotify.

## Development

### Quick start

```bash
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:3000`. Make sure the bridge is running on `localhost:5005` (either via the installer above or manually).

### Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run desktop:dev` | Vite + Electron for desktop development |
| `npm run desktop:build` | Build + package as macOS DMG |

### Building the macOS app

```bash
npm run desktop:build
```

The DMG lands in `release/`. Upload it to a GitHub Release:

```bash
gh release create v0.4.0 release/Sonohaus-0.4.0-arm64.dmg --title "v0.4.0" --notes "Release notes"
```

**Intel Macs:** In `package.json` under `build.mac.target`, change `arch` to `["x64"]` or `["x64", "arm64"]`.

## Kiosk mode (optional)

For wall-mounted tablets or dedicated displays:

```dotenv
VITE_KIOSK_FULLSCREEN=true
VITE_KIOSK_IDLE_MINUTES=45
```

## Mac mini setup

For a dedicated Sonos controller on a Mac mini:

```bash
./ops/mini/install.sh
```

Installs LaunchAgents for the bridge and UI with desktop shortcuts. See `ops/mini/install.sh` for details.

## License

MIT
