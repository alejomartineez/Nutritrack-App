import React, { useMemo, useState } from 'react';
import { Scale, Check, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { theme } from './lib/theme';

// ---------------------------------------------------------------------------
// PESO CORPORAL: registro rápido diario + tendencia de los últimos 30 días.
// Storage propio ('weight_logs': { 'YYYY-MM-DD': kg }) para no acoplar el
// resto de la app; entra en la copia de seguridad completa.
// ---------------------------------------------------------------------------

const KEY = 'weight_logs';

const localDateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const loadWeights = () => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};

const saveWeights = (map) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch (e) {
    // almacenamiento no disponible, se continúa sin persistir
  }
};

function Sparkline({ entries }) {
  if (entries.length < 2) return null;
  const values = entries.map((e) => e.kg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 0.5); // evita línea plana pegada al borde
  const W = 300;
  const H = 70;
  const PAD = 6;
  const points = entries
    .map((e, i) => {
      const x = PAD + (i / (entries.length - 1)) * (W - PAD * 2);
      const y = PAD + (1 - (e.kg - min) / range) * (H - PAD * 2);
      return `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`;
    })
    .join(' ');

  return (
    <div className="mt-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16" preserveAspectRatio="none">
        <polyline points={points} fill="none" stroke={theme.accentBright} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="flex justify-between text-[10px] text-slate-500 font-mono">
        <span>{entries[0].date.slice(5)}</span>
        <span>
          {min}kg – {max}kg
        </span>
        <span>{entries[entries.length - 1].date.slice(5)}</span>
      </div>
    </div>
  );
}

export default function WeightTracker() {
  const [weights, setWeights] = useState(loadWeights);
  const [input, setInput] = useState('');
  const [savedMsg, setSavedMsg] = useState(false);

  const entries = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffKey = localDateKey(cutoff);
    return Object.entries(weights)
      .filter(([date]) => date >= cutoffKey)
      .map(([date, kg]) => ({ date, kg }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [weights]);

  const latest = entries[entries.length - 1] || null;
  const previous = entries[entries.length - 2] || null;
  const delta = latest && previous ? Math.round((latest.kg - previous.kg) * 10) / 10 : null;

  const submit = () => {
    const kg = parseFloat(String(input).replace(',', '.'));
    if (Number.isNaN(kg) || kg <= 0 || kg > 400) return;
    const next = { ...weights, [localDateKey()]: Math.round(kg * 10) / 10 };
    setWeights(next);
    saveWeights(next);
    setInput('');
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  };

  const DeltaIcon = delta == null ? Minus : delta < 0 ? TrendingDown : delta > 0 ? TrendingUp : Minus;
  const deltaColor = delta == null || delta === 0 ? 'text-slate-400' : delta < 0 ? 'text-emerald-400' : 'text-amber-400';

  return (
    <div className="rounded-3xl surface p-5">
      <div className="flex items-center gap-2 mb-3">
        <Scale className="w-4 h-4 text-emerald-400" />
        <h2 className="label-section">Peso corporal</h2>
      </div>

      {/* Sin registros el texto explicativo va en su propia fila: al costado del
          input quedaba en una columna de 4 palabras de ancho, partido en 4 líneas. */}
      {!latest && (
        <p className="text-sm text-slate-500 leading-relaxed mb-3">
          Registrá tu peso para ver la tendencia y saber si el plan está funcionando.
        </p>
      )}

      <div className={`flex items-end gap-3 ${latest ? 'justify-between' : 'justify-end'}`}>
        {latest && (
          <div>
            <p className="num-display text-3xl text-slate-100">
              {latest.kg}
              <span className="text-base font-medium text-slate-400 ml-1 tracking-normal">kg</span>
            </p>
            <p className={`text-xs mt-0.5 flex items-center gap-1 ${deltaColor}`}>
              <DeltaIcon className="w-3.5 h-3.5" />
              {delta == null
                ? 'Primer registro'
                : delta === 0
                ? 'Sin cambios vs registro anterior'
                : `${delta > 0 ? '+' : ''}${delta} kg vs registro anterior`}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={latest ? String(latest.kg) : 'kg'}
            inputMode="decimal"
            className="w-20 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-mono text-center"
          />
          <button
            onClick={submit}
            aria-label="Guardar peso de hoy"
            className="p-2.5 rounded-xl bg-emerald-500 text-slate-900 hover:bg-emerald-400"
          >
            <Check className="w-5 h-5" />
          </button>
        </div>
      </div>

      {savedMsg && <p className="text-xs text-emerald-400 mt-2">Peso de hoy guardado ✓</p>}

      <Sparkline entries={entries} />
    </div>
  );
}
