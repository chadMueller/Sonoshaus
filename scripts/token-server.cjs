// Tiny token sync server. Stores Spotify tokens in a JSON file so both
// the web UI and the Electron DMG can share the same Spotify session.
// Also handles OAuth callback for the Electron app's Spotify login flow.
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = 38901;
const TOKEN_FILE = path.join(
  process.env.HOME || '/tmp',
  'Library', 'Application Support', 'Sonohaus', 'spotify-tokens.json'
);
const PENDING_AUTH_FILE = path.join(
  process.env.HOME || '/tmp',
  'Library', 'Application Support', 'Sonohaus', 'pending-auth.json'
);

// Ensure directory exists
fs.mkdirSync(path.dirname(TOKEN_FILE), { recursive: true });

function readTokens() {
  try { return fs.readFileSync(TOKEN_FILE, 'utf8'); } catch { return '{}'; }
}

function writeTokens(data) {
  fs.writeFileSync(TOKEN_FILE, data, 'utf8');
}

function readPendingAuth() {
  try { return JSON.parse(fs.readFileSync(PENDING_AUTH_FILE, 'utf8')); } catch { return null; }
}

function writePendingAuth(data) {
  fs.writeFileSync(PENDING_AUTH_FILE, JSON.stringify(data), 'utf8');
}

function clearPendingAuth() {
  try { fs.unlinkSync(PENDING_AUTH_FILE); } catch {}
}

function spotifyTokenExchange(params) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(params).toString();
    const req = https.request('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Spotify token exchange failed (${res.statusCode}): ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.url === '/tokens' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(readTokens());
    return;
  }

  if (req.url === '/tokens' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      writeTokens(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"ok":true}');
    });
    return;
  }

  // Store PKCE verifier + client config before opening browser auth
  if (req.url === '/auth/prepare' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
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

  // OAuth callback - Spotify redirects here after user authorizes
  if (req.url?.startsWith('/callback') && req.method === 'GET') {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<html><body style="background:#0b0b0b;color:#e58d3d;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><h2>Spotify Auth Error</h2><p>${error}</p><p>You can close this tab and try again in Sonohaus.</p></div></body></html>`);
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
      res.end(`<html><body style="background:#0b0b0b;color:#e58d3d;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><h2>Auth Session Expired</h2><p>No pending auth found. Try connecting again from Sonohaus.</p></div></body></html>`);
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
      res.end(`<html><body style="background:#0b0b0b;color:#e58d3d;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><h2>Connected!</h2><p>Spotify is now linked to Sonohaus.</p><p>You can close this tab.</p></div></body></html>`);
    } catch (err) {
      clearPendingAuth();
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<html><body style="background:#0b0b0b;color:#e58d3d;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><h2>Token Exchange Failed</h2><p>${err.message}</p><p>Try connecting again from Sonohaus.</p></div></body></html>`);
    }
    return;
  }

  if (req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{"ok":true}');
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[token-server] listening on localhost:${PORT}`);
});
