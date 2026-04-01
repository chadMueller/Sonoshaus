const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const { startSpotifyTokenServer } = require('./spotify-token-server.cjs');

const isDev = Boolean(process.env.ELECTRON_START_URL);
const shouldFullscreen = String(process.env.KIOSK_FULLSCREEN || 'false').toLowerCase() === 'true';

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

  if (isDev) {
    win.loadURL(process.env.ELECTRON_START_URL);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

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

