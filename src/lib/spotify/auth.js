import { createCodeChallenge, createRandomVerifier } from './pkce.js';

const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const AUTH_URL = 'https://accounts.spotify.com/authorize';

const STORAGE_KEY = 'sonohaus.spotify.tokens.v1';
const VERIFIER_KEY = 'sonohaus.spotify.pkce.verifier.v1';
const STATE_KEY = 'sonohaus.spotify.pkce.state.v1';

const TOKEN_SYNC_URL = 'http://localhost:38901/tokens';
const TOKEN_SYNC_BASE = 'http://127.0.0.1:38901';

/** Spotify redirect for DMG — must match exactly in the Spotify Developer Dashboard (add once per app). */
export const ELECTRON_SPOTIFY_REDIRECT_URI = 'http://127.0.0.1:38901/callback';

/** URI to register in Spotify Dashboard for the current environment (Electron = localhost callback). */
export function getSpotifyDashboardRedirectUri() {
  if (typeof window !== 'undefined' && window.sonohaus?.isElectron) {
    return ELECTRON_SPOTIFY_REDIRECT_URI;
  }
  return (
    String(import.meta.env.VITE_SPOTIFY_REDIRECT_URI || '').trim() ||
    `${typeof window !== 'undefined' ? window.location.origin : ''}/`
  );
}

/** Hint for “sign in from the web UI first” (dev server or preview port). */
export function getSpotifyWebUiOrigin() {
  return String(import.meta.env.VITE_SPOTIFY_WEB_UI_ORIGIN || 'http://localhost:3000').trim();
}

export const SPOTIFY_AUTH_SUCCESS_EVENT = 'sonohaus:spotify-auth-success';

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function safeJsonParse(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

const CLIENT_ID_STORAGE_KEY = 'sonohaus.spotifyClientId';

export function getSpotifyConfig() {
  const clientId =
    localStorage.getItem(CLIENT_ID_STORAGE_KEY)?.trim() ||
    String(import.meta.env.VITE_SPOTIFY_CLIENT_ID || '').trim();

  const redirectUri =
    String(import.meta.env.VITE_SPOTIFY_REDIRECT_URI || '').trim() ||
    `${window.location.origin}${window.location.pathname}`;

  return { clientId, redirectUri };
}

export function setSpotifyClientId(id) {
  const trimmed = (id || '').trim();
  if (trimmed) {
    localStorage.setItem(CLIENT_ID_STORAGE_KEY, trimmed);
  } else {
    localStorage.removeItem(CLIENT_ID_STORAGE_KEY);
  }
}

export function getStoredClientId() {
  return localStorage.getItem(CLIENT_ID_STORAGE_KEY)?.trim() || '';
}

export function getStoredTokens() {
  const parsed = safeJsonParse(localStorage.getItem(STORAGE_KEY));
  if (!parsed || typeof parsed !== 'object') return null;
  if (!parsed.access_token || !parsed.expires_at) return null;
  return parsed;
}

export function clearStoredTokens() {
  localStorage.removeItem(STORAGE_KEY);
}

function storeTokens({ access_token, refresh_token, expires_in, scope, token_type }) {
  const expiresAt = nowSeconds() + Number(expires_in || 0);
  const current = getStoredTokens();
  const payload = {
    access_token,
    refresh_token: refresh_token || current?.refresh_token || null,
    token_type: token_type || 'Bearer',
    scope: scope || current?.scope || '',
    expires_at: expiresAt,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  syncTokensToServer(payload);
  return payload;
}

// Sync tokens to the shared file via the token-sync server
function syncTokensToServer(payload) {
  const { clientId } = getSpotifyConfig();
  const data = { tokens: payload, clientId };
  fetch(TOKEN_SYNC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).catch(() => {});
}

// Pull tokens from the shared file (for DMG app or fresh browser)
export async function loadSharedTokens() {
  try {
    const res = await fetch(TOKEN_SYNC_URL);
    if (!res.ok) return false;
    const data = await res.json();
    if (!data.tokens?.access_token) return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data.tokens));
    if (data.clientId) {
      setSpotifyClientId(data.clientId);
    }
    return true;
  } catch {
    return false;
  }
}

