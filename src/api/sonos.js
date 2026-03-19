const DEFAULT_BASE_URL = 'http://localhost:5005';
const BASE_URL = (
  import.meta.env.VITE_SONOS_API_URL?.trim() || DEFAULT_BASE_URL
).replace(/\/+$/, '');
const FORCE_MOCK = String(import.meta.env.VITE_SONOS_FORCE_MOCK || '').toLowerCase() === 'true';

// --- Mock Data ---

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

// --- API Functions ---

async function apiFetch(path) {
  if (FORCE_MOCK) {
    throw new Error('Mock mode enabled');
  }
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

function withResolvedAlbumArt(track) {
  if (!track) return track;
  if (track.absoluteAlbumArtUri) {
    return { ...track, albumArtUri: track.absoluteAlbumArtUri };
  }
  if (track.albumArtUri && track.albumArtUri.startsWith('/')) {
    return { ...track, albumArtUri: `${BASE_URL}${track.albumArtUri}` };
  }
  return track;
}

export async function getZones() {
  try {
    return await apiFetch('/zones');
  } catch {
    return mockZones;
  }
}

export async function getState(room) {
  try {
    const state = await apiFetch(`/${encodeURIComponent(room)}/state`);
    return {
      ...state,
      currentTrack: withResolvedAlbumArt(state?.currentTrack),
      nextTrack: withResolvedAlbumArt(state?.nextTrack),
    };
  } catch {
    return { ...mockPlayerState };
  }
}

export async function play(room) {
  try {
    return await apiFetch(`/${encodeURIComponent(room)}/play`);
  } catch {
    return { status: 'mock-ok' };
  }
}

export async function pause(room) {
  try {
    return await apiFetch(`/${encodeURIComponent(room)}/pause`);
  } catch {
    return { status: 'mock-ok' };
  }
}

export async function next(room) {
  try {
    return await apiFetch(`/${encodeURIComponent(room)}/next`);
  } catch {
    return { status: 'mock-ok' };
  }
}

export async function previous(room) {
  try {
    return await apiFetch(`/${encodeURIComponent(room)}/previous`);
  } catch {
    return { status: 'mock-ok' };
  }
}

export async function setVolume(room, level) {
  try {
    return await apiFetch(`/${encodeURIComponent(room)}/volume/${level}`);
  } catch {
    return { status: 'mock-ok' };
  }
}

export async function getFavorites(room) {
  try {
    const data = await apiFetch(`/${encodeURIComponent(room)}/favorites`);
    return data;
  } catch {
    return mockFavorites;
  }
}

export async function playFavorite(room, name) {
  try {
    return await apiFetch(`/${encodeURIComponent(room)}/favorite/${encodeURIComponent(name)}`);
  } catch {
    return { status: 'mock-ok' };
  }
}

export async function getPlaylists(room) {
  try {
    return await apiFetch(`/${encodeURIComponent(room)}/playlists`);
  } catch {
    return mockPlaylists;
  }
}

export async function playPlaylist(room, name) {
  try {
    return await apiFetch(`/${encodeURIComponent(room)}/playlist/${encodeURIComponent(name)}`);
  } catch {
    return { status: 'mock-ok' };
  }
}

export async function toggleShuffle(room) {
  try {
    return await apiFetch(`/${encodeURIComponent(room)}/shuffle/toggle`);
  } catch {
    return { status: 'mock-ok' };
  }
}

export async function toggleRepeat(room) {
  try {
    return await apiFetch(`/${encodeURIComponent(room)}/repeat/toggle`);
  } catch {
    return { status: 'mock-ok' };
  }
}

export async function joinRoom(room, targetRoom) {
  try {
    return await apiFetch(`/${encodeURIComponent(room)}/join/${encodeURIComponent(targetRoom)}`);
  } catch {
    return { status: 'mock-ok' };
  }
}

export async function leaveRoom(room) {
  try {
    return await apiFetch(`/${encodeURIComponent(room)}/leave`);
  } catch {
    return { status: 'mock-ok' };
  }
}

export async function isBridgeReachable() {
  if (FORCE_MOCK) {
    return false;
  }

  try {
    const response = await fetch(`${BASE_URL}/zones`);
    return response.ok;
  } catch {
    return false;
  }
}
