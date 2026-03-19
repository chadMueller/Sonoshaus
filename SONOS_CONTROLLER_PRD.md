# Sonos Controller PRD
## Retro Car Stereo UI with Theme Switching

---

## Overview

Build a web-based Sonos controller that mimics the aesthetic of early 2000s car stereo head units (Sony Xplod, Alpine, Kenwood, Pioneer). The app connects to Sonos speakers via the `node-sonos-http-api` bridge and provides full playback control with a nostalgic, skeuomorphic interface.

**Target platforms:** Desktop web app, wall-mounted touchscreen (Raspberry Pi), Electron wrapper for macOS

---

## Technical Stack

- **Frontend:** React 18 + Vite
- **Styling:** CSS-in-JS (inline styles) or Tailwind — no external UI libraries
- **Backend:** `node-sonos-http-api` (separate project, runs on local network)
- **State:** React useState/useEffect (no Redux needed)
- **API:** REST calls to Sonos HTTP API

---

## Architecture

```
┌─────────────────────────┐
│   React Web App         │
│   (This project)        │
│   localhost:3000        │
└───────────┬─────────────┘
            │ HTTP REST
            ▼
┌─────────────────────────┐
│  node-sonos-http-api    │
│  localhost:5005         │
└───────────┬─────────────┘
            │ UPnP/SOAP
            ▼
┌─────────────────────────┐
│   Sonos Speakers        │
│   (Local network)       │
└─────────────────────────┘
```

---

## API Integration

Base URL: `http://localhost:5005` (configurable)

### Endpoints to implement:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/zones` | GET | List all speakers and groups |
| `/{room}/state` | GET | Current playback state, track info, volume |
| `/{room}/play` | GET | Start playback |
| `/{room}/pause` | GET | Pause playback |
| `/{room}/next` | GET | Skip to next track |
| `/{room}/previous` | GET | Previous track |
| `/{room}/volume/{0-100}` | GET | Set volume level |
| `/{room}/favorites` | GET | List Sonos favorites |
| `/{room}/favorite/{name}` | GET | Play a favorite |
| `/{room}/playlists` | GET | List Sonos playlists |
| `/{room}/playlist/{name}` | GET | Play a playlist |
| `/{room}/shuffle/toggle` | GET | Toggle shuffle mode |
| `/{room}/repeat/toggle` | GET | Toggle repeat mode |

### State Response Shape:

```typescript
interface PlayerState {
  currentTrack: {
    artist: string;
    title: string;
    album: string;
    albumArtUri: string;
    duration: number; // seconds
  };
  nextTrack: {
    artist: string;
    title: string;
    album: string;
  };
  volume: number; // 0-100
  mute: boolean;
  trackNo: number;
  elapsedTime: number; // seconds
  elapsedTimeFormatted: string; // "3:45"
  playbackState: "PLAYING" | "PAUSED_PLAYBACK" | "STOPPED";
  playMode: {
    shuffle: boolean;
    repeat: boolean;
    crossfade: boolean;
  };
}
```

### Zones Response Shape:

```typescript
interface Zone {
  uuid: string;
  coordinator: {
    uuid: string;
    roomName: string;
  };
  members: Array<{
    uuid: string;
    roomName: string;
  }>;
}
```

---

## Theme System

Implement a theme switcher with 5+ retro car stereo themes. Each theme defines colors for all UI elements.

### Theme Interface:

```typescript
interface Theme {
  name: string;           // Display name
  era: string;            // e.g., "2000s Car Stereo"
  
  // Chassis/body colors
  chassis: string;        // Main body color
  chassisLight: string;   // Highlight
  chassisDark: string;    // Shadow
  bezel: string;          // Border/frame color
  
  // Accent ring (jog dial)
  accentRing: string;
  accentRingLight: string;
  accentRingDark: string;
  
  // LCD Display
  displayBg: string;      // Display background
  displayText: string;    // Primary text color
  displayTextDim: string; // Secondary/dim text
  displayTextBright: string;
  displayGlow: string;    // CSS glow color with alpha
  
  // Buttons
  buttonBg: string;
  buttonText: string;
  buttonActive: string;
  
  // Segments (7-segment display, volume bars)
  segmentOn: string;
  segmentOff: string;
  
  // Spectrum analyzer
  spectrumLow: string;    // Green bars
  spectrumMid: string;    // Yellow bars
  spectrumHigh: string;   // Red bars
}
```

