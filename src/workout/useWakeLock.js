import { useEffect } from 'react';

/** Mantiene la pantalla prendida mientras `active` (iOS 16.4+). */
export function useWakeLock(active) {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !navigator.wakeLock) return undefined;
    let lock = null;
    let cancelled = false;
    const acquire = async () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      try {
        const l = await navigator.wakeLock.request('screen');
        if (cancelled) l.release().catch(() => {});
        else lock = l;
      } catch {
        lock = null;
      }
    };
    // iOS suelta el lock al salir de la app: se pide de nuevo al volver.
    const onVisible = () => document.visibilityState === 'visible' && acquire();
    acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release?.().catch(() => {});
    };
  }, [active]);
}
