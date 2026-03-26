export const PRESETS_STORAGE_KEY = 'sonohaus.presets.v1';
export const PRESET_COUNT = 6;

// Preset shape:
// { type: 'favorite' | 'playlist', name: string, label: string, room: string | null }
// room = specific room to select before playing, or null to use whatever is currently selected
// null = empty slot

export function loadPresets() {
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!raw) return Array(PRESET_COUNT).fill(null);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== PRESET_COUNT) return Array(PRESET_COUNT).fill(null);
    return parsed;
  } catch {
    return Array(PRESET_COUNT).fill(null);
  }
}

export function savePresets(presets) {
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch {
    /* quota / private mode */
  }
}
