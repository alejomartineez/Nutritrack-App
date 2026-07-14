import React, { useEffect, useRef, useState } from 'react';
import { Timer, Plus, Minus, X } from 'lucide-react';
import { REST_PRESETS_SEC } from './workoutData';

const beep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
    osc.onended = () => ctx.close();
  } catch (e) {
    // audio no disponible en este entorno, se omite el sonido
  }
};

/** Barra flotante de descanso: se dispara al completar una serie y avisa en naranja al llegar a cero. */
export default function RestTimer({ durationSec, onDismiss }) {
  const [remaining, setRemaining] = useState(durationSec);
  const firedRef = useRef(false);

  useEffect(() => {
    if (remaining <= 0) {
      if (!firedRef.current) {
        firedRef.current = true;
        beep();
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      }
      return;
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

  const isDone = remaining <= 0;
  const mm = String(Math.floor(Math.max(0, remaining) / 60)).padStart(1, '0');
  const ss = String(Math.max(0, remaining) % 60).padStart(2, '0');

  return (
    <div
      className={`fixed bottom-24 inset-x-0 flex flex-col items-center px-4 z-40 pointer-events-none`}
    >
      <div
        className={`w-full max-w-md rounded-2xl border px-4 py-3 flex items-center justify-between gap-3 pointer-events-auto shadow-lg transition-colors ${
          isDone ? 'bg-orange-500 border-orange-400 animate-pulse' : 'bg-neutral-900/95 border-orange-500/40'
        }`}
      >
        <div className="flex items-center gap-2">
          <Timer className={`w-5 h-5 ${isDone ? 'text-neutral-900' : 'text-orange-400'}`} />
          <span className={`font-mono text-xl font-black ${isDone ? 'text-neutral-900' : 'text-orange-300'}`}>
            {mm}:{ss}
          </span>
          <span className={`text-xs font-semibold ${isDone ? 'text-neutral-900' : 'text-slate-400'}`}>
            {isDone ? '¡A seguir!' : 'descanso'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setRemaining((r) => Math.max(0, r - 15))}
            aria-label="Restar 15 segundos"
            className={`p-2 rounded-full ${isDone ? 'hover:bg-orange-400' : 'hover:bg-neutral-800'}`}
          >
            <Minus className={`w-4 h-4 ${isDone ? 'text-neutral-900' : 'text-slate-300'}`} />
          </button>
          <button
            onClick={() => setRemaining((r) => Math.max(0, r) + 15)}
            aria-label="Sumar 15 segundos"
            className={`p-2 rounded-full ${isDone ? 'hover:bg-orange-400' : 'hover:bg-neutral-800'}`}
          >
            <Plus className={`w-4 h-4 ${isDone ? 'text-neutral-900' : 'text-slate-300'}`} />
          </button>
          <button
            onClick={onDismiss}
            aria-label="Cerrar temporizador"
            className={`p-2 rounded-full ${isDone ? 'hover:bg-orange-400' : 'hover:bg-neutral-800'}`}
          >
            <X className={`w-4 h-4 ${isDone ? 'text-neutral-900' : 'text-slate-300'}`} />
          </button>
        </div>
      </div>
      {!isDone && (
        <div className="w-full max-w-md flex gap-1.5 justify-center mt-1.5 pointer-events-auto">
          {REST_PRESETS_SEC.map((preset) => (
            <button
              key={preset}
              onClick={() => setRemaining(preset)}
              className="px-2.5 py-1 rounded-full bg-neutral-900/90 border border-orange-500/30 text-orange-300 text-[11px] font-semibold"
            >
              {preset}s
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
