# Sonoshaus

A retro "stereo receiver stack" style UI for controlling Sonos on your network. The on-device branding reads **Sonohaus**; the project name is **Sonoshaus**.

## How it works

```text
┌─────────────────┐     HTTP (REST)      ┌──────────────────────────┐     LAN      ┌─────────┐
│  Sonoshaus UI   │ ───────────────────► │  node-sonos-http-api     │ ───────────► │  Sonos  │
│  (React + Vite) │   zones, play, vol…   │  (bridge, bundled)       │   UPnP/…    │ speakers│
└─────────────────┘                       └──────────────────────────┘              └─────────┘
```

The macOS app bundles the Sonos bridge. Open the app and your speakers appear automatically.

## Install (macOS)

1. Download **Sonohaus-x.x.x-arm64.dmg** from the [Releases page](../../releases)
2. Open the disk image, drag **Sonohaus** into **Applications**
3. If macOS blocks the app (unsigned), open **System Settings > Privacy & Security** and choose **Open Anyway**, or right-click the app > **Open** the first time
4. Launch the app. Your Sonos speakers should appear within a few seconds

## Spotify album browsing (optional)

Sonoshaus can connect to your Spotify account to browse your saved albums and queue them to Sonos.

### Setup (in-app)

1. Click **Setup** in the Library rack (Albums tab)
2. Follow the steps: create a Spotify app at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
3. Add the redirect URI shown in the app (usually `http://localhost:3000/`)
4. Paste your **Client ID** and click **Save**
5. Click **Connect** to sign in with Spotify

No client secret is needed (OAuth PKCE). Your Client ID is stored locally in the browser/app and never sent anywhere except Spotify.

## Development (from source)

### Quick start

```bash
cp .env.example .env
# Edit .env if needed (defaults work for local development)
npm install
npm run dev
```

Open the URL Vite prints (default: `http://localhost:3000`).

### Sonos bridge

The app bundles `node-sonos-http-api` and starts it automatically in the Electron build. For web development, you can either:

- Let the app use the bundled bridge (run `npm run prepare-bridge` first)
- Run the bridge separately: `git clone https://github.com/jishi/node-sonos-http-api && cd node-sonos-http-api && npm install && npm start`

Set `VITE_SONOS_API_URL` in `.env` to point at wherever the bridge is running (default: `http://localhost:5005`).

### Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Production build > `dist/` |
| `npm run preview` | Preview the production build |
| `npm run prepare-bridge` | Clone and install node-sonos-http-api into `bridge/` |
| `npm run desktop:dev` | Vite + Electron for desktop development |
| `npm run desktop:build` | Prepare bridge + build + electron-builder > DMG in `release/` |

### Building the macOS app

```bash
npm run desktop:build
```

The DMG lands in `release/`. Upload it to a GitHub Release:

```bash
gh release create v0.3.0 release/Sonohaus-0.3.0-arm64.dmg --title "v0.3.0" --notes "Release notes here"
```

**Intel Macs:** In `package.json` under `build.mac.target`, set the dmg entry's `arch` to `["x64"]` or `["x64", "arm64"]`.

## Kiosk / wall tablet (optional)

```dotenv
VITE_KIOSK_FULLSCREEN=true
VITE_KIOSK_IDLE_MINUTES=45
```

## Set-and-forget on a Mac mini

```bash
./ops/mini/install.sh
```

Installs LaunchAgents for the bridge and UI with desktop shortcuts. See `ops/mini/install.sh` for details.

## License

Add a `LICENSE` when you publish the repo if you want others to reuse the code.
