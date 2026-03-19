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

export function ReceiverDisplay({ loading, error, currentTrack, playbackState, selectedRoom }) {
  const title = currentTrack?.title || (loading ? 'Loading Track...' : 'No Track Selected');
  const artist = currentTrack?.artist || (selectedRoom ? selectedRoom : 'Sonos');
  const source = currentTrack?.album || 'Network Stream';
  const qualityLabel = playbackState === 'PLAYING' ? 'LIVE PLAYBACK' : 'STANDBY';
  const isPlaying = playbackState === 'PLAYING';
  const artSrc = currentTrack?.albumArtUri || FALLBACK_ART;

  return (
    <div className="display-window">
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
          <span className="engraved-text amber-engraved">Source: {source}</span>
          <div className="track-title">{title}</div>
          <div className="track-artist">{artist}</div>
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
    </div>
  );
}
