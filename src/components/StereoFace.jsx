import React, { useState } from 'react';
import { TimeDisplay } from './TimeDisplay.jsx';
import { SevenSegmentDigit } from './SevenSegmentDigit.jsx';
import { SpectrumAnalyzer } from './SpectrumAnalyzer.jsx';
import { ScrollingText } from './ScrollingText.jsx';
import { VolumeBar } from './VolumeBar.jsx';
import { DBassIndicator } from './DBassIndicator.jsx';
import { JogDial } from './JogDial.jsx';

function SideButton({ label, theme, onClick, active = false }) {
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setPressed(false);
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        width: 56,
        minHeight: 44,
        padding: '8px 4px',
        fontFamily: 'Arial, sans-serif',
        fontSize: 9,
        fontWeight: 'bold',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        color: active ? '#ffffff' : theme.buttonText,
        background: active
          ? `linear-gradient(to bottom, ${theme.accentRing}, ${theme.accentRingDark})`
          : pressed
          ? `linear-gradient(to bottom, ${theme.chassisDark}, ${theme.chassis})`
          : `linear-gradient(to bottom, ${theme.chassisLight}, ${theme.chassisDark})`,
        border: `1px solid ${active ? theme.accentRing : theme.bezel}`,
        borderRadius: 2,
        cursor: 'pointer',
        boxShadow: active
          ? `0 0 8px ${theme.accentRing}40, inset 0 1px 1px rgba(255,255,255,0.15)`
          : hover
          ? `inset 0 1px 1px rgba(255,255,255,0.1), 0 1px 3px rgba(0,0,0,0.3)`
          : `inset 0 1px 1px rgba(255,255,255,0.05), 0 2px 4px rgba(0,0,0,0.4)`,
        transition: 'all 0.1s ease',
        lineHeight: 1.2,
      }}
    >
      {label}
    </button>
  );
}

function SmallDigitGroup({ label, value, theme }) {
  const chars = String(value).split('');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span
        style={{
          fontFamily: "'Courier New', monospace",
          fontSize: 7,
          fontWeight: 'bold',
          letterSpacing: 2,
          color: theme.displayTextDim,
          textTransform: 'uppercase',
          textShadow: `0 0 4px ${theme.displayGlow}`,
        }}
      >
        {label}
      </span>
      <div style={{ display: 'flex', gap: 0 }}>
        {chars.map((c, i) => (
          <SevenSegmentDigit key={i} value={c} theme={theme} size={28} />
        ))}
      </div>
    </div>
  );
}

