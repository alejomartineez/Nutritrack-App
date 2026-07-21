import { useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Utilidades de viewport.
//
// El problema que resuelven: en iOS Safari, cuando se abre el teclado, el
// *visual viewport* (lo que realmente ves) se achica, pero el *layout viewport*
// (contra el que se posiciona `position: fixed`) queda igual. Resultado: una
// barra fija con `bottom: 0` queda anclada detrás del teclado, y Safari la
// reposiciona por su cuenta mientras scrolleás — se ve "flotando" sobre el
// contenido y tapándolo.
// ---------------------------------------------------------------------------

/**
 * Píxeles del layout viewport que quedan tapados por debajo del viewport visual
 * (teclado abierto, barras del navegador). 0 cuando no hay nada tapando.
 *
 * Un elemento fijo al fondo puede subirse esa cantidad para quedar justo encima
 * del teclado y dejar de saltar. Devuelve 0 en navegadores sin `visualViewport`,
 * así que el comportamiento previo queda intacto.
 */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;

    const update = () => {
      // Fondo del viewport visual, en coordenadas del layout viewport.
      const visibleBottom = vv.offsetTop + vv.height;
      const covered = window.innerHeight - visibleBottom;
      // Se redondea para no disparar renders por diferencias subpíxel, que iOS
      // produce de a decenas mientras el teclado se anima.
      setInset(Math.max(0, Math.round(covered)));
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
