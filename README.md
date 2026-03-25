# Sonoshaus

A retro “car stereo” style UI for controlling Sonos on your network. The on-device branding reads **Sonohaus**; the project name is **Sonoshaus**.

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

There are no Sonos or Spotify API keys inside this repo’s runtime path for basic control—only the **bridge URL** you configure. Optional Spotify-related variables in `.env.example` are for integrations you wire up yourself; treat secrets as described below.

## Requirements

- Node.js 18+ recommended  
- A running **node-sonos-http-api** instance reachable from the machine running the UI  
- Network path from the browser (or Electron) to `http://<bridge-host>:5005` (default port for the bridge)

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

`VITE_*` variables are **inlined at build time**. After changing them, run `npm run build` again before packaging or deploying static files.

## Scripts

| Command | Purpose |
|--------|---------|
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview the production build |
| `npm run desktop:dev` | Vite + Electron for desktop development |
| `npm run desktop:build` | `npm run build` then `electron-builder` (output under `release/`) |

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

## Security & GitHub

- **Never commit `.env`.** It is listed in `.gitignore`. Only `.env.example` belongs in git.
- **Do not put secrets in `VITE_*` variables.** Anything prefixed with `VITE_` is embedded in the client JavaScript anyone can read. Use non-`VITE_` env vars for server-side tooling, or a small backend you control.
- **Build artifacts** (`dist/`, `release/`) are gitignored. Clone → `npm install` → `npm run build` before `desktop:build`.
- If you previously had API keys only in `.env`, rotate them in the relevant dashboards (e.g. Spotify Developer) if there was any chance they were copied or committed.

## License

Add a `LICENSE` when you publish the repo if you want others to reuse the code.
