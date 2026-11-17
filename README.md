# Sonoshaus

A retro stereo receiver UI for controlling Sonos speakers on your home network.

## Quick Start

You need two things: a **bridge** (background service that talks to your Sonos) and the **app** (the UI).

### Requirements

- macOS (Apple Silicon)
- [Node.js](https://nodejs.org) v18 or later
- Sonos speakers on your local network

### Step 1: Install the bridge

```bash
git clone https://github.com/chadMueller/Sonoshaus.git
cd Sonoshaus
./scripts/install-bridge.command
```

Or double-click `scripts/install-bridge.command` in Finder. It will download the Sonos bridge, install it, and set it to start automatically when you log in. You only do this once.

### Step 2: Install the app

1. Download the latest `.dmg` from the [Releases page](../../releases)
2. Open the disk image, drag **Sonohaus** into **Applications**
3. If macOS blocks the app: **System Settings > Privacy & Security > Open Anyway**
4. Open the app. Your speakers should appear within a few seconds.

### Step 3: Connect Spotify (optional)

Spotify library browsing requires a **free Spotify developer app** tied to your account (~2 minutes, one-time). Spotify does not allow shared credentials for public apps in dev mode.

1. In Sonohaus, open the **Library** section and tap **Setup**
2. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) and create an app
3. Add redirect URI: `http://127.0.0.1:38901/callback` (desktop) or your web URL + `/` for local dev
4. Copy your **Client ID** into Setup, tap **Save**, then **Connect** and sign in

**Release builds** use `.env.production` (empty Client ID) so every user runs Setup with their own app. For local dev, set `VITE_SPOTIFY_CLIENT_ID` in `.env`.

The Spotify session syncs between the web UI and desktop app via a small token server on `localhost:38901` (installed with the bridge).

## How it works

```
Sonohaus app  -->  bridge (localhost:5005)  -->  Sonos speakers
```

The bridge ([node-sonos-http-api](https://github.com/jishi/node-sonos-http-api)) runs in the background and translates HTTP calls into the protocol Sonos speakers understand. The Sonohaus app is a UI that talks to the bridge.

For Spotify, a small token server (`localhost:38901`) shares your Spotify session between the web UI and the desktop app. Both are installed by the bridge installer script.

## Uninstall

Double-click `scripts/uninstall-bridge.command` to remove the bridge and token server.

To remove the app, drag Sonohaus out of Applications.

## Development

```bash
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:3000`. Bridge must be running on `localhost:5005`.

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Production build to `dist/` |
| `npm run desktop:build` | Build + package as macOS DMG |

## Full screen (macOS app)

Uses native **macOS Space fullscreen** — the app moves to its own desktop when you go full screen.

- Click **Full screen** on the receiver faceplate (left of the brand), or
- **View → Enter Full Screen**, or
- **⌃⌘F** (Control–Command–F), or
- The green window button

Exit with the same controls, or swipe to your main desktop with a trackpad gesture.

## Kiosk mode

For wall-mounted tablets or dedicated displays, add to `.env`:

```dotenv
VITE_KIOSK_FULLSCREEN=true
VITE_KIOSK_IDLE_MINUTES=45
```

## Mac mini setup

For a dedicated always-on Sonos controller:

```bash
./ops/mini/install.sh
```

## License

MIT
