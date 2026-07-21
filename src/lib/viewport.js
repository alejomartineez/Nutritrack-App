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
 * de herramientas, y eso también achica el viewport visual (~50-90px). Con el
 * umbral en cero, ese vaivén se leía como "el teclado se movió" y la barra
 * saltaba a mitad del scroll. Un teclado siempre tapa bastante más que esto.
 */
const KEYBOARD_MIN_INSET = 120;

/**
 * true cuando hay un teclado virtual abierto tapando el fondo del viewport.
 *
 * Devuelve false en navegadores sin `visualViewport`, y también en Android y
 * desktop, donde el layout viewport sí se achica con el teclado y por lo tanto
 * el posicionamiento fijo ya funciona bien sin ayuda.
 */
export function useKeyboardOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;

    const update = () => {
      // Fondo del viewport visual, en coordenadas del layout viewport.
      const visibleBottom = vv.offsetTop + vv.height;
      const covered = window.innerHeight - visibleBottom;
      setOpen(covered > KEYBOARD_MIN_INSET);
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return open;
}
