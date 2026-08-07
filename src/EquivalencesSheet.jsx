import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, PlusCircle, Minus, Plus, Scale, Check } from 'lucide-react';
import Sheet from './lib/Sheet';
import { MACROS, EQUIV_CATEGORIES, computeEquivalents } from './equivalences';

// ---------------------------------------------------------------------------
// EQUIVALENCIAS — el "machete" para elegir comida
//
// Elegís un macro y cuánto querés ("30 g de proteína") y ves cuánto de cada
// alimento te da lo mismo, ordenado de lo más magro a lo más pesado. Cada fila
// se puede registrar directo con esa porción: no es solo una tabla de consulta,
// resuelve el "¿y ahora qué como?".
// ---------------------------------------------------------------------------

const DEFAULT_TARGET = { p: 30, c: 45, f: 15, kcal: 200 };

export default function EquivalencesSheet({ onClose, onLog, accent = 'emerald', remaining }) {
  const [macro, setMacro] = useState('p');
  const [target, setTarget] = useState(DEFAULT_TARGET.p);
  // Confirmación dentro del sheet: el toast global de la app queda por detrás del
  // velo (z-index), así que acá el "✓ Agregado" se muestra en la propia fila.
  const [addedId, setAddedId] = useState(null);
  const addedTimer = useRef(null);
  useEffect(() => () => clearTimeout(addedTimer.current), []);

  const A =
    accent === 'amber'
      ? {
          solid: 'bg-amber-500 text-slate-900',
          border: 'border-amber-400',
          text: 'text-amber-400',
          soft: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
          hover: 'hover:border-amber-500/50',
          addedRow: 'bg-amber-500/10 border-amber-500/40',
        }
      : {
          solid: 'bg-emerald-500 text-slate-900',
          border: 'border-emerald-400',
          text: 'text-emerald-400',
          soft: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
          hover: 'hover:border-emerald-500/50',
          addedRow: 'bg-emerald-500/10 border-emerald-500/40',
        };

  const macroInfo = MACROS[macro];
  const results = useMemo(() => computeEquivalents(macro, target), [macro, target]);

  // Agrupa por categoría respetando el orden por kcal que ya trae `results`.
  const groups = useMemo(
    () =>
      EQUIV_CATEGORIES.map((cat) => ({
        ...cat,
        items: results.filter((r) => r.cat === cat.id),
      })).filter((g) => g.items.length > 0),
    [results]
  );

  const switchMacro = (key) => {
    setMacro(key);
    setTarget(DEFAULT_TARGET[key]);
  };

  const stepTarget = (delta) =>
    setTarget((t) => Math.min(macroInfo.max, Math.max(macroInfo.min, t + delta)));

  const handleLog = (item, id) => {
    onLog(item);
    setAddedId(id);
    clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setAddedId(null), 1400);
  };

  const unit = macroInfo.unit; // 'g' | 'kcal'
  const unitSuffix = unit === 'g' ? 'g' : ' kcal';
  const remainingForMacro = remaining ? remaining[macro] : 0;

  return (
    <Sheet onClose={onClose} labelledBy="equiv-titulo">
      <div className="w-full max-w-md sheet rounded-t-3xl sm:rounded-3xl p-5 max-h-[88vh] flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="min-w-0">
            <h2 id="equiv-titulo" className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Scale className={`w-5 h-5 ${A.text}`} /> Equivalencias
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cuánto de cada alimento te da lo mismo. Tocá para registrarlo con esa porción.
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="btn-icon hover:bg-slate-800 shrink-0">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Selector de macro */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          {Object.values(MACROS).map((m) => {
            const active = m.key === macro;
            return (
              <button
                key={m.key}
                onClick={() => switchMacro(m.key)}
                aria-pressed={active}
                className={`py-2 rounded-xl text-sm font-semibold border transition-colors ${
                  active ? `${A.solid} ${A.border}` : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Objetivo: cuánto del macro */}
        <div className="mt-3 rounded-2xl surface p-3">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => stepTarget(-macroInfo.step)}
              aria-label={`Restar ${macroInfo.step} ${unit}`}
              className="btn-icon bg-slate-800 border border-slate-700 hover:bg-slate-700"
            >
              <Minus className="w-4 h-4 text-slate-200" />
            </button>
            <div className="text-center">
              <p className="font-mono text-3xl font-black text-slate-100 leading-none">
                {target}
                <span className="text-lg font-bold text-slate-400 ml-1">{unit}</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1">de {macroInfo.label.toLowerCase()}</p>
            </div>
            <button
              onClick={() => stepTarget(macroInfo.step)}
              aria-label={`Sumar ${macroInfo.step} ${unit}`}
              className="btn-icon bg-slate-800 border border-slate-700 hover:bg-slate-700"
            >
              <Plus className="w-4 h-4 text-slate-200" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {macroInfo.presets.map((v) => (
              <button
                key={v}
                onClick={() => setTarget(v)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  target === v ? `${A.solid} ${A.border}` : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                {v}
                {unit === 'g' ? 'g' : ''}
              </button>
            ))}
            {remainingForMacro > 0 && (
              <button
                onClick={() => setTarget(Math.min(macroInfo.max, remainingForMacro))}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${A.soft}`}
              >
                Falta hoy · {remainingForMacro}
                {unitSuffix}
              </button>
            )}
          </div>
        </div>

        {/* Resultados */}
        <div className="flex-1 overflow-y-auto mt-3 -mx-1 px-1 space-y-4">
          {groups.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">
              No hay equivalencias para ese objetivo.
            </p>
          ) : (
            groups.map((g) => (
              <div key={g.id}>
                <p className="label-section text-slate-500 mb-1.5">{g.label}</p>
                <div className="space-y-1.5">
                  {g.items.map((item) => {
                    const added = addedId === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() =>
                          handleLog(
                            { name: `${item.name} (${item.label})`, kcal: item.kcal, p: item.p, c: item.c, f: item.f },
                            item.id
                          )
                        }
                        className={`w-full text-left rounded-xl border px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                          added ? A.addedRow : `surface ${A.hover}`
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-slate-200 truncate">{item.name}</p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">
                            <span className={`font-bold ${A.text}`}>{item.label}</span>
                            <span className="text-slate-600"> · </span>
                            {item.kcal} kcal · P {item.p} · C {item.c} · G {item.f}
                          </p>
                        </div>
                        {added ? (
                          <span className={`shrink-0 flex items-center gap-1 text-xs font-bold ${A.text}`}>
                            <Check className="w-4 h-4" strokeWidth={3} /> Agregado
                          </span>
                        ) : (
                          <PlusCircle className={`w-5 h-5 shrink-0 ${A.text}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <p className="text-[11px] text-slate-600 text-center mt-3 shrink-0">
          Valores aproximados de referencia. Ajustá la porción a tu gusto.
        </p>
      </div>
    </Sheet>
  );
}
