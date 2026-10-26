import React, { useMemo, useState } from 'react';
import { Sheet, Button, NumberField, Segmented } from '../ui';
import { PLATES_KG, BAR_OPTIONS_KG } from './workoutData';
import { platesFor, num } from './workoutStats';
import { fmtNum } from './format';

// Alto relativo de cada disco en el dibujo (los grandes más altos).
const plateHeight = (p) => 28 + Math.min(1, p / 25) * 52;

export default function PlateCalculator({ initial, barKg, onBarChange, onUse, onClose }) {
  const [target, setTarget] = useState(initial ? String(initial) : '');
  const result = useMemo(() => platesFor(num(target), barKg, PLATES_KG), [target, barKg]);
  const valid = num(target) > 0;

  return (
    <Sheet
      onClose={onClose}
      title="Calculadora de discos"
      footer={
        <Button block size="lg" tone="entreno" disabled={!valid} onClick={() => onUse(result.achieved)}>
          Usar {fmtNum(result.achieved)} kg
        </Button>
      }
    >
      <NumberField label="Peso total" value={target} onChange={setTarget} unit="kg" placeholder="0" inputClassName="text-2xl font-semibold" />

      <p className="text-xs font-medium text-ink-500 mt-4 mb-1.5 px-1">Barra</p>
      <Segmented
        value={barKg}
        onChange={onBarChange}
        options={BAR_OPTIONS_KG.map((b) => ({ value: b, label: b ? `${b} kg` : 'Sin barra' }))}
      />

      <div className="mt-5 rounded-2xl inset px-4 py-5">
        <p className="text-xs text-ink-500 text-center mb-3">Por lado</p>
        {valid && result.perSide.length > 0 ? (
          <div className="flex items-center justify-center gap-1 min-h-[80px]" aria-label={`Por lado: ${result.perSide.map((p) => fmtNum(p)).join(', ')} kg`}>
            <span className="h-3 w-8 rounded-l-full bg-ink-600" aria-hidden="true" />
            {result.perSide.map((p, i) => (
              <span
                key={i}
                className="w-9 rounded-md bg-entreno-500/20 text-entreno-300 flex items-center justify-center text-[11px] font-bold num"
                style={{ height: plateHeight(p), boxShadow: 'inset 0 0 0 1.5px rgb(var(--entreno-500) / 0.5)' }}
              >
                {fmtNum(p)}
              </span>
            ))}
            <span className="h-3 w-4 rounded-r bg-ink-600" aria-hidden="true" />
          </div>
        ) : (
          <p className="text-center text-sm text-ink-500 min-h-[80px] flex items-center justify-center">
            {valid ? 'Solo la barra' : 'Escribí el peso total'}
          </p>
        )}
        {result.remainder > 0 && valid && (
          <p className="text-xs text-amber-400 text-center mt-3">
            No se llega exacto: faltan {fmtNum(result.remainder)} kg. Lo más cercano es {fmtNum(result.achieved)} kg.
          </p>
        )}
      </div>
    </Sheet>
  );
}
