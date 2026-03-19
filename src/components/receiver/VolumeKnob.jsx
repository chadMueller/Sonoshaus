import { useEffect, useRef, useState } from 'react';

const MIN_ANGLE = -140;
const MAX_ANGLE = 140;
const START_ANGLE = 35;
const DRAG_SENSITIVITY = 0.28;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function VolumeKnob({ value = 50, onChange }) {
  const knobRef = useRef(null);
  const dragRef = useRef({ startY: 0, startValue: 50 });
  const [angle, setAngle] = useState(START_ANGLE);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const nextAngle = MIN_ANGLE + (clamp(value, 0, 100) / 100) * (MAX_ANGLE - MIN_ANGLE);
    setAngle(nextAngle);
  }, [value]);

  useEffect(() => {
    if (!dragging) return undefined;

    const handlePointerMove = (event) => {
      const deltaY = dragRef.current.startY - event.clientY;
      const nextValue = clamp(dragRef.current.startValue + deltaY * DRAG_SENSITIVITY, 0, 100);
      const nextAngle = MIN_ANGLE + (nextValue / 100) * (MAX_ANGLE - MIN_ANGLE);
      setAngle(nextAngle);
      if (onChange) {
        onChange(nextValue);
      }
    };

    const handlePointerUp = () => {
      setDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [dragging, onChange]);

  return (
    <div className="volume-container">
      <div className="volume-scale" />
      <div
        ref={knobRef}
        className={`volume-knob-base ${dragging ? 'dragging' : ''}`}
        onPointerDown={(event) => {
          event.preventDefault();
          dragRef.current = {
            startY: event.clientY,
            startValue: clamp(value, 0, 100),
          };
          event.currentTarget.setPointerCapture?.(event.pointerId);
          setDragging(true);
        }}
        role="slider"
        aria-label="Master Volume"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(((angle - MIN_ANGLE) / (MAX_ANGLE - MIN_ANGLE)) * 100)}
        tabIndex={0}
      >
        <div className="volume-knob-edge" />
        <div className="volume-knob-face" style={{ transform: `rotate(${angle}deg)` }}>
          <div className="knob-indicator" />
        </div>
      </div>
      <span className="engraved-text" style={{ marginTop: 8 }}>
        Master Volume
      </span>
    </div>
  );
}