export function isSpotifyAuthed() {
  return !!getStoredTokens();
}

async function pollForSharedTokens(timeoutMs = 120000, intervalMs = 2000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const loaded = await loadSharedTokens();
    if (loaded) {
      window.dispatchEvent(new Event(SPOTIFY_AUTH_SUCCESS_EVENT));
      return;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('Spotify login timed out. Complete the login in your browser and try again.');
}

export async function startSpotifyLogin({ scopes = ['user-library-read'] } = {}) {
  const { clientId, redirectUri } = getSpotifyConfig();
  if (!clientId) throw new Error('Missing VITE_SPOTIFY_CLIENT_ID');

  const verifier = createRandomVerifier(64);
  const challenge = await createCodeChallenge(verifier);
  const stateBytes = new Uint8Array(16);
  crypto.getRandomValues(stateBytes);
  const state = Array.from(stateBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
    scope: scopes.join(' '),
  });

  const authUrl = `${AUTH_URL}?${params.toString()}`;

  if (window.location.protocol === 'file:' || window.sonohaus?.isElectron) {
    if (!window.sonohaus?.openExternal) {
      throw new Error('Electron bridge not available. Restart the app and try again.');
    }
    // DMG embeds the token server and uses a localhost redirect (allowed by Spotify for dev).
    // No Vercel hop — user taps Connect, browser returns to 127.0.0.1:38901/callback.
    const dmgRedirect = ELECTRON_SPOTIFY_REDIRECT_URI;

    const prepareRes = await fetch(`${TOKEN_SYNC_BASE}/auth/prepare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verifier,
        clientId,
        redirectUri: dmgRedirect,
      }),
    });
    if (!prepareRes.ok) {
      const detail = await prepareRes.text().catch(() => '');
      throw new Error(
        `Could not reach the Spotify helper on port 38901 (${prepareRes.status}). Quit other apps using that port or restart Sonohaus. ${detail}`,
      );
    }

    const browserParams = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: dmgRedirect,
      code_challenge_method: 'S256',
      code_challenge: challenge,
      state: `dmg_${state}`,
      scope: scopes.join(' '),
    });
    const browserAuthUrl = `${AUTH_URL}?${browserParams.toString()}`;
    await window.sonohaus.openExternal(browserAuthUrl);
    // Poll the token-sync server until tokens arrive
    await pollForSharedTokens();
    return;
  }
  window.location.assign(authUrl);
}

async function exchangeCodeForTokens(code) {
  const { clientId, redirectUri } = getSpotifyConfig();
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!verifier) throw new Error('Missing PKCE verifier (session expired). Try connecting again.');

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Spotify token exchange failed (${response.status}): ${text}`);
  }

  const json = await response.json();
  return storeTokens(json);
}

async function refreshAccessToken(refreshToken) {
  const { clientId } = getSpotifyConfig();
  if (!clientId) throw new Error('Missing VITE_SPOTIFY_CLIENT_ID');

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Spotify refresh failed (${response.status}): ${text}`);
  }

  const json = await response.json();
  return storeTokens(json);
}

export async function handleSpotifyRedirectIfPresent() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    url.searchParams.delete('error');
    url.searchParams.delete('state');
    window.history.replaceState({}, '', url.toString());
    throw new Error(`Spotify auth error: ${error}`);
  }

  if (!code) return null;

  const expectedState = sessionStorage.getItem(STATE_KEY);
  if (!expectedState || !state || state !== expectedState) {
    throw new Error('Spotify auth state mismatch. Please try again.');
  }

  const tokens = await exchangeCodeForTokens(code);

  // Clean up URL + ephemeral PKCE state
  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  window.history.replaceState({}, '', url.toString());

  return tokens;
}

export async function getValidAccessToken() {
  const tokens = getStoredTokens();
  if (!tokens) return null;

  const skew = 30; // seconds
  if (Number(tokens.expires_at) > nowSeconds() + skew) {
    return tokens.access_token;
  }

  if (!tokens.refresh_token) {
    clearStoredTokens();
    return null;
  }

  const refreshed = await refreshAccessToken(tokens.refresh_token);
  return refreshed.access_token;
}

