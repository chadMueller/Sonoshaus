import { useCallback, useRef } from 'react';

export function SoundPanel({ volume, theme, onVolumeChange }) {
  const sliderRef = useRef(null);

  const clamp = (val) => Math.max(0, Math.min(100, Math.round(val)));

  const handleDecrement = useCallback(() => {
    onVolumeChange(clamp(volume - 5));
  }, [volume, onVolumeChange]);

  const handleIncrement = useCallback(() => {
    onVolumeChange(clamp(volume + 5));
  }, [volume, onVolumeChange]);

  const handleSliderChange = useCallback((e) => {
    onVolumeChange(clamp(Number(e.target.value)));
  }, [onVolumeChange]);

  // Calculate fill percentage for the visual track
  const fillPercent = volume;

  const styles = {
    container: {
      padding: '24px 20px',
      background: `linear-gradient(to bottom, ${theme.chassisLight}, ${theme.chassis})`,
      border: `1px solid ${theme.bezel}`,
      borderRadius: '4px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
    },
    label: {
      color: theme.displayTextDim,
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      fontWeight: 'bold',
      letterSpacing: '2px',
      textTransform: 'uppercase',
      marginBottom: '16px',
      display: 'block',
      textAlign: 'center',
    },
    controlRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      justifyContent: 'center',
      maxWidth: '500px',
      margin: '0 auto',
    },
    stepButton: {
      width: '56px',
      height: '56px',
      minWidth: '56px',
      minHeight: '56px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: `linear-gradient(to bottom, ${theme.buttonBg}, ${theme.chassisDark})`,
      border: `1px solid ${theme.bezel}`,
      borderRadius: '8px',
      color: theme.displayText,
      fontFamily: "'Courier New', monospace",
      fontSize: '24px',
      fontWeight: 'bold',
      cursor: 'pointer',
      boxShadow: '0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
      textShadow: `0 0 8px ${theme.displayGlow}`,
      userSelect: 'none',
      flexShrink: 0,
    },
    sliderContainer: {
      flex: 1,
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px',
    },
    sliderTrack: {
      position: 'relative',
      width: '100%',
      height: '16px',
      background: theme.chassisDark,
      borderRadius: '8px',
      border: `1px solid ${theme.bezel}`,
      overflow: 'hidden',
    },
    sliderFill: {
      position: 'absolute',
      top: 0,
      left: 0,
      height: '100%',
      width: `${fillPercent}%`,
      background: `linear-gradient(to right, ${theme.spectrumLow}, ${fillPercent > 60 ? theme.spectrumMid : theme.spectrumLow}, ${fillPercent > 80 ? theme.spectrumHigh : theme.spectrumMid})`,
      borderRadius: '8px 0 0 8px',
      boxShadow: `0 0 8px ${theme.displayGlow}`,
      transition: 'width 0.1s ease',
    },
    sliderInput: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      opacity: 0,
      cursor: 'pointer',
      margin: 0,
      zIndex: 2,
    },
    volumeDisplay: {
      fontFamily: "'Courier New', monospace",
      fontSize: '32px',
      fontWeight: 'bold',
      color: theme.displayText,
      textShadow: `0 0 12px ${theme.displayGlow}, 0 0 24px ${theme.displayGlow}`,
      letterSpacing: '2px',
      textAlign: 'center',
      minWidth: '80px',
    },
  };

  return (
    <div style={styles.container}>
      <span style={styles.label}>Volume</span>

      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <span style={styles.volumeDisplay}>{volume}</span>
      </div>

      <div style={styles.controlRow}>
        <button
          style={styles.stepButton}
          onClick={handleDecrement}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = theme.displayText;
            e.currentTarget.style.boxShadow = `0 0 10px ${theme.displayGlow}, 0 2px 4px rgba(0,0,0,0.4)`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = theme.bezel;
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)';
          }}
          aria-label="Decrease volume"
        >
          &minus;
        </button>

        <div style={styles.sliderContainer}>
          <div style={styles.sliderTrack}>
            <div style={styles.sliderFill} />
            <input
              ref={sliderRef}
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleSliderChange}
              style={styles.sliderInput}
              aria-label="Volume slider"
            />
          </div>
        </div>

        <button
          style={styles.stepButton}
          onClick={handleIncrement}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = theme.displayText;
            e.currentTarget.style.boxShadow = `0 0 10px ${theme.displayGlow}, 0 2px 4px rgba(0,0,0,0.4)`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = theme.bezel;
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)';
          }}
          aria-label="Increase volume"
        >
          +
        </button>
      </div>
    </div>
  );
}
