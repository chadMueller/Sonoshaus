import React from 'react';

export function VolumeBar({ value = 50, theme, segments = 12 }) {
  const activeCount = Math.round((value / 100) * segments);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 4,
      }}
    >
      <span
        style={{
          fontFamily: "'Courier New', monospace",
          fontSize: 9,
          fontWeight: 'bold',
          letterSpacing: 2,
          color: theme.displayTextDim,
          textShadow: `0 0 4px ${theme.displayGlow}`,
          marginRight: 4,
          lineHeight: '14px',
        }}
      >
        VOL
      </span>
      {Array.from({ length: segments }, (_, i) => {
        const isActive = i < activeCount;
        const ratio = i / segments;
        let color;
        if (ratio < 0.5) {
          color = theme.spectrumLow;
        } else if (ratio < 0.8) {
          color = theme.spectrumMid;
        } else {
          color = theme.spectrumHigh;
        }
        // Bars grow in height left to right
        const height = 4 + (i / segments) * 10;
        return (
          <div
            key={i}
            style={{
              width: 5,
              height,
              borderRadius: 0.5,
              background: isActive ? color : theme.segmentOff,
              opacity: isActive ? 1 : 0.3,
              boxShadow: isActive ? `0 0 3px ${color}` : 'none',
              transition: 'opacity 0.15s ease',
            }}
          />
        );
      })}
    </div>
  );
}
