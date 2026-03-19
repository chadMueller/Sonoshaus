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

## 2) Run locally

```bash
npm install
npm run dev
```

Open the URL shown in terminal (for example `http://localhost:3003`).

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