export function StereoFace({ theme, sonos, viewMode, setViewMode }) {
  const [dbass, setDbass] = useState(false);

  const playerState = sonos.playerState;
  const track = playerState?.currentTrack;
  const isPlaying = playerState?.playbackState === 'PLAYING';
  const timeStr = playerState?.elapsedTimeFormatted || '0:00';
  const trackNo = playerState?.trackNo || 0;
  const volume = sonos.volume || 0;
  const shuffle = playerState?.playMode?.shuffle || false;
  const repeat = playerState?.playMode?.repeat || false;
  const trackTitle = track
    ? `${track.artist} - ${track.title}`
    : 'NO DISC';

  const handlePlayPause = () => {
    if (isPlaying) {
      sonos.pause();
    } else {
      sonos.play();
    }
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 820,
        // Main chassis body
        background: `linear-gradient(to bottom, ${theme.chassisLight} 0%, ${theme.chassis} 8%, ${theme.chassis} 92%, ${theme.chassisDark} 100%)`,
        borderRadius: 6,
        border: `2px solid ${theme.bezel}`,
        boxShadow: `
          0 8px 32px rgba(0,0,0,0.7),
          0 2px 8px rgba(0,0,0,0.5),
          inset 0 1px 0 rgba(255,255,255,0.08),
          inset 0 -1px 0 rgba(0,0,0,0.3)
        `,
        padding: 0,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Top label bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 16px',
          borderBottom: `1px solid ${theme.bezel}`,
          background: `linear-gradient(to bottom, rgba(255,255,255,0.04), transparent)`,
        }}
      >
        <span
          style={{
            fontFamily: 'Arial, sans-serif',
            fontSize: 8,
            fontWeight: 'bold',
            letterSpacing: 2,
            color: theme.buttonText,
            opacity: 0.5,
            textTransform: 'uppercase',
          }}
        >
          MD/CD CHANGER CONTROL
        </span>
        <span
          style={{
            fontFamily: 'Arial, sans-serif',
            fontSize: 8,
            fontWeight: 'bold',
            letterSpacing: 1,
            color: theme.buttonText,
            opacity: 0.5,
            textTransform: 'uppercase',
          }}
        >
          XR-C5300X
        </span>
      </div>

      {/* Main body */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 12px 8px 12px',
          gap: 12,
        }}
      >
        {/* Left side buttons */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            flexShrink: 0,
          }}
        >
          <SideButton
            label="MENU"
            theme={theme}
            onClick={() => {}}
          />
          <SideButton
            label="SRC"
            theme={theme}
            active={viewMode === 'source'}
            onClick={() => setViewMode(viewMode === 'source' ? 'main' : 'source')}
          />
        </div>

        {/* Jog Dial */}
        <div style={{ flexShrink: 0 }}>
          <JogDial
            theme={theme}
            onPlayPause={handlePlayPause}
            onNext={sonos.next}
            onPrev={sonos.prev}
            isPlaying={isPlaying}
          />
        </div>

        {/* LCD Display Area */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            background: theme.displayBg,
            borderRadius: 3,
            padding: '10px 14px',
            border: `1px solid ${theme.bezel}`,
            boxShadow: `
              inset 0 0 20px rgba(0,0,0,0.5),
              inset 0 2px 6px rgba(0,0,0,0.4),
              0 0 12px ${theme.displayGlow}
            `,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle LCD scan lines overlay */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(0,0,0,0.08) 2px,
                rgba(0,0,0,0.08) 4px
              )`,
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />

          {/* Top row: Time, Track/Disc numbers, Spectrum */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              position: 'relative',
              zIndex: 2,
            }}
          >
            {/* Time display */}
            <TimeDisplay time={timeStr} theme={theme} size={36} />

            {/* Disc / Track numbers */}
            <div style={{ display: 'flex', gap: 8 }}>
              <SmallDigitGroup label="DISC" value={String(1).padStart(2, ' ')} theme={theme} />
              <SmallDigitGroup label="TRCK" value={String(trackNo).padStart(2, ' ')} theme={theme} />
            </div>

            {/* Spectrum analyzer */}
            <div style={{ marginLeft: 'auto' }}>
              <SpectrumAnalyzer isPlaying={isPlaying} theme={theme} bars={12} />
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              height: 1,
              background: `linear-gradient(to right, transparent, ${theme.displayTextDim}40, transparent)`,
              position: 'relative',
              zIndex: 2,
            }}
          />

          {/* Scrolling track name */}
          <div style={{ position: 'relative', zIndex: 2, width: '100%' }}>
            <ScrollingText text={trackTitle} theme={theme} />
          </div>

          {/* Divider */}
          <div
            style={{
              height: 1,
              background: `linear-gradient(to right, transparent, ${theme.displayTextDim}40, transparent)`,
              position: 'relative',
              zIndex: 2,
            }}
          />

          {/* Bottom row: Volume bar + indicators */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              position: 'relative',
              zIndex: 2,
            }}
          >
            <VolumeBar value={volume} theme={theme} segments={12} />

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                onClick={sonos.toggleRepeat}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '6px 8px',
                  minWidth: 44,
                  minHeight: 28,
                  cursor: 'pointer',
                  fontFamily: "'Courier New', monospace",
                  fontSize: 8,
                  fontWeight: 'bold',
                  letterSpacing: 1.5,
                  color: repeat ? theme.displayTextBright : theme.displayTextDim,
                  textShadow: repeat ? `0 0 6px ${theme.displayGlow}` : 'none',
                  opacity: repeat ? 1 : 0.5,
                  textTransform: 'uppercase',
                }}
              >
                RPT
              </button>
              <button
                onClick={sonos.toggleShuffle}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '6px 8px',
                  minWidth: 44,
                  minHeight: 28,
                  cursor: 'pointer',
                  fontFamily: "'Courier New', monospace",
                  fontSize: 8,
                  fontWeight: 'bold',
                  letterSpacing: 1.5,
                  color: shuffle ? theme.displayTextBright : theme.displayTextDim,
                  textShadow: shuffle ? `0 0 6px ${theme.displayGlow}` : 'none',
                  opacity: shuffle ? 1 : 0.5,
                  textTransform: 'uppercase',
                }}
              >
                SHUF
              </button>
            </div>
          </div>
        </div>

        {/* Right side */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            flexShrink: 0,
          }}
        >
          <SideButton
            label="SND"
            theme={theme}
            active={viewMode === 'sound'}
            onClick={() => setViewMode(viewMode === 'sound' ? 'main' : 'sound')}
          />
          <SideButton
            label="OFF"
            theme={theme}
            onClick={() => sonos.pause()}
          />
          <DBassIndicator active={dbass} theme={theme} onClick={() => setDbass((d) => !d)} />

          {/* Xplod branding */}
          <div
            style={{
              marginTop: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <span
              style={{
                fontFamily: 'Arial, sans-serif',
                fontSize: 11,
                fontWeight: 'bold',
                letterSpacing: 2,
                color: theme.accentRing,
                textShadow: `0 0 6px ${theme.accentRing}60`,
                textTransform: 'uppercase',
                fontStyle: 'italic',
              }}
            >
              Xplod
            </span>
            <span
              style={{
                fontFamily: 'Arial, sans-serif',
                fontSize: 7,
                fontWeight: 'bold',
                letterSpacing: 1,
                color: theme.buttonText,
                opacity: 0.5,
              }}
            >
              50Wx4
            </span>
          </div>
        </div>
      </div>

      {/* Preset buttons bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '6px 16px 10px',
          gap: 6,
          borderTop: `1px solid rgba(255,255,255,0.03)`,
        }}
      >
        <span
          style={{
            fontFamily: 'Arial, sans-serif',
            fontSize: 7,
            fontWeight: 'bold',
            letterSpacing: 1,
            color: theme.buttonText,
            opacity: 0.4,
            marginRight: 8,
            textTransform: 'uppercase',
          }}
        >
          PRESET
        </span>
        {[1, 2, 3, 4, 5, 6].map((num) => {
          const fav = sonos.favorites[num - 1];
          const hasFav = !!fav;
          return (
            <button
              key={num}
              onClick={() => {
                if (fav) sonos.playFavorite(fav);
              }}
              title={fav || `Preset ${num} (empty)`}
              style={{
                width: 44,
                height: 44,
                fontFamily: "'Courier New', monospace",
                fontSize: 12,
                fontWeight: 'bold',
                color: hasFav ? theme.buttonText : theme.displayTextDim,
                background: `linear-gradient(to bottom, ${theme.chassisLight}, ${theme.chassisDark})`,
                border: `1px solid ${theme.bezel}`,
                borderRadius: 2,
                cursor: hasFav ? 'pointer' : 'default',
                opacity: hasFav ? 1 : 0.4,
                boxShadow: `inset 0 1px 1px rgba(255,255,255,0.05), 0 1px 3px rgba(0,0,0,0.3)`,
                transition: 'all 0.1s ease',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {num}
            </button>
          );
        })}
      </div>
    </div>
  );
}
