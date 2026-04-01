import React, { useEffect, useRef, useState } from 'react';

const MIN_ANGLE = -130;
const MAX_ANGLE = 130;
const STEP = 2;
const DRAG_SENSITIVITY = 0.22;
const DRAG_THROTTLE_MS = 180;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function snapToNotch(value) {
  return clamp(Math.round(value / STEP) * STEP, 0, 100);
}

export const RoomVolumeKnob = React.memo(function RoomVolumeKnob({ value = 0, label, onChange }) {
  const dragRef = useRef({ startY: 0, startValue: 0 });
  const [dragging, setDragging] = useState(false);
  const clampedValue = clamp(Math.round(value), 0, 100);
  const steppedValue = snapToNotch(clampedValue);
  const [angle, setAngle] = useState(MIN_ANGLE);
  const lastEmitRef = useRef({ at: 0, value: steppedValue });
  const lastDragValueRef = useRef(steppedValue);

  useEffect(() => {
    const nextAngle = MIN_ANGLE + (steppedValue / 100) * (MAX_ANGLE - MIN_ANGLE);
    setAngle(nextAngle);
  }, [steppedValue]);

  useEffect(() => {
    if (!dragging) return undefined;

    const onMove = (event) => {
      const deltaY = dragRef.current.startY - event.clientY;
      const rawNextValue = clamp(dragRef.current.startValue + deltaY * DRAG_SENSITIVITY, 0, 100);
      const next = snapToNotch(rawNextValue);
      lastDragValueRef.current = next;

      const now = Date.now();
      const shouldEmit =
        now - lastEmitRef.current.at >= DRAG_THROTTLE_MS ||
        Math.abs(next - lastEmitRef.current.value) >= STEP * 2;
      if (shouldEmit && onChange) {
        lastEmitRef.current = { at: now, value: next };
        onChange(next);
      }
    };

    const onUp = () => {
      setDragging(false);
      if (onChange) {
        const finalValue = lastDragValueRef.current;
        onChange(finalValue);
      }
    };

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
        lastEmitRef.current = { at: Date.now(), value: steppedValue };
        lastDragValueRef.current = steppedValue;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        setDragging(true);
      }}
      onWheel={(event) => {
        event.preventDefault();
        const direction = event.deltaY > 0 ? -1 : 1;
        if (onChange) onChange(clamp(steppedValue + direction * STEP, 0, 100));
      }}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 10 : STEP;
        if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
          event.preventDefault();
          if (onChange) onChange(clamp(steppedValue + step, 0, 100));
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
          event.preventDefault();
          if (onChange) onChange(clamp(steppedValue - step, 0, 100));
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
      <span className="room-volume-readout" aria-hidden="true">
        {steppedValue}
      </span>
    </button>
  );
});
