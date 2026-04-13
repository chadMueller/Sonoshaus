import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MediaStack } from './MediaStack.jsx';
import { VuEqualizer } from './VuEqualizer.jsx';

const FALLBACK_ART =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%231a1a1a'/%3E%3Ccircle cx='100' cy='100' r='72' fill='none' stroke='%23333' stroke-width='2'/%3E%3Ccircle cx='100' cy='100' r='50' fill='none' stroke='%232a2a2a' stroke-width='1'/%3E%3Ccircle cx='100' cy='100' r='14' fill='%23222'/%3E%3Ccircle cx='100' cy='100' r='5' fill='%23444'/%3E%3C/svg%3E";

function truncateText(value, maxChars) {
  if (typeof value !== 'string') return '';
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxChars) return normalized;
  if (maxChars <= 1) return '…';
  return `${normalized.slice(0, Math.max(0, maxChars - 1))}…`;
}

export const ReceiverDisplay = React.memo(function ReceiverDisplay({
  loading,
  error,
  currentTrack,
  playbackState,
  selectedRoom,
  queue = [],
  queueStartIndex = 0,
  queueLoading,
  shuffleOn,
  onSeekToQueueIndex,
}) {
  const [showQueue, setShowQueue] = useState(false);
  const rawTitle = currentTrack?.title || (loading ? 'Loading Track...' : 'No Track Selected');
  const rawArtist = currentTrack?.artist || (selectedRoom ? selectedRoom : 'Sonos');
  const rawSource = currentTrack?.album || 'Network Stream';

  const normalizedTitle = useMemo(
    () => (typeof rawTitle === 'string' ? rawTitle.replace(/\s+/g, ' ').trim() : ''),
    [rawTitle],
  );
  const isLongTitle = normalizedTitle.length > 28;
  const title = isLongTitle ? normalizedTitle : truncateText(rawTitle, 28);
  const artist = truncateText(rawArtist, 30);
  const source = truncateText(rawSource, 22);
  const qualityLabel = playbackState === 'PLAYING' ? 'LIVE PLAYBACK' : 'STANDBY';
  const isPlaying = playbackState === 'PLAYING';
  const artSrc = currentTrack?.albumArtUri || FALLBACK_ART;

  const marqueeARef = useRef(null);
  const marqueeDistancePxRef = useRef(0);
  const [marqueeDistancePx, setMarqueeDistancePx] = useState(0);
  const [marqueeDurationMs, setMarqueeDurationMs] = useState(16000);

  useEffect(() => {
    if (!isLongTitle) return;
    const el = marqueeARef.current;
    if (!el) return;

    const SPACING_PX = 36;
    const PX_PER_SEC = 26; // subtle

    const measure = () => {
      const w = Math.ceil(el.getBoundingClientRect().width);
      const dist = Math.max(0, w + SPACING_PX);
      marqueeDistancePxRef.current = dist;
      setMarqueeDistancePx(dist);
      const dur = Math.max(12000, Math.min(32000, Math.round((dist / PX_PER_SEC) * 1000)));
      setMarqueeDurationMs(dur);
    };

    measure();

    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [isLongTitle, normalizedTitle]);

  return (
    <div className="display-window">
      <div className="receiver-display-toggles">
        {shuffleOn ? <span className="receiver-shuffle-badge">Shuffle</span> : null}
        <button
          type="button"
          className={`receiver-queue-toggle ${showQueue ? 'active' : ''}`}
          onClick={() => setShowQueue((v) => !v)}
          aria-pressed={showQueue}
          aria-label={showQueue ? 'Show now playing console' : 'Show queue'}
        >
          {showQueue ? 'Console' : 'Queue'}
        </button>
      </div>

      {showQueue ? (
        <div className="receiver-queue-inline">
          <MediaStack
            queue={queue}
            queueStartIndex={queueStartIndex}
            loading={queueLoading ?? loading}
            selectedRoom={selectedRoom}
            onSeekToQueueIndex={onSeekToQueueIndex}
          />
        </div>
      ) : (
      <>
      <div className="album-art-container">
        <img
          src={artSrc}
          alt="Album Art"
          className="album-art"
          onError={(event) => {
            event.currentTarget.src = FALLBACK_ART;
          }}
        />
      </div>

      <div className="track-info-panel">
        <div className="now-playing">
          <span className="engraved-text amber-engraved" title={rawSource}>
            Source: {source}
          </span>
          {isLongTitle ? (
            <div className="track-title track-title-marquee is-scrolling" title={rawTitle}>
              <div
                className="track-title-marquee-inner"
                aria-label={normalizedTitle}
                style={{
                  '--marquee-distance': `${marqueeDistancePx}px`,
                  '--marquee-duration': `${marqueeDurationMs}ms`,
                }}
              >
                <span ref={marqueeARef} className="track-title-marquee-text">
                  {normalizedTitle}
                </span>
                <span className="track-title-marquee-text" aria-hidden="true">
                  {normalizedTitle}
                </span>
              </div>
            </div>
          ) : (
            <div className="track-title" title={rawTitle}>
              {title}
            </div>
          )}
          <div className="track-artist" title={rawArtist}>
            {artist}
          </div>
          <div className="track-source">
            <div className="source-dot" />
            {error ? error : qualityLabel}
          </div>
        </div>

        <div className="vu-meter-container">
          <VuEqualizer isPlaying={isPlaying} />
        </div>
      </div>
      </>
      )}
    </div>
  );
});
