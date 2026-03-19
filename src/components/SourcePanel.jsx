export function SourcePanel({ favorites, playlists, theme, onPlayFavorite, onPlayPlaylist }) {
  const styles = {
    container: {
      padding: '20px',
      background: `linear-gradient(to bottom, ${theme.chassisLight}, ${theme.chassis})`,
      border: `1px solid ${theme.bezel}`,
      borderRadius: '4px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
    },
    section: {
      marginBottom: '20px',
    },
    sectionLast: {
      marginBottom: 0,
    },
    label: {
      color: theme.displayTextDim,
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      fontWeight: 'bold',
      letterSpacing: '2px',
      textTransform: 'uppercase',
      marginBottom: '12px',
      display: 'block',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
      gap: '8px',
    },
    card: {
      padding: '12px 14px',
      minHeight: '44px',
      display: 'flex',
      alignItems: 'center',
      background: `linear-gradient(to bottom, ${theme.buttonBg}, ${theme.chassisDark})`,
      border: `1px solid ${theme.bezel}`,
      borderRadius: '4px',
      color: theme.buttonText,
      fontFamily: "'Courier New', monospace",
      fontSize: '11px',
      fontWeight: 'bold',
      letterSpacing: '0.5px',
      textTransform: 'uppercase',
      cursor: 'pointer',
      boxShadow: '0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      transition: 'all 0.15s ease',
    },
    empty: {
      color: theme.displayTextDim,
      fontFamily: "'Courier New', monospace",
      fontSize: '11px',
      letterSpacing: '1px',
      textTransform: 'uppercase',
      padding: '12px 0',
    },
  };

  const handleCardHover = (e, entering) => {
    if (entering) {
      e.currentTarget.style.borderColor = theme.displayText;
      e.currentTarget.style.color = theme.displayText;
      e.currentTarget.style.boxShadow = `0 0 10px ${theme.displayGlow}, 0 1px 3px rgba(0,0,0,0.3)`;
      e.currentTarget.style.textShadow = `0 0 6px ${theme.displayGlow}`;
    } else {
      e.currentTarget.style.borderColor = theme.bezel;
      e.currentTarget.style.color = theme.buttonText;
      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)';
      e.currentTarget.style.textShadow = 'none';
    }
  };

  const hasFavorites = favorites && favorites.length > 0;
  const hasPlaylists = playlists && playlists.length > 0;

  return (
    <div style={styles.container}>
      <div style={styles.section}>
        <span style={styles.label}>Favorites</span>
        {hasFavorites ? (
          <div style={styles.grid}>
            {favorites.map((fav, i) => (
              <button
                key={`fav-${i}`}
                style={styles.card}
                onClick={() => onPlayFavorite(fav)}
                onMouseEnter={(e) => handleCardHover(e, true)}
                onMouseLeave={(e) => handleCardHover(e, false)}
                title={fav}
              >
                {fav}
              </button>
            ))}
          </div>
        ) : (
          <span style={styles.empty}>No favorites found</span>
        )}
      </div>

      <div style={styles.sectionLast}>
        <span style={styles.label}>Playlists</span>
        {hasPlaylists ? (
          <div style={styles.grid}>
            {playlists.map((pl, i) => (
              <button
                key={`pl-${i}`}
                style={styles.card}
                onClick={() => onPlayPlaylist(pl)}
                onMouseEnter={(e) => handleCardHover(e, true)}
                onMouseLeave={(e) => handleCardHover(e, false)}
                title={pl}
              >
                {pl}
              </button>
            ))}
          </div>
        ) : (
          <span style={styles.empty}>No playlists found</span>
        )}
      </div>
    </div>
  );
}
