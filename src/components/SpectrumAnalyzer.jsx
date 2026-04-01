import React, { useMemo } from 'react';

export function SpectrumAnalyzer({ isPlaying = false, theme, bars = 12 }) {
  const segmentsPerBar = 9;
  const barWidth = 6;
  const barGap = 2;
  const segHeight = 3;
  const segGap = 1.5;
  const totalHeight = segmentsPerBar * (segHeight + segGap);

  // Generate stable random delays/durations per bar so animation looks organic
  const barTimings = useMemo(
    () =>
      Array.from({ length: bars }, () => ({
        duration: 0.6 + Math.random() * 0.8,
        delay: Math.random() * -1.5,
      })),
    [bars],
  );

  return (
    <>
      <style>{`
        @keyframes spectrumBounce {
          0%, 100% { transform: scaleY(0.15); }
          50% { transform: scaleY(1); }
        }
      `}</style>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: barGap,
          height: totalHeight,
        }}
      >
        {barTimings.map((timing, barIndex) => (
          <div
            key={barIndex}
            style={{
              width: barWidth,
              height: totalHeight,
              borderRadius: 1,
              background: `linear-gradient(to top, ${theme.spectrumLow} 0%, ${theme.spectrumMid} 60%, ${theme.spectrumHigh} 100%)`,
              opacity: isPlaying ? 0.9 : 0.15,
              transformOrigin: 'bottom',
              transform: isPlaying ? undefined : 'scaleY(0.15)',
              animation: isPlaying
                ? `spectrumBounce ${timing.duration}s ease-in-out ${timing.delay}s infinite`
                : 'none',
              boxShadow: isPlaying
                ? `0 0 4px ${theme.spectrumLow}, 0 0 1px ${theme.spectrumMid}`
                : 'none',
              transition: 'opacity 0.3s ease',
            }}
          />
        ))}
      </div>
    </>
  );
}
