import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from '../api/sonos.js';

export function useSonos() {
  const [zones, setZones] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [playerState, setPlayerState] = useState(null);
  const [volume, setVolumeState] = useState(50);
  const [favorites, setFavorites] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [bridgeReachable, setBridgeReachable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const selectedRoomRef = useRef(selectedRoom);
  selectedRoomRef.current = selectedRoom;
  const volumeCommitTimerRef = useRef(null);

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
        setSelectedRoom(data[0].coordinator.roomName);
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

  useEffect(() => () => {
    if (volumeCommitTimerRef.current) {
      clearTimeout(volumeCommitTimerRef.current);
    }
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

  const toggleShuffle = useCallback(async () => {
    if (!selectedRoom) return;
    try {
      await api.toggleShuffle(selectedRoom);
    } catch {
      setError('Shuffle command failed');
    }
  }, [selectedRoom]);

  const toggleRepeat = useCallback(async () => {
    if (!selectedRoom) return;
    try {
      await api.toggleRepeat(selectedRoom);
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
        setSelectedRoom(roomName);
        return;
      }
      try {
        await api.joinRoom(roomName, target);
        await refreshZones({ silent: true });
      } catch {
        setError('Failed to join room to group');
      }
    },
    [currentCoordinator, refreshZones],
  );

  const leaveRoomFromGroup = useCallback(
    async (roomName) => {
      try {
        await api.leaveRoom(roomName);
        await refreshZones({ silent: true });
        if (selectedRoomRef.current === roomName) {
          setSelectedRoom(roomName);
        }
      } catch {
        setError('Failed to remove room from group');
      }
    },
    [refreshZones],
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
    setSelectedRoom,
    playerState,
    volume,
    setVolume,
    favorites,
    playlists,
    loading,
    error,
    bridgeReachable,
    currentCoordinator,
    currentGroupRooms,
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
    playFavorite,
    playPlaylist,
  };
}