### Required Themes:

1. **Sony Xplod** (default)
   - Orange amber LCD (#ff6b00)
   - Red metallic accent ring (#c41e3a)
   - Black chassis
   - Green/yellow/red spectrum

2. **Alpine Blue**
   - Cyan LCD (#00ccff)
   - Blue accent ring (#0066cc)
   - Dark navy chassis
   - Cyan spectrum

3. **Kenwood Green**
   - Green LCD (#00ff00)
   - Silver/gray accent ring
   - Black chassis
   - All-green spectrum

4. **Pioneer Red**
   - Red LCD (#ff0000)
   - Red accent ring (#cc0000)
   - Black chassis
   - Red spectrum

5. **Warm & Woody** (modern hi-fi option)
   - Dark brown text on cream (#3d2914 on #f5f0e6)
   - Copper accent ring (#b87333)
   - Walnut brown chassis
   - Warm spectrum colors

---

## UI Components

### 1. Seven-Segment Display

Create an SVG-based 7-segment digit display for time, track numbers, and disc numbers.

**Props:**
- `value: string` — single character (0-9, :, space)
- `theme: string` — theme key
- `size: number` — height in pixels

**Behavior:**
- Each segment is a polygon
- Lit segments use `segmentOn` color with glow effect
- Unlit segments use `segmentOff` color (very dim)
- Support colon character for time display

**Segment layout (standard 7-segment):**
```
 ─── A ───
│         │
F         B
│         │
 ─── G ───
│         │
E         C
│         │
 ─── D ───
```

### 2. Time Display

Combines multiple SevenSegmentDigit components.

**Props:**
- `time: string` — formatted time like "3:45"
- `theme: string`
- `size: number`

### 3. Spectrum Analyzer

Animated vertical bar equalizer visualization.

**Props:**
- `isPlaying: boolean`
- `theme: string`
- `bars: number` — number of bars (default 12)

**Behavior:**
- When playing: bars animate randomly with smooth transitions
- When paused: all bars at 0
- Each bar is a column of 8-10 small rectangles
- Bottom bars are green, middle yellow, top red (based on theme)
- Lit segments have glow effect

**Animation:**
- Update every 80-100ms
- Use sine waves + random noise for organic feel
- Each bar independent but loosely correlated

### 4. Jog Dial

Central rotary control with play/pause button.

**Structure (nested circles):**
1. Outer housing (chassis color, slight 3D effect)
2. Accent ring (metallic gradient, conic-gradient)
3. Inner dial (rotatable, textured)
4. Center button (play/pause)
5. Direction notch (shows rotation)

**Props:**
- `theme: string`
- `onPlayPause: () => void`
- `onNext: () => void`
- `onPrev: () => void`
- `isPlaying: boolean`

**Behavior:**
- Mouse wheel rotates the dial (visual feedback + triggers next/prev)
- Center button toggles play/pause
- Skip buttons (◀◀ / ▶▶) positioned outside dial
- Rotation is visual only (stores angle in state)

**Labels around dial:**
- Top: "DISC +"
- Bottom: "— DISC —" (in accent color)
- Left: "MODE" + "◀◀"
- Right: "MODE" + "▶▶"

### 5. Volume Bar

Horizontal or vertical segmented volume display.

**Props:**
- `value: number` — 0-100
- `theme: string`
- `segments: number` — default 12

**Behavior:**
- Segments increase in height left to right
- Colors transition: green → yellow → red based on position
- Active segments have glow
- "VOL" label prefix

### 6. Preset Buttons

Row of 6 numbered buttons for favorites.

**Props:**
- `favorites: string[]` — up to 6 favorite names
- `theme: string`
- `onSelect: (name: string, index: number) => void`
- `activeIndex: number`

**Behavior:**
- Buttons 1-6 in a row
- Active button glows in accent color
- Inactive buttons are dim
- Empty slots (no favorite) are extra dim
- Tooltip shows favorite name on hover

### 7. Side Buttons

Rectangular buttons for MENU, SOURCE, SOUND, OFF.

**Props:**
- `label: string`
- `theme: string`
- `onClick: () => void`
- `active: boolean`

**Behavior:**
- Active state shows accent color background
- Subtle 3D pressed effect
- Uppercase text, letter-spacing

### 8. Scrolling Text Display

Marquee-style scrolling for long track titles.

**Props:**
- `text: string`
- `theme: string`
- `width: number`

**Behavior:**
- If text fits, show static
- If text overflows, scroll horizontally in loop
- Monospace font (Courier New)
- LCD glow effect
- Uppercase

### 9. D-BASS Indicator

Toggle button with lit indicator.

**Props:**
- `active: boolean`
- `theme: string`
- `onClick: () => void`

**Behavior:**
- When active: bright green background with glow
- When inactive: dim, same as segmentOff

### 10. Theme Selector

Dropdown to switch themes.

**Props:**
- `currentTheme: string`
- `onSelect: (themeKey: string) => void`

**Behavior:**
- Shows current theme name
- Dropdown lists all themes with name + era subtitle
- Selected theme highlighted
- Click outside closes dropdown

### 11. Room Selector

Horizontal button group for Sonos rooms.

**Props:**
- `rooms: string[]`
- `selectedRoom: string`
- `theme: string`
- `onSelect: (room: string) => void`

**Behavior:**
- Each room is a pill button
- Selected room has accent color + glow
- Uppercase text

---

## Main Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ HEADER: "SONOS | NETWORK AUDIO"              [Theme Selector ▼] │
├──────────────────────────────────────────────────────────────────┤
│ ROOM SELECTOR: [Living Room] [Kitchen] [Bedroom]                 │
├──────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ STEREO FACE                                                  │ │
│ │ ┌─────────────────────────────────────────────────────────┐  │ │
│ │ │ "MD/CD CHANGER CONTROL"                    "XR-C5300X"  │  │ │
│ │ └─────────────────────────────────────────────────────────┘  │ │
│ │                                                              │ │
│ │  ┌────────┐   ┌─────────────────────────────────┐  ┌──────┐ │ │
│ │  │ MENU   │   │  ┌────┐  ┌────┐                 │  │ OPEN │ │ │
│ │  │ SOURCE │   │  │1:29│  │DISC│ ▐█▐█▐█▐█▐█▐█▐█ │  │      │ │ │
│ │  └────────┘   │  └────┘  │ 6  │  SPECTRUM      │  │D-BASS│ │ │
│ │               │  ┌────┐  ├────┤                 │  └──────┘ │ │
│ │   ┌─────┐     │  │TRCK│  │ 97 │                 │           │ │
│ │   │     │     │  └────┘  └────┘                 │   Xplod   │ │
│ │   │ JOG │     │  ─────────────────────────────  │   50W×4   │ │
│ │   │DIAL │     │  M83 - MIDNIGHT CITY  (scroll)  │           │ │
│ │   │     │     │  ─────────────────────────────  │           │ │
│ │   └─────┘     │  VOL ▐▐▐▐▐▐▐░░░░░  REP  SHUF   │           │ │
│ │               └─────────────────────────────────┘           │ │
│ │  ┌────────┐                                                 │ │
│ │  │ SOUND  │   PRESETS [1][2][3][4][5][6]                    │ │
│ │  │  OFF   │                                                 │ │
│ │  └────────┘                                                 │ │
│ └──────────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────┤
│ EXPANDABLE PANELS (based on view mode):                          │
│ - SOURCE: Grid of favorites/playlists                            │
│ - SOUND: Large touch-friendly volume slider                      │
└──────────────────────────────────────────────────────────────────┘
```

---

## View Modes

Toggle between modes using side buttons:

### 1. Main (default)
- Shows stereo face only
- All controls visible

### 2. Source
- Expands panel below stereo
- Shows grid of favorites and playlists
- Click to play

### 3. Sound
- Expands panel below stereo
- Large volume slider with +/- buttons
- Touch-optimized for wall display

---

## State Management

### App-level state:

```typescript
const [currentTheme, setCurrentTheme] = useState('xplod');
const [zones, setZones] = useState<Zone[]>([]);
const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
const [playerState, setPlayerState] = useState<PlayerState | null>(null);
const [volume, setVolume] = useState(50);
const [favorites, setFavorites] = useState<string[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [dbass, setDbass] = useState(false);
const [activePreset, setActivePreset] = useState(-1);
const [viewMode, setViewMode] = useState<'main' | 'source' | 'sound'>('main');
```

### Polling:

- Poll `/zones` on mount
- Poll `/{room}/state` every 2 seconds when room selected
- Poll `/{room}/favorites` when room changes

---

## Styling Guidelines

### General:
- Dark background (`#0a0a0a` to `#1a1a1a` gradient)
- No CSS frameworks — use inline styles or CSS-in-JS
- Heavy use of gradients for 3D/metallic effects
- Box shadows for depth
- `filter: drop-shadow()` for glow effects

### Typography:
- System fonts for buttons: Arial, sans-serif
- Monospace for LCD: 'Courier New', monospace
- Font weights: bold for labels
- Letter-spacing: 1-2px for labels
- All uppercase for most text

### Effects:
- `text-shadow: 0 0 Npx {glowColor}` for LCD glow
- `box-shadow: 0 0 Npx {color}` for button glow
- `background: linear-gradient(to bottom, light, dark)` for 3D buttons
- `background: conic-gradient(...)` for metallic rings
- `background: radial-gradient(...)` for dials

### Responsive:
- Min-width: 800px (optimize for landscape)
- Touch targets: minimum 44px for buttons
- Scale up for wall-mounted displays

---

## File Structure

```
sonos-controller/
├── index.html
├── package.json
├── vite.config.js
├── public/
│   └── manifest.json        # PWA manifest
├── src/
│   ├── main.jsx             # Entry point
│   ├── App.jsx              # Main app component
│   ├── api/
│   │   └── sonos.js         # API functions
│   ├── themes/
│   │   └── index.js         # Theme definitions
│   ├── components/
│   │   ├── SevenSegmentDigit.jsx
│   │   ├── TimeDisplay.jsx
│   │   ├── SpectrumAnalyzer.jsx
│   │   ├── JogDial.jsx
│   │   ├── VolumeBar.jsx
│   │   ├── PresetButtons.jsx
│   │   ├── SideButton.jsx
│   │   ├── ScrollingText.jsx
│   │   ├── DBassIndicator.jsx
│   │   ├── ThemeSelector.jsx
│   │   ├── RoomSelector.jsx
│   │   ├── StereoFace.jsx   # Main stereo container
│   │   ├── SourcePanel.jsx  # Favorites grid
│   │   └── SoundPanel.jsx   # Volume controls
│   └── hooks/
│       └── useSonos.js      # Custom hook for API
```

---

## Package Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.12"
  }
}
```

---

## Development Commands

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Testing Checklist

- [ ] Themes switch correctly (all colors update)
- [ ] 7-segment digits render all numbers 0-9
- [ ] Spectrum analyzer animates when playing
- [ ] Jog dial rotates on scroll
- [ ] Play/pause toggles correctly
- [ ] Next/previous skip tracks
- [ ] Volume slider updates and persists
- [ ] Favorites load and play
- [ ] Room switching works
- [ ] Scrolling text marquees for long titles
- [ ] D-BASS toggles visually
- [ ] Preset buttons map to favorites
- [ ] Error states handled gracefully
- [ ] Loading states shown

---

## Future Enhancements (V2)

- [ ] Touch gestures (swipe to skip)
- [ ] Queue view with drag-to-reorder
- [ ] Album art display mode
- [ ] Alarm/timer controls
- [ ] EQ controls (bass/treble sliders)
- [ ] Group/ungroup speakers
- [ ] More themes (JVC Arsenal, Blaupunkt, Eclipse)
- [ ] CD loading animation
- [ ] Motorized faceplate open/close animation
- [ ] Sound effects (button clicks)
- [ ] Electron wrapper for native macOS app
- [ ] Kiosk mode for Raspberry Pi

---

## Reference Images

Sony Xplod XR-C5300X:
- Orange/amber LCD display with glow
- Red metallic ring around jog dial
- Chrome/silver inner dial
- Green/yellow/red spectrum bars
- "Xplod 50W×4" branding in red
- Preset buttons 1-6 below display
- D-BASS indicator lights up green

Key aesthetic elements:
- Negative display (light text on dark background)
- Metallic gradients on buttons and rings
- Glow effects on active elements
- 7-segment and dot-matrix style text
- Physical button appearance with shadows

---

## Notes for Implementation

1. **Start with themes** — define all theme objects first so colors are consistent
2. **Build atomic components** — SevenSegmentDigit, then TimeDisplay, etc.
3. **Mock the API first** — use fake data until API is connected
4. **Add animations last** — get static layout working first
5. **Test touch interactions** — verify on actual touchscreen if possible

The goal is authenticity to the early 2000s car stereo aesthetic while being fully functional as a Sonos controller.
