import { useCallback, useEffect, useState } from 'react';
import { loadPresets, savePresets } from '../lib/presets.js';

export function usePresets() {
  const [presets, setPresets] = useState(loadPresets);

  useEffect(() => {
    savePresets(presets);
  }, [presets]);

  const setPreset = useCallback((index, preset) => {
    setPresets((prev) => {
      const next = [...prev];
      next[index] = preset;
      return next;
    });
  }, []);

  const clearPreset = useCallback((index) => {
    setPresets((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  }, []);

  return { presets, setPreset, clearPreset };
}
