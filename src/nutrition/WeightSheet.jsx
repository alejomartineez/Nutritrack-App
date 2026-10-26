import React, { useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Sheet, Button, Chip, toast } from '../ui';
import { haptic } from '../lib/haptics';
import { dateKeyOf, addDaysToKey, formatShortDate, keyToDate, formatDisplayDate } from '../lib/dates';
import { useWeights, setWeight, removeWeight } from './store';
import { SwipeRow, fmt1 } from './parts';

/** Registrar el peso (hoy o un día anterior) y ver/corregir el historial. */
export default function WeightSheet({ initialDate, onClose }) {
  const weights = useWeights();
  const today = dateKeyOf();
  const [day, setDay] = useState(initialDate && initialDate <= today ? initialDate : today);
  const lastKnown = useMemo(() => {
    const keys = Object.keys(weights).filter((k) => k <= day).sort();
    return keys.length ? weights[keys[keys.length - 1]] : 70;
  }, [weights, day]);
  const [value, setValue] = useState(String(weights[day] ?? lastKnown));
  const kg = parseFloat(String(value).replace(',', '.'));
  const valid = Number.isFinite(kg) && kg > 20 && kg < 400;

  const pickDay = (k) => {
    setDay(k);
    setValue(String(weights[k] ?? lastKnown));
  };
  const step = (d) => {
    haptic(5);
    setValue(String(Math.round(((valid ? kg : lastKnown) + d) * 10) / 10));
  };

  const history = Object.entries(weights).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <Sheet
      title="Peso"
      subtitle="Pesate a la mañana, en ayunas, para comparar parejo"
      onClose={onClose}
      footer={
        <Button
          size="lg"
          block
          disabled={!valid}
          onClick={() => {
            setWeight(day, kg);
            toast(`${fmt1(kg)} kg · ${formatDisplayDate(keyToDate(day)).toLowerCase()}`);
            onClose();
          }}
        >
          Guardar
        </Button>
      }
    >
      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        {[0, -1, -2].map((d) => {
          const k = addDaysToKey(today, d);
          return (
            <Chip key={k} active={day === k} onClick={() => pickDay(k)}>
              {formatDisplayDate(keyToDate(k))}
            </Chip>
          );
        })}
        <label className={`relative shrink-0 h-9 px-3.5 rounded-full text-sm font-semibold flex items-center ${day < addDaysToKey(today, -2) ? 'bg-brand-500 text-onaccent' : 'bg-ink-700/60 text-ink-300'}`}>
          Otro día
          <input type="date" max={today} value={day} onChange={(e) => e.target.value && pickDay(e.target.value)} className="absolute inset-0 opacity-0" />
        </label>
      </div>

      <div className="rounded-3xl bg-ink-900 py-5 flex items-center justify-center gap-5">
        <button onClick={() => step(-0.1)} aria-label="Restar 100 g" className="btn-icon w-12 h-12 bg-ink-700/70 text-ink-200">
          <Minus className="w-5 h-5" strokeWidth={2.5} />
        </button>
        <label className="flex items-baseline gap-1">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^0-9.,]/g, ''))}
            onFocus={(e) => e.target.select()}
            inputMode="decimal"
            aria-label="Peso en kilos"
            className="num-display text-5xl text-ink-50 bg-transparent outline-none w-[4.6ch] text-center"
          />
          <span className="text-lg font-semibold text-ink-500">kg</span>
        </label>
        <button onClick={() => step(0.1)} aria-label="Sumar 100 g" className="btn-icon w-12 h-12 bg-brand-500/15 text-brand-400">
          <Plus className="w-5 h-5" strokeWidth={2.5} />
        </button>
      </div>

      {history.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-medium text-ink-500 mb-1.5 px-1">Historial · deslizá para borrar</p>
          <div className="surface rounded-2xl overflow-hidden divide-y divide-[var(--hairline)]">
            {history.slice(0, 60).map(([k, w], i) => {
              const prev = history[i + 1]?.[1];
              const d = prev != null ? w - prev : null;
              return (
                <SwipeRow
                  key={k}
                  onTap={() => pickDay(k)}
                  onDelete={() => {
                    removeWeight(k);
                    toast(`Borraste el peso del ${formatShortDate(k)}`, { action: { label: 'Deshacer', onClick: () => setWeight(k, w) } });
                  }}
                >
                  <div className="flex items-center px-4 h-12 gap-3">
                    <span className="flex-1 text-[15px] text-ink-200">{formatShortDate(k)}</span>
                    {d != null && Math.abs(d) >= 0.05 && (
                      <span className="num text-xs text-ink-500">
                        {d > 0 ? '+' : ''}
                        {fmt1(d)}
                      </span>
                    )}
                    <span className="num text-[15px] font-semibold text-ink-100 w-16 text-right">{fmt1(w)} kg</span>
                  </div>
                </SwipeRow>
              );
            })}
          </div>
        </div>
      )}
    </Sheet>
  );
}
