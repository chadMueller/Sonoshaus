const FALLBACK_ART =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%231a1a1a'/%3E%3Ccircle cx='100' cy='100' r='72' fill='none' stroke='%23333' stroke-width='2'/%3E%3Ccircle cx='100' cy='100' r='50' fill='none' stroke='%232a2a2a' stroke-width='1'/%3E%3Ccircle cx='100' cy='100' r='14' fill='%23222'/%3E%3Ccircle cx='100' cy='100' r='5' fill='%23444'/%3E%3C/svg%3E";

export function ReceiverDisplay({ loading, error, currentTrack, playbackState, selectedRoom }) {
  const title = currentTrack?.title || (loading ? 'Loading Track...' : 'No Track Selected');
  const artist = currentTrack?.artist || (selectedRoom ? selectedRoom : 'Sonos');
  const source = currentTrack?.album || 'Network Stream';
  const qualityLabel = playbackState === 'PLAYING' ? 'LIVE PLAYBACK' : 'STANDBY';
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
          <div className="vu-needle" />
        </div>
      </div>
    </div>
  );
}
