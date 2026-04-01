const DEFAULT_BASE_URL = 'http://localhost:5005';
const ENV_URL = (import.meta.env.VITE_SONOS_API_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, '');
const FORCE_MOCK = String(import.meta.env.VITE_SONOS_FORCE_MOCK || '').toLowerCase() === 'true';

/** localStorage override for bridge URL (set from Bridge Setup Wizard). */
export const BRIDGE_URL_STORAGE_KEY = 'sonohaus.bridgeBaseUrl.v1';

function envBaseUrl() {
  if (typeof window === 'undefined') return ENV_URL;
  return window.location.protocol === 'https:'
    ? `${window.location.origin}/sonos-bridge`
    : ENV_URL;
}

/**
 * Effective bridge base URL: optional localStorage override, else env / HTTPS proxy.
 */
export function getEffectiveBridgeBaseUrl() {
  if (typeof window === 'undefined') return ENV_URL;
  try {
    const stored = localStorage.getItem(BRIDGE_URL_STORAGE_KEY);
    if (stored && /^https?:\/\//i.test(stored.trim())) {
      return stored.trim().replace(/\/+$/, '');
    }
  } catch {
    // ignore
  }
  return envBaseUrl();
}

export function setBridgeBaseUrlOverride(url) {
  if (typeof window === 'undefined') return;
  try {
    if (!url || !String(url).trim()) {
      localStorage.removeItem(BRIDGE_URL_STORAGE_KEY);
      return;
    }
    const trimmed = String(url).trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(trimmed)) {
      throw new Error('URL must start with http:// or https://');
    }
    localStorage.setItem(BRIDGE_URL_STORAGE_KEY, trimmed);
  } catch (e) {
    throw e instanceof Error ? e : new Error(String(e));
  }
}

