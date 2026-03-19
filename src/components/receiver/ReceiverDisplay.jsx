const FALLBACK_ART =
  'https://images.pexels.com/photos/164686/pexels-photo-164686.jpeg?auto=compress&cs=tinysrgb&w=400';

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
