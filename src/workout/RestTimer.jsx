import React from 'react';
import { Timer, X } from 'lucide-react';
import { formatClock } from './format';

/** Barra de descanso acoplada abajo de la sesión. */
export default function RestTimer({ timer, remaining, onAdd, onStop }) {
  if (!timer) return null;
  const done = remaining <= 0;
  const pct = timer.durationSec > 0 ? Math.min(1, Math.max(0, remaining / timer.durationSec)) : 0;

  return (
    <div className="px-3 pb-2 anim-item-in">
      <div
        className={`relative overflow-hidden rounded-2xl h-14 pl-4 pr-1.5 flex items-center gap-2 ${
          done ? 'bg-entreno-500 text-onaccent' : 'glass text-ink-100'
        }`}
        role="timer"
        aria-live="off"
      >
        {!done && (
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 bg-entreno-500/15 transition-[width] duration-300 ease-linear"
            style={{ width: `${pct * 100}%` }}
          />
        )}
        <Timer className={`relative w-5 h-5 shrink-0 ${done ? '' : 'text-entreno-400'}`} />
        <span className="relative num-display text-2xl min-w-[4.2rem]">{done ? '0:00' : formatClock(remaining)}</span>
        <span className={`relative flex-1 min-w-0 truncate text-sm font-semibold ${done ? '' : 'text-ink-500'}`}>
          {done ? '¡A la próxima serie!' : 'Descanso'}
        </span>
        <button
          onClick={() => onAdd(-15)}
          disabled={done}
          aria-label="Restar 15 segundos"
          className="relative h-10 px-2.5 rounded-xl text-sm font-semibold num disabled:opacity-0"
        >
          −15
        </button>
        <button onClick={() => onAdd(15)} aria-label="Sumar 15 segundos" className={`relative h-10 px-2.5 rounded-xl text-sm font-semibold num ${done ? 'bg-onaccent/10' : 'bg-ink-700/60'}`}>
          +15
        </button>
        <button onClick={onStop} aria-label="Saltar descanso" className="relative btn-icon w-10 h-10">
          <X className="w-[18px] h-[18px]" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
