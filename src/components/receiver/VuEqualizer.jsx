import React, { useEffect, useRef, useCallback } from 'react';

const BAR_COUNT = 20;
const SEGMENTS = 12;
const SEG_GAP = 1;
const BAR_GAP = 2;
const PEAK_HOLD_MS = 900;
const PEAK_DECAY = 0.04;

const SEG_COLORS = [
  '#3fbf3f', '#3fbf3f', '#3fbf3f', '#3fbf3f',
  '#5fbf3f', '#8fbf2f',
  '#c9a820', '#d4922a',
  '#d97030', '#d45030',
  '#cc3333', '#cc3333',
];

const SEG_GLOW = [
  'rgba(63,191,63,0.3)', 'rgba(63,191,63,0.3)',
  'rgba(63,191,63,0.25)', 'rgba(63,191,63,0.2)',
  'rgba(95,191,63,0.2)', 'rgba(143,191,47,0.2)',
  'rgba(201,168,32,0.25)', 'rgba(212,146,42,0.3)',
  'rgba(217,112,48,0.35)', 'rgba(212,80,48,0.4)',
  'rgba(204,51,51,0.5)', 'rgba(204,51,51,0.5)',
];

function generateBarSeeds() {
  return Array.from({ length: BAR_COUNT }, () => ({
    phase: Math.random() * Math.PI * 2,
    freq1: 0.7 + Math.random() * 1.2,
    freq2: 1.8 + Math.random() * 2.4,
    freq3: 0.3 + Math.random() * 0.5,
    amp1: 0.25 + Math.random() * 0.3,
    amp2: 0.1 + Math.random() * 0.2,
    amp3: 0.08 + Math.random() * 0.12,
    base: 0.08 + Math.random() * 0.15,
    ceiling: 0.7 + Math.random() * 0.3,
  }));
}

function getBarLevel(seed, t) {
  const s = t + seed.phase;
  const v =
    seed.base +
    seed.amp1 * (0.5 + 0.5 * Math.sin(s * seed.freq1)) +
    seed.amp2 * (0.5 + 0.5 * Math.sin(s * seed.freq2 + 1.3)) +
    seed.amp3 * (0.5 + 0.5 * Math.sin(s * seed.freq3 + 2.7));
  return Math.min(v, seed.ceiling);
}

const IDLE_TARGET = 0.04;
const SETTLED_THRESHOLD = 0.001;

export const VuEqualizer = React.memo(function VuEqualizer({ isPlaying }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const seedsRef = useRef(generateBarSeeds());
  const peaksRef = useRef(new Float32Array(BAR_COUNT));
  const peakTimesRef = useRef(new Float64Array(BAR_COUNT));
  const smoothRef = useRef(new Float32Array(BAR_COUNT));
  const startRef = useRef(null);
  const wasPlayingRef = useRef(false);
  const settledRef = useRef(false);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const draw = useCallback((now) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const playing = isPlayingRef.current;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.scale(dpr, dpr);
    }

    ctx.clearRect(0, 0, w, h);

    if (startRef.current === null) startRef.current = now;
    const t = (now - startRef.current) / 1000;

    const seeds = seedsRef.current;
    const peaks = peaksRef.current;
    const peakTimes = peakTimesRef.current;
    const smooth = smoothRef.current;

    const totalGaps = (BAR_COUNT - 1) * BAR_GAP;
    const barW = Math.max(2, (w - totalGaps) / BAR_COUNT);
    const segH = Math.max(1, (h - (SEGMENTS - 1) * SEG_GAP) / SEGMENTS);

    let allSettled = !playing;

    for (let i = 0; i < BAR_COUNT; i++) {
      const raw = playing ? getBarLevel(seeds[i], t) : IDLE_TARGET;
      const lerp = playing ? 0.12 : 0.06;
      smooth[i] += (raw - smooth[i]) * lerp;
      const level = smooth[i];

      if (!playing && Math.abs(level - IDLE_TARGET) > SETTLED_THRESHOLD) {
        allSettled = false;
      }

      const litCount = Math.round(level * SEGMENTS);
      const x = i * (barW + BAR_GAP);

      if (level > peaks[i]) {
        peaks[i] = level;
        peakTimes[i] = now;
      }

      const peakAge = now - peakTimes[i];
      if (peakAge > PEAK_HOLD_MS) {
        peaks[i] = Math.max(level, peaks[i] - PEAK_DECAY);
      }
      if (!playing && peaks[i] > IDLE_TARGET + SETTLED_THRESHOLD) {
        allSettled = false;
      }
      const peakSeg = Math.min(SEGMENTS - 1, Math.round(peaks[i] * SEGMENTS));

      for (let s = 0; s < SEGMENTS; s++) {
        const sy = h - (s + 1) * (segH + SEG_GAP);
        const lit = s < litCount;

        if (lit) {
          ctx.fillStyle = SEG_COLORS[s];
          ctx.shadowColor = SEG_GLOW[s];
          ctx.shadowBlur = s >= 8 ? 6 : 3;
          ctx.fillRect(x, sy, barW, segH);
          ctx.shadowBlur = 0;
        } else if (s === peakSeg && peaks[i] > 0.06) {
          ctx.fillStyle = SEG_COLORS[s];
          ctx.globalAlpha = 0.85;
          ctx.fillRect(x, sy, barW, segH);
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.03)';
          ctx.fillRect(x, sy, barW, segH);
        }
      }
    }

    if (allSettled) {
      settledRef.current = true;
      rafRef.current = null;
      return;
    }

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    if (isPlaying && !wasPlayingRef.current) {
      seedsRef.current = generateBarSeeds();
      startRef.current = null;
    }
    wasPlayingRef.current = isPlaying;
    settledRef.current = false;

    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(draw);
    }
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying, draw]);

  return (
    <canvas
      ref={canvasRef}
      className="vu-eq-canvas"
      aria-hidden="true"
    />
  );
});
