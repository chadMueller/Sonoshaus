import React, { useEffect, useRef, useCallback } from 'react';

export function SpectrumAnalyzer({ isPlaying = false, theme, bars = 12 }) {
  const segmentsPerBar = 9;
  const containerRef = useRef(null);
  const phasesRef = useRef(
    Array.from({ length: bars }, () => Math.random() * Math.PI * 2)
  );
  const frameRef = useRef(0);
  const rafRef = useRef(null);
  const lastTickRef = useRef(0);

  const barWidth = 6;
  const barGap = 2;
  const segHeight = 3;
  const segGap = 1.5;
  const totalHeight = segmentsPerBar * (segHeight + segGap);

  const updateSegments = useCallback((levels) => {
    const container = containerRef.current;
    if (!container) return;
    const barEls = container.children;
    for (let b = 0; b < barEls.length; b++) {
      const litCount = Math.round((levels ? levels[b] : 0) * segmentsPerBar);
      const segs = barEls[b].children;
      for (let s = 0; s < segs.length; s++) {
        const isLit = s < litCount;
        const ratio = s / segmentsPerBar;
        const color = ratio < 0.5 ? theme.spectrumLow : ratio < 0.8 ? theme.spectrumMid : theme.spectrumHigh;
        const seg = segs[s];
        seg.style.opacity = isLit ? '1' : '0.3';
        seg.style.background = isLit ? color : theme.segmentOff;
        seg.style.boxShadow = isLit ? `0 0 4px ${color}, 0 0 1px ${color}` : 'none';
      }
    }
  }, [theme, segmentsPerBar]);

  useEffect(() => {
    if (!isPlaying) {
      updateSegments(null);
      return;
    }

    function tick(timestamp) {
      if (timestamp - lastTickRef.current < 85) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      lastTickRef.current = timestamp;

      frameRef.current += 1;
      const t = frameRef.current * 0.15;

      const levels = phasesRef.current.map((phase) => {
        const sine = Math.sin(t + phase) * 0.4;
        const sine2 = Math.sin(t * 0.7 + phase * 1.3) * 0.25;
        const noise = (Math.random() - 0.5) * 0.35;
        const val = 0.45 + sine + sine2 + noise;
        return Math.max(0, Math.min(1, val));
      });

      updateSegments(levels);
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, bars, updateSegments]);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: barGap,
        height: totalHeight,
      }}
    >
      {Array.from({ length: bars }, (_, barIndex) => (
        <div
          key={barIndex}
          style={{
            display: 'flex',
            flexDirection: 'column-reverse',
            gap: segGap,
          }}
        >
          {Array.from({ length: segmentsPerBar }, (_, segIndex) => (
            <div
              key={segIndex}
              style={{
                width: barWidth,
                height: segHeight,
                borderRadius: 0.5,
                background: theme.segmentOff,
                opacity: 0.3,
                boxShadow: 'none',
                transition: 'opacity 0.08s ease',
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
