const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require('electron');
const { startSpotifyTokenServer } = require('./spotify-token-server.cjs');

const isDev = Boolean(process.env.ELECTRON_START_URL);
const shouldFullscreen = String(process.env.KIOSK_FULLSCREEN || 'false').toLowerCase() === 'true';
const isMac = process.platform === 'darwin';

function notifyFullscreenState(win) {
  if (!win || win.isDestroyed()) return;
  win.webContents.send('sonohaus:fullscreen-changed', win.isFullScreen());
}

function buildApplicationMenu() {
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'togglefullscreen' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        ...(isMac
          ? [{ role: 'zoom' }, { type: 'separator' }, { role: 'front' }]
          : [{ role: 'close' }]),
      ],
    },
  ];

  if (!isMac) {
    template.push({
      role: 'help',
      submenu: [
        {
          label: 'SonosHaus website',
          click: () => shell.openExternal('https://www.sonoshaus.com'),
        },
      ],
    });
  }

  return Menu.buildFromTemplate(template);
}

function getInstallerPath() {
  if (isDev) {
    return path.join(__dirname, '..', 'scripts', 'install-bridge.command');
  }
  return path.join(process.resourcesPath, 'bridge-installer', 'install-bridge.command');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    autoHideMenuBar: true,
    fullscreenable: true,
    fullscreen: shouldFullscreen,
    backgroundColor: '#0b0b0b',
    title: 'Sonohaus',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  win.on('enter-full-screen', () => notifyFullscreenState(win));
  win.on('leave-full-screen', () => notifyFullscreenState(win));

  if (isDev) {
    win.loadURL(process.env.ELECTRON_START_URL);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  win.webContents.on('did-finish-load', () => notifyFullscreenState(win));

  return win;
}

ipcMain.handle('sonohaus:fullscreen-is-active', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return win?.isFullScreen() ?? false;
});

ipcMain.handle('sonohaus:fullscreen-toggle', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return false;
  const next = !win.isFullScreen();
  win.setFullScreen(next);
  return next;
});

ipcMain.handle('sonohaus:fullscreen-set', (event, value) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return false;
  win.setFullScreen(Boolean(value));
  return win.isFullScreen();
});

ipcMain.handle('sonohaus:open-external', async (_event, url) => {
  if (typeof url !== 'string' || !url.startsWith('https://')) {
    return { ok: false, message: 'Only HTTPS URLs are allowed' };
  }
  try {
    await shell.openExternal(url);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err?.message || String(err) };
  }
});

ipcMain.handle('sonohaus:open-bridge-installer', async () => {
  if (process.platform !== 'darwin') {
    return {
      ok: false,
      message: 'The bundled bridge installer is for macOS. Install node-sonos-http-api manually on this platform.',
    };
  }

  const installerPath = getInstallerPath();
  if (!fs.existsSync(installerPath)) {
    return {
      ok: false,
      message: `Installer not found at ${installerPath}. Reinstall Sonohaus or run scripts/install-bridge.command from the repo.`,
    };
  }

  try {
    fs.chmodSync(installerPath, 0o755);
  } catch {
    // non-fatal
  }

  try {
    const child = spawn('open', [installerPath], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message: err?.message || String(err),
    };
  }
});

app.whenReady().then(async () => {
  Menu.setApplicationMenu(buildApplicationMenu());

  const tokenServer = await startSpotifyTokenServer();
  if (tokenServer?.reason === 'legacy-port-blocked') {
    dialog.showMessageBoxSync({
      type: 'warning',
      title: 'Spotify helper',
      message: 'An older Sonohaus service is using port 38901.',
      detail:
        'Re-run the bridge installer from Sonohaus (or run install-bridge.command from the app bundle). Alternatively unload the legacy job: launchctl bootout gui/$UID ~/Library/LaunchAgents/com.sonohaus.token-server.plist — then restart Sonohaus.',
    });
  }
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

