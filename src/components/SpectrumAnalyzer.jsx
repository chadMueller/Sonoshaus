import React, { useState, useEffect, useRef } from 'react';

export function SpectrumAnalyzer({ isPlaying = false, theme, bars = 12 }) {
  const segmentsPerBar = 9;
  const [levels, setLevels] = useState(() => new Array(bars).fill(0));
  const phasesRef = useRef(
    Array.from({ length: bars }, () => Math.random() * Math.PI * 2)
  );
  const frameRef = useRef(0);

  useEffect(() => {
    if (!isPlaying) {
      setLevels(new Array(bars).fill(0));
      return;
    }

    const interval = setInterval(() => {
      frameRef.current += 1;
      const t = frameRef.current * 0.15;

      setLevels(
        phasesRef.current.map((phase, i) => {
          const sine = Math.sin(t + phase) * 0.4;
          const sine2 = Math.sin(t * 0.7 + phase * 1.3) * 0.25;
          const noise = (Math.random() - 0.5) * 0.35;
          const base = 0.45;
          const val = base + sine + sine2 + noise;
          return Math.max(0, Math.min(1, val));
        })
      );
    }, 85);

    return () => clearInterval(interval);
  }, [isPlaying, bars]);

  const barWidth = 6;
  const barGap = 2;
  const segHeight = 3;
  const segGap = 1.5;
  const totalWidth = bars * (barWidth + barGap) - barGap;
  const totalHeight = segmentsPerBar * (segHeight + segGap);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: barGap,
        height: totalHeight,
      }}
    >
      {levels.map((level, barIndex) => {
        const litCount = Math.round(level * segmentsPerBar);
        return (
          <div
            key={barIndex}
            style={{
              display: 'flex',
              flexDirection: 'column-reverse',
              gap: segGap,
            }}
          >
            {Array.from({ length: segmentsPerBar }, (_, segIndex) => {
              const isLit = segIndex < litCount;
              const ratio = segIndex / segmentsPerBar;
              let color;
              if (ratio < 0.5) {
                color = theme.spectrumLow;
              } else if (ratio < 0.8) {
                color = theme.spectrumMid;
              } else {
                color = theme.spectrumHigh;
              }
              return (
                <div
                  key={segIndex}
                  style={{
                    width: barWidth,
                    height: segHeight,
                    borderRadius: 0.5,
                    background: isLit ? color : theme.segmentOff,
                    opacity: isLit ? 1 : 0.3,
                    boxShadow: isLit
                      ? `0 0 4px ${color}, 0 0 1px ${color}`
                      : 'none',
                    transition: 'opacity 0.08s ease',
                  }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
