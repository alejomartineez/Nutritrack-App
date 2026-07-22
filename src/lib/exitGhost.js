import { useLayoutEffect } from 'react';
import { prefersReducedMotion } from './motion';

// ---------------------------------------------------------------------------
// ANIMACIÓN DE SALIDA PARA CAPAS QUE SE DESMONTAN
//
// El problema: en React una capa que se cierra desaparece en el mismo frame en
// que cambia el estado. No hay dónde colgar una animación de salida, y por eso
// las hojas, los modales y las pantallas de introducción se iban de golpe
// aunque entraran animadas. Esa asimetría —entra deslizándose, se corta seco—
// es lo que más delataba a la app.
//
// La solución "de manual" es que cada capa avise antes de cerrarse. No sirve
// acá: una hoja se cierra por seis caminos distintos —Escape, el velo, la X,
// "Cancelar", "Guardar", o el padre que cambia de estado por su cuenta— y casi
// todos son botones que llaman directo al `setState` del padre, sin pasar por
// el componente de la hoja. Habría que convertir diez hojas a render-prop y
// reemplazar cada handler, y la que se olvide queda desincronizada con el resto.
//
// Lo que se hace en cambio: cuando React ya sacó la capa del DOM, se inserta un
// CLON INERTE en el `body` y se lo anima saliendo. El clon no tiene handlers ni
// estado —es una foto— y se borra solo. Como la señal es el desmontaje,
// funciona igual para los seis caminos y no hay nada que recordar al agregar una
// capa nueva.
//
// Los tres detalles que lo hacen creíble:
//
// 1. EL GUARDA DE STRICTMODE. En desarrollo React monta, desmonta y vuelve a
//    montar cada efecto, pero en ese desmontaje simulado NO saca el nodo del
//    documento. Por eso la decisión se difiere un microtask y se consulta
//    `isConnected`: en un cierre de verdad el nodo ya está desconectado; en el
//    simulacro sigue conectado y no se hace nada. Sin esto, abrir cualquier hoja
//    en desarrollo dejaría un fantasma pegado en pantalla.
//
// 2. CORRE EN UN `useLayoutEffect`, NO EN UN `useEffect`. `cloneNode` no copia
//    `scrollTop`, así que hay que leerlo a mano, y un nodo fuera del documento
//    no tiene caja: devuelve 0. La limpieza de un `useEffect` normal corre
//    DESPUÉS de que React sacó el nodo (los efectos pasivos de un árbol borrado
//    se desmontan en la fase pasiva), así que desde ahí siempre se leía 0 y una
//    hoja larga cerrada estando abajo de todo —Ajustes— saltaba al principio
//    justo mientras se iba. Medido y verificado: con `useLayoutEffect` el clon
//    conserva el scroll exacto.
//
// 3. SE LE SACAN LAS CLASES DE ANIMACIÓN A LOS HIJOS. Al insertarse, cualquier
//    `.anim-*` de adentro volvería a dispararse: la capa se iría mientras su
//    contenido "entra" otra vez.
//
// Con `prefers-reduced-motion` no se clona nada y la capa desaparece de una,
// que es exactamente lo que se pidió.
// ---------------------------------------------------------------------------

/** Margen sobre la animación más larga, para borrar el clon recién cuando terminó. */
const CLEANUP_MS = 400;

function playExitGhost(node, ghostClass) {
  if (!node || prefersReducedMotion()) return;

  // La foto se saca ahora, sincrónicamente: en el microtask el nodo ya puede
  // estar desconectado y para entonces perdió las medidas de scroll.
  const clone = node.cloneNode(true);
  const source = node.querySelectorAll('*');
  const scrolled = [];
  for (let i = 0; i < source.length; i++) {
    if (source[i].scrollTop) scrolled.push([i, source[i].scrollTop]);
  }

  queueMicrotask(() => {
    if (node.isConnected) return; // StrictMode: fue un simulacro, no un cierre

    clone.classList.add(ghostClass);
    clone.setAttribute('aria-hidden', 'true');
    clone.style.pointerEvents = 'none';
    // El clon no puede seguir anunciándose como diálogo ni recibir foco: para
    // un lector de pantalla la capa ya se cerró.
    for (const attr of ['role', 'aria-modal', 'aria-label', 'aria-labelledby', 'tabindex']) {
      clone.removeAttribute(attr);
    }

    const inner = clone.querySelectorAll('*');
    // Incluye al propio clon, no solo a los hijos: las pantallas completas
    // llevan `anim-screen-in` en la raíz y, sin sacársela, el fantasma volvía a
    // ENTRAR en vez de salir (medido: animationName daba `screen-in`).
    for (const el of [clone, ...inner]) {
      // Se listan primero y se sacan después: `classList` es una colección viva
      // y borrar mientras se la recorre se saltea elementos.
      const anims = [...el.classList].filter((c) => c.startsWith('anim-'));
      if (anims.length) el.classList.remove(...anims);
    }

    document.body.appendChild(clone);
    // Recién ahora el clon tiene caja y acepta que se le fije el scroll.
    for (const [i, top] of scrolled) {
      if (inner[i]) inner[i].scrollTop = top;
    }

    setTimeout(() => clone.remove(), CLEANUP_MS);
  });
}

/**
 * Anima la salida de una capa cuando se desmonta.
 *
 * @param ref        Ref al nodo raíz de la capa (el que lleva `fixed inset-0`).
 * @param ghostClass Clase que dispara la animación de salida en el clon.
 *                   Hoy: `sheet-ghost` (velo + panel) y `screen-ghost`
 *                   (pantalla completa). Están definidas en index.css.
 */
export function useExitGhost(ref, ghostClass) {
  useLayoutEffect(() => {
    const node = ref.current;
    return () => playExitGhost(node, ghostClass);
    // El nodo se captura al montar y no cambia mientras la capa vive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
