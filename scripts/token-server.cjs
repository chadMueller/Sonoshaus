// Tiny token sync server. Stores Spotify tokens in a JSON file so both
// the web UI and the Electron DMG can share the same Spotify session.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 38901;
const TOKEN_FILE = path.join(
  process.env.HOME || '/tmp',
  'Library', 'Application Support', 'Sonohaus', 'spotify-tokens.json'
);

// Ensure directory exists
fs.mkdirSync(path.dirname(TOKEN_FILE), { recursive: true });

function readTokens() {
  try { return fs.readFileSync(TOKEN_FILE, 'utf8'); } catch { return '{}'; }
}

function writeTokens(data) {
  fs.writeFileSync(TOKEN_FILE, data, 'utf8');
}

const server = http.createServer((req, res) => {
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
