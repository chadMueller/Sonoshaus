import { createCodeChallenge, createRandomVerifier } from './pkce.js';

const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const AUTH_URL = 'https://accounts.spotify.com/authorize';

const STORAGE_KEY = 'sonohaus.spotify.tokens.v1';
const VERIFIER_KEY = 'sonohaus.spotify.pkce.verifier.v1';
const STATE_KEY = 'sonohaus.spotify.pkce.state.v1';

const OAUTH_PORT = 38901;
const ELECTRON_REDIRECT_URI = `http://localhost:${OAUTH_PORT}/callback`;

export const SPOTIFY_AUTH_SUCCESS_EVENT = 'sonohaus:spotify-auth-success';

function isElectron() {
  return !!window.sonohaus?.isElectron;
}

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

  let redirectUri;
  if (isElectron()) {
    redirectUri = ELECTRON_REDIRECT_URI;
  } else {
    redirectUri =
      String(import.meta.env.VITE_SPOTIFY_REDIRECT_URI || '').trim() ||
      `${window.location.origin}${window.location.pathname}`;
  }

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
  return payload;
}

export function isSpotifyAuthed() {
  return !!getStoredTokens();
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

  if (isElectron()) {
    await startSpotifyLoginElectron(authUrl, state);
  } else {
    if (window.location.protocol === 'file:') {
      throw new Error(
        'Spotify auth requires http:// or https:// (not file://). Run via Electron or `npm run dev`.'
      );
    }
    window.location.assign(authUrl);
  }
}

async function startSpotifyLoginElectron(authUrl, expectedState) {
  const sonohaus = window.sonohaus;

  await sonohaus.startOAuthServer(OAUTH_PORT);

  const removeListener = sonohaus.onOAuthCode(async (data) => {
    removeListener();

    try {
      if (data.error) {
        throw new Error(`Spotify auth error: ${data.error}`);
      }

      if (!data.code) {
        throw new Error('No authorization code received from Spotify.');
      }

      if (!data.state || data.state !== expectedState) {
        throw new Error('Spotify auth state mismatch. Please try again.');
      }

      await exchangeCodeForTokens(data.code);

      sessionStorage.removeItem(VERIFIER_KEY);
      sessionStorage.removeItem(STATE_KEY);

      window.dispatchEvent(new CustomEvent(SPOTIFY_AUTH_SUCCESS_EVENT));
    } catch (err) {
      console.error('[spotify/auth] Electron OAuth error:', err);
      window.dispatchEvent(
        new CustomEvent(SPOTIFY_AUTH_SUCCESS_EVENT, { detail: { error: err.message } })
      );
    } finally {
      sonohaus.stopOAuthServer();
    }
  });

  await sonohaus.openExternal(authUrl);
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

