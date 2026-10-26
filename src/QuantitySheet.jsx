import React, { useState, useMemo } from 'react';
import { X, PlusCircle } from 'lucide-react';
import { scaleFood } from './lib/nutritionCalcs';
import Sheet from './lib/Sheet';

// ---------------------------------------------------------------------------
// HOJA DE CANTIDAD
//
// Antes, tocar un alimento lo agregaba con su porción fija: si comías 200g en vez
// de los 150g listados no había forma de ajustarlo sin ir a carga manual. Esta
// hoja resuelve eso con un paso corto: elegís cantidad, ves los macros ya
// escalados y confirmás. Los chips de "Frecuentes" siguen agregando ×1 directo,
// así el camino repetitivo no pierde velocidad.
//
// Dos modos según la base del alimento:
//   - 'portion' (base local): la cantidad es un multiplicador de la porción.
//   - '100g'    (Open Food Facts): la cantidad son gramos.
// ---------------------------------------------------------------------------

const PORTION_PRESETS = [0.5, 1, 1.5, 2];
const GRAM_PRESETS = [50, 100, 150, 200];

export default function QuantitySheet({ food, mode = 'plan', onConfirm, onCancel }) {
  const isGrams = food.basis === '100g';
  const presets = isGrams ? GRAM_PRESETS : PORTION_PRESETS;
  const [qty, setQty] = useState(isGrams ? 100 : 1);
  const [custom, setCustom] = useState('');

  // Lo que realmente se va a agregar: misma función que usa el registro, así la
  // vista previa no puede desincronizarse de lo que termina guardado.
  const amount = custom.trim() !== '' ? parseFloat(custom.replace(',', '.')) : qty;
  const preview = useMemo(() => scaleFood(food, amount), [food, amount]);
  const valid = Number.isFinite(amount) && amount > 0;

  const accent =
    mode === 'plan'
      ? { chip: 'bg-brand-500 text-onaccent', btn: 'bg-brand-500 hover:bg-brand-400 text-onaccent', border: 'sheet-plan' }
      : { chip: 'bg-amber-500 text-onaccent', btn: 'bg-amber-500 hover:bg-amber-400 text-onaccent', border: 'sheet-free' };

  const pick = (value) => {
    setQty(value);
    setCustom('');
  };

  return (
    <Sheet onClose={onCancel} labelledBy="cantidad-titulo">
      <div
        className={`w-full max-w-md sheet ${accent.border} rounded-t-3xl sm:rounded-3xl p-6 max-h-[85vh] overflow-y-auto`}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}
      >
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 id="cantidad-titulo" className="text-lg font-bold text-ink-100 min-w-0">{food.name}</h2>
          <button onClick={onCancel} aria-label="Cerrar" className="p-2 -mt-1 -mr-2 rounded-full hover:bg-ink-700 shrink-0">
            <X className="w-5 h-5 text-ink-400" />
          </button>
        </div>
        <p className="text-xs text-ink-500 mb-5">
          {isGrams ? 'Valores por 100 g — elegí cuánto comiste' : 'Elegí cuántas porciones comiste'}
        </p>

        {/* Presets */}
        <div className="grid grid-cols-4 gap-2">
          {presets.map((value) => {
            const active = custom.trim() === '' && qty === value;
            return (
              <button
                key={value}
                onClick={() => pick(value)}
                aria-pressed={active}
                className={`py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  active ? accent.chip : 'bg-ink-900 border border-ink-700 text-ink-300 hover:border-ink-600'
                }`}
              >
                {isGrams ? `${value}g` : `×${value}`}
              </button>
            );
          })}
        </div>

        {/* Cantidad libre */}
        <label className="block mt-3">
          <span className="text-xs font-semibold text-ink-400 mb-1 block">
            {isGrams ? 'Otra cantidad (g)' : 'Otra cantidad (porciones)'}
          </span>
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            inputMode="decimal"
            placeholder={isGrams ? 'Ej: 75' : 'Ej: 1.25'}
            className={`w-full bg-ink-900 border border-ink-700 rounded-xl px-3 py-2.5 text-sm text-ink-100 placeholder-ink-500`}
          />
        </label>

        {/* Vista previa de lo que se va a registrar */}
        <div className="mt-5 rounded-2xl bg-ink-900/60 border border-ink-700 px-4 py-3">
          <p className="font-mono text-lg font-bold text-ink-100">
            {valid ? preview.kcal : '—'} <span className="text-sm font-semibold text-ink-500">kcal</span>
          </p>
          <p className="text-xs text-ink-400 font-mono mt-0.5">
            {valid ? `P ${preview.p}g · C ${preview.c}g · G ${preview.f}g` : 'Ingresá una cantidad válida'}
          </p>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-ink-600 text-ink-300 font-semibold py-3 hover:bg-ink-700/50"
          >
            Cancelar
          </button>
          <button
            onClick={() => valid && onConfirm(amount)}
            disabled={!valid}
            className={`flex-1 rounded-xl font-bold py-3 flex items-center justify-center gap-2 transition-colors ${
              valid ? accent.btn : 'bg-ink-700 text-ink-500 cursor-not-allowed'
            }`}
          >
            <PlusCircle className="w-5 h-5" />
            Agregar
          </button>
        </div>
      </div>
    </Sheet>
  );
}
