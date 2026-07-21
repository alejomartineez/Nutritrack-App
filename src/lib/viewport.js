import { useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Utilidades de viewport.
//
// El problema que resuelven: en iOS Safari, cuando se abre el teclado, el
// *visual viewport* (lo que realmente ves) se achica, pero el *layout viewport*
// (contra el que se posiciona `position: fixed`) queda igual. Una barra fija con
// `bottom: 0` queda anclada detrás del teclado, y Safari la reposiciona por su
// cuenta mientras scrolleás — aparece flotando en medio de la pantalla.
//
// Se intentó perseguir al teclado subiendo la barra con un transform, y no
// alcanza: durante el scroll Safari despega los elementos fijos y los reacomoda
// a su antojo, así que la barra igual termina en el medio. La única solución
// confiable es esconderla mientras el teclado está abierto.
// ---------------------------------------------------------------------------

/**
 * Mínimo de píxeles tapados para considerar que hay un teclado.
 *
 * No alcanza con `> 0`: al scrollear, Safari colapsa y expande su propia barra
 * de herramientas, y eso también achica el viewport visual (~50-90px). Un
 * teclado siempre tapa bastante más que esto.
 */
const KEYBOARD_MIN_INSET = 120;

const TEXTLESS_INPUT_TYPES = ['button', 'submit', 'reset', 'checkbox', 'radio', 'range', 'file', 'color'];

const isTextField = (el) =>
  !!el &&
  (el.tagName === 'TEXTAREA' ||
    el.isContentEditable ||
    (el.tagName === 'INPUT' && !TEXTLESS_INPUT_TYPES.includes(el.type)));

/**
 * true cuando hay un teclado virtual abierto tapando el fondo del viewport.
 *
 * Devuelve false en desktop y en Android, donde el layout viewport sí se achica
 * con el teclado y por lo tanto el posicionamiento fijo ya funciona bien solo.
 */
export function useKeyboardOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    const touch = window.matchMedia('(pointer: coarse)').matches;

    // OJO: acá NO se resta `vv.offsetTop`, y es a propósito.
    //
    // `offsetTop` es cuánto se desplazó el viewport visual dentro del layout
    // viewport, o sea posición de scroll — no tiene nada que ver con si hay un
    // teclado. Restarlo hacía que, al scrollear con el teclado abierto, la
    // cuenta diera cada vez menos "tapado" hasta cruzar el umbral: el hook
    // creía que el teclado se había cerrado y mostraba la barra en medio de la
    // pantalla. La diferencia de alturas sola es estable durante el scroll,
    // porque `vv.height` solo cambia cuando aparece o desaparece algo (teclado
    // o barra de Safari).
    const measure = () => !!vv && window.innerHeight - vv.height > KEYBOARD_MIN_INSET;

    const update = () => setOpen(measure());

    // Respaldo: en un dispositivo táctil, un campo de texto enfocado implica
    // teclado. Es inmune a cualquier rareza del viewport, y cubre el arranque
    // (el foco llega antes que el `resize`). Al desenfocar se vuelve a medir.
    const onFocusIn = (e) => {
      if (touch && isTextField(e.target)) setOpen(true);
    };

    update();
    if (vv) {
      vv.addEventListener('resize', update);
      vv.addEventListener('scroll', update);
    }
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', update);

    return () => {
      if (vv) {
        vv.removeEventListener('resize', update);
        vv.removeEventListener('scroll', update);
      }
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', update);
    };
  }, []);

  return open;
}
