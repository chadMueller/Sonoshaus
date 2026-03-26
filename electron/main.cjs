const path = require('node:path');
const http = require('node:http');
const fs = require('node:fs');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { app, BrowserWindow } = require('electron');

const isDev = Boolean(process.env.ELECTRON_START_URL);
const shouldFullscreen = String(process.env.KIOSK_FULLSCREEN || 'false').toLowerCase() === 'true';

let bridgeProcess = null;
let uiServer = null;
let uiPort = 3000;

// ---------------------------------------------------------------------------
// Utility: find a free TCP port starting from `start`
// ---------------------------------------------------------------------------
function findFreePort(start) {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', () => resolve(findFreePort(start + 1)));
    srv.listen(start, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

// ---------------------------------------------------------------------------
// Static file server for the built UI (replaces file:// loading)
// ---------------------------------------------------------------------------
const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function startUiServer(distDir, port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${port}`);
      let filePath = path.join(distDir, url.pathname === '/' ? 'index.html' : url.pathname);

      // If path doesn't exist or is a directory, serve index.html (SPA fallback)
      try {
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) filePath = path.join(distDir, 'index.html');
      } catch {
        filePath = path.join(distDir, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME[ext] || 'application/octet-stream';

      try {
        const data = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    server.listen(port, '127.0.0.1', () => {
      uiServer = server;
      resolve(server);
    });
  });
}

// ---------------------------------------------------------------------------
// Sonos bridge (node-sonos-http-api) child process
// ---------------------------------------------------------------------------
function getBridgePath() {
  // In packaged app: resources/app.asar.unpacked/bridge or resources/app/bridge
  // In dev: ./bridge
  const candidates = [
    path.join(__dirname, '..', 'bridge'),
    path.join(process.resourcesPath || '', 'app', 'bridge'),
    path.join(process.resourcesPath || '', 'app.asar.unpacked', 'bridge'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'server.js'))) return candidate;
  }
  return null;
}

function startBridge() {
  const bridgePath = getBridgePath();
  if (!bridgePath) {
    console.warn('[main] Bridge not found, skipping. Install manually or run scripts/prepare-bridge.sh');
    return null;
  }

  console.log('[main] Starting Sonos bridge from', bridgePath);
  const child = spawn(process.execPath.includes('Electron') ? 'node' : process.execPath, ['server.js'], {
    cwd: bridgePath,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: '5005' },
  });

  child.stdout.on('data', (d) => console.log('[bridge]', d.toString().trim()));
  child.stderr.on('data', (d) => console.error('[bridge]', d.toString().trim()));
  child.on('error', (err) => console.error('[main] Bridge spawn error:', err.message));
  child.on('exit', (code) => {
    console.log('[main] Bridge exited with code', code);
    bridgeProcess = null;
  });

  bridgeProcess = child;
  return child;
}

function waitForBridge(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve) => {
    function poll() {
      if (Date.now() > deadline) {
        console.warn('[main] Bridge did not respond within', timeoutMs, 'ms');
        resolve(false);
        return;
      }
      http.get(url, (res) => {
        res.resume();
        resolve(true);
      }).on('error', () => {
        setTimeout(poll, 300);
      });
    }
    poll();
  });
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------
function createWindow(loadUrl) {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    autoHideMenuBar: true,
    fullscreen: shouldFullscreen,
    backgroundColor: '#0b0b0b',
    title: 'Sonohaus',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.loadURL(loadUrl);
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------
app.whenReady().then(async () => {
  // 1. Start the Sonos bridge
  startBridge();
  const bridgeReady = await waitForBridge('http://127.0.0.1:5005/zones', 10000);
  if (bridgeReady) {
    console.log('[main] Bridge is ready');
  }

  // 2. Determine UI URL
  let loadUrl;
  if (isDev) {
    loadUrl = process.env.ELECTRON_START_URL;
  } else {
    const distDir = path.join(__dirname, '..', 'dist');
    uiPort = await findFreePort(3000);
    await startUiServer(distDir, uiPort);
    loadUrl = `http://127.0.0.1:${uiPort}`;
    console.log('[main] UI server on', loadUrl);
  }

  // 3. Open window
  createWindow(loadUrl);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(loadUrl);
    }
  });
});

app.on('before-quit', () => {
  if (bridgeProcess) {
    console.log('[main] Stopping bridge');
    bridgeProcess.kill();
    bridgeProcess = null;
  }
  if (uiServer) {
    uiServer.close();
    uiServer = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
