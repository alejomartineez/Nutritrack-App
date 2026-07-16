import { useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Utilidades de animación. Todo respeta prefers-reduced-motion: si el usuario
// pidió menos movimiento en su sistema, los valores saltan sin animar.
// ---------------------------------------------------------------------------

/** true si el sistema del usuario pide reducir el movimiento. */
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Anima un número desde su valor anterior hasta `target` con easeOutCubic.
 * Devuelve el valor intermedio en cada frame. Con reduced-motion salta directo.
 * `startFrom` (opcional) fija el valor de arranque al montar — p. ej. 0 para que
 * el número "cuente" desde cero la primera vez.
 */
export function useCountUp(target, duration = 600, startFrom) {
  const initial = startFrom ?? target;
  const [value, setValue] = useState(initial);
  const fromRef = useRef(initial);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return undefined;

    if (prefersReducedMotion()) {
      fromRef.current = target;
      setValue(target);
      return undefined;
    }

    const start = performance.now();
    const finish = () => {
      fromRef.current = target;
      setValue(target);
    };
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setValue(from + (target - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        finish();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    // Red de seguridad: si rAF queda pausado (pestaña en segundo plano) el
    // número igual llega al valor final en vez de congelarse a mitad de camino.
    const fallback = setTimeout(finish, duration + 150);
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(fallback);
    };
  }, [target, duration]);

  return value;
}
