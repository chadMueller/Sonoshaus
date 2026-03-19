export function RoomSelector({ rooms, selectedRoom, theme, onSelect }) {
  const styles = {
    container: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      padding: '12px 0',
      justifyContent: 'center',
    },
    pill: (isSelected) => ({
      padding: '10px 20px',
      minHeight: '44px',
      minWidth: '44px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: isSelected
        ? `linear-gradient(to bottom, ${theme.accentRingLight}, ${theme.accentRing})`
        : `linear-gradient(to bottom, ${theme.chassisLight}, ${theme.chassisDark})`,
      border: isSelected
        ? `1px solid ${theme.accentRingLight}`
        : `1px solid ${theme.bezel}`,
      borderRadius: '24px',
      color: isSelected ? '#ffffff' : theme.buttonText,
      fontSize: '11px',
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      letterSpacing: '1.5px',
      textTransform: 'uppercase',
      cursor: 'pointer',
      boxShadow: isSelected
        ? `0 0 12px ${theme.displayGlow}, 0 2px 4px rgba(0,0,0,0.4)`
        : '0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
      textShadow: isSelected
        ? `0 0 8px ${theme.displayGlow}`
        : 'none',
      transition: 'all 0.2s ease',
    }),
  };

  if (!rooms || rooms.length === 0) {
    return (
      <div style={styles.container}>
        <span style={{
          color: theme.displayTextDim,
          fontFamily: "'Courier New', monospace",
          fontSize: '12px',
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}>
          NO ROOMS FOUND
        </span>
      </div>
    );
  }

  return (
    <div style={styles.container} role="radiogroup" aria-label="Select room">
      {rooms.map((room) => {
        const isSelected = room === selectedRoom;
        return (
          <button
            key={room}
            role="radio"
            aria-checked={isSelected}
            style={styles.pill(isSelected)}
            onClick={() => onSelect(room)}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = theme.accentRing;
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = theme.bezel;
              }
            }}
          >
            {room}
          </button>
        );
      })}
    </div>
  );
}
