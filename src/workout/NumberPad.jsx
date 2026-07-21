import React from 'react';
import { X, Delete, Check } from 'lucide-react';
import Sheet from '../lib/Sheet';

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
    // Ya cerraba tocando el velo, así que mantiene ese comportamiento. El
    // `stopPropagation` del panel dejó de hacer falta: Sheet compara el target
    // contra el velo en vez de escuchar el click que burbujea.
    <Sheet onClose={onClose} closeOnBackdrop z="z-[60]" align="bottom" label={label}>
      <div className="w-full max-w-md sheet sheet-entreno rounded-t-3xl p-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="label-section text-entreno-400">{label}</p>
          <button onClick={onClose} aria-label="Cerrar teclado" className="btn-icon hover:bg-neutral-800">
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
                className="shrink-0 px-3 py-1.5 rounded-full bg-entreno-500/15 border border-entreno-500/30 text-entreno-300 text-sm font-semibold"
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
                className="py-4 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center hover:bg-neutral-700"
              >
                <Delete className="w-5 h-5 text-slate-300" />
              </button>
            ) : (
              <button
                key={k}
                onClick={() => push(k)}
                disabled={k === '.' && !allowDecimal}
                className="py-4 rounded-2xl bg-neutral-800 border border-neutral-700 text-xl font-bold text-slate-100 hover:bg-neutral-700 disabled:opacity-30"
              >
                {k}
              </button>
            )
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-3 py-3.5 rounded-2xl bg-entreno-500 text-neutral-900 font-bold flex items-center justify-center gap-2 hover:bg-entreno-400"
        >
          <Check className="w-5 h-5" /> Listo
        </button>
      </div>
    </Sheet>
  );
}
