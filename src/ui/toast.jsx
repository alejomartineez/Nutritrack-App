import React, { useEffect, useState } from 'react';
import { Check, Info, AlertTriangle } from 'lucide-react';

// Avisos flotantes. `toast()` se puede llamar desde cualquier lado; <Toaster/>
// vive una sola vez en la raíz. Se muestra uno a la vez (el nuevo reemplaza al
// anterior), con acción opcional ("Deshacer").

let listener = null;
let seq = 0;

/**
 * @param text   mensaje
 * @param opts   { action: { label, onClick }, tone: 'ok'|'info'|'warn', duration }
 */
export const toast = (text, opts = {}) => {
  listener?.({ id: ++seq, text, tone: 'ok', duration: opts.action ? 5000 : 2200, ...opts });
};

const ICONS = { ok: Check, info: Info, warn: AlertTriangle };
const TONES = { ok: 'text-brand-400', info: 'text-ink-300', warn: 'text-amber-400' };
const EXIT_MS = 220;

export function Toaster() {
  const [current, setCurrent] = useState(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    listener = (t) => {
      setCurrent(t);
      setLeaving(false);
    };
    return () => {
      listener = null;
    };
  }, []);

  useEffect(() => {
    if (!current) return undefined;
    const leave = setTimeout(() => setLeaving(true), current.duration);
    const remove = setTimeout(() => setCurrent(null), current.duration + EXIT_MS);
    return () => {
      clearTimeout(leave);
      clearTimeout(remove);
    };
  }, [current]);

  const Icon = current ? ICONS[current.tone] || Check : null;

  return (
    <div className="toast-layer" aria-live="polite">
      {current && (
        <div
          key={current.id}
          className={`toast rounded-full pl-4 ${current.action ? 'pr-1.5' : 'pr-5'} py-1.5 min-h-11 flex items-center gap-2.5 text-sm text-ink-100 ${
            leaving ? 'anim-toast-out' : 'anim-toast-in'
          } ${current.action ? '' : 'pointer-events-none'}`}
        >
          <Icon className={`w-4 h-4 shrink-0 ${TONES[current.tone] || TONES.ok}`} strokeWidth={2.5} />
          <span className="leading-snug py-1">{current.text}</span>
          {current.action && (
            <button
              onClick={() => {
                current.action.onClick();
                setLeaving(true);
                setTimeout(() => setCurrent(null), EXIT_MS);
              }}
              className="ml-1 shrink-0 rounded-full bg-ink-700/80 px-3.5 py-1.5 text-sm font-semibold text-brand-400"
            >
              {current.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
