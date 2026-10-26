import React, { useRef, useState } from 'react';
import { Plus, Sparkles, Trash2 } from 'lucide-react';
import { round1 } from '../lib/nutritionCalcs';
import { haptic } from '../lib/haptics';
import { splitName } from './model';

// Piezas chicas compartidas por las pantallas de nutrición.

export const MACROS = [
  { key: 'p', goal: 'protein', label: 'Proteína', short: 'P', color: 'rgb(var(--protein))', text: 'text-protein' },
  { key: 'c', goal: 'carbs', label: 'Carbos', short: 'C', color: 'rgb(var(--carbs))', text: 'text-carbs' },
  { key: 'f', goal: 'fat', label: 'Grasa', short: 'G', color: 'rgb(var(--fat))', text: 'text-fat' },
];

export const fmt = (n) => Math.round(n).toLocaleString('es-AR');
export const fmt1 = (n) => String(round1(n)).replace('.', ',');

/** "P 12 · C 40 · G 8" con puntitos de color. */
export function MacroLine({ p, c, f, className = '' }) {
  return (
    <span className={`num inline-flex items-center gap-2 text-xs text-ink-500 ${className}`}>
      {MACROS.map((m) => (
        <span key={m.key} className="inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: m.color }} />
          {fmt1({ p, c, f }[m.key] || 0)}
        </span>
      ))}
    </span>
  );
}

export function FreeBadge({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 text-amber-300 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide ${className}`}>
      <Sparkles className="w-2.5 h-2.5" /> Gusto
    </span>
  );
}

/**
 * Fila de alimento para listas de búsqueda: tocar abre el detalle, el + agrega
 * directo con la cantidad sugerida.
 */
export function FoodRow({ name, detail, kcal, free, onOpen, onQuickAdd, right }) {
  const { title, portion } = splitName(name);
  const [popped, setPopped] = useState(false);
  return (
    <div className="flex items-center gap-2 pl-4 pr-2 min-h-[3.5rem] active:bg-ink-700/30">
      <button onClick={onOpen} className="flex-1 min-w-0 py-2.5 text-left" style={{ transform: 'none' }}>
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="text-[15px] text-ink-100 truncate">{title}</span>
          {free && <FreeBadge className="shrink-0" />}
        </span>
        <span className="block text-xs text-ink-500 truncate mt-0.5">
          {detail ?? portion}
          {kcal != null && (
            <>
              {(detail ?? portion) ? ' · ' : ''}
              <span className="num">{fmt(kcal)} kcal</span>
            </>
          )}
        </span>
      </button>
      {right}
      {onQuickAdd && (
        <button
          onClick={() => {
            haptic();
            setPopped(true);
            setTimeout(() => setPopped(false), 400);
            onQuickAdd();
          }}
          aria-label={`Agregar ${title}`}
          className={`btn-icon w-9 h-9 bg-brand-500/15 text-brand-400 ${popped ? 'anim-pop' : ''}`}
        >
          <Plus className="w-[18px] h-[18px]" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

/**
 * Fila deslizable: arrastrar a la izquierda muestra "Borrar"; soltar pasado el
 * umbral borra. Tocar sin arrastrar llama a onTap.
 */
export function SwipeRow({ onTap, onDelete, children, className = '' }) {
  const [dx, setDx] = useState(0);
  const start = useRef(null);
  const moved = useRef(false);
  const WIDTH = 84;

  const down = (e) => {
    start.current = { x: e.clientX, y: e.clientY, base: dx };
    moved.current = false;
  };
  const move = (e) => {
    if (!start.current) return;
    const ddx = e.clientX - start.current.x;
    const ddy = e.clientY - start.current.y;
    if (!moved.current && Math.abs(ddx) < 8) return;
    if (!moved.current && Math.abs(ddy) > Math.abs(ddx)) {
      start.current = null;
      return;
    }
    moved.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDx(Math.min(0, Math.max(-220, start.current.base + ddx)));
  };
  const up = () => {
    if (!start.current) return;
    start.current = null;
    if (!moved.current) return;
    if (dx < -170) {
      haptic(15);
      onDelete();
      setDx(0);
    } else setDx(dx < -WIDTH / 2 ? -WIDTH : 0);
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <button
        onClick={() => {
          setDx(0);
          onDelete();
        }}
        aria-label="Borrar"
        tabIndex={dx ? 0 : -1}
        className="absolute inset-y-0 right-0 flex items-center justify-end pr-6 bg-red-500 text-white"
        style={{ width: Math.max(WIDTH, -dx), transform: 'none', visibility: dx ? 'visible' : 'hidden' }}
      >
        <Trash2 className="w-5 h-5" />
      </button>
      <div
        className="relative bg-ink-800 touch-pan-y"
        style={{ transform: `translate3d(${dx}px,0,0)`, transition: start.current ? 'none' : 'transform 0.25s cubic-bezier(0.32,0.72,0,1)' }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onClick={() => {
          if (moved.current) return;
          if (dx) setDx(0);
          else onTap?.();
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onTap?.()}
      >
        {children}
      </div>
    </div>
  );
}
