import React from 'react';

// Standard 7-segment digit mapping
// Segments: A (top), B (top-right), C (bottom-right), D (bottom), E (bottom-left), F (top-left), G (middle)
const SEGMENT_MAP = {
  '0': [1, 1, 1, 1, 1, 1, 0],
  '1': [0, 1, 1, 0, 0, 0, 0],
  '2': [1, 1, 0, 1, 1, 0, 1],
  '3': [1, 1, 1, 1, 0, 0, 1],
  '4': [0, 1, 1, 0, 0, 1, 1],
  '5': [1, 0, 1, 1, 0, 1, 1],
  '6': [1, 0, 1, 1, 1, 1, 1],
  '7': [1, 1, 1, 0, 0, 0, 0],
  '8': [1, 1, 1, 1, 1, 1, 1],
  '9': [1, 1, 1, 1, 0, 1, 1],
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '-': [0, 0, 0, 0, 0, 0, 1],
};

// Segment polygon definitions for a digit area of roughly 30x50 viewBox
// Each segment is a hexagonal/parallelogram shape
const SEGMENT_PATHS = {
  A: '4,1 26,1 23,4 7,4',       // top horizontal
  B: '27,2 30,5 28,23 25,20',    // top-right vertical
  C: '27,27 30,30 28,48 25,45',  // bottom-right vertical
  D: '4,49 26,49 23,46 7,46',    // bottom horizontal
  E: '2,27 5,30 3,48 0,45',      // bottom-left vertical
  F: '2,2 5,5 3,23 0,20',        // top-left vertical
  G: '4,24 26,24 24,27 6,27 4,24', // middle horizontal
};

const SEGMENT_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

export function SevenSegmentDigit({ value = ' ', theme, size = 48 }) {
  const segments = SEGMENT_MAP[value] || SEGMENT_MAP[' '];
  const isColon = value === ':';

  const width = size * 0.6;
  const height = size;

  if (isColon) {
    const dotSize = size * 0.08;
    return (
      <svg
        width={width * 0.4}
        height={height}
        viewBox="0 0 12 50"
        style={{ display: 'inline-block', verticalAlign: 'top' }}
      >
        <circle
          cx="6"
          cy="17"
          r={dotSize > 1.5 ? 3 : 2.5}
          fill={theme.segmentOn}
          style={{
            filter: `drop-shadow(0 0 4px ${theme.displayGlow})`,
          }}
        />
        <circle
          cx="6"
          cy="33"
          r={dotSize > 1.5 ? 3 : 2.5}
          fill={theme.segmentOn}
          style={{
            filter: `drop-shadow(0 0 4px ${theme.displayGlow})`,
          }}
        />
      </svg>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 30 50"
      style={{ display: 'inline-block', verticalAlign: 'top' }}
    >
      {SEGMENT_KEYS.map((key, i) => {
        const isLit = segments[i];
        return (
          <polygon
            key={key}
            points={SEGMENT_PATHS[key]}
            fill={isLit ? theme.segmentOn : theme.segmentOff}
            style={
              isLit
                ? { filter: `drop-shadow(0 0 3px ${theme.displayGlow})` }
                : { opacity: 0.4 }
            }
          />
        );
      })}
    </svg>
  );
}
