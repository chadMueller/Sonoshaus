import React, { useState, useCallback, useRef } from 'react';

export function JogDial({ theme, onPlayPause, onNext, onPrev, isPlaying }) {
  const [rotation, setRotation] = useState(0);
  const [centerHover, setCenterHover] = useState(false);
  const [centerPressed, setCenterPressed] = useState(false);
  const wheelTimeout = useRef(null);
  const lastWheelDir = useRef(0);

  const handleWheel = useCallback(
    (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1 : -1;
      setRotation((r) => r + delta * 15);

      // Debounce the skip action
      if (wheelTimeout.current) clearTimeout(wheelTimeout.current);
      lastWheelDir.current = delta;
      wheelTimeout.current = setTimeout(() => {
        if (lastWheelDir.current > 0) {
          onNext?.();
        } else {
          onPrev?.();
        }
      }, 200);
    },
    [onNext, onPrev]
  );

  const dialSize = 140;
  const outerSize = dialSize + 24;
  const ringSize = dialSize + 8;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        userSelect: 'none',
      }}
    >
      {/* DISC + label */}
      <div
        style={{
          fontFamily: 'Arial, sans-serif',
          fontSize: 8,
          fontWeight: 'bold',
          letterSpacing: 2,
          color: theme.buttonText,
          textTransform: 'uppercase',
          opacity: 0.6,
        }}
      >
        DISC +
      </div>

      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {/* Prev button */}
        <button
          onClick={onPrev}
          style={{
            background: `linear-gradient(to bottom, ${theme.chassisLight}, ${theme.chassisDark})`,
            border: `1px solid ${theme.bezel}`,
            color: theme.buttonText,
            fontSize: 10,
            fontWeight: 'bold',
            padding: '8px 6px',
            cursor: 'pointer',
            borderRadius: 2,
            lineHeight: 1,
            minWidth: 28,
            minHeight: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Previous"
        >
          {'<<'}
        </button>

        {/* Dial assembly */}
        <div
          onWheel={handleWheel}
          style={{
            position: 'relative',
            width: outerSize,
            height: outerSize,
            borderRadius: '50%',
            // Outer housing
            background: `radial-gradient(circle at 35% 35%, ${theme.chassisLight}, ${theme.chassis} 60%, ${theme.chassisDark})`,
            boxShadow: `
              0 4px 12px rgba(0,0,0,0.6),
              inset 0 1px 2px rgba(255,255,255,0.05),
              0 0 0 2px ${theme.chassisDark}
            `,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Accent ring */}
          <div
            style={{
              width: ringSize,
              height: ringSize,
              borderRadius: '50%',
              background: `conic-gradient(
                from 0deg,
                ${theme.accentRingLight},
                ${theme.accentRingDark},
                ${theme.accentRingLight},
                ${theme.accentRing},
                ${theme.accentRingDark},
                ${theme.accentRingLight},
                ${theme.accentRingDark},
                ${theme.accentRingLight}
              )`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `
                inset 0 0 4px rgba(0,0,0,0.4),
                0 0 8px rgba(0,0,0,0.3)
              `,
            }}
          >
            {/* Inner dial (rotatable) */}
            <div
              style={{
                width: dialSize,
                height: dialSize,
                borderRadius: '50%',
                background: `radial-gradient(circle at 40% 35%, #555555, #333333 40%, #222222 70%, #1a1a1a)`,
                transform: `rotate(${rotation}deg)`,
                transition: 'transform 0.15s ease-out',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                // Fine knurling texture via repeating gradient
                backgroundImage: `
                  radial-gradient(circle at 40% 35%, #555555, #333333 40%, #222222 70%, #1a1a1a),
                  repeating-conic-gradient(
                    from 0deg,
                    rgba(255,255,255,0.03) 0deg 3deg,
                    transparent 3deg 6deg
                  )
                `,
                boxShadow: `inset 0 0 20px rgba(0,0,0,0.5)`,
              }}
            >
              {/* Direction notch */}
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 12,
                  height: 4,
                  background: theme.accentRing,
                  borderRadius: 2,
                  boxShadow: `0 0 6px ${theme.accentRing}`,
                }}
              />

              {/* Center play/pause button */}
              <button
                onClick={onPlayPause}
                onMouseEnter={() => setCenterHover(true)}
                onMouseLeave={() => {
                  setCenterHover(false);
                  setCenterPressed(false);
                }}
                onMouseDown={() => setCenterPressed(true)}
                onMouseUp={() => setCenterPressed(false)}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  border: `2px solid ${theme.bezel}`,
                  background: centerPressed
                    ? `radial-gradient(circle, ${theme.chassisDark}, ${theme.chassis})`
                    : `radial-gradient(circle at 40% 35%, ${theme.chassisLight}, ${theme.chassis} 60%, ${theme.chassisDark})`,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  // Stop rotation from affecting the button
                  transform: `rotate(${-rotation}deg)`,
                  transition: 'transform 0.15s ease-out',
                  boxShadow: centerHover
                    ? `0 0 10px ${theme.displayGlow}, inset 0 1px 2px rgba(255,255,255,0.1)`
                    : `inset 0 1px 2px rgba(255,255,255,0.05), 0 2px 4px rgba(0,0,0,0.3)`,
                  color: centerHover ? theme.displayText : theme.buttonText,
                  fontSize: 18,
                  padding: 0,
                  lineHeight: 1,
                }}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? '\u275A\u275A' : '\u25B6'}
              </button>
            </div>
          </div>
        </div>

        {/* Next button */}
        <button
          onClick={onNext}
          style={{
            background: `linear-gradient(to bottom, ${theme.chassisLight}, ${theme.chassisDark})`,
            border: `1px solid ${theme.bezel}`,
            color: theme.buttonText,
            fontSize: 10,
            fontWeight: 'bold',
            padding: '8px 6px',
            cursor: 'pointer',
            borderRadius: 2,
            lineHeight: 1,
            minWidth: 28,
            minHeight: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Next"
        >
          {'>>'}
        </button>
      </div>

      {/* DISC label */}
      <div
        style={{
          fontFamily: 'Arial, sans-serif',
          fontSize: 8,
          fontWeight: 'bold',
          letterSpacing: 2,
          color: theme.accentRing,
          textTransform: 'uppercase',
        }}
      >
        {'-- DISC --'}
      </div>
    </div>
  );
}
