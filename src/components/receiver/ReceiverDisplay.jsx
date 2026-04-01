import { useEffect, useMemo, useRef, useState } from 'react';
import { MediaStack } from './MediaStack.jsx';

const FALLBACK_ART =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%231a1a1a'/%3E%3Ccircle cx='100' cy='100' r='72' fill='none' stroke='%23333' stroke-width='2'/%3E%3Ccircle cx='100' cy='100' r='50' fill='none' stroke='%232a2a2a' stroke-width='1'/%3E%3Ccircle cx='100' cy='100' r='14' fill='%23222'/%3E%3Ccircle cx='100' cy='100' r='5' fill='%23444'/%3E%3C/svg%3E";
const EQ_BAR_CONFIG = [
  { base: 18, peak: 78, delay: '0ms', speed: '920ms' },
  { base: 14, peak: 62, delay: '70ms', speed: '740ms' },
  { base: 26, peak: 92, delay: '130ms', speed: '860ms' },
  { base: 20, peak: 70, delay: '180ms', speed: '680ms' },
  { base: 16, peak: 58, delay: '240ms', speed: '780ms' },
  { base: 24, peak: 86, delay: '300ms', speed: '900ms' },
  { base: 12, peak: 50, delay: '360ms', speed: '710ms' },
  { base: 22, peak: 72, delay: '430ms', speed: '810ms' },
  { base: 18, peak: 64, delay: '500ms', speed: '760ms' },
  { base: 15, peak: 57, delay: '560ms', speed: '720ms' },
  { base: 28, peak: 95, delay: '620ms', speed: '940ms' },
  { base: 19, peak: 68, delay: '690ms', speed: '790ms' },
  { base: 14, peak: 56, delay: '760ms', speed: '700ms' },
  { base: 23, peak: 88, delay: '820ms', speed: '910ms' },
  { base: 17, peak: 61, delay: '890ms', speed: '760ms' },
  { base: 21, peak: 74, delay: '950ms', speed: '830ms' },
];

function truncateText(value, maxChars) {
  if (typeof value !== 'string') return '';
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxChars) return normalized;
  if (maxChars <= 1) return '…';
  return `${normalized.slice(0, Math.max(0, maxChars - 1))}…`;
}

export function ReceiverDisplay({
  loading,
  error,
  currentTrack,
  playbackState,
  selectedRoom,
  queue = [],
  queueStartIndex = 0,
  queueLoading,
  shuffleOn,
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
          aria-label={showQueue ? 'Show now playing' : 'Show queue'}
        >
          Queue
        </button>
      </div>

      {showQueue ? (
        <div className="receiver-queue-inline">
          <MediaStack
            queue={queue}
            queueStartIndex={queueStartIndex}
            loading={queueLoading ?? loading}
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
          <div className="vu-scale" />
          <div className="vu-scale red" />
          <div className={`vu-eq ${isPlaying ? 'playing' : 'idle'}`}>
            {EQ_BAR_CONFIG.map((bar, index) => (
              <span
                // eslint-disable-next-line react/no-array-index-key
                key={index}
                className="vu-eq-bar"
                style={{
                  '--eq-base': `${bar.base}%`,
                  '--eq-peak': `${bar.peak}%`,
                  '--eq-delay': bar.delay,
                  '--eq-speed': bar.speed,
                }}
              />
            ))}
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
