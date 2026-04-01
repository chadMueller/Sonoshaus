import { useEffect, useMemo, useRef, useState } from 'react';
import { ToggleSwitch } from './ToggleSwitch.jsx';
import { ReceiverDisplay } from './ReceiverDisplay.jsx';
import { TransportControls } from './TransportControls.jsx';
import { VolumeKnob } from './VolumeKnob.jsx';
import { RoomVolumeKnob } from './RoomVolumeKnob.jsx';
import { MediaStack } from './MediaStack.jsx';
import { PresetsRack } from './PresetsRack.jsx';
import { SpotifyAlbumRack } from './SpotifyAlbumRack.jsx';
import { RackSlot } from './RackSlot.jsx';
import { useSonos } from '../../hooks/useSonos.js';
import { useReceiverRackOrder } from '../../hooks/useReceiverRackOrder.js';
import { RACK_ARIA_NAMES } from '../../lib/receiverRackOrder.js';
import { BridgeSetupWizard } from '../BridgeSetupWizard.jsx';
import { isMockModeEnabled } from '../../api/sonos.js';

export function SonosReceiverView({ spotifyAuthError }) {
  const sonos = useSonos();
  const { order, moveRack, reorderUiVisible, toggleReorderUi } = useReceiverRackOrder();
  const isPlaying = sonos.playerState?.playbackState === 'PLAYING';
  const shuffleOn = sonos.playerState?.playMode?.shuffle === true;
  const repeatOn = !!sonos.playerState?.playMode?.repeat;
  const powerOn = !!sonos.selectedRoom && isPlaying;
  const roomOrderRef = useRef(new Map());
  const [pendingRooms, setPendingRooms] = useState({});

  const hasPendingRooms = Object.keys(pendingRooms).length > 0;
  useEffect(() => {
    if (!hasPendingRooms) return;
    const id = setInterval(() => {
      const now = Date.now();
      setPendingRooms((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const [roomKey, info] of Object.entries(next)) {
          if (!info || typeof info !== 'object') continue;
          if (now - info.startedAt > 7000) {
            delete next[roomKey];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 500);
    return () => clearInterval(id);
  }, [hasPendingRooms]);

  useEffect(() => {
    setPendingRooms((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const [roomKey, info] of Object.entries(next)) {
        if (!info || typeof info !== 'object') continue;
        const isActive = sonos.currentGroupRooms.includes(roomKey);
        if (isActive === info.desiredActive) {
          delete next[roomKey];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [sonos.currentGroupRooms]);

  const roomLabels = useMemo(() => {
    const names =
      sonos.roomNames.length > 0
        ? sonos.roomNames
        : isMockModeEnabled()
          ? ['Living Room', 'Kitchen', 'Office', 'Bedroom', 'Patio', 'Den', 'Dining', 'Gym']
          : [];
    return [...names]
      .sort((a, b) => String(a).localeCompare(String(b)))
      .map((name) => ({ key: name, label: name }));
  }, [sonos.roomNames]);

  // Zone EQ colors: rooms in the same zone get the same color
  const ZONE_COLORS = [
    'rgba(229, 141, 61, 0.85)',  // gold/amber
    'rgba(90, 190, 90, 0.85)',   // green
    'rgba(80, 160, 220, 0.85)',  // blue
    'rgba(190, 90, 170, 0.85)',  // magenta
    'rgba(70, 195, 195, 0.85)',  // cyan
    'rgba(210, 80, 70, 0.85)',   // red
  ];

  const roomEqColor = useMemo(() => {
    const map = {};
    const zones = sonos.zones || [];
    zones.forEach((zone, zoneIdx) => {
      const color = ZONE_COLORS[zoneIdx % ZONE_COLORS.length];
      const coord = zone?.coordinator?.roomName;
      if (coord) map[coord] = color;
      const members = Array.isArray(zone?.members) ? zone.members : [];
      members.forEach((m) => {
        if (m?.roomName) map[m.roomName] = color;
      });
    });
    return map;
  }, [sonos.zones]);

  const renderRackSegment = (rackId) => {
    switch (rackId) {
      case 'receiver':
        return (
          <div className="receiver-environment">
            <div className="aluminum-faceplate">
              <div className="screw tl" />
              <div className="screw tr" />
              <div className="screw bl" />
              <div className="screw br" />

              <section className="section-power">
                <div className="power-brand-cluster">
                  <div className="left-power-group">
                    <ToggleSwitch
                      label=""
                      hideLabel
                      ariaLabel="Power"
                      active={powerOn}
                      onToggle={() => {
                        if (!sonos.selectedRoom && roomLabels.length > 0) {
                          const room = roomLabels[0].key;
                          sonos.setSelectedRoom(room);
                          sonos.playRoom(room);
                          return;
                        }
                        if (isPlaying) {
                          sonos.pause();
                        } else {
                          sonos.play();
                        }
                      }}
                    />
                    <div className={`jewel-light ${sonos.bridgeReachable ? 'on' : 'off'}`} />
                    <button
                      type="button"
                      className="receiver-edit-order"
                      aria-pressed={reorderUiVisible}
                      aria-label={
                        reorderUiVisible
                          ? 'Hide rack order controls on all sections'
                          : 'Show rack order controls to reorder receiver sections'
                      }
                      onClick={toggleReorderUi}
                    >
                      {reorderUiVisible ? 'Hide order' : 'Edit order'}
                    </button>
                  </div>

                  <div className="brand-block">
                    <div className="brand-name">Sonohaus</div>
                    <div className="model-name">MODEL S-1600</div>
                  </div>
                </div>
              </section>

              <section className="section-display">
                <ReceiverDisplay
                  loading={sonos.loading}
                  error={sonos.error}
                  currentTrack={sonos.playerState?.currentTrack}
                  playbackState={sonos.playerState?.playbackState}
                  selectedRoom={sonos.selectedRoom}
                  queue={sonos.queue}
                  queueStartIndex={sonos.queueStartIndex}
                  queueLoading={sonos.loading}
                  shuffleOn={shuffleOn}
                  onSeekToQueueIndex={sonos.skipToQueueIndex}
                />
              </section>

              <section className="section-controls">
                <VolumeKnob value={sonos.volume} onChange={sonos.setVolume} />
                <TransportControls
                  isPlaying={isPlaying}
                  shuffle={shuffleOn}
                  repeat={repeatOn}
                  onPrevious={sonos.prev}
                  onPlayPause={isPlaying ? sonos.pause : sonos.play}
                  onNext={sonos.next}
                  onToggleShuffle={sonos.toggleShuffle}
                  onToggleRepeat={sonos.toggleRepeat}
                />
              </section>

              <section className="section-room-toggles">
                <div className="rooms-row">
                  {roomLabels.map((room) => (
                    <div key={room.key} className="room-toggle-wrap">
                      <ToggleSwitch
                        label={room.label}
                        active={pendingRooms[room.key]?.desiredActive ?? sonos.currentGroupRooms.includes(room.key)}
                        pending={!!pendingRooms[room.key]}
                        onToggle={() => {
                          const currentlyActive = sonos.currentGroupRooms.includes(room.key);
                          const desiredActive = !currentlyActive;
                          setPendingRooms((prev) => ({
                            ...prev,
                            [room.key]: { desiredActive, startedAt: Date.now() },
                          }));
                          if (currentlyActive) {
                            sonos.leaveRoomFromGroup(room.key);
                          } else {
                            sonos.joinRoomToCurrentGroup(room.key);
                          }
                        }}
                        onSecondaryClick={() => sonos.setSelectedRoom(room.key)}
                        secondaryLabel="Solo"
                        secondaryActive={sonos.selectedRoom === room.key}
                      />
                      <div className="room-volume-wrap">
                        <RoomVolumeKnob
                          label={room.label}
                          value={sonos.roomVolumes[room.key] ?? 0}
                          onChange={(nextVolume) => sonos.setRoomVolume(room.key, nextVolume)}
                        />
                      </div>
                      {sonos.roomStates?.[room.key]?.playbackState === 'PLAYING' ? (
                        <div
                          className="room-activity-eq"
                          aria-label="Playing"
                          style={{ '--eq-color': roomEqColor[room.key] || ZONE_COLORS[0] }}
                        >
                          <span className="eq-bar b1" />
                          <span className="eq-bar b2" />
                          <span className="eq-bar b3" />
                          <span className="eq-bar b4" />
                        </div>
                      ) : (
                        <div className="room-activity-eq room-activity-eq--idle" aria-hidden="true" />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        );
      case 'presets':
        return (
          <PresetsRack
            selectedRoom={sonos.selectedRoom}
            roomNames={sonos.roomNames}
            favorites={sonos.favorites}
            playlists={sonos.playlists}
            onPlayFavorite={sonos.playFavorite}
            onPlayPlaylist={sonos.playPlaylist}
            onSetSelectedRoom={sonos.setSelectedRoom}
          />
        );
      case 'spotify':
        return (
          <SpotifyAlbumRack
            selectedRoom={sonos.selectedRoom}
            spotifyAuthError={spotifyAuthError}
            sonosFavorites={sonos.favorites}
            sonosPlaylists={sonos.playlists}
            onPlaySonosFavorite={sonos.playFavorite}
            onPlaySonosPlaylist={sonos.playPlaylist}
          />
        );
      case 'queue':
        return (
          <MediaStack
            queue={sonos.queue}
            queueStartIndex={sonos.queueStartIndex}
            loading={sonos.loading}
            selectedRoom={sonos.selectedRoom}
            onSeekToQueueIndex={sonos.skipToQueueIndex}
          />
        );
      default:
        return null;
    }
  };

  const showBridgeWizard = !isMockModeEnabled() && !sonos.bridgeReachable;

  if (showBridgeWizard) {
    return (
      <BridgeSetupWizard
        loading={sonos.loading}
        errorMessage={sonos.error}
        onRetry={() => sonos.refreshZones()}
      />
    );
  }

  return (
    <main className="receiver-page">
      <div className="receiver-cabinet">
        <div className="receiver-rack">
          {order.map((rackId, index) => (
            <RackSlot
              key={rackId}
              showReorderRail={reorderUiVisible}
              ariaRackName={RACK_ARIA_NAMES[rackId] ?? rackId}
              canMoveUp={index > 0}
              canMoveDown={index < order.length - 1}
              onMoveUp={() => moveRack(rackId, 'up')}
              onMoveDown={() => moveRack(rackId, 'down')}
            >
              {renderRackSegment(rackId)}
            </RackSlot>
          ))}
        </div>
      </div>
    </main>
  );
}
