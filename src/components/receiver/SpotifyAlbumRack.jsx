import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  startSpotifyLogin,
  clearStoredTokens,
  getSpotifyConfig,
  getSpotifyDashboardRedirectUri,
  isSpotifyAuthed,
  setSpotifyClientId,
  getStoredClientId,
  loadSharedTokens,
  SPOTIFY_AUTH_SUCCESS_EVENT,
} from '../../lib/spotify/auth.js';
import { getAlbumTracksAll, getMyPlaylistsPage, getSavedAlbumsPage } from '../../lib/spotify/api.js';
import { clearQueue, playSpotifyTrackNow, playSpotifyUriNow, queueSpotifyTrack, shuffleOff } from '../../api/sonos.js';

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function canUseSpotify() {
  return true;
}

function truncate(value, maxChars) {
  if (typeof value !== 'string') return '';
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, Math.max(0, maxChars - 1))}\u2026`;
}

function alphaBucket(name) {
  const c = String(name || '')
    .trim()
    .charAt(0)
    .toUpperCase();
  if (c >= 'A' && c <= 'Z') return c;
  return '#';
}

export const SpotifyAlbumRack = React.memo(function SpotifyAlbumRack({
  selectedRoom,
  spotifyAuthError,
  onLibraryChange,
  sonosFavorites = [],
  sonosPlaylists = [],
  onPlaySonosFavorite,
  onPlaySonosPlaylist,
}) {
  const [status, setStatus] = useState('idle');
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [spotifyPlaylists, setSpotifyPlaylists] = useState([]);
  const [total, setTotal] = useState(null);
  const [spotifyPlaylistsTotal, setSpotifyPlaylistsTotal] = useState(null);
  const [offset, setOffset] = useState(0);
  const [spotifyPlaylistsOffset, setSpotifyPlaylistsOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [spotifyPlaylistsHasMore, setSpotifyPlaylistsHasMore] = useState(false);
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState('rack');
  const [contentMode, setContentMode] = useState('albums'); // albums | spotify-playlists | favorites | playlists
  const [sortMode, setSortMode] = useState('alpha'); // alpha | recent
  const [alphaSeek, setAlphaSeek] = useState(null); // { letter, startedAt }
  const isSpotifyLibraryMode = contentMode === 'albums' || contentMode === 'spotify-playlists';

  const [enqueueState, setEnqueueState] = useState(null);
  const enqueueAbortRef = useRef({ aborted: false });
  const fetchInFlightRef = useRef(false);
  const [rackWindow, setRackWindow] = useState({ start: 0, end: 30 });
  const rackScrollRef = useRef(null);
  const rackSentinelRef = useRef(null);
  const carouselScrollRef = useRef(null);
  const carouselSentinelRef = useRef(null);
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const offsetRef = useRef(0);
  const spotifyPlaylistsOffsetRef = useRef(0);
  const { clientId } = getSpotifyConfig();
  const [spotifyAuthed, setSpotifyAuthed] = useState(() => isSpotifyAuthed());
  const [showSpotifySetup, setShowSpotifySetup] = useState(false);
  const [clientIdInput, setClientIdInput] = useState(() => getStoredClientId());

  hasMoreRef.current = contentMode === 'spotify-playlists' ? spotifyPlaylistsHasMore : hasMore;
  loadingMoreRef.current = loadingMore;
  offsetRef.current = offset;
  spotifyPlaylistsOffsetRef.current = spotifyPlaylistsOffset;

  useEffect(() => {
    if (spotifyAuthError) {
      setError(spotifyAuthError);
      setStatus('error');
    }
  }, [spotifyAuthError]);

  // On mount, try loading shared tokens from the token-sync server
  // (covers DMG app picking up tokens from web UI auth)
  useEffect(() => {
    if (isSpotifyAuthed()) return;
    loadSharedTokens().then((loaded) => {
      if (loaded) setSpotifyAuthed(true);
    });
  }, []);

  // DMG: keep polling briefly so “sign in from web UI first” can complete after the app is open.
  useEffect(() => {
    if (!window.sonohaus?.isElectron) return;
    if (spotifyAuthed || !clientId) return;
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      if (n > 45) {
        clearInterval(id);
        return;
      }
      loadSharedTokens().then((loaded) => {
        if (loaded) {
          setSpotifyAuthed(true);
          clearInterval(id);
        }
      });
    }, 4000);
    return () => clearInterval(id);
  }, [spotifyAuthed, clientId]);

  useEffect(() => {
    setSpotifyAuthed(isSpotifyAuthed());
  }, [clientId]);

  useEffect(() => {
    // Treat these as true tabs: switching mode swaps the whole rack content.
    // Keep the UI predictable by resetting transient states.
    setError(null);
    setQuery('');
    if (contentMode !== 'albums') {
      setViewMode('rack');
      setLoadingMore(false);
    }
    setSortMode('alpha');
  }, [contentMode]);

  // Load Spotify playlists on-demand when the user switches tabs.
  useEffect(() => {
    if (contentMode !== 'spotify-playlists') return;
    if (!clientId) return;
    if (!spotifyAuthed && !isSpotifyAuthed()) return;
    if (spotifyPlaylists.length > 0) return;
    fetchNextPage({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentMode, clientId, spotifyAuthed]);

  const favoriteItems = useMemo(() => {
    const src = Array.isArray(sonosFavorites) ? sonosFavorites : [];
    return src
      .map((item) => {
        if (typeof item === 'string') return { id: `fav-${item}`, name: item, artistName: 'Favorite', artworkUrl: null };
        if (item && typeof item === 'object') {
          const name = item.title || item.name || item.uri || 'Untitled';
          const artistName = item.artist || item.artistName || item.album || item.containerType || 'Favorite';
          return { id: item.id || `fav-${name}`, name, artistName, artworkUrl: item.artworkUrl || item.albumArtUri || item.albumArtURI || item.imageUrl || null };
        }
        return null;
      })
      .filter(Boolean);
  }, [sonosFavorites]);

  const playlistItems = useMemo(() => {
    const src = Array.isArray(sonosPlaylists) ? sonosPlaylists : [];
    return src
      .map((item) => {
        if (typeof item === 'string') return { id: `pl-${item}`, name: item, artistName: 'Playlist', artworkUrl: null };
        if (item && typeof item === 'object') {
          const name = item.title || item.name || item.uri || 'Untitled';
          const artistName = item.artist || item.artistName || item.album || item.containerType || 'Playlist';
          return { id: item.id || `pl-${name}`, name, artistName, artworkUrl: item.artworkUrl || item.albumArtUri || item.albumArtURI || item.imageUrl || null };
        }
        return null;
      })
      .filter(Boolean);
  }, [sonosPlaylists]);

  const currentItems = useMemo(() => {
    if (contentMode === 'favorites') return favoriteItems;
    if (contentMode === 'playlists') return playlistItems;
    if (contentMode === 'spotify-playlists') return spotifyPlaylists;
    return albums;
  }, [contentMode, favoriteItems, playlistItems, spotifyPlaylists, albums]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return currentItems;
    return currentItems.filter((a) => {
      const hay = `${a.name} ${a.artistName || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [currentItems, query]);

  const sortedItems = useMemo(() => {
    if (!isSpotifyLibraryMode) return filtered;

    if (sortMode === 'recent') {
      // Albums have a true "recent" sort (addedAt). Playlists are already returned in a meaningful order by Spotify,
      // so "Recent" keeps the API ordering for consistent browsing.
      if (contentMode === 'albums') {
        return [...filtered].sort((a, b) => {
          const ta = a.addedAt ? Date.parse(a.addedAt) : 0;
          const tb = b.addedAt ? Date.parse(b.addedAt) : 0;
          if (tb !== ta) return tb - ta;
          return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        });
      }
      return filtered;
    }

    return [...filtered].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [filtered, isSpotifyLibraryMode, contentMode, sortMode]);

  const firstIdByLetter = useMemo(() => {
    const map = new Map();
    if (!isSpotifyLibraryMode) return map;
    if (sortMode === 'recent') return map;

    for (const item of sortedItems) {
      const letter = alphaBucket(item.name);
      if (!map.has(letter)) {
        map.set(letter, item.id);
      }
    }
    return map;
  }, [sortedItems, isSpotifyLibraryMode, sortMode]);

  const fetchNextPage = useCallback(
    async ({ reset = false } = {}) => {
      if (fetchInFlightRef.current) return;
      fetchInFlightRef.current = true;

      const isInitial = reset;
      if (isInitial) {
        setStatus('loading');
        setLoadingMore(false);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      try {
        const isSpotifyPlaylists = contentMode === 'spotify-playlists';
        const nextOffset = reset ? 0 : isSpotifyPlaylists ? spotifyPlaylistsOffsetRef.current : offsetRef.current;

        if (isSpotifyPlaylists) {
          const res = await getMyPlaylistsPage({ limit: 50, offset: nextOffset });
          const newOffset = res.offset + res.playlists.length;
          setSpotifyPlaylistsTotal(res.total);
          setSpotifyPlaylistsOffset(newOffset);
          spotifyPlaylistsOffsetRef.current = newOffset;
          setSpotifyPlaylistsHasMore(!!res.hasMore);
          const normalized = res.playlists.map((p) => ({
            ...p,
            artistName: p.ownerName ? `${p.ownerName}${p.trackCount != null ? ` · ${p.trackCount} tracks` : ''}` : '',
          }));
          setSpotifyPlaylists((prev) => (reset ? normalized : [...prev, ...normalized]));
        } else {
          const res = await getSavedAlbumsPage({ limit: 50, offset: nextOffset });
          const newOffset = res.offset + res.albums.length;
          setTotal(res.total);
          setOffset(newOffset);
          offsetRef.current = newOffset;
          setHasMore(!!res.hasMore);
          setAlbums((prev) => (reset ? res.albums : [...prev, ...res.albums]));
        }

        setStatus('ready');
        setSpotifyAuthed(true);
      } catch (err) {
        if (isInitial) {
          const msg =
            err?.code === 'SPOTIFY_NOT_AUTHED' && window.sonohaus?.isElectron
              ? 'Tap Connect to sign in with Spotify.'
              : err?.message ||
                (contentMode === 'spotify-playlists' ? 'Failed to load Spotify playlists' : 'Failed to load Spotify albums');
          setError(msg);
          setStatus('error');
        } else {
          console.error('[SpotifyAlbumRack] load more failed:', err);
        }
      } finally {
        setLoadingMore(false);
        fetchInFlightRef.current = false;
      }
    },
    [contentMode],
  );

  // Only load albums after we have tokens (avoid racing loadSharedTokens / showing “Not authenticated”).
  useEffect(() => {
    if (!clientId) return;
    if (!spotifyAuthed && !isSpotifyAuthed()) return;
    if (!isSpotifyAuthed()) return;
    fetchNextPage({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, spotifyAuthed]);

  // Listen for Electron OAuth success
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.error) {
        setError(e.detail.error);
        setStatus('error');
        return;
      }
      setSpotifyAuthed(true);
      setError(null);
      fetchNextPage({ reset: true });
    };
    window.addEventListener(SPOTIFY_AUTH_SUCCESS_EVENT, handler);
    return () => window.removeEventListener(SPOTIFY_AUTH_SUCCESS_EVENT, handler);
  }, [fetchNextPage]);

  const fetchNextPageRef = useRef(fetchNextPage);
  fetchNextPageRef.current = fetchNextPage;

  const tryFetchMore = useCallback(() => {
    if (!hasMoreRef.current || loadingMoreRef.current || fetchInFlightRef.current) {
      return;
    }
    fetchNextPageRef.current({ reset: false });
  }, []);

  const loadAllRef = useRef(false);

  const loadAllRemaining = useCallback(async () => {
    if (loadAllRef.current || fetchInFlightRef.current) return;
    loadAllRef.current = true;
    setLoadingMore(true);

    try {
      while (hasMoreRef.current) {
        if (contentMode === 'spotify-playlists') {
          const curOffset = spotifyPlaylistsOffsetRef.current;
          const res = await getMyPlaylistsPage({ limit: 50, offset: curOffset });
          const newOffset = res.offset + res.playlists.length;
          spotifyPlaylistsOffsetRef.current = newOffset;
          setSpotifyPlaylistsOffset(newOffset);
          setSpotifyPlaylistsTotal(res.total);
          setSpotifyPlaylistsHasMore(!!res.hasMore);
          hasMoreRef.current = !!res.hasMore;
          const normalized = res.playlists.map((p) => ({
            ...p,
            artistName: p.ownerName ? `${p.ownerName}${p.trackCount != null ? ` · ${p.trackCount} tracks` : ''}` : '',
          }));
          setSpotifyPlaylists((prev) => [...prev, ...normalized]);
        } else {
          const curOffset = offsetRef.current;
          const res = await getSavedAlbumsPage({ limit: 50, offset: curOffset });
          const newOffset = res.offset + res.albums.length;
          offsetRef.current = newOffset;
          setOffset(newOffset);
          setTotal(res.total);
          setHasMore(!!res.hasMore);
          hasMoreRef.current = !!res.hasMore;
          setAlbums((prev) => [...prev, ...res.albums]);
        }
      }
    } catch (err) {
      console.error('[SpotifyAlbumRack] loadAll failed:', err);
    } finally {
      setLoadingMore(false);
      loadAllRef.current = false;
      fetchInFlightRef.current = false;
    }
  }, []);

  const scrollToLetter = useCallback(
    (letter) => {
      const id = firstIdByLetter.get(letter);
      if (!id) return;
      const el = document.getElementById(`cd-album-${id}`);
      if (!el) return;
      el.scrollIntoView({
        behavior: 'smooth',
        inline: viewMode === 'carousel' ? 'center' : 'start',
        block: 'nearest',
      });
    },
    [firstIdByLetter, viewMode],
  );

  const ensureLetterLoaded = useCallback(
    (letter) => {
      if (!isSpotifyLibraryMode) return;
      if (sortMode === 'recent') return;
      if (!letter) return;
      if (firstIdByLetter.has(letter)) {
        scrollToLetter(letter);
        return;
      }
      // Load all remaining items, then scroll when the letter appears
      setAlphaSeek({ letter, startedAt: Date.now() });
      loadAllRemaining();
    },
    [isSpotifyLibraryMode, sortMode, firstIdByLetter, scrollToLetter, loadAllRemaining],
  );

  useEffect(() => {
    if (!alphaSeek) return;
    if (!isSpotifyLibraryMode || sortMode === 'recent') {
      setAlphaSeek(null);
      return;
    }

    const { letter, startedAt } = alphaSeek;
    if (firstIdByLetter.has(letter)) {
      scrollToLetter(letter);
      setAlphaSeek(null);
      return;
    }

    if (!hasMoreRef.current) {
      setAlphaSeek(null);
      return;
    }

    if (Date.now() - startedAt > 12000) {
      setAlphaSeek(null);
      return;
    }

    const t = setTimeout(() => tryFetchMore(), 150);
    return () => clearTimeout(t);
  }, [alphaSeek, isSpotifyLibraryMode, sortMode, firstIdByLetter, scrollToLetter, tryFetchMore, albums.length, spotifyPlaylists.length]);

  // Virtualization: track scroll position to render only visible album tiles
  const TILE_WIDTH = 212; // 200px tile + 12px gap
  const BUFFER = 10; // extra tiles outside viewport
  useEffect(() => {
    const el = rackScrollRef.current;
    if (!el) return;
    let ticking = false;
    const update = () => {
      const scrollLeft = el.scrollLeft;
      const containerWidth = el.clientWidth;
      const start = Math.max(0, Math.floor(scrollLeft / TILE_WIDTH) - BUFFER);
      const end = Math.ceil((scrollLeft + containerWidth) / TILE_WIDTH) + BUFFER;
      setRackWindow({ start, end });
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => el.removeEventListener('scroll', onScroll);
  }, [viewMode, contentMode, sortMode]);

  useEffect(() => {
    if (contentMode !== 'albums' && contentMode !== 'spotify-playlists') return;
    if (viewMode !== 'rack') return;
    const root = rackScrollRef.current;
    const target = rackSentinelRef.current;
    if (!root || !target) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) tryFetchMore();
      },
      { root, rootMargin: '0px 600px 0px 0px', threshold: 0 },
    );
    obs.observe(target);
    return () => obs.disconnect();
  }, [viewMode, tryFetchMore, hasMore]);

  useEffect(() => {
    if (contentMode !== 'albums' && contentMode !== 'spotify-playlists') return;
    if (viewMode !== 'carousel') return;
    const root = carouselScrollRef.current;
    const target = carouselSentinelRef.current;
    if (!root || !target) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) tryFetchMore();
      },
      { root, rootMargin: '0px 600px 0px 0px', threshold: 0 },
    );
    obs.observe(target);
    return () => obs.disconnect();
  }, [viewMode, tryFetchMore, hasMore]);

  // When user starts searching, load all remaining items so search covers the full library
  useEffect(() => {
    if (contentMode !== 'albums' && contentMode !== 'spotify-playlists') return;
    if (!query.trim()) return;
    if (!hasMoreRef.current) return;

    loadAllRemaining();
  }, [contentMode, query, loadAllRemaining]);

  const handleConnect = async () => {
    setError(null);
    try {
      await startSpotifyLogin({
        scopes: ['user-library-read', 'playlist-read-private', 'playlist-read-collaborative'],
      });
    } catch (err) {
      setError(err?.message || 'Spotify connection failed');
      setStatus('error');
    }
  };

  const handleDisconnect = () => {
    clearStoredTokens();
    setSpotifyAuthed(false);
    setAlbums([]);
    setSpotifyPlaylists([]);
    setTotal(null);
    setSpotifyPlaylistsTotal(null);
    setOffset(0);
    setSpotifyPlaylistsOffset(0);
    setHasMore(false);
    setSpotifyPlaylistsHasMore(false);
    setQuery('');
    setEnqueueState(null);
    setStatus('idle');
    onLibraryChange?.();
  };

  const cancelEnqueue = () => {
    enqueueAbortRef.current.aborted = true;
    setEnqueueState(null);
  };

  const enqueueAlbum = async (album) => {
    if (!selectedRoom) {
      setError('Select a room to queue an album');
      setStatus('error');
      return;
    }

    enqueueAbortRef.current.aborted = false;
    setEnqueueState({ albumId: album.id, done: 0, total: 0, phase: 'Loading...' });

    try {
      const tracks = await getAlbumTracksAll(album.id);
      if (enqueueAbortRef.current.aborted) return;

      const totalTracks = tracks.length;
      if (totalTracks === 0) {
        setEnqueueState(null);
        setError('No tracks found for that album');
        setStatus('error');
        return;
      }

      setEnqueueState({ albumId: album.id, done: 0, total: totalTracks, phase: 'Replacing queue...' });

      await clearQueue(selectedRoom);
      if (enqueueAbortRef.current.aborted) return;
      await shuffleOff(selectedRoom);
      if (enqueueAbortRef.current.aborted) return;

      setEnqueueState({ albumId: album.id, done: 0, total: totalTracks, phase: 'Playing...' });

      await playSpotifyTrackNow(selectedRoom, tracks[0].id);
      if (enqueueAbortRef.current.aborted) return;

      setEnqueueState({ albumId: album.id, done: 1, total: totalTracks, phase: 'Queuing...' });

      for (let i = 1; i < tracks.length; i += 1) {
        await queueSpotifyTrack(selectedRoom, tracks[i].id);
        if (enqueueAbortRef.current.aborted) return;
        setEnqueueState((prev) => ({
          albumId: album.id,
          done: clamp((prev?.done ?? i) + 1, 1, totalTracks),
          total: totalTracks,
          phase: 'Queuing...',
        }));
        // eslint-disable-next-line no-await-in-loop
        await sleep(120);
      }

      setEnqueueState({ albumId: album.id, done: totalTracks, total: totalTracks, phase: 'Ready' });
      await sleep(500);
      setEnqueueState(null);
      setStatus('ready');
    } catch (err) {
      console.error('[SpotifyAlbumRack] enqueue error:', err);
      setEnqueueState(null);
      setError(err?.message || 'Failed to queue album');
      setStatus('error');
    }
  };

  const enqueuePlaylist = async (playlist) => {
    if (!selectedRoom) {
      setError('Select a room to play');
      setStatus('error');
      return;
    }

    const uri = playlist?.uri;
    if (!uri) {
      setError('That playlist is missing a Spotify URI');
      setStatus('error');
      return;
    }

    enqueueAbortRef.current.aborted = false;
    setEnqueueState({ albumId: playlist.id, done: 0, total: 0, phase: 'Replacing queue...' });

    try {
      console.info('[SpotifyAlbumRack] playlist click:', playlist);

      await clearQueue(selectedRoom);
      if (enqueueAbortRef.current.aborted) return;

      await shuffleOff(selectedRoom);
      if (enqueueAbortRef.current.aborted) return;

      setEnqueueState({ albumId: playlist.id, done: 0, total: 0, phase: 'Playing...' });
      console.info('[SpotifyAlbumRack] playlist play now:', { room: selectedRoom, uri });

      await playSpotifyUriNow(selectedRoom, uri);
      if (enqueueAbortRef.current.aborted) return;

      setEnqueueState({ albumId: playlist.id, done: 0, total: 0, phase: 'Ready' });
      await sleep(450);
      setEnqueueState(null);
      setStatus('ready');
    } catch (err) {
      console.error('[SpotifyAlbumRack] playlist enqueue error:', err);
      setEnqueueState(null);
      setError(err?.message || 'Failed to play playlist');
      setStatus('error');
    }
  };

  const enqueueLabel = enqueueState
    ? `${enqueueState.phase} ${enqueueState.total ? `${enqueueState.done}/${enqueueState.total}` : ''}`.trim()
    : null;

  const renderAlbumTile = (album, variant) => {
    const art = album.artworkUrl;
    const title = truncate(album.name, 40);
    const artist = truncate(album.artistName, 36);
    const fallbackLetter = String(album.name || '')
      .trim()
      .charAt(0)
      .toUpperCase();
    const active = enqueueState?.albumId === album.id;
    const isCarousel = variant === 'carousel';
    const showOverlay = contentMode === 'albums' || contentMode === 'spotify-playlists';

    return (
      <button
        key={`${variant}-${album.id}`}
        type="button"
        role="listitem"
        id={`cd-album-${album.id}`}
        className={isCarousel ? `cd-carousel-item ${active ? 'active' : ''}` : `cd-case ${active ? 'active' : ''}`}
        onClick={() => {
          if (contentMode === 'albums') {
            enqueueAlbum(album);
            return;
          }
          if (contentMode === 'spotify-playlists') {
            enqueuePlaylist(album);
            return;
          }
          if (!selectedRoom) {
            setError('Select a room to play');
            setStatus('error');
            return;
          }
          if (contentMode === 'favorites') {
            onPlaySonosFavorite?.(album.name);
          } else if (contentMode === 'playlists') {
            onPlaySonosPlaylist?.(album.name);
          }
        }}
        title={`${album.name} \u2014 ${album.artistName}`}
        disabled={!!enqueueState}
      >
        <div className="cd-cover">
          {art ? (
            <>
              <img className="cd-cover-img" src={art} alt="" loading="lazy" />
              {showOverlay ? (
                <div className="cd-overlay">
                  <div className="cd-overlay-text">
                    <span className="cd-overlay-title">{title}</span>
                    <span className="cd-overlay-artist">{artist}</span>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="cd-cover-fallback" aria-hidden="true">
              <span className="cd-cover-fallback-name">{album.name}</span>
              {album.artistName ? <span className="cd-cover-fallback-artist">{artist}</span> : null}
            </div>
          )}
          {active && enqueueState ? (
            <div className="cd-enqueue-overlay">
              <span className="cd-enqueue-overlay-label">{enqueueState.phase}</span>
              {enqueueState.total > 0 ? (
                <div className="cd-enqueue-overlay-bar">
                  <div
                    className="cd-enqueue-overlay-fill"
                    style={{ width: `${Math.round((enqueueState.done / enqueueState.total) * 100)}%` }}
                  />
                </div>
              ) : null}
              {enqueueState.total > 0 ? (
                <span className="cd-enqueue-overlay-count">{enqueueState.done}/{enqueueState.total}</span>
              ) : null}
            </div>
          ) : null}
        </div>
      </button>
    );
  };

  const renderAlphaNav = () => (
    <div className="cd-alpha-nav" aria-label="Jump by letter">
      {ALPHA.map((letter) => {
        const has = firstIdByLetter.has(letter);
        return (
          <button
            key={letter}
            type="button"
            className={`cd-alpha-letter${has ? ' has-albums' : ''}`}
            onClick={() => ensureLetterLoaded(letter)}
          >
            {letter}
          </button>
        );
      })}
      {firstIdByLetter.has('#') ? (
        <button type="button" className="cd-alpha-letter has-albums" onClick={() => ensureLetterLoaded('#')}>
          #
        </button>
      ) : (
        <button type="button" className="cd-alpha-letter" onClick={() => ensureLetterLoaded('#')}>
          #
        </button>
      )}
    </div>
  );

  return (
    <section id="spotify-album-rack" className="cd-module" aria-label="Spotify album rack">
      <div className="cd-faceplate">
        <div className="cd-header">
          <div className="cd-actions cd-actions-left">
            <div className="cd-view-toggle" role="group" aria-label="Content">
              <button
                type="button"
                className={`cd-view-btn ${contentMode === 'albums' ? 'active' : ''}`}
                onClick={() => setContentMode('albums')}
              >
                Albums
              </button>
              <button
                type="button"
                className={`cd-view-btn ${contentMode === 'spotify-playlists' ? 'active' : ''}`}
                onClick={() => setContentMode('spotify-playlists')}
              >
                Playlists
              </button>
              <button
                type="button"
                className={`cd-view-btn ${contentMode === 'favorites' ? 'active' : ''}`}
                onClick={() => setContentMode('favorites')}
              >
                Sonos Favorites
              </button>
              <button
                type="button"
                className={`cd-view-btn ${contentMode === 'playlists' ? 'active' : ''}`}
                onClick={() => setContentMode('playlists')}
              >
                Sonos Playlists
              </button>
            </div>
          </div>
          <h2 className="cd-title cd-title-center">Library</h2>
          <div className="cd-actions cd-actions-right">
            {isSpotifyLibraryMode ? (
              <div className="cd-view-toggle" role="group" aria-label="Sort">
                <button
                  type="button"
                  className={`cd-view-btn ${sortMode === 'alpha' ? 'active' : ''}`}
                  onClick={() => setSortMode('alpha')}
                >
                  A–Z
                </button>
                <button
                  type="button"
                  className={`cd-view-btn ${sortMode === 'recent' ? 'active' : ''}`}
                  onClick={() => setSortMode('recent')}
                >
                  Recent
                </button>
              </div>
            ) : null}
            {isSpotifyLibraryMode ? (
              <div className="cd-view-toggle" role="group" aria-label="View mode">
                <button
                  type="button"
                  className={`cd-view-btn ${viewMode === 'rack' ? 'active' : ''}`}
                  onClick={() => setViewMode('rack')}
                >
                  Rack
                </button>
                <button
                  type="button"
                  className={`cd-view-btn ${viewMode === 'carousel' ? 'active' : ''}`}
                  onClick={() => setViewMode('carousel')}
                >
                  Carousel
                </button>
              </div>
            ) : null}
            {contentMode === 'albums' || contentMode === 'spotify-playlists' ? (
              spotifyAuthed ? (
                <button
                  type="button"
                  className="cd-action cd-action-ghost cd-action-spotify-account"
                  onClick={handleDisconnect}
                  aria-label="Disconnect Spotify"
                  title="Remove Spotify login from this browser"
                >
                  Disconnect
                </button>
              ) : clientId && canUseSpotify() ? (
                <button type="button" className="cd-action" onClick={handleConnect} aria-label="Connect Spotify">
                  Connect
                </button>
              ) : (
                <button
                  type="button"
                  className="cd-action"
                  onClick={() => setShowSpotifySetup((v) => !v)}
                  aria-label="Set up Spotify"
                >
                  {showSpotifySetup ? 'Close' : 'Setup'}
                </button>
              )
            ) : null}
          </div>
        </div>

        {showSpotifySetup ? (
          <div className="cd-spotify-setup">
            <div className="cd-spotify-setup-steps">
              <p>1. Go to developer.spotify.com/dashboard and create an app</p>
              <p>
                2. Add this redirect URI to the Spotify app (must match exactly):{' '}
                <strong>
                  {window.sonohaus?.isElectron
                    ? getSpotifyDashboardRedirectUri()
                    : `${window.location.origin}/`}
                </strong>
              </p>
              {window.sonohaus?.isElectron ? (
                <p className="cd-spotify-setup-note">
                  The desktop app starts the Spotify helper on <code>127.0.0.1:38901</code> automatically. Add the URI
                  above once in the Spotify dashboard (builds can ship with a Client ID so testers skip this screen).
                </p>
              ) : null}
              <p>3. Copy your Client ID and paste it below</p>
            </div>
            <div className="cd-spotify-setup-input">
              <input
                type="text"
                className="cd-search-input"
                value={clientIdInput}
                onChange={(e) => setClientIdInput(e.target.value)}
                placeholder="Paste Spotify Client ID..."
                aria-label="Spotify Client ID"
              />
              <button
                type="button"
                className="cd-action"
                onClick={() => {
                  setSpotifyClientId(clientIdInput);
                  setShowSpotifySetup(false);
                  window.location.reload();
                }}
                disabled={!clientIdInput.trim()}
              >
                Save
              </button>
            </div>
          </div>
        ) : null}

          <div className="cd-controls">
            <div className="cd-search">
              <input
                className="cd-search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  contentMode === 'spotify-playlists'
                    ? 'Search playlists...'
                    : contentMode === 'albums'
                      ? 'Search albums / artists...'
                      : 'Search...'
                }
                aria-label="Search"
              />
              <div className="cd-search-hint">
                {(() => {
                  const isSpotifyList = contentMode === 'spotify-playlists';
                  const t = isSpotifyList ? spotifyPlaylistsTotal : total;
                  const loadedCount = isSpotifyList ? spotifyPlaylists.length : albums.length;
                  if (t != null) return `${filtered.length}/${t}${loadingMore ? ' · loading' : ''}`;
                  if (loadedCount > 0 || status === 'ready') return `${filtered.length}${loadingMore ? ' · loading' : ''}`;
                  return '';
                })()}
              </div>
            </div>

            {enqueueLabel ? (
              <button type="button" className="cd-enqueue" onClick={cancelEnqueue} title="Click to cancel">
                {enqueueLabel}
              </button>
            ) : null}
          </div>

        <div className="cd-rack" role="list">
            {(contentMode === 'albums' || contentMode === 'spotify-playlists') &&
            status === 'loading' &&
            (contentMode === 'spotify-playlists' ? spotifyPlaylists.length : albums.length) === 0 ? (
            <div className="cd-empty">Connecting to your collection...</div>
          ) : error ? (
            <div className="cd-empty">{error}</div>
            ) : (contentMode === 'albums' || contentMode === 'spotify-playlists') &&
              !spotifyAuthed &&
              (contentMode === 'spotify-playlists' ? spotifyPlaylists.length : albums.length) === 0 ? (
            <div className="cd-empty">
              {!clientId
                ? 'Open Setup and paste your Spotify Client ID from the Spotify developer dashboard.'
                : window.sonohaus?.isElectron
                  ? 'Tap Connect to sign in with Spotify in your browser. When you see “Connected”, return to Sonohaus — your library loads automatically.'
                  : 'Tap Connect to sign in with Spotify and load your library.'}
            </div>
            ) : contentMode === 'albums' && !hasMore && albums.length === 0 ? (
            <div className="cd-empty">No albums found</div>
            ) : contentMode === 'spotify-playlists' && !spotifyPlaylistsHasMore && spotifyPlaylists.length === 0 ? (
            <div className="cd-empty">No playlists found</div>
            ) : filtered.length === 0 && query.trim() && contentMode === 'albums' && !hasMore ? (
            <div className="cd-empty">No matches in your library.</div>
            ) : filtered.length === 0 && query.trim() && contentMode === 'spotify-playlists' && !spotifyPlaylistsHasMore ? (
            <div className="cd-empty">No matching playlists.</div>
          ) : (
            <div className="cd-carousel-panel">
              {isSpotifyLibraryMode && sortMode !== 'recent' ? renderAlphaNav() : null}
              {contentMode === 'albums' && filtered.length === 0 && query.trim() && hasMore ? (
                <div className="cd-search-pending">
                  No matches in loaded albums — scroll right to load more.
                </div>
              ) : null}
              {isSpotifyLibraryMode && viewMode === 'carousel' ? (
                <div className="cd-carousel-scroll" ref={carouselScrollRef} key={`scroll-${contentMode}-${viewMode}-${sortMode}`}>
                  {sortedItems.map((album) => renderAlbumTile(album, 'carousel'))}
                  {hasMoreRef.current ? <div ref={carouselSentinelRef} className="cd-rack-sentinel" aria-hidden /> : null}
                  {isSpotifyLibraryMode && (loadingMore || alphaSeek) ? (
                    <div className="cd-loading-tail" aria-live="polite">
                      {alphaSeek ? `Loading ${alphaSeek.letter}\u2026` : 'Loading\u2026'}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="cd-scroll" ref={rackScrollRef} key={`scroll-${contentMode}-${viewMode}-${sortMode}`}>
                  {(() => {
                    const items = isSpotifyLibraryMode ? sortedItems : filtered;
                    const totalItems = items.length;
                    const start = Math.min(rackWindow.start, totalItems);
                    const end = Math.min(rackWindow.end, totalItems);
                    return (
                      <>
                        {start > 0 && <div style={{ flex: '0 0 auto', width: start * TILE_WIDTH }} />}
                        {items.slice(start, end).map((album) => renderAlbumTile(album, 'rack'))}
                        {end < totalItems && <div style={{ flex: '0 0 auto', width: (totalItems - end) * TILE_WIDTH }} />}
                      </>
                    );
                  })()}
                  {(contentMode === 'albums' && hasMore) ||
                  (contentMode === 'spotify-playlists' && spotifyPlaylistsHasMore) ? (
                    <div ref={rackSentinelRef} className="cd-rack-sentinel" aria-hidden />
                  ) : null}
                  {contentMode === 'albums' && (loadingMore || alphaSeek) ? (
                    <div className="cd-loading-tail" aria-live="polite">
                      {alphaSeek ? `Loading ${alphaSeek.letter}\u2026` : 'Loading\u2026'}
                    </div>
                  ) : null}
                  {contentMode === 'spotify-playlists' && loadingMore ? (
                    <div className="cd-loading-tail" aria-live="polite">
                      Loading\u2026
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
});
