// Spotify token sync + OAuth callback (same behavior as scripts/token-server.cjs).
// Started from Electron main so DMG users get Connect without installing the bridge first.
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 38901;
const TOKEN_FILE = path.join(
  process.env.HOME || '/tmp',
  'Library',
  'Application Support',
  'Sonohaus',
  'spotify-tokens.json',
);
const PENDING_AUTH_FILE = path.join(
  process.env.HOME || '/tmp',
  'Library',
  'Application Support',
  'Sonohaus',
  'pending-auth.json',
);

fs.mkdirSync(path.dirname(TOKEN_FILE), { recursive: true });

/** Normalize path for routing (handles query strings and trailing slashes). */
function requestPathname(req) {
  try {
    const u = new URL(req.url, 'http://127.0.0.1');
    let p = u.pathname || '/';
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return p;
  } catch {
    return '/';
  }
}

function readTokens() {
  try {
    return fs.readFileSync(TOKEN_FILE, 'utf8');
  } catch {
    return '{}';
  }
}

function writeTokens(data) {
  fs.writeFileSync(TOKEN_FILE, data, 'utf8');
}

function readPendingAuth() {
  try {
    return JSON.parse(fs.readFileSync(PENDING_AUTH_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function writePendingAuth(data) {
  fs.writeFileSync(PENDING_AUTH_FILE, JSON.stringify(data), 'utf8');
}

function clearPendingAuth() {
  try {
    fs.unlinkSync(PENDING_AUTH_FILE);
  } catch {}
}

function spotifyTokenExchange(params) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(params).toString();
    const req = https.request(
      'https://accounts.spotify.com/api/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`Spotify token exchange failed (${res.statusCode}): ${data}`));
          }
        });
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * True if POST /auth/prepare exists (not a legacy token server).
 * Sends invalid JSON so the handler returns 400 without writing pending auth.
 */
function probeAuthPrepareRouteExists() {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: '/auth/prepare',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': 1,
        },
        timeout: 2000,
      },
      (res) => {
        res.resume();
        res.on('end', () => {
          resolve(res.statusCode !== 404);
        });
      },
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.write('x');
    req.end();
  });
}

/**
 * @returns {Promise<{ ok: boolean, started?: boolean, reason?: string }>}
 */
function startSpotifyTokenServer() {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (payload) => {
      if (settled) return;
      settled = true;
      resolve(payload);
    };

    const server = http.createServer(async (req, res) => {
      const pathname = requestPathname(req);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (pathname === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, authPrepare: true, version: 2 }));
        return;
      }

      if (pathname === '/tokens' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(readTokens());
        return;
      }

      if (pathname === '/tokens' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          writeTokens(body);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end('{"ok":true}');
        });
        return;
      }

      if (pathname === '/auth/prepare' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            writePendingAuth(data);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end('{"ok":true}');
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: err.message }));
          }
        });
        return;
      }

      if (pathname === '/callback' && req.method === 'GET') {
        const url = new URL(req.url, `http://localhost:${PORT}`);
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        if (error) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(
            `<html><body style="background:#0b0b0b;color:#e58d3d;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><h2>Spotify Auth Error</h2><p>${error}</p><p>You can close this tab and try again in Sonohaus.</p></div></body></html>`,
          );
          clearPendingAuth();
          return;
        }

        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<html><body>Missing authorization code.</body></html>');
          return;
        }

        const pending = readPendingAuth();
        if (!pending?.verifier || !pending?.clientId || !pending?.redirectUri) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(
            `<html><body style="background:#0b0b0b;color:#e58d3d;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><h2>Auth Session Expired</h2><p>No pending auth found. Try connecting again from Sonohaus.</p></div></body></html>`,
          );
          return;
        }

        try {
          const tokenData = await spotifyTokenExchange({
            client_id: pending.clientId,
            grant_type: 'authorization_code',
            code,
            redirect_uri: pending.redirectUri,
            code_verifier: pending.verifier,
          });

          const nowSec = Math.floor(Date.now() / 1000);
          const tokens = {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token || null,
            token_type: tokenData.token_type || 'Bearer',
            scope: tokenData.scope || '',
            expires_at: nowSec + Number(tokenData.expires_in || 0),
          };

          writeTokens(JSON.stringify({ tokens, clientId: pending.clientId }));
          clearPendingAuth();

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(
            `<html><body style="background:#0b0b0b;color:#e58d3d;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><h2>Connected!</h2><p>Spotify is now linked to Sonohaus.</p><p>You can close this tab.</p></div></body></html>`,
          );
        } catch (err) {
          clearPendingAuth();
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(
            `<html><body style="background:#0b0b0b;color:#e58d3d;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><h2>Token Exchange Failed</h2><p>${err.message}</p><p>Try connecting again from Sonohaus.</p></div></body></html>`,
          );
        }
        return;
      }

      if (pathname === '/ping') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"ok":true}');
        return;
      }

      res.writeHead(404);
      res.end('Not found');
    });

    server.on('error', async (err) => {
      if (err.code === 'EADDRINUSE') {
        const supports = await probeAuthPrepareRouteExists();
        if (supports) {
          console.log('[spotify-token-server] port 38901 in use — token helper already running (OK)');
          finish({ ok: true, started: false, reason: 'already-running' });
          return;
        }
        console.error(
          '[spotify-token-server] Port 38901 is in use by a legacy helper without Spotify Connect support. Unload the old token server: launchctl bootout gui/$UID ~/Library/LaunchAgents/com.sonohaus.token-server.plist (or re-run the Sonohaus bridge installer), then restart Sonohaus.',
        );
        finish({ ok: true, started: false, reason: 'legacy-port-blocked' });
      } else {
        console.error('[spotify-token-server]', err);
        finish({ ok: false, started: false, reason: err.message });
      }
    });

    server.listen(PORT, '127.0.0.1', () => {
      console.log(`[spotify-token-server] listening on 127.0.0.1:${PORT}`);
      finish({ ok: true, started: true });
    });
  });
}

module.exports = { startSpotifyTokenServer, PORT };
