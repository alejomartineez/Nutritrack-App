import React, { useEffect, useRef, useState, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useExitGhost } from '../lib/exitGhost';
import { useKeyboardInset } from '../lib/viewport';

// Hojas modales. `Overlay` es el comportamiento (velo, Escape, pila, foco,
// teclado, salida animada); `Sheet` suma el panel estándar con manija,
// título, cuerpo scrolleable y pie fijo. Se montan en un portal al <body> para
// que ningún `transform` de una pestaña las ancle mal.

const stack = [];
const SheetCtx = createContext({ close: () => {} });

/** Para cerrar la hoja que te contiene desde adentro. */
export const useSheet = () => useContext(SheetCtx);

export function Overlay({ onClose, closeOnBackdrop = true, label, labelledBy, z = 'z-50', align = 'sheet', children }) {
  const ref = useRef(null);
  const entry = useRef({ onClose });
  entry.current.onClose = onClose;
  const kb = useKeyboardInset();

  useEffect(() => {
    const node = ref.current;
    const me = entry.current;
    stack.push(me);
    const returnTo = document.activeElement;
    node?.focus({ preventScroll: true });

    const onKey = (e) => {
      if (e.key === 'Escape' && stack[stack.length - 1] === me) {
        e.stopPropagation();
        me.onClose?.();
      }
    };
    // El fondo no scrollea por detrás; el panel sí.
    const block = (e) => {
      if (e.target === node) e.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    node?.addEventListener('touchmove', block, { passive: false });
    return () => {
      document.removeEventListener('keydown', onKey);
      node?.removeEventListener('touchmove', block);
      const i = stack.indexOf(me);
      if (i !== -1) stack.splice(i, 1);
      if (returnTo?.focus && node?.contains(document.activeElement)) returnTo.focus({ preventScroll: true });
    };
  }, []);

  useExitGhost(ref, align === 'full' ? 'screen-ghost' : 'sheet-ghost');

  const alignClass = align === 'full' ? 'items-stretch' : align === 'center' ? 'items-center px-4' : 'items-end';

  return createPortal(
    <div
      ref={ref}
      className={`fixed inset-0 ${z} flex ${alignClass} justify-center ${align === 'full' ? 'anim-screen-in' : 'scrim'}`}
      style={{ paddingBottom: kb }}
      role="dialog"
      aria-modal="true"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      tabIndex={-1}
      onClick={closeOnBackdrop ? (e) => e.target === e.currentTarget && onClose?.() : undefined}
    >
      <SheetCtx.Provider value={{ close: () => entry.current.onClose?.() }}>{children}</SheetCtx.Provider>
    </div>,
    document.body
  );
}

/**
 * Hoja estándar.
 * @param size 'auto' (alto según contenido) | 'large' (casi toda la pantalla)
 * @param footer contenido fijo abajo (botón principal)
 * @param headerRight acción extra a la derecha del título
 */
export default function Sheet({
  onClose,
  title,
  subtitle,
  size = 'auto',
  footer,
  headerRight,
  closeOnBackdrop = true,
  hideClose = false,
  bodyClassName = 'px-5 pb-5',
  children,
}) {
  const titleId = useRef(`sheet_${Math.random().toString(36).slice(2, 8)}`).current;
  const panelRef = useRef(null);
  const drag = useRef(null);
  const [dy, setDy] = useState(0);

  // Deslizar hacia abajo desde la manija o el título cierra la hoja.
  const onPointerDown = (e) => {
    if (e.target.closest('button, input, textarea, select, a')) return;
    drag.current = { y: e.clientY, t: performance.now() };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    setDy(Math.max(0, e.clientY - drag.current.y));
  };
  const onPointerUp = (e) => {
    if (!drag.current) return;
    const dist = Math.max(0, e.clientY - drag.current.y);
    const speed = dist / Math.max(1, performance.now() - drag.current.t);
    drag.current = null;
    if (dist > 110 || speed > 0.6) {
      panelRef.current?.style.setProperty('--drag', `${dist}px`);
      onClose?.();
    } else {
      setDy(0);
    }
  };

  const heightClass = size === 'large' ? 'h-[calc(100dvh-env(safe-area-inset-top,0px)-12px)]' : 'max-h-[calc(100dvh-env(safe-area-inset-top,0px)-12px)]';

  return (
    <Overlay onClose={onClose} closeOnBackdrop={closeOnBackdrop} labelledBy={title ? titleId : undefined} label={title ? undefined : 'Hoja'}>
      <div
        ref={panelRef}
        className={`sheet w-full max-w-md rounded-t-[28px] flex flex-col ${heightClass}`}
        style={dy ? { transform: `translate3d(0, ${dy}px, 0)`, transition: 'none' } : { transition: 'transform 0.25s cubic-bezier(0.32,0.72,0,1)' }}
      >
        <div
          className="shrink-0 touch-none select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="sheet-handle" />
          {(title || !hideClose) && (
            <div className="flex items-start gap-3 px-5 pt-3 pb-3">
              <div className="min-w-0 flex-1">
                {title && (
                  <h2 id={titleId} className="text-xl font-bold text-ink-100 leading-tight">
                    {title}
                  </h2>
                )}
                {subtitle && <p className="text-sm text-ink-500 mt-0.5">{subtitle}</p>}
              </div>
              {headerRight}
              {!hideClose && (
                <button
                  onClick={onClose}
                  aria-label="Cerrar"
                  className="btn-icon w-8 h-8 bg-ink-700/70 hover:bg-ink-700 text-ink-400 -mr-1"
                >
                  <X className="w-4 h-4" strokeWidth={2.5} />
                </button>
              )}
            </div>
          )}
        </div>
        <div className={`flex-1 min-h-0 overflow-y-auto overscroll-contain ${bodyClassName}`}>{children}</div>
        {footer && (
          <div className="shrink-0 px-5 pt-3 border-t hairline" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}>
            {footer}
          </div>
        )}
        {!footer && <div className="shrink-0" style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />}
      </div>
    </Overlay>
  );
}
