import React, { useMemo } from 'react';
import { LineChart } from 'lucide-react';
import { Sheet, Stat, EmptyState } from '../ui';
import { formatDisplayDate, formatShortDate, keyToDate } from '../lib/dates';
import { computeExerciseHistory, formatScore, num } from './workoutStats';
import { isTimed } from './workoutData';
import { fmtNum } from './format';

const W = 320;
const H = 132;
const PAD = { l: 8, r: 8, t: 16, b: 22 };

/** Línea simple del 1RM estimado (o reps máximas) sesión a sesión. */
function TrendChart({ points, unit }) {
  if (points.length < 2) return null;
  const values = points.map((p) => p.value);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const x = (i) => PAD.l + (i / (points.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v) => PAD.t + (1 - (v - lo) / span) * (H - PAD.t - PAD.b);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)},${H - PAD.b} L${x(0).toFixed(1)},${H - PAD.b} Z`;
  const bestIdx = values.lastIndexOf(hi);
  const stroke = 'rgb(var(--entreno-400))';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Evolución: de ${fmtNum(values[0])} a ${fmtNum(values.at(-1))} ${unit}`}>
      <defs>
        <linearGradient id="exh-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--entreno-500))" stopOpacity="0.22" />
          <stop offset="100%" stopColor="rgb(var(--entreno-500))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} stroke="rgb(var(--ink-700))" strokeWidth="1" />
      <path d={area} fill="url(#exh-fill)" />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r={i === bestIdx ? 4 : 2.5} fill={i === bestIdx ? stroke : 'rgb(var(--ink-800))'} stroke={stroke} strokeWidth="1.75" />
      ))}
      <text x={x(bestIdx)} y={y(hi) - 8} textAnchor={bestIdx > points.length * 0.7 ? 'end' : bestIdx < points.length * 0.3 ? 'start' : 'middle'} className="num" fontSize="11" fontWeight="600" fill="rgb(var(--ink-200))">
        {fmtNum(hi, 1)}
      </text>
      <text x={PAD.l} y={H - 6} fontSize="10" fill="rgb(var(--ink-500))">
        {formatShortDate(points[0].date)}
      </text>
      <text x={W - PAD.r} y={H - 6} fontSize="10" textAnchor="end" fill="rgb(var(--ink-500))">
        {formatShortDate(points.at(-1).date)}
      </text>
    </svg>
  );
}

const setLabel = (s, timed) => {
  const w = num(s.weight);
  const r = num(s.reps);
  const reps = timed ? `${r} s` : r;
  return w > 0 ? `${fmtNum(w)}×${reps}` : `${reps}${timed ? '' : ' reps'}`;
};

export default function ExerciseHistorySheet({ exercise, exerciseId, sessionsMap, onClose }) {
  const history = useMemo(() => computeExerciseHistory(sessionsMap, exerciseId), [sessionsMap, exerciseId]);
  const timed = isTimed(exercise);
  const loadPoints = history.filter((h) => h.e1rm).map((h) => ({ date: h.date, value: h.e1rm }));
  const usesLoad = loadPoints.length >= history.length / 2 && loadPoints.length > 0;
  const points = (usesLoad ? loadPoints : history.filter((h) => h.maxReps).map((h) => ({ date: h.date, value: h.maxReps }))).slice(-16);
  const best = history.reduce((acc, h) => {
    if (!h.best) return acc;
    if (!acc) return h.best;
    if (h.best.kind === 'load' && acc.kind !== 'load') return h.best;
    return h.best.kind === acc.kind && h.best.value > acc.value ? h.best : acc;
  }, null);
  const bestE1rm = Math.max(0, ...history.map((h) => h.e1rm || 0));

  return (
    <Sheet onClose={onClose} title={exercise?.name || 'Ejercicio'} subtitle={exercise ? `${exercise.muscleGroup} · ${exercise.equipment}` : undefined} size="large">
      {history.length === 0 ? (
        <EmptyState icon={LineChart} title="Sin historial todavía" text="Cuando completes series de este ejercicio vas a ver acá tu evolución." />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Mejor serie" value={best ? (best.kind === 'load' ? fmtNum(best.weight) : best.reps) : '—'} unit={best ? (best.kind === 'load' ? `kg × ${best.reps}` : timed ? 's' : 'reps') : undefined} />
            <Stat label="1RM estimado" value={bestE1rm ? fmtNum(bestE1rm, 1) : '—'} unit={bestE1rm ? 'kg' : undefined} />
            <Stat label="Sesiones" value={history.length} />
          </div>

          {points.length >= 2 && (
            <div className="surface rounded-2xl p-3">
              <p className="text-xs text-ink-500 px-1 mb-1">{usesLoad ? '1RM estimado (kg)' : timed ? 'Mejor tiempo (s)' : 'Máximo de reps'}</p>
              <TrendChart points={points} unit={usesLoad ? 'kg' : timed ? 's' : 'reps'} />
            </div>
          )}

          <section>
            <h3 className="text-[13px] font-semibold uppercase tracking-wide text-ink-500 px-1 mb-2">Últimas sesiones</h3>
            <ul className="surface rounded-2xl divide-y divide-[var(--hairline)]">
              {history
                .slice(-12)
                .reverse()
                .map((h) => (
                  <li key={h.sessionId} className="px-4 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-semibold text-ink-100">{formatDisplayDate(keyToDate(h.date))}</p>
                      {h.best && <p className="text-xs text-ink-500 num">{formatScore(h.best)}</p>}
                    </div>
                    <p className="num text-sm text-ink-400 mt-1 leading-relaxed">
                      {h.sets.map((s, i) => (
                        <span key={s.id || i} className={s.type === 'warmup' ? 'text-ink-600' : ''}>
                          {i > 0 && <span className="text-ink-600"> · </span>}
                          {setLabel(s, timed)}
                        </span>
                      ))}
                    </p>
                  </li>
                ))}
            </ul>
          </section>
        </div>
      )}
    </Sheet>
  );
}
