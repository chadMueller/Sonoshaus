import React from 'react';
import { SevenSegmentDigit } from './SevenSegmentDigit.jsx';

export function TimeDisplay({ time = '0:00', theme, size = 48 }) {
  const chars = time.split('');

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      {chars.map((char, i) => (
        <SevenSegmentDigit key={i} value={char} theme={theme} size={size} />
      ))}
    </div>
  );
}
