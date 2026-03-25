# Sonoshaus

A retro “stereo receiver stack” style UI for controlling Sonos on your network. The on-device branding reads **Sonohaus**; the project name is **Sonoshaus**.

## How it works

```text
┌─────────────────┐     HTTP (REST)      ┌──────────────────────────┐     LAN      ┌─────────┐
│  Sonoshaus UI   │ ───────────────────► │  node-sonos-http-api     │ ───────────► │  Sonos  │
│  (React + Vite) │   zones, play, vol…   │  (bridge, e.g. :5005)    │   UPnP/…    │ speakers│
└─────────────────┘                       └──────────────────────────┘              └─────────┘
```

1. **[node-sonos-http-api](https://github.com/jishi/node-sonos-http-api)** runs on a Mac, PC, or Raspberry Pi on the same network as your speakers. It exposes a simple HTTP API around Sonos’s local protocol.
2. **Sonoshaus** is a static React app that calls that API: rooms/zones, transport, volume, favorites, playlists, and queue (depending on what the bridge exposes).
3. **Electron** (optional) wraps the built UI so you can run it like a normal macOS app. The UI is still static files; it does not bundle the bridge.

There are no Sonos or Spotify API keys in the default code path for basic control—only the **bridge URL** you configure. Optional Spotify-related variables in `.env.example` are for integrations you add yourself.

## Requirements

- Node.js 18+ recommended  
- A running **node-sonos-http-api** instance reachable from the machine running the UI  
- Network path from the browser (or Electron) to `http://<bridge-host>:5005` (default port for the bridge)

## Install

### macOS (from the DMG in this repo)

1. On GitHub, open **`release/`** and download **`Sonohaus-*-arm64.dmg`** (Apple Silicon). Or clone the repo and double-click the file locally.
2. Open the disk image, drag **Sonohaus** into **Applications**.
3. If macOS blocks the app (unsigned / not notarized), open **System Settings → Privacy & Security** and choose **Open Anyway** for Sonohaus, or right‑click the app → **Open** the first time.
4. Run **[node-sonos-http-api](https://github.com/jishi/node-sonos-http-api)** on your LAN (see **Sonos bridge** below). The packaged app talks to whatever **`VITE_SONOS_API_URL`** was set at **build** time; if that doesn’t match your setup, set `.env` and run `npm run desktop:build` again, or use **`npm run dev`** / a hosted web build with the right env.

### Web / dev (from source)

Use **Quick start** below (`npm install`, `.env`, `npm run dev`).

## Quick start

```bash
cp .env.example .env
# Edit .env — set VITE_SONOS_API_URL to your bridge (see below)
npm install
npm run dev
```

Open the URL Vite prints (dev server uses port **3000** by default).

### Pointing at the bridge

Set `VITE_SONOS_API_URL` to wherever the API listens, for example:

- Bridge on the same computer: `http://localhost:5005`
- Bridge on another device: `http://192.168.x.x:5005`

`VITE_*` variables are **inlined at build time** (they end up in public JavaScript—do not put secrets there). After changing them, run `npm run build` again before packaging or deploying static files. Keep private values in **`.env`** only; that file is gitignored.

## Scripts

| Command | Purpose |
|--------|---------|
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview the production build |
| `npm run desktop:dev` | Vite + Electron for desktop development |
| `npm run desktop:build` | `npm run build` then `electron-builder` → macOS `.dmg` in `release/` |

## macOS app (DMG)

Build a signed/unsigned installer locally:

```bash
npm run desktop:build
```

The build is tuned to trim what we can: English-only Electron locales (`electronLanguages`), **maximum** asar compression, **ARM64-only** Apple Silicon builds, **ULFO** DMG layout, and no production sourcemaps. Expect a **modest** drop (on the order of a few MB at most)—almost all of the size is Chromium inside Electron. To go meaningfully smaller you’d need a different shell (e.g. Tauri) or ship the web UI in a browser only.

**Intel Macs:** in `package.json` under `build.mac.target`, set the dmg entry’s `arch` to `["x64"]` or `["x64", "arm64"]` (universal is larger).

**`release/*.dmg`** — the disk image is **tracked in git** so clones include a ready-to-open macOS build. Unpacked `release/mac-arm64/` and other electron-builder scratch output stay ignored (large, reproducible from source).

If a `.dmg` exceeds [GitHub’s ~100 MB file limit](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage), use [Git LFS](https://git-lfs.com) for that file or attach it to a [GitHub Release](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases) instead.

## Sonos bridge (node-sonos-http-api)

```bash
git clone https://github.com/jishi/node-sonos-http-api.git
cd node-sonos-http-api
npm install
npm start
```

Smoke test:

```bash
curl http://localhost:5005/zones
```

## Media stack

The lower panel supports **Favorites**, **Playlists**, and **Queue** when the bridge exposes those endpoints. **Play next** is enabled for favorites/playlists and degrades gracefully if the bridge does not support it.

## Kiosk / wall tablet (optional)

```dotenv
VITE_KIOSK_FULLSCREEN=true
VITE_KIOSK_IDLE_MINUTES=45
```

## Set-and-forget on a Mac mini

From this directory:

```bash
./ops/mini/install.sh
```

This can install LaunchAgents for the bridge and UI, and add desktop shortcuts (`Start` / `Stop` / `Status` Sonos Remote). See `ops/mini/install.sh` for paths and overrides (e.g. `BRIDGE_DIR`).

Uninstall: `./ops/mini/uninstall.sh`

## License

Add a `LICENSE` when you publish the repo if you want others to reuse the code.
