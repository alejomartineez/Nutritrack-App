import { useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Detección de teclado virtual.
//
// Contexto del problema: en iOS, una barra `position: fixed; bottom: 0` queda
// anclada al *layout viewport*, que con el teclado abierto sigue midiendo la
// pantalla entera. La barra queda detrás del teclado y, peor, Safari despega
// los elementos fijos durante el scroll y los reacomoda solo — así que termina
// apareciendo en medio de la pantalla. La única solución confiable es
// esconderla mientras el teclado está abierto.
//
// Historial de intentos fallidos, para no repetirlos:
//
//   1. Subir la barra con un transform del alto del teclado. No sirve: durante
//      el scroll iOS la reposiciona igual.
//   2. Medir `innerHeight - (vv.offsetTop + vv.height)`. Mal: `offsetTop` es
//      posición de scroll, así que al scrollear la cuenta daba cada vez menos
//      y la barra reaparecía.
//   3. Medir `innerHeight - vv.height`. Funciona en Safari, pero NO en la PWA
//      instalada (standalone), donde iOS sí achica el layout viewport y la
//      diferencia da casi cero.
//
// Conclusión: no hay una medición de viewport que valga en todos los modos. El
// foco sí es inequívoco — si hay un campo de texto enfocado en un dispositivo
// táctil, hay teclado. Eso es lo que se usa como señal principal.
// ---------------------------------------------------------------------------

const TEXTLESS_INPUT_TYPES = ['button', 'submit', 'reset', 'checkbox', 'radio', 'range', 'file', 'color'];

const isTextField = (el) =>
  !!el &&
  (el.tagName === 'TEXTAREA' ||
    el.isContentEditable ||
    (el.tagName === 'INPUT' && !TEXTLESS_INPUT_TYPES.includes(el.type)));

/**
 * ¿Este dispositivo abre un teclado virtual al enfocar un campo?
 *
 * Se combinan dos señales independientes en vez de confiar en una sola: en un
 * iPhone `maxTouchPoints` es 5 y `pointer: coarse` da true, así que con que
 * ande cualquiera de las dos alcanza. Se evalúa en cada evento (y no una vez al
 * montar) para que el comportamiento no quede congelado si el navegador reporta
 * distinto más tarde.
 */
const hasVirtualKeyboard = () =>
  navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;

/**
 * true cuando hay un teclado virtual abierto.
 *
 * Se apoya en el foco, no en medir el viewport: es la única señal que se
 * comporta igual en Safari y en la PWA instalada. En desktop devuelve siempre
 * false (no hay teclado virtual que tape nada), así que enfocar el buscador no
 * esconde la barra ahí.
 */
export function useKeyboardOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onFocusIn = (e) => {
      if (hasVirtualKeyboard() && isTextField(e.target)) setOpen(true);
    };

    // `focusout` llega antes de que el teclado termine de bajar, pero eso está
    // bien: la barra reaparece con su fade mientras el teclado se va.
    const onFocusOut = () => setOpen(false);

    // Por si al montar ya hay algo enfocado (vuelta de un modal, autofocus).
    if (hasVirtualKeyboard() && isTextField(document.activeElement)) setOpen(true);

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  return open;
}
