import { getValidAccessToken } from './auth.js';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

async function spotifyFetchJson(path) {
  const token = await getValidAccessToken();
  if (!token) {
    const error = new Error('Not authenticated with Spotify');
    error.code = 'SPOTIFY_NOT_AUTHED';
    throw error;
  }

  const response = await fetch(`${SPOTIFY_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Spotify API error (${response.status}): ${text}`);
  }

  return response.json();
}

export function normalizeSpotifyAlbum(item) {
  if (!item) return null;
  const images = Array.isArray(item.images) ? item.images : [];
  const art = images[0]?.url || images[images.length - 1]?.url || null;
  return {
    id: item.id,
    uri: item.uri,
    name: item.name,
    artistName: Array.isArray(item.artists) ? item.artists.map((a) => a.name).join(', ') : '',
    artworkUrl: art,
    releaseYear: item.release_date ? Number(String(item.release_date).slice(0, 4)) : null,
    totalTracks: item.total_tracks ?? null,
  };
}

export async function getSavedAlbumsPage({ limit = 50, offset = 0 } = {}) {
  const res = await spotifyFetchJson(`/me/albums?limit=${limit}&offset=${offset}`);
  const items = Array.isArray(res.items) ? res.items : [];
  const albums = items
    .map((i) => {
      const base = normalizeSpotifyAlbum(i.album);
      if (!base) return null;
      return {
        ...base,
        addedAt: i.added_at || null,
      };
    })
    .filter(Boolean);
  return {
    albums,
    total: res.total ?? albums.length,
    limit: res.limit ?? limit,
    offset: res.offset ?? offset,
    hasMore: (res.offset ?? offset) + items.length < (res.total ?? 0),
  };
}

export function normalizePlaylist(item) {
  if (!item) return null;
  const images = Array.isArray(item.images) ? item.images : [];
  const art = images[0]?.url || images[images.length - 1]?.url || null;
  const total = item.tracks && typeof item.tracks === 'object' ? item.tracks.total : null;
  return {
    id: item.id,
    uri: item.uri,
    name: item.name,
    ownerName: item.owner?.display_name || item.owner?.id || '',
    trackCount: total ?? null,
    artworkUrl: art,
    public: item.public !== false,
  };
}

export async function getMyPlaylistsPage({ limit = 50, offset = 0 } = {}) {
  const res = await spotifyFetchJson(`/me/playlists?limit=${limit}&offset=${offset}`);
  const items = Array.isArray(res.items) ? res.items : [];
  const playlists = items.map(normalizePlaylist).filter(Boolean);
  const total = res.total ?? playlists.length;
  const off = res.offset ?? offset;
  return {
    playlists,
    total,
    limit: res.limit ?? limit,
    offset: off,
    hasMore: off + items.length < total,
  };
}

export async function getAlbumTracksAll(albumId) {
  const tracks = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    // Spotify returns simplified track objects here, but includes id.
    const res = await spotifyFetchJson(
      `/albums/${encodeURIComponent(albumId)}/tracks?limit=${limit}&offset=${offset}`
    );
    const items = Array.isArray(res.items) ? res.items : [];
    for (const t of items) {
      if (t?.id) tracks.push({ id: t.id, uri: t.uri, name: t.name, trackNumber: t.track_number });
    }
    offset += items.length;
    if (!res.next || items.length === 0) break;
  }

  // Ensure track order by track_number when present.
  tracks.sort((a, b) => (a.trackNumber ?? 0) - (b.trackNumber ?? 0));
  return tracks;
}