export function clearBridgeBaseUrlOverride() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(BRIDGE_URL_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function isMockModeEnabled() {
  return FORCE_MOCK;
}

export class BridgeUnreachableError extends Error {
  constructor(message = 'Sonos bridge is not reachable', cause) {
    super(message);
    this.name = 'BridgeUnreachableError';
    this.code = 'BRIDGE_UNREACHABLE';
    if (cause) this.cause = cause;
  }
}

// --- Mock Data (only when VITE_SONOS_FORCE_MOCK=true) ---

const mockZones = [
  {
    uuid: 'mock-uuid-1',
    coordinator: { uuid: 'mock-uuid-1', roomName: 'Living Room' },
    members: [{ uuid: 'mock-uuid-1', roomName: 'Living Room' }],
  },
  {
    uuid: 'mock-uuid-2',
    coordinator: { uuid: 'mock-uuid-2', roomName: 'Kitchen' },
    members: [{ uuid: 'mock-uuid-2', roomName: 'Kitchen' }],
  },
  {
    uuid: 'mock-uuid-3',
    coordinator: { uuid: 'mock-uuid-3', roomName: 'Bedroom' },
    members: [{ uuid: 'mock-uuid-3', roomName: 'Bedroom' }],
  },
];

const mockPlayerState = {
  currentTrack: {
    artist: 'M83',
    title: 'Midnight City',
    album: "Hurry Up, We're Dreaming",
    albumArtUri: '',
    duration: 244,
  },
  nextTrack: {
    artist: 'MGMT',
    title: 'Electric Feel',
    album: 'Oracular Spectacular',
  },
  volume: 42,
  mute: false,
  trackNo: 6,
  elapsedTime: 89,
  elapsedTimeFormatted: '1:29',
  playbackState: 'PLAYING',
  playMode: {
    shuffle: false,
    repeat: false,
    crossfade: false,
  },
};

const mockFavorites = [
  'Discover Weekly',
  'Daily Mix 1',
  'Chill Vibes',
  'Workout Beats',
  'Road Trip',
  'Lo-Fi Study',
];

const mockPlaylists = [
  'Morning Coffee',
  'Focus Mode',
  'Evening Wind Down',
  'Party Mix',
  'Sunday Morning',
];

function baseUrlForRequest() {
  return getEffectiveBridgeBaseUrl();
}

// --- API Functions ---

async function apiFetch(path) {
  if (FORCE_MOCK) {
    throw new Error('Mock mode enabled');
  }
  const base = baseUrlForRequest();
  let response;
  try {
    response = await fetch(`${base}${path}`);
  } catch (err) {
    throw new BridgeUnreachableError(
      `Cannot reach Sonos bridge at ${base}. Install or start the bridge, or set the correct URL.`,
      err,
    );
  }
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

async function apiFetchAny(path) {
  if (FORCE_MOCK) {
    throw new Error('Mock mode enabled');
  }
  const base = baseUrlForRequest();
  let response;
  try {
    response = await fetch(`${base}${path}`);
  } catch (err) {
    throw new BridgeUnreachableError(
      `Cannot reach Sonos bridge at ${base}.`,
      err,
    );
  }
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function apiMutation(path) {
  if (FORCE_MOCK) {
    return { status: 'mock-ok' };
  }
  const base = baseUrlForRequest();
  let response;
  try {
    response = await fetch(`${base}${path}`);
  } catch (err) {
    throw new BridgeUnreachableError(`Cannot reach Sonos bridge at ${base}.`, err);
  }
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

async function apiMutationWithMethod(path, method) {
  if (FORCE_MOCK) {
    return { status: 'mock-ok' };
  }
  const base = baseUrlForRequest();
  let response;
  try {
    response = await fetch(`${base}${path}`, { method });
  } catch (err) {
    throw new BridgeUnreachableError(`Cannot reach Sonos bridge at ${base}.`, err);
  }
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  const text = await response.text();
  if (!text) return { ok: true };
  try {
    return JSON.parse(text);
  } catch {
    return { ok: true, raw: text };
  }
}

async function apiMutationTextOk(path) {
  if (FORCE_MOCK) {
    return { status: 'mock-ok' };
  }
  const base = baseUrlForRequest();
  let response;
  try {
    response = await fetch(`${base}${path}`, { method: 'POST' });
  } catch (err) {
    throw new BridgeUnreachableError(`Cannot reach Sonos bridge at ${base}.`, err);
  }
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  const text = await response.text();
  if (!text) return { ok: true };
  try {
    return JSON.parse(text);
  } catch {
    return { ok: true, raw: text };
  }
}

async function apiMutationTry(paths) {
  let lastError = null;
  for (const path of paths) {
    try {
      const result = await apiMutation(path);
      return { ok: true, path, result };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('No supported mutation endpoint');
}

function withResolvedAlbumArt(track) {
  if (!track) return track;
  const base = baseUrlForRequest();
  if (track.absoluteAlbumArtUri) {
    return { ...track, albumArtUri: track.absoluteAlbumArtUri };
  }
  if (track.albumArtUri && track.albumArtUri.startsWith('/')) {
    return { ...track, albumArtUri: `${base}${track.albumArtUri}` };
  }
  return track;
}

export async function getZones() {
  if (FORCE_MOCK) {
    return mockZones;
  }
  return apiFetch('/zones');
}

export async function getState(room) {
  if (FORCE_MOCK) {
    return {
      ...mockPlayerState,
      currentTrack: withResolvedAlbumArt(mockPlayerState.currentTrack),
      nextTrack: withResolvedAlbumArt(mockPlayerState.nextTrack),
    };
  }
  const state = await apiFetch(`/${encodeURIComponent(room)}/state`);
  return {
    ...state,
    currentTrack: withResolvedAlbumArt(state?.currentTrack),
    nextTrack: withResolvedAlbumArt(state?.nextTrack),
  };
}

export function play(room) {
  return apiMutation(`/${encodeURIComponent(room)}/play`);
}

export function pause(room) {
  return apiMutation(`/${encodeURIComponent(room)}/pause`);
}

export function next(room) {
  return apiMutation(`/${encodeURIComponent(room)}/next`);
}

export function previous(room) {
  return apiMutation(`/${encodeURIComponent(room)}/previous`);
}

/**
 * Jump playback to a track in the coordinator queue (node-sonos-http-api: trackseek).
 * @param {string} room
 * @param {number} zeroBasedIndex — index in the full queue array (0 = first track)
 */
export function seekToQueueIndex(room, zeroBasedIndex) {
  const i = Math.floor(Number(zeroBasedIndex));
  if (!Number.isFinite(i) || i < 0) {
    throw new Error('Invalid queue index');
  }
  const oneBased = i + 1;
  const roomEnc = encodeURIComponent(room);
  return apiMutationTry([
    `/${roomEnc}/trackseek/${oneBased}`,
    `/${roomEnc}/trackseek/${i}`,
  ]);
}

export function setVolume(room, level) {
  const roomEnc = encodeURIComponent(room);
  const path = `/${roomEnc}/volume/${level}`;
  const candidates = [
    () => apiMutation(path), // GET
    () => apiMutationWithMethod(path, 'POST'),
    () => apiMutation(`${path}?timeout=0`), // GET variant
  ];
  return (async () => {
    let lastError = null;
    for (const attempt of candidates) {
      try {
        // eslint-disable-next-line no-await-in-loop
        return await attempt();
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error('Failed to set volume');
  })();
}

function resolveItemArt(item) {
  if (!item || typeof item !== 'object') return item;
  const art = item.albumArtUri || item.albumArtURI;
  const base = baseUrlForRequest();
  if (art && typeof art === 'string' && art.startsWith('/')) {
    return { ...item, albumArtUri: `${base}${art}` };
  }
  return item;
}

export async function getFavorites(room) {
  if (FORCE_MOCK) {
    return mockFavorites;
  }
  const data = await apiFetch(`/${encodeURIComponent(room)}/favorites`);
  if (Array.isArray(data)) return data.map(resolveItemArt);
  return data;
}

export function playFavorite(room, name) {
  return apiMutation(`/${encodeURIComponent(room)}/favorite/${encodeURIComponent(name)}`);
}

export function playFavoriteNext(room, name) {
  const encodedRoom = encodeURIComponent(room);
  const encodedName = encodeURIComponent(name);
  return apiMutationTry([
    `/${encodedRoom}/favorite/${encodedName}/next`,
    `/${encodedRoom}/favorite/${encodedName}?action=next`,
  ]);
}

export async function getPlaylists(room) {
  if (FORCE_MOCK) {
    return mockPlaylists;
  }
  const data = await apiFetch(`/${encodeURIComponent(room)}/playlists`);
  if (Array.isArray(data)) return data.map(resolveItemArt);
  return data;
}

export function playPlaylist(room, name) {
  return apiMutation(`/${encodeURIComponent(room)}/playlist/${encodeURIComponent(name)}`);
}

export function playPlaylistNext(room, name) {
  const encodedRoom = encodeURIComponent(room);
  const encodedName = encodeURIComponent(name);
  return apiMutationTry([
    `/${encodedRoom}/playlist/${encodedName}/next`,
    `/${encodedRoom}/playlist/${encodedName}?action=next`,
  ]);
}

function normalizeSpotifyTrackRef(trackIdOrUri) {
  if (typeof trackIdOrUri !== 'string') return null;
  const trimmed = trackIdOrUri.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('spotify:track:')) return trimmed;
  return `spotify:track:${trimmed}`;
}

export async function playSpotifyTrackNow(room, trackIdOrUri) {
  const roomEnc = encodeURIComponent(room);
  const trackRef = normalizeSpotifyTrackRef(trackIdOrUri);
  if (!trackRef) throw new Error('Invalid Spotify track');
  return apiMutation(`/${roomEnc}/spotify/now/${trackRef}`);
}

export async function playSpotifyTrackNext(room, trackIdOrUri) {
  const roomEnc = encodeURIComponent(room);
  const trackRef = normalizeSpotifyTrackRef(trackIdOrUri);
  if (!trackRef) throw new Error('Invalid Spotify track');
  return apiMutation(`/${roomEnc}/spotify/next/${trackRef}`);
}

export async function queueSpotifyTrack(room, trackIdOrUri) {
  const roomEnc = encodeURIComponent(room);
  const trackRef = normalizeSpotifyTrackRef(trackIdOrUri);
  if (!trackRef) throw new Error('Invalid Spotify track');
  return apiMutation(`/${roomEnc}/spotify/queue/${trackRef}`);
}

export async function playSpotifyUriNow(room, spotifyUri) {
  const roomEnc = encodeURIComponent(room);
  if (typeof spotifyUri !== 'string' || !spotifyUri.startsWith('spotify:')) {
    throw new Error('Invalid Spotify URI');
  }
  return apiMutation(`/${roomEnc}/spotify/now/${spotifyUri}`);
}

export function clearQueue(room) {
  return apiMutation(`/${encodeURIComponent(room)}/clearqueue`);
}

export function shuffleOff(room) {
  return apiMutation(`/${encodeURIComponent(room)}/shuffle/off`);
}

export function toggleShuffle(room) {
  return apiMutation(`/${encodeURIComponent(room)}/shuffle/toggle`);
}

export function toggleRepeat(room) {
  return apiMutation(`/${encodeURIComponent(room)}/repeat/toggle`);
}

export function joinRoom(room, targetRoom) {
  return apiMutation(`/${encodeURIComponent(room)}/join/${encodeURIComponent(targetRoom)}`);
}

export function leaveRoom(room) {
  return apiMutation(`/${encodeURIComponent(room)}/leave`);
}

export async function getQueue(room) {
  if (FORCE_MOCK) {
    return [];
  }
  const encodedRoom = encodeURIComponent(room);
  const candidates = [
    `/${encodedRoom}/queue`,
    `/${encodedRoom}/state/queue`,
  ];
  for (const endpoint of candidates) {
    try {
      return await apiFetchAny(endpoint);
    } catch {
      // try next endpoint
    }
  }
  return [];
}

export async function isBridgeReachable() {
  if (FORCE_MOCK) {
    return false;
  }
  const base = baseUrlForRequest();
  try {
    const response = await fetch(`${base}/zones`);
    return response.ok;
  } catch {
    return false;
  }
}
