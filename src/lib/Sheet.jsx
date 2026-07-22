import React, { useEffect, useRef } from 'react';
import { useExitGhost } from './exitGhost';

// ---------------------------------------------------------------------------
// HOJA MODAL — comportamiento compartido
//
// La app tenía 10 hojas con el mismo velo copiado y pegado, y ninguna hacía lo
// que un modal tiene que hacer: no cerraban con Escape, no manejaban el foco, no
// se anunciaban como diálogo y dejaban el fondo scrolleando por detrás.
//
// Este componente pone SOLO el comportamiento. El panel de adentro sigue siendo
// el markup de cada hoja, con sus clases intactas: acá no se decide nada de cómo
// se ve, así que adoptarlo no cambia una sola pantalla.
// ---------------------------------------------------------------------------

/**
 * Pila de hojas abiertas. Con hojas anidadas —el selector de ejercicios sobre el
 * editor de la semana, el teclado numérico sobre la sesión— Escape tiene que
 * cerrar SOLO la de más arriba. Sin la pila, un Escape las cerraba todas de
 * golpe porque cada una escucha en `document`.
 */
const stack = [];

/** Lo que el navegador considera enfocable dentro de la hoja, en orden de tabulación. */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * @param onClose        Cerrar la hoja. Lo llaman Escape y el velo.
 * @param closeOnBackdrop Si tocar el velo cierra. Va apagado por defecto: en una
 *                        hoja con datos a medio cargar, un toque al borde que
 *                        descarta todo es peor que un toque de más.
 * @param label          Texto del diálogo para lectores de pantalla, cuando no
 *                        hay un título visible al que apuntar.
 * @param labelledBy     id del título visible. Preferilo a `label`: no duplica
 *                        el texto y sigue al que ya se lee en pantalla.
 * @param z              Clase de z-index. Las hojas anidadas suben.
 * @param align          'sheet' sube desde abajo y se centra en pantalla ancha;
 *                        'bottom' se queda siempre abajo (el teclado numérico).
 */
export default function Sheet({
  onClose,
  closeOnBackdrop = false,
  label,
  labelledBy,
  z = 'z-50',
  align = 'sheet',
  children,
}) {
  const overlayRef = useRef(null);
  // A dónde volver el foco al cerrar. Sin esto, cerrar una hoja mandaba el foco
  // al principio del documento y con teclado había que recorrer toda la pantalla
  // para volver al botón que la abrió.
  const returnFocusRef = useRef(null);
  // La entrada de ESTA hoja en la pila. Se guarda para poder refrescarle el
  // `onClose` en cada render sin rearmar el efecto.
  const entryRef = useRef(null);

  useEffect(() => {
    const overlay = overlayRef.current;
    const entry = { onClose };
    entryRef.current = entry;
    stack.push(entry);

    returnFocusRef.current = document.activeElement;

    // Se enfoca el CONTENEDOR, no el primer campo. Enfocar un input abriría el
    // teclado del teléfono apenas se abre la hoja, tapando media pantalla antes
    // de que el usuario haya decidido si quiere escribir algo.
    overlay?.focus({ preventScroll: true });

    const onKeyDown = (e) => {
      if (stack[stack.length - 1] !== entry) return; // no es la hoja de arriba

      if (e.key === 'Escape') {
        e.stopPropagation();
        entry.onClose?.(); // siempre el `onClose` del último render, no el del montaje
        return;
      }

      if (e.key !== 'Tab' || !overlay) return;

      // Trampa de foco: sin esto, tabular desde la hoja se iba a la página de
      // atrás —que está tapada por el velo—, así que el foco desaparecía.
      const items = [...overlay.querySelectorAll(FOCUSABLE)].filter(
        (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement
      );
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === overlay)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    // El fondo no se scrollea por detrás.
    //
    // NO se toca `document.body`: bloquear el scroll con `overflow: hidden` o
    // `position: fixed` cambia el alto del documento, y eso dispara el mismo
    // clampeo de scroll de iOS que ya rompió el buscador una vez (está contado
    // en el comentario del `main` en App.jsx). Bloquear el gesto en el velo
    // logra lo mismo sin tocar el layout: el documento queda exactamente igual
    // de alto que antes de abrir la hoja.
    //
    // Se filtra por `target === overlay`: adentro del panel el scroll tiene que
    // seguir andando, porque las hojas largas —Ajustes— scrollean solas.
    const blockBackdropScroll = (e) => {
      if (e.target === overlay) e.preventDefault();
    };

    document.addEventListener('keydown', onKeyDown);
    overlay?.addEventListener('touchmove', blockBackdropScroll, { passive: false });
    overlay?.addEventListener('wheel', blockBackdropScroll, { passive: false });

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      overlay?.removeEventListener('touchmove', blockBackdropScroll);
      overlay?.removeEventListener('wheel', blockBackdropScroll);

      const i = stack.indexOf(entry);
      if (i !== -1) stack.splice(i, 1);

      // Solo si el foco sigue adentro de la hoja que se está yendo: si el
      // usuario ya movió el foco a otro lado, devolverlo sería robárselo.
      const target = returnFocusRef.current;
      if (target && typeof target.focus === 'function' && overlay?.contains(document.activeElement)) {
        target.focus({ preventScroll: true });
      }
    };
    // `onClose` queda fuera de las dependencias a propósito: casi todas las
    // hojas la pasan como flecha inline, así que entraría una identidad nueva en
    // cada render y el efecto se desmontaría y remontaría constantemente —lo que
    // volvería a robar el foco y a reventar la pila—. `entry.onClose` no se lee
    // hasta que hay un Escape, y para entonces la clausura ya es la correcta
    // porque el efecto se rearma solo cuando la hoja se abre o se cierra.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mantiene la clausura de Escape apuntando al último `onClose` sin rearmar el
  // efecto (ver la nota de arriba).
  useEffect(() => {
    if (entryRef.current) entryRef.current.onClose = onClose;
  });

  // Salida animada del velo y del panel. El mecanismo —y por qué es un clon y
  // no un estado de "cerrando"— está explicado en src/lib/exitGhost.js.
  useExitGhost(overlayRef, 'sheet-ghost');

  const alignClass =
    align === 'bottom' ? 'items-end' : 'items-end sm:items-center px-0 sm:px-4';

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 ${z} flex ${alignClass} justify-center scrim`}
      role="dialog"
      aria-modal="true"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      tabIndex={-1}
      onClick={closeOnBackdrop ? (e) => { if (e.target === e.currentTarget) onClose?.(); } : undefined}
    >
      {children}
    </div>
  );
}
