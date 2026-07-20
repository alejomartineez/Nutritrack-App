import React from 'react';
import { X, Delete, Check } from 'lucide-react';

/**
 * Teclado numérico propio en hoja inferior (bottom sheet), pensado para usar
 * a una sola mano durante el entrenamiento. Reemplaza al teclado nativo del
 * sistema para que nunca tape el resto de la pantalla (rutina, cronómetro, etc).
 */
export default function NumberPad({ label, value, onChange, onClose, quickSteps = [], allowDecimal = true }) {
  const push = (digit) => {
    if (digit === '.' && (!allowDecimal || value.includes('.'))) return;
    if (value === '0' && digit !== '.') onChange(digit);
    else onChange(value + digit);
  };

  const backspace = () => onChange(value.slice(0, -1));

  const step = (amount) => {
    const current = parseFloat(value || '0') || 0;
    const next = Math.max(0, current + amount);
    onChange(String(Number.isInteger(next) ? next : Math.round(next * 100) / 100));
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'];

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md bg-neutral-900 border-t border-entreno-500/30 rounded-t-3xl p-4 pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-wide text-entreno-400">{label}</p>
          <button onClick={onClose} aria-label="Cerrar teclado" className="p-1.5 rounded-full hover:bg-neutral-800">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="text-center py-3 mb-3 rounded-2xl bg-neutral-800 border border-neutral-700">
          <span className="font-mono text-4xl font-black text-entreno-300">{value || '0'}</span>
        </div>

        {quickSteps.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto">
            {quickSteps.map((s) => (
              <button
                key={s}
                onClick={() => step(s)}
                className="shrink-0 px-3 py-1.5 rounded-full bg-entreno-500/15 border border-entreno-500/30 text-entreno-300 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-entreno-400"
              >
                {s > 0 ? `+${s}` : s}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          {keys.map((k) =>
            k === 'back' ? (
              <button
                key={k}
                onClick={backspace}
                aria-label="Borrar"
                className="py-4 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center hover:bg-neutral-700 focus-visible:ring-2 focus-visible:ring-entreno-400"
              >
                <Delete className="w-5 h-5 text-slate-300" />
              </button>
            ) : (
              <button
                key={k}
                onClick={() => push(k)}
                disabled={k === '.' && !allowDecimal}
                className="py-4 rounded-2xl bg-neutral-800 border border-neutral-700 text-xl font-bold text-slate-100 hover:bg-neutral-700 focus-visible:ring-2 focus-visible:ring-entreno-400 disabled:opacity-30"
              >
                {k}
              </button>
            )
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-3 py-3.5 rounded-2xl bg-entreno-500 text-neutral-900 font-bold flex items-center justify-center gap-2 hover:bg-entreno-400 focus-visible:ring-2 focus-visible:ring-entreno-300"
        >
          <Check className="w-5 h-5" /> Listo
        </button>
      </div>
    </div>
  );
}
