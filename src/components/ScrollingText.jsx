import React, { useState, useEffect, useRef } from 'react';

export function ScrollingText({ text = '', theme, width }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [offset, setOffset] = useState(0);
  const [containerWidth, setContainerWidth] = useState(width || 260);
  const animRef = useRef(null);

  const displayText = text.toUpperCase();

  // Measure container width if no explicit width provided
  useEffect(() => {
    if (width) {
      setContainerWidth(width);
      return;
    }
    if (!containerRef.current) return;
    const measure = () => {
      const w = containerRef.current.offsetWidth;
      if (w > 0) setContainerWidth(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [width]);

  useEffect(() => {
    if (!textRef.current) return;
    const textWidth = textRef.current.scrollWidth;
    setShouldScroll(textWidth > containerWidth);
    setOffset(0);
  }, [text, containerWidth]);

  useEffect(() => {
    if (!shouldScroll || !textRef.current) return;

    const textWidth = textRef.current.scrollWidth;
    const speed = 0.8;
    let pos = 0;
    let paused = 60;

    function animate() {
      if (paused > 0) {
        paused--;
      } else {
        pos += speed;
        if (pos > textWidth + 40) {
          pos = -containerWidth;
        }
      }
      setOffset(-pos);
      animRef.current = requestAnimationFrame(animate);
    }

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [shouldScroll, containerWidth]);

  return (
    <div
      ref={containerRef}
      style={{
        width: width || '100%',
        overflow: 'hidden',
        position: 'relative',
        height: 18,
      }}
    >
      <div
        ref={textRef}
        style={{
          fontFamily: "'Courier New', monospace",
          fontSize: 13,
          fontWeight: 'bold',
          letterSpacing: 2,
          color: theme.displayText,
          textShadow: `0 0 6px ${theme.displayGlow}, 0 0 12px ${theme.displayGlow}`,
          whiteSpace: 'nowrap',
          position: 'absolute',
          top: 0,
          left: 0,
          transform: shouldScroll ? `translateX(${offset}px)` : 'none',
        }}
      >
        {displayText}
      </div>
    </div>
  );
}
