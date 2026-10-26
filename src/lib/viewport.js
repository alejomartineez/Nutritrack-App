import { useEffect, useLayoutEffect, useState } from 'react';

// Utilidades para convivir con el teclado de iOS. Los elementos `fixed` no se
// mueven cuando aparece el teclado (se quedan en el layout viewport), así que
// todo lo que flota abajo queda tapado salvo que lo corramos a mano.

const TEXTLESS = ['button', 'submit', 'reset', 'checkbox', 'radio', 'range', 'file', 'color', 'time', 'date'];

const isTextField = (el) =>
  !!el && (el.tagName === 'TEXTAREA' || el.isContentEditable || (el.tagName === 'INPUT' && !TEXTLESS.includes(el.type)));

const hasVirtualKeyboard = () => navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;

/** true mientras un campo de texto tiene el foco en un dispositivo táctil. */
export function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onIn = (e) => hasVirtualKeyboard() && isTextField(e.target) && setOpen(true);
    const onOut = () => setOpen(false);
    document.addEventListener('focusin', onIn);
    document.addEventListener('focusout', onOut);
    return () => {
      document.removeEventListener('focusin', onIn);
      document.removeEventListener('focusout', onOut);
    };
  }, []);
  return open;
}

/**
 * Píxeles que el teclado le quita a la parte de abajo de la pantalla, medidos
 * con visualViewport. Las hojas los usan como padding inferior para que el
 * campo enfocado y el botón principal sigan a la vista.
 */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;
    const update = () => {
      const hidden = window.innerHeight - vv.height - vv.offsetTop;
      setInset(hidden > 80 ? Math.round(hidden) : 0);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);
  return inset;
}

/**
 * Para hojas `fixed` con buscador: iOS scrollea la ventana para "mostrar" el
 * campo, y como la hoja no se mueve con ese scroll, el campo se termina yendo
 * de la vista. Mientras está activo, la ventana queda quieta arriba.
 */
export function useFreezeWindowScroll(enabled) {
  useLayoutEffect(() => {
    if (!enabled) return undefined;
    const y = window.scrollY;
    const freeze = () => {
      if (window.scrollY !== y) window.scrollTo(0, y);
    };
    window.addEventListener('scroll', freeze, { passive: true });
    return () => window.removeEventListener('scroll', freeze);
  }, [enabled]);
}

/** Bloquea el pellizco: la app se usa a pantalla completa como nativa. */
export function lockViewportZoom() {
  const blockMultiTouch = (e) => {
    if (e.touches && e.touches.length > 1) e.preventDefault();
  };
  const blockGesture = (e) => e.preventDefault();
  document.addEventListener('touchmove', blockMultiTouch, { passive: false });
  document.addEventListener('gesturestart', blockGesture);
  document.addEventListener('gesturechange', blockGesture);
  document.addEventListener('gestureend', blockGesture);
}
