import { useCallback, useEffect, useState } from 'react';

function hasFullscreenBridge() {
  return Boolean(window.sonohaus?.isElectron && window.sonohaus?.fullscreen);
}

export function useElectronFullscreen() {
  const [available] = useState(hasFullscreenBridge);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!available) return undefined;

    let cancelled = false;
    window.sonohaus.fullscreen.isActive().then((active) => {
      if (!cancelled) setIsFullscreen(active);
    });

    const unsubscribe = window.sonohaus.fullscreen.onChanged((active) => {
      setIsFullscreen(active);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [available]);

  const toggle = useCallback(async () => {
    if (!available) return;
    const next = await window.sonohaus.fullscreen.toggle();
    setIsFullscreen(next);
  }, [available]);

  return { available, isFullscreen, toggle };
}
