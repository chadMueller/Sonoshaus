import React, { useCallback, useMemo, useRef, useState } from 'react';
import { usePresets } from '../../hooks/usePresets.js';
import { PRESET_COUNT } from '../../lib/presets.js';

function sourceToPickerItems(source, type) {
  if (!Array.isArray(source)) return [];
  return source
    .map((item) => {
      if (typeof item === 'string') return { type, name: item, label: item };
      if (item && typeof item === 'object') {
        const name = item.title || item.name || item.uri || 'Untitled';
        return { type, name, label: name };
      }
      return null;
    })
    .filter(Boolean);
}

function truncateLabel(value, max) {
  if (typeof value !== 'string') return '';
  const s = value.replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, Math.max(0, max - 1))}\u2026`;
}

const LONG_PRESS_MS = 600;

export const PresetsRack = React.memo(function PresetsRack({
  selectedRoom,
  roomNames = [],
  favorites = [],
  playlists = [],
  onPlayFavorite,
  onPlayPlaylist,
  onSetSelectedRoom,
}) {
  const { presets, setPreset, clearPreset } = usePresets();
  const [assigningIndex, setAssigningIndex] = useState(null);
  const [assignStep, setAssignStep] = useState('content'); // 'content' | 'room'
  const [pendingContent, setPendingContent] = useState(null);
  const [pickerTab, setPickerTab] = useState('favorites');
  const [playingIndex, setPlayingIndex] = useState(null);
  const [errorIndex, setErrorIndex] = useState(null);
  const pressTimerRef = useRef(null);
  const pressIndexRef = useRef(null);
  const playingTimerRef = useRef(null);
  const errorTimerRef = useRef(null);

  const favoriteItems = useMemo(() => sourceToPickerItems(favorites, 'favorite'), [favorites]);
  const playlistItems = useMemo(() => sourceToPickerItems(playlists, 'playlist'), [playlists]);
  const pickerItems = pickerTab === 'favorites' ? favoriteItems : playlistItems;

  const firePreset = useCallback(
    (index) => {
      const preset = presets[index];
      if (!preset) return;

      // If preset has a saved room, switch to it first
      const targetRoom = preset.room || selectedRoom;
      if (!targetRoom) {
        setErrorIndex(index);
        clearTimeout(errorTimerRef.current);
        errorTimerRef.current = setTimeout(() => setErrorIndex(null), 1200);
        return;
      }

      if (preset.room && preset.room !== selectedRoom) {
        onSetSelectedRoom?.(preset.room);
      }

      if (preset.type === 'favorite') {
        onPlayFavorite?.(preset.name);
      } else if (preset.type === 'playlist') {
        onPlayPlaylist?.(preset.name);
      }
      setPlayingIndex(index);
      clearTimeout(playingTimerRef.current);
      playingTimerRef.current = setTimeout(() => setPlayingIndex(null), 1500);
    },
    [presets, selectedRoom, onPlayFavorite, onPlayPlaylist, onSetSelectedRoom],
  );

  const handlePointerDown = useCallback(
    (index) => {
      pressIndexRef.current = index;
      pressTimerRef.current = setTimeout(() => {
        pressTimerRef.current = null;
        setAssigningIndex(index);
        setAssignStep('content');
        setPendingContent(null);
        setPickerTab('favorites');
      }, LONG_PRESS_MS);
    },
    [],
  );

  const handlePointerUp = useCallback(
    (index) => {
      if (pressTimerRef.current !== null) {
        clearTimeout(pressTimerRef.current);
        pressTimerRef.current = null;
        if (assigningIndex === null) {
          firePreset(index);
        }
      }
    },
    [assigningIndex, firePreset],
  );

  const handlePointerCancel = useCallback(() => {
    if (pressTimerRef.current !== null) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  const handlePickContent = useCallback((item) => {
    setPendingContent(item);
    setAssignStep('room');
  }, []);

  const finishAssign = useCallback(
    (room) => {
      if (assigningIndex === null || !pendingContent) return;
      setPreset(assigningIndex, {
        type: pendingContent.type,
        name: pendingContent.name,
        label: pendingContent.label,
        room,
      });
      setAssigningIndex(null);
      setPendingContent(null);
      setAssignStep('content');
    },
    [assigningIndex, pendingContent, setPreset],
  );

  const handleClear = useCallback(() => {
    if (assigningIndex === null) return;
    clearPreset(assigningIndex);
    setAssigningIndex(null);
    setPendingContent(null);
    setAssignStep('content');
  }, [assigningIndex, clearPreset]);

  const handleCancel = useCallback(() => {
    setAssigningIndex(null);
    setPendingContent(null);
    setAssignStep('content');
  }, []);

  return (
    <section className="stack-module stack-module--presets" aria-label="Presets">
      <div className="stack-faceplate">
        <div className="stack-header">
          <div className="stack-title" aria-hidden="true" />
          <h2 className="cd-title">Presets</h2>
          {assigningIndex !== null ? (
            <button
              type="button"
              className="presets-cancel"
              onClick={handleCancel}
            >
              Cancel
            </button>
          ) : null}
        </div>

        <div className="presets-button-row">
          {Array.from({ length: PRESET_COUNT }, (_, i) => {
            const preset = presets[i];
            const isEmpty = !preset;
            const isPlaying = playingIndex === i;
            const isAssigning = assigningIndex === i;
            const isError = errorIndex === i;

            let stateClass = '';
            if (isPlaying) stateClass = 'preset-btn--playing';
            else if (isError) stateClass = 'preset-btn--error';
            else if (isAssigning) stateClass = 'preset-btn--assigning';
            else if (isEmpty) stateClass = 'preset-btn--empty';

            const roomHint = preset?.room ? ` \u2022 ${preset.room}` : '';

            return (
              <button
                key={i}
                type="button"
                className={`preset-btn ${stateClass}`}
                onPointerDown={() => handlePointerDown(i)}
                onPointerUp={() => handlePointerUp(i)}
                onPointerCancel={handlePointerCancel}
                onPointerLeave={handlePointerCancel}
                onContextMenu={(e) => e.preventDefault()}
                title={preset ? `${preset.label} (${preset.type})${roomHint}` : `Preset ${i + 1} \u2014 hold to assign`}
                aria-label={preset ? `Preset ${i + 1}: ${preset.label}${roomHint}` : `Preset ${i + 1}: empty`}
              >
                <span className="preset-btn-number">{i + 1}</span>
                <span className="preset-btn-label">
                  {preset ? truncateLabel(preset.label, 12) : '---'}
                </span>
                {preset?.room ? (
                  <span className="preset-btn-room">{truncateLabel(preset.room, 10)}</span>
                ) : null}
              </button>
            );
          })}
        </div>

        {assigningIndex !== null ? (
          <div className="presets-assign-panel">
            {assignStep === 'content' ? (
              <>
                <div className="presets-assign-header">
                  <span className="presets-assign-title">
                    1. Pick content
                  </span>
                  <div className="cd-view-toggle" role="group" aria-label="Source type">
                    <button
                      type="button"
                      className={`cd-view-btn ${pickerTab === 'favorites' ? 'active' : ''}`}
                      onClick={() => setPickerTab('favorites')}
                    >
                      Favorites
                    </button>
                    <button
                      type="button"
                      className={`cd-view-btn ${pickerTab === 'playlists' ? 'active' : ''}`}
                      onClick={() => setPickerTab('playlists')}
                    >
                      Playlists
                    </button>
                  </div>
                </div>

                <div className="presets-assign-list">
                  {pickerItems.length === 0 ? (
                    <div className="stack-empty">
                      No {pickerTab} found
                    </div>
                  ) : (
                    pickerItems.map((item) => (
                      <button
                        key={`${item.type}-${item.name}`}
                        type="button"
                        className="stack-item"
                        onClick={() => handlePickContent(item)}
                        title={item.label}
                      >
                        <div className="stack-item-text">
                          <div className="stack-item-title stack-item-title--single">
                            <span className="stack-item-track">{item.label}</span>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="presets-assign-header">
                  <span className="presets-assign-title">
                    2. Pick room
                  </span>
                  <span className="presets-assign-content-label">
                    {pendingContent?.label}
                  </span>
                </div>

                <div className="presets-room-picker">
                  <button
                    type="button"
                    className="presets-room-option presets-room-option--any"
                    onClick={() => finishAssign(null)}
                  >
                    Current room
                    <span className="presets-room-hint">Uses whatever room is selected</span>
                  </button>
                  {roomNames.map((room) => (
                    <button
                      key={room}
                      type="button"
                      className="presets-room-option"
                      onClick={() => finishAssign(room)}
                    >
                      {room}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="presets-assign-footer">
              {assignStep === 'room' ? (
                <button
                  type="button"
                  className="presets-back-btn"
                  onClick={() => setAssignStep('content')}
                >
                  Back
                </button>
              ) : null}
              {presets[assigningIndex] ? (
                <button
                  type="button"
                  className="presets-clear-btn"
                  onClick={handleClear}
                >
                  Clear preset
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
});
