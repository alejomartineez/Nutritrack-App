import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, PlusCircle, Minus, Plus, Scale, Check, Search, ArrowLeftRight } from 'lucide-react';
import Sheet from './lib/Sheet';
import {
  MACROS,
  EQUIV_CATEGORIES,
  EQUIV_FOODS,
  computeEquivalents,
  computeFoodSwap,
  swapMatchKey,
} from './equivalences';

// ---------------------------------------------------------------------------
// EQUIVALENCIAS — el "machete" para elegir comida
//
// Dos caminos:
//   1. Meta: elegís un macro y cuánto querés ("30 g de proteína") y ves cuánto
//      de cada alimento te da lo mismo. Sirve para cerrar lo que falta del día.
//   2. Reemplazo: elegís un alimento de tu plan ("2 huevos") y ves con qué otro
//      se puede sustituir sin cambiar calorías/macros.
// ---------------------------------------------------------------------------

const DEFAULT_TARGET = { p: 30, c: 45, f: 15, kcal: 200 };

const signed = (n, suffix = '') => {
  if (!n) return `0${suffix}`;
  return `${n > 0 ? '+' : '−'}${Math.abs(n)}${suffix}`;
};

function ResultGroups({ groups, addedId, onLog, A }) {
  if (groups.length === 0) {
    return (
      <p className="text-sm text-slate-500 text-center py-6">
        No hay equivalencias para ese objetivo.
      </p>
    );
  }

  return groups.map((g) => (
    <div key={g.id}>
      <p className="label-section text-slate-500 mb-1.5">{g.label}</p>
      <div className="space-y-1.5">
        {g.items.map((item) => {
          const added = addedId === item.id;
          return (
            <button
              key={item.id}
              onClick={() =>
                onLog(
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
                {item.delta && (
                  <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                    vs origen {signed(item.delta.kcal, ' kcal')} · P {signed(item.delta.p)} · C {signed(item.delta.c)} · G {signed(item.delta.f)}
                  </p>
                )}
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
  ));
}

export default function EquivalencesSheet({ onClose, onLog, accent = 'emerald', remaining }) {
  const [mode, setMode] = useState('meta'); // 'meta' | 'swap'
  const [macro, setMacro] = useState('p');
  const [target, setTarget] = useState(DEFAULT_TARGET.p);
  const [addedId, setAddedId] = useState(null);
  const addedTimer = useRef(null);
  useEffect(() => () => clearTimeout(addedTimer.current), []);

  const [swapQuery, setSwapQuery] = useState('');
  const [sourceFood, setSourceFood] = useState(null);
  const [sourceQty, setSourceQty] = useState(1);
  const [matchKey, setMatchKey] = useState('p');

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
  const metaResults = useMemo(() => computeEquivalents(macro, target), [macro, target]);
  const metaGroups = useMemo(
    () =>
      EQUIV_CATEGORIES.map((cat) => ({
        ...cat,
        items: metaResults.filter((r) => r.cat === cat.id),
      })).filter((g) => g.items.length > 0),
    [metaResults]
  );

  const swap = useMemo(
    () => (sourceFood ? computeFoodSwap(sourceFood, sourceQty, matchKey) : { source: null, results: [] }),
    [sourceFood, sourceQty, matchKey]
  );
  const swapGroups = useMemo(
    () =>
      EQUIV_CATEGORIES.map((cat) => ({
        ...cat,
        items: swap.results.filter((r) => r.cat === cat.id),
      })).filter((g) => g.items.length > 0),
    [swap.results]
  );

  const foodHits = useMemo(() => {
    const q = swapQuery.trim().toLowerCase();
    const list = q
      ? EQUIV_FOODS.filter((f) => f.name.toLowerCase().includes(q))
      : EQUIV_FOODS;
    return list;
  }, [swapQuery]);

  const switchMacro = (key) => {
    setMacro(key);
    setTarget(DEFAULT_TARGET[key]);
  };

  const pickSource = (food) => {
    setSourceFood(food);
    setSourceQty(food.unit === 'u' ? 1 : food.per);
    setMatchKey(swapMatchKey(food));
    setSwapQuery('');
  };

  const stepTarget = (delta) =>
    setTarget((t) => Math.min(macroInfo.max, Math.max(macroInfo.min, t + delta)));

  const qtyStep = sourceFood?.unit === 'u' ? 1 : 10;
  const qtyMin = sourceFood?.unit === 'u' ? 1 : 10;
  const qtyMax = sourceFood?.unit === 'u' ? 12 : 1000;
  const stepQty = (delta) =>
    setSourceQty((q) => Math.min(qtyMax, Math.max(qtyMin, q + delta)));

  const handleLog = (item, id) => {
    onLog(item);
    setAddedId(id);
    clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setAddedId(null), 1400);
  };

  const unit = macroInfo.unit;
  const unitSuffix = unit === 'g' ? 'g' : ' kcal';
  const remainingForMacro = remaining ? remaining[macro] : 0;

  const qtyPresets = sourceFood?.unit === 'u' ? [1, 2, 3, 4] : [50, 100, 150, 200];

  return (
    <Sheet onClose={onClose} labelledBy="equiv-titulo">
      <div className="w-full max-w-md sheet rounded-t-3xl sm:rounded-3xl p-5 max-h-[88vh] min-h-0 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="min-w-0">
            <h2 id="equiv-titulo" className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Scale className={`w-5 h-5 ${A.text}`} /> Equivalencias
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {mode === 'meta'
                ? 'Cuánto de cada alimento te da lo mismo. Tocá para registrarlo.'
                : 'Reemplazá un alimento del plan por otro con los mismos macros.'}
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="btn-icon hover:bg-slate-800 shrink-0">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1 bg-slate-800 border border-slate-700 rounded-2xl p-1 mt-3">
          <button
            onClick={() => setMode('meta')}
            aria-pressed={mode === 'meta'}
            className={`py-2 rounded-xl text-xs font-semibold transition-colors ${
              mode === 'meta' ? `${A.solid} ${A.border}` : 'text-slate-400'
            }`}
          >
            Meta del día
          </button>
          <button
            onClick={() => setMode('swap')}
            aria-pressed={mode === 'swap'}
            className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              mode === 'swap' ? `${A.solid} ${A.border}` : 'text-slate-400'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" /> Reemplazar
          </button>
        </div>

        {mode === 'meta' ? (
          <>
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

            <div className="flex-1 overflow-y-auto mt-3 -mx-1 px-1 space-y-4">
              <ResultGroups groups={metaGroups} addedId={addedId} onLog={handleLog} A={A} />
            </div>
          </>
        ) : (
          <>
            {!sourceFood ? (
              <div className="mt-3 flex flex-col min-h-0 flex-1">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={swapQuery}
                    onChange={(e) => setSwapQuery(e.target.value)}
                    placeholder="¿Qué alimento reemplazás? (huevo…)"
                    className="w-full surface rounded-2xl pl-9 pr-3 py-3 text-slate-100 placeholder-slate-500"
                  />
                </div>
                <div className="flex-1 overflow-y-auto mt-2 -mx-1 px-1 space-y-1.5">
                  {foodHits.map((food) => (
                    <button
                      key={food.id}
                      onClick={() => pickSource(food)}
                      className={`w-full text-left rounded-xl surface px-3.5 py-2.5 ${A.hover}`}
                    >
                      <p className="text-sm text-slate-200">{food.name}</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        por {food.unit === 'u' ? `1 ${food.single}` : `${food.per} ${food.unit}`} · {food.kcal} kcal · P {food.p} · C {food.c} · G {food.f}
                      </p>
                    </button>
                  ))}
                  {foodHits.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-6">Nada con ese nombre.</p>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="mt-3 rounded-2xl surface p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Origen</p>
                      <p className="text-sm font-semibold text-slate-100 mt-0.5">{sourceFood.name}</p>
                    </div>
                    <button
                      onClick={() => setSourceFood(null)}
                      className="text-xs font-semibold text-slate-400 hover:text-slate-200 shrink-0 mt-0.5"
                    >
                      Cambiar
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-3 mt-3">
                    <button
                      onClick={() => stepQty(-qtyStep)}
                      aria-label="Restar cantidad"
                      className="btn-icon bg-slate-800 border border-slate-700 hover:bg-slate-700"
                    >
                      <Minus className="w-4 h-4 text-slate-200" />
                    </button>
                    <div className="text-center">
                      <p className="font-mono text-3xl font-black text-slate-100 leading-none">
                        {sourceQty}
                        <span className="text-lg font-bold text-slate-400 ml-1">
                          {sourceFood.unit === 'u' ? '' : sourceFood.unit}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {sourceFood.unit === 'u'
                          ? sourceQty === 1
                            ? sourceFood.single
                            : sourceFood.plural
                          : 'de porción'}
                      </p>
                    </div>
                    <button
                      onClick={() => stepQty(qtyStep)}
                      aria-label="Sumar cantidad"
                      className="btn-icon bg-slate-800 border border-slate-700 hover:bg-slate-700"
                    >
                      <Plus className="w-4 h-4 text-slate-200" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {qtyPresets.map((v) => (
                      <button
                        key={v}
                        onClick={() => setSourceQty(v)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                          sourceQty === v ? `${A.solid} ${A.border}` : 'bg-slate-800 border-slate-700 text-slate-300'
                        }`}
                      >
                        {sourceFood.unit === 'u' ? v : `${v}${sourceFood.unit}`}
                      </button>
                    ))}
                  </div>

                  {swap.source && (
                    <p className="text-xs text-slate-400 font-mono mt-3 text-center">
                      {swap.source.label} · {swap.source.kcal} kcal · P {swap.source.p} · C {swap.source.c} · G {swap.source.f}
                    </p>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 mt-3 mb-1.5">Igualar por</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {Object.values(MACROS).map((m) => {
                    const active = m.key === matchKey;
                    return (
                      <button
                        key={m.key}
                        onClick={() => setMatchKey(m.key)}
                        aria-pressed={active}
                        className={`py-2 rounded-xl text-[11px] font-semibold border transition-colors ${
                          active ? `${A.solid} ${A.border}` : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        {m.key === 'kcal' ? 'Kcal' : m.key.toUpperCase()}
                      </button>
                    );
                  })}
                </div>

                <div className="flex-1 overflow-y-auto mt-3 -mx-1 px-1 space-y-4">
                  <ResultGroups groups={swapGroups} addedId={addedId} onLog={handleLog} A={A} />
                </div>
              </>
            )}
          </>
        )}

        <p className="text-[11px] text-slate-600 text-center mt-3 shrink-0">
          Valores aproximados de referencia. Ajustá la porción a tu gusto.
        </p>
      </div>
    </Sheet>
  );
}
