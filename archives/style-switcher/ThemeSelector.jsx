import { useState, useEffect, useRef } from 'react';

export function ThemeSelector({ currentTheme, themes, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const themeKeys = Object.keys(themes);
  const active = themes[currentTheme] || themes[themeKeys[0]];

  const styles = {
    container: {
      position: 'relative',
      display: 'inline-block',
      fontFamily: 'Arial, sans-serif',
      zIndex: 100,
    },
    trigger: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      background: `linear-gradient(to bottom, ${active.chassisLight}, ${active.chassisDark})`,
      border: `1px solid ${active.bezel}`,
      borderRadius: '4px',
      color: active.displayText,
      fontSize: '11px',
      fontWeight: 'bold',
      letterSpacing: '1.5px',
      textTransform: 'uppercase',
      cursor: 'pointer',
      minWidth: '160px',
      justifyContent: 'space-between',
      textShadow: `0 0 6px ${active.displayGlow}`,
      boxShadow: `0 1px 3px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)`,
    },
    arrow: {
      fontSize: '8px',
      transition: 'transform 0.2s',
      transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
    },
    dropdown: {
      position: 'absolute',
      top: 'calc(100% + 4px)',
      right: 0,
      minWidth: '200px',
      background: `linear-gradient(to bottom, ${active.chassisLight}, ${active.chassis})`,
      border: `1px solid ${active.bezel}`,
      borderRadius: '4px',
      boxShadow: `0 8px 24px rgba(0,0,0,0.6), 0 0 12px ${active.displayGlow}`,
      overflow: 'hidden',
    },
    option: (key) => ({
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
      padding: '10px 14px',
      cursor: 'pointer',
      background:
        key === currentTheme
          ? `linear-gradient(to right, ${themes[key].displayBg}, transparent)`
          : 'transparent',
      borderLeft:
        key === currentTheme
          ? `3px solid ${themes[key].displayText}`
          : '3px solid transparent',
      transition: 'background 0.15s',
    }),
    optionName: (key) => ({
      color: key === currentTheme ? themes[key].displayText : active.buttonText,
      fontSize: '12px',
      fontWeight: 'bold',
      letterSpacing: '1px',
      textTransform: 'uppercase',
      textShadow: key === currentTheme ? `0 0 6px ${themes[key].displayGlow}` : 'none',
    }),
    optionEra: (key) => ({
      color: key === currentTheme ? themes[key].displayTextDim : active.displayTextDim,
      fontSize: '9px',
      letterSpacing: '0.5px',
      textTransform: 'uppercase',
    }),
  };

  return (
    <div ref={ref} style={styles.container}>
      <button
        style={styles.trigger}
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{active.name}</span>
        <span style={styles.arrow}>&#9660;</span>
      </button>

      {open && (
        <div style={styles.dropdown} role="listbox" aria-label="Select theme">
          {themeKeys.map((key) => (
            <div
              key={key}
              role="option"
              aria-selected={key === currentTheme}
              style={styles.option(key)}
              onClick={() => {
                onSelect(key);
                setOpen(false);
              }}
              onMouseEnter={(e) => {
                if (key !== currentTheme) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (key !== currentTheme) {
                  e.currentTarget.style.background = 'transparent';
                } else {
                  e.currentTarget.style.background = `linear-gradient(to right, ${themes[key].displayBg}, transparent)`;
                }
              }}
            >
              <span style={styles.optionName(key)}>{themes[key].name}</span>
              <span style={styles.optionEra(key)}>{themes[key].era}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
