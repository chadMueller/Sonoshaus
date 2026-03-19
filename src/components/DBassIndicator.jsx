import React from 'react';

export function DBassIndicator({ active = false, theme, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 10px',
        minWidth: 44,
        minHeight: 44,
        fontFamily: "'Courier New', monospace",
        fontSize: 9,
        fontWeight: 'bold',
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: active ? '#000000' : theme.displayTextDim,
        background: active ? '#00cc00' : theme.segmentOff,
        border: 'none',
        borderRadius: 2,
        cursor: 'pointer',
        boxShadow: active
          ? '0 0 8px rgba(0, 204, 0, 0.7), 0 0 16px rgba(0, 204, 0, 0.3)'
          : 'none',
        transition: 'all 0.15s ease',
        lineHeight: 1,
      }}
    >
      D-BASS
    </button>
  );
}
