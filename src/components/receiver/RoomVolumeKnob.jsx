import { useEffect, useRef, useState } from 'react';

const MIN_ANGLE = -130;
const MAX_ANGLE = 130;
const NOTCH_STEP = 20;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function snapToNotch(value) {
  return clamp(Math.round(value / NOTCH_STEP) * NOTCH_STEP, 0, 100);
}

export function RoomVolumeKnob({ value = 0, label, onChange }) {
  const dragRef = useRef({ startY: 0, startValue: 0 });
  const [dragging, setDragging] = useState(false);
  const clampedValue = clamp(Math.round(value), 0, 100);
  const steppedValue = snapToNotch(clampedValue);
  const [angle, setAngle] = useState(MIN_ANGLE);

  useEffect(() => {
    const nextAngle = MIN_ANGLE + (steppedValue / 100) * (MAX_ANGLE - MIN_ANGLE);
    setAngle(nextAngle);
  }, [steppedValue]);

  useEffect(() => {
    if (!dragging) return undefined;

    const onMove = (event) => {
      const deltaY = dragRef.current.startY - event.clientY;
      const rawNextValue = clamp(dragRef.current.startValue + deltaY * 0.22, 0, 100);
      if (onChange) onChange(snapToNotch(rawNextValue));
    };

    const onUp = () => setDragging(false);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragging, onChange]);

  return (
    <button
      type="button"
      className={`room-volume-knob ${dragging ? 'dragging' : ''}`}
      onPointerDown={(event) => {
        event.preventDefault();
        dragRef.current = { startY: event.clientY, startValue: clampedValue };
        event.currentTarget.setPointerCapture?.(event.pointerId);
        setDragging(true);
      }}
      onWheel={(event) => {
        event.preventDefault();
        const direction = event.deltaY > 0 ? -1 : 1;
        if (onChange) onChange(clamp(steppedValue + direction * NOTCH_STEP, 0, 100));
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
          event.preventDefault();
          if (onChange) onChange(clamp(steppedValue + NOTCH_STEP, 0, 100));
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
          event.preventDefault();
          if (onChange) onChange(clamp(steppedValue - NOTCH_STEP, 0, 100));
        }
      }}
      aria-label={`${label} volume ${steppedValue} percent`}
      title={`${label} volume`}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={steppedValue}
      tabIndex={0}
    >
      <span className="room-volume-knob-ring" />
      <span className="room-volume-knob-face" style={{ transform: `rotate(${angle}deg)` }}>
        <span className="room-volume-knob-indicator" />
      </span>
    </button>
  );
}
