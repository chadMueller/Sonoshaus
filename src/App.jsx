import { useEffect } from 'react';
import { SonosReceiverView } from './components/receiver/SonosReceiverView.jsx';
import './styles/sonosReceiver.css';

export function App() {
  useEffect(() => {
    const kioskFullscreen =
      String(import.meta.env.VITE_KIOSK_FULLSCREEN || '').toLowerCase() === 'true';
    const idleMinutes = Number(import.meta.env.VITE_KIOSK_IDLE_MINUTES || 45);
    const idleMs = Number.isFinite(idleMinutes) && idleMinutes > 0 ? idleMinutes * 60 * 1000 : 0;

    let idleTimer = null;
    const resetIdle = () => {
      if (!idleMs) return;
      if (idleTimer) window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        window.location.reload();
      }, idleMs);
    };

    const interactions = ['pointerdown', 'mousemove', 'keydown', 'touchstart'];
    interactions.forEach((eventName) => window.addEventListener(eventName, resetIdle, { passive: true }));
    resetIdle();

    if (kioskFullscreen) {
      const requestFullscreen = () => {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
        window.removeEventListener('pointerdown', requestFullscreen);
        window.removeEventListener('keydown', requestFullscreen);
      };
      window.addEventListener('pointerdown', requestFullscreen, { passive: true });
      window.addEventListener('keydown', requestFullscreen);
    }

    return () => {
      interactions.forEach((eventName) => window.removeEventListener(eventName, resetIdle));
      if (idleTimer) window.clearTimeout(idleTimer);
    };
  }, []);

  return <SonosReceiverView />;
}
