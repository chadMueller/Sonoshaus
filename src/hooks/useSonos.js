import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from '../api/sonos.js';

const LAST_SELECTED_ROOM_KEY = 'sonohaus.lastSelectedRoom.v1';

function safeLoadLastSelectedRoom() {
  try {
    const v = localStorage.getItem(LAST_SELECTED_ROOM_KEY);
    return v && typeof v === 'string' ? v : null;
  } catch {
    return null;
  }
}

function safeSaveLastSelectedRoom(roomName) {
  try {
    if (!roomName) return;
    localStorage.setItem(LAST_SELECTED_ROOM_KEY, String(roomName));
  } catch {
    // ignore
  }
}

export function useSonos() {
  const [zones, setZones] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [playerState, setPlayerState] = useState(null);
  const [volume, setVolumeState] = useState(50);
  const [favorites, setFavorites] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [queue, setQueue] = useState([]);
  const [playNextSupported, setPlayNextSupported] = useState(true);
  const [bridgeReachable, setBridgeReachable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roomStates, setRoomStates] = useState({});
  const [roomLastActiveAt, setRoomLastActiveAt] = useState({});

  const selectedRoomRef = useRef(selectedRoom);
  selectedRoomRef.current = selectedRoom;
  const userSelectedRoomRef = useRef(false);
  const volumeCommitTimerRef = useRef(null);
  const roomVolumeTimersRef = useRef({});

  const getRoomNamesFromZone = useCallback((zone) => {
    const members = Array.isArray(zone?.members)
      ? zone.members.map((member) => member?.roomName).filter(Boolean)
      : [];
    const coordinator = zone?.coordinator?.roomName ? [zone.coordinator.roomName] : [];
    return Array.from(new Set([...coordinator, ...members]));
  }, []);

  const findZoneForRoom = useCallback(
    (roomName) =>
      zones.find((zone) => getRoomNamesFromZone(zone).includes(roomName)) || null,
    [zones, getRoomNamesFromZone],
  );

  const refreshZones = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.getZones();
      setZones(data);
      setBridgeReachable(true);
      setError(null);
      if (!selectedRoomRef.current && data.length > 0) {
        // Temporary default; auto-join logic below may override on first scan.
        const fallback = safeLoadLastSelectedRoom() || data[0].coordinator.roomName;
        setSelectedRoom(fallback);
      }
      return data;
    } catch {
      setBridgeReachable(false);
      setError('Failed to load zones');
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const setSelectedRoomAndPersist = useCallback((roomName) => {
    userSelectedRoomRef.current = true;
    safeSaveLastSelectedRoom(roomName);
    setSelectedRoom(roomName);
  }, []);

  const getCoordinatorRooms = useCallback((zoneList) => {
    const list = Array.isArray(zoneList) ? zoneList : [];
    return list.map((z) => z?.coordinator?.roomName).filter(Boolean);
  }, []);

  const scanCoordinatorActivity = useCallback(
    async (zoneList, { allowAutoSelect = false } = {}) => {
      const coordinators = getCoordinatorRooms(zoneList);
      if (coordinators.length === 0) return;

      const now = Date.now();
      const results = await Promise.all(
        coordinators.map(async (roomName) => {
          try {
            const state = await api.getState(roomName);
            return { roomName, state };
          } catch {
            return { roomName, state: null };
          }
        }),
      );

      setRoomStates((prev) => {
        const next = { ...prev };
        for (const r of results) {
          if (r.state) next[r.roomName] = r.state;
        }
        return next;
      });

      setRoomLastActiveAt((prev) => {
        const next = { ...prev };
        for (const r of results) {
          const s = r.state;
          if (!s) continue;
          const playing = s.playbackState === 'PLAYING';
          if (playing) next[r.roomName] = now;
        }
        return next;
      });

      if (!allowAutoSelect) return;
      if (userSelectedRoomRef.current) return;

      // Choose most recently active; if none playing, fall back to last selected.
      const lastSelected = safeLoadLastSelectedRoom();
      const activityPairs = results
        .map((r) => [r.roomName, roomLastActiveAt[r.roomName] || 0, r.state?.playbackState])
        .sort((a, b) => b[1] - a[1]);
      const bestActive = activityPairs.find((p) => p[1] > 0 && p[2] === 'PLAYING')?.[0] || activityPairs[0]?.[0] || null;
      const target = bestActive || lastSelected || coordinators[0] || null;
      if (target && target !== selectedRoomRef.current) {
        setSelectedRoom(target);
      }
    },
    [getCoordinatorRooms, roomLastActiveAt],
  );

  // Fetch zones on mount
  useEffect(() => {
    let cancelled = false;
    refreshZones();

    const interval = setInterval(() => {
      if (!cancelled) {
        refreshZones({ silent: true });
      }
    }, 10000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [refreshZones]);

  // Auto-join the most recently active coordinator (best-effort).
  useEffect(() => {
    if (!zones || zones.length === 0) return;
    let cancelled = false;

    const run = async (allowAutoSelect) => {
      try {
        await scanCoordinatorActivity(zones, { allowAutoSelect });
      } catch {
        // ignore
      }
    };

    // First run should be allowed to auto-select.
    run(true);

    const interval = setInterval(() => {
      if (!cancelled) run(false);
    }, 15000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [zones, scanCoordinatorActivity]);

  useEffect(() => () => {
    if (volumeCommitTimerRef.current) {
      clearTimeout(volumeCommitTimerRef.current);
    }
    Object.values(roomVolumeTimersRef.current).forEach((timer) => clearTimeout(timer));
  }, []);

  const normalizeQueue = useCallback((rawQueue) => {
    if (Array.isArray(rawQueue)) return rawQueue;
    if (Array.isArray(rawQueue?.items)) return rawQueue.items;
    if (Array.isArray(rawQueue?.queue)) return rawQueue.queue;
    if (Array.isArray(rawQueue?.tracks)) return rawQueue.tracks;
    return [];
  }, []);

  const getQueueStartIndex = useCallback((state, normalizedQueue) => {
    const q = Array.isArray(normalizedQueue) ? normalizedQueue : [];
    if (q.length === 0) return 0;
    const anyState = state && typeof state === 'object' ? state : null;

    const qp = anyState && typeof anyState.queuePosition === 'number' ? anyState.queuePosition : null;
    if (typeof qp === 'number' && Number.isFinite(qp) && qp >= 0 && qp < q.length) return Math.floor(qp);

    const trackNo = anyState && typeof anyState.trackNo === 'number' ? anyState.trackNo : null;
    // Some bridges report trackNo as 1-based queue index.
    if (typeof trackNo === 'number' && Number.isFinite(trackNo)) {
      const idx = Math.floor(trackNo - 1);
      if (idx >= 0 && idx < q.length) return idx;
    }

    return 0;
  }, []);

  // Poll player state every 2 seconds when a room is selected
  useEffect(() => {
    if (!selectedRoom) return;

    let cancelled = false;

    async function fetchState() {
      try {
        const data = await api.getState(selectedRoom);
        if (cancelled) return;
        setPlayerState(data);
        setVolumeState(data.volume);
        setBridgeReachable(true);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setBridgeReachable(false);
          setError('Failed to fetch player state');
        }
      }
    }

    fetchState();
    const interval = setInterval(fetchState, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedRoom]);

  // Fetch favorites and playlists when room changes
  useEffect(() => {
    if (!selectedRoom) return;

    let cancelled = false;

    async function fetchContent() {
      try {
        const [favData, playlistData] = await Promise.all([
          api.getFavorites(selectedRoom),
          api.getPlaylists(selectedRoom),
        ]);
        if (cancelled) return;
        setFavorites(Array.isArray(favData) ? favData : []);
        setPlaylists(Array.isArray(playlistData) ? playlistData : []);
      } catch {
        // Silently fail - favorites/playlists are non-critical
      }
    }

    fetchContent();
    return () => { cancelled = true; };
  }, [selectedRoom]);

  // Fetch queue when room changes and poll periodically.
  useEffect(() => {
    if (!selectedRoom) return;
    let cancelled = false;

    async function fetchQueue() {
      try {
        const queueData = await api.getQueue(selectedRoom);
        if (!cancelled) {
          setQueue(normalizeQueue(queueData));
        }
      } catch {
        if (!cancelled) {
          setQueue([]);
        }
      }
    }

    fetchQueue();
    const interval = setInterval(fetchQueue, 8000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedRoom, normalizeQueue]);

  const queueStartIndex = getQueueStartIndex(playerState, queue);
  const remainingQueue = Array.isArray(queue) ? queue.slice(queueStartIndex) : [];

  // Control functions
  const playRoom = useCallback(async (roomName) => {
    try {
      await api.play(roomName);
    } catch {
      setError('Playback command failed');
    }
  }, []);

  const play = useCallback(async () => {
    if (!selectedRoom) return;
    try {
      await api.play(selectedRoom);
    } catch {
      setError('Playback command failed');
    }
  }, [selectedRoom]);

  const pause = useCallback(async () => {
    if (!selectedRoom) return;
    try {
      await api.pause(selectedRoom);
    } catch {
      setError('Pause command failed');
    }
  }, [selectedRoom]);

  const next = useCallback(async () => {
    if (!selectedRoom) return;
    try {
      await api.next(selectedRoom);
    } catch {
      setError('Skip command failed');
    }
  }, [selectedRoom]);

  const prev = useCallback(async () => {
    if (!selectedRoom) return;
    try {
      await api.previous(selectedRoom);
    } catch {
      setError('Skip command failed');
    }
  }, [selectedRoom]);

  const setVolume = useCallback(async (level) => {
    if (!selectedRoom) return;
    const clamped = Math.max(0, Math.min(100, Math.round(level)));
    setVolumeState(clamped);
    if (volumeCommitTimerRef.current) {
      clearTimeout(volumeCommitTimerRef.current);
    }
    volumeCommitTimerRef.current = setTimeout(() => {
      api.setVolume(selectedRoom, clamped);
    }, 90);
  }, [selectedRoom]);

  const roomVolumes = Object.fromEntries(
    zones.flatMap((zone) => {
      const members = Array.isArray(zone?.members) ? zone.members : [];
      return members
        .map((member) => {
          const roomName = member?.roomName;
          const memberVolume = member?.state?.volume;
          if (!roomName || typeof memberVolume !== 'number') return null;
          return [roomName, Math.max(0, Math.min(100, Math.round(memberVolume)))];
        })
        .filter(Boolean);
    }),
  );

  const setRoomVolume = useCallback((roomName, level) => {
    if (!roomName) return;
    const clamped = Math.max(0, Math.min(100, Math.round(level)));
    if (roomVolumeTimersRef.current[roomName]) {
      clearTimeout(roomVolumeTimersRef.current[roomName]);
    }
    roomVolumeTimersRef.current[roomName] = setTimeout(async () => {
      try {
        await api.setVolume(roomName, clamped);
        await refreshZones({ silent: true });
        if (selectedRoomRef.current === roomName) {
          setVolumeState(clamped);
        }
      } catch {
        setError(`Failed to set volume for ${roomName}`);
      }
    }, 90);
  }, [refreshZones]);

  const toggleShuffle = useCallback(async () => {
    if (!selectedRoom) return;
    try {
      await api.toggleShuffle(selectedRoom);
      const state = await api.getState(selectedRoom);
      if (state) setPlayerState(state);
    } catch {
      setError('Shuffle command failed');
    }
  }, [selectedRoom]);

  const toggleRepeat = useCallback(async () => {
    if (!selectedRoom) return;
    try {
      await api.toggleRepeat(selectedRoom);
      const state = await api.getState(selectedRoom);
      if (state) setPlayerState(state);
    } catch {
      setError('Repeat command failed');
    }
  }, [selectedRoom]);

  const playFavorite = useCallback(async (name) => {
    if (!selectedRoom) return;
    try {
      await api.playFavorite(selectedRoom, name);
    } catch {
      setError('Failed to play favorite');
    }
  }, [selectedRoom]);

  const playPlaylist = useCallback(async (name) => {
    if (!selectedRoom) return;
    try {
      await api.playPlaylist(selectedRoom, name);
    } catch {
      setError('Failed to play playlist');
    }
  }, [selectedRoom]);

  const playFavoriteNext = useCallback(async (name) => {
    if (!selectedRoom) return false;
    try {
      await api.playFavoriteNext(selectedRoom, name);
      setPlayNextSupported(true);
      return true;
    } catch {
      setPlayNextSupported(false);
      setError('Play-next not supported by current Sonos bridge endpoint');
      return false;
    }
  }, [selectedRoom]);

  const playPlaylistNext = useCallback(async (name) => {
    if (!selectedRoom) return false;
    try {
      await api.playPlaylistNext(selectedRoom, name);
      setPlayNextSupported(true);
      return true;
    } catch {
      setPlayNextSupported(false);
      setError('Play-next not supported by current Sonos bridge endpoint');
      return false;
    }
  }, [selectedRoom]);

  const currentZone = selectedRoom ? findZoneForRoom(selectedRoom) : null;
  const currentGroupRooms = currentZone
    ? getRoomNamesFromZone(currentZone)
    : selectedRoom
      ? [selectedRoom]
      : [];
  const currentCoordinator = currentZone?.coordinator?.roomName || selectedRoom;

  const joinRoomToCurrentGroup = useCallback(
    async (roomName) => {
      const target = currentCoordinator || selectedRoomRef.current || roomName;
      if (!target || roomName === target) {
        setSelectedRoomAndPersist(roomName);
        return;
      }
      try {
        await api.joinRoom(roomName, target);
        await refreshZones({ silent: true });
      } catch {
        setError('Failed to join room to group');
      }
    },
    [currentCoordinator, refreshZones, setSelectedRoomAndPersist],
  );

  const leaveRoomFromGroup = useCallback(
    async (roomName) => {
      try {
        await api.leaveRoom(roomName);
        await refreshZones({ silent: true });
        if (selectedRoomRef.current === roomName) {
          setSelectedRoomAndPersist(roomName);
        }
      } catch {
        setError('Failed to remove room from group');
      }
    },
    [refreshZones, setSelectedRoomAndPersist],
  );

  const roomNames = Array.from(
    new Set(
      zones.flatMap((zone) => {
        const memberNames = Array.isArray(zone.members)
          ? zone.members
              .map((member) => member?.roomName)
              .filter(Boolean)
          : [];
        const coordinatorName = zone?.coordinator?.roomName
          ? [zone.coordinator.roomName]
          : [];
        return [...coordinatorName, ...memberNames];
      }),
    ),
  );

  return {
    zones,
    roomNames,
    selectedRoom,
    setSelectedRoom: setSelectedRoomAndPersist,
    playerState,
    volume,
    setVolume,
    favorites,
    playlists,
    queue,
    remainingQueue,
    queueStartIndex,
    roomStates,
    roomLastActiveAt,
    playNextSupported,
    loading,
    error,
    bridgeReachable,
    currentCoordinator,
    currentGroupRooms,
    roomVolumes,
    playRoom,
    play,
    pause,
    next,
    prev,
    toggleShuffle,
    toggleRepeat,
    refreshZones,
    joinRoomToCurrentGroup,
    leaveRoomFromGroup,
    setRoomVolume,
    playFavorite,
    playPlaylist,
    playFavoriteNext,
    playPlaylistNext,
  };
}
