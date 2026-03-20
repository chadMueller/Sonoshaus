import { useMemo, useRef } from 'react';
import { ToggleSwitch } from './ToggleSwitch.jsx';
import { ReceiverDisplay } from './ReceiverDisplay.jsx';
import { TransportControls } from './TransportControls.jsx';
import { VolumeKnob } from './VolumeKnob.jsx';
import { RoomVolumeKnob } from './RoomVolumeKnob.jsx';
import { MediaStack } from './MediaStack.jsx';
import { useSonos } from '../../hooks/useSonos.js';

export function SonosReceiverView() {
  const sonos = useSonos();
  const isPlaying = sonos.playerState?.playbackState === 'PLAYING';
  const powerOn = !!sonos.selectedRoom && isPlaying;
  const roomOrderRef = useRef(new Map());

  const roomLabels = useMemo(() => {
    const names =
      sonos.roomNames.length > 0
        ? sonos.roomNames
        : ['Living Room', 'Kitchen', 'Office', 'Bedroom', 'Patio', 'Den', 'Dining', 'Gym'];
    names.forEach((name) => {
      if (!roomOrderRef.current.has(name)) {
        roomOrderRef.current.set(name, roomOrderRef.current.size);
      }
    });
    return [...names]
      .sort((a, b) => (roomOrderRef.current.get(a) ?? 0) - (roomOrderRef.current.get(b) ?? 0))
      .map((name) => ({ key: name, label: name }));
  }, [sonos.roomNames]);

  return (
    <main className="receiver-page">
      <div className="receiver-rack">
        <div className="receiver-environment">
          <div className="wood-casing">
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
                  </div>

                  <div className="brand-block">
                    <div className="brand-name">M-HAUS</div>
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
                />
              </section>

              <section className="section-controls">
                <VolumeKnob value={sonos.volume} onChange={sonos.setVolume} />
                <TransportControls
                  isPlaying={isPlaying}
                  onPrevious={sonos.prev}
                  onPlayPause={isPlaying ? sonos.pause : sonos.play}
                  onNext={sonos.next}
                />
              </section>

              <section className="section-room-toggles">
                <div className="rooms-row">
                  {roomLabels.map((room) => (
                    <div key={room.key} className="room-toggle-wrap">
                      <ToggleSwitch
                        label={room.label}
                        active={sonos.currentGroupRooms.includes(room.key)}
                        onToggle={() => {
                          if (sonos.currentGroupRooms.includes(room.key)) {
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
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>

        <MediaStack
          selectedRoom={sonos.selectedRoom}
          favorites={sonos.favorites}
          playlists={sonos.playlists}
          queue={sonos.queue}
          loading={sonos.loading}
          playNextSupported={sonos.playNextSupported}
          onPlayFavorite={sonos.playFavorite}
          onPlayPlaylist={sonos.playPlaylist}
          onPlayFavoriteNext={sonos.playFavoriteNext}
          onPlayPlaylistNext={sonos.playPlaylistNext}
        />
      </div>
    </main>
  );
}
