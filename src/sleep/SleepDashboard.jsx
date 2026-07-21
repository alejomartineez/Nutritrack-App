import React, { useMemo } from 'react';
import { Moon, TrendingDown, Gauge, Minus, Plus, Target } from 'lucide-react';
import { ENERGY_LEVELS } from './sleepData';
import { getLast7DaysSleep, computeWeeklyStats } from './sleepStorage';

const consistencyLabel = (stdevMin) => {
  if (stdevMin == null) return { label: 'Sin datos', color: 'text-ink-400' };
  if (stdevMin <= 20) return { label: 'Muy consistente', color: 'text-brand-300' };
  if (stdevMin <= 45) return { label: 'Consistente', color: 'text-sueno-300' };
  return { label: 'Irregular', color: 'text-amber-300' };
};

/** Meta editable. Vivía solo en localStorage y no había forma de cambiarla
 *  desde la app: `saveSleepGoalHours` existía y nunca se llamaba. */
function GoalStepper({ goalHours, onChange }) {
  return (
    <div className="rounded-2xl surface px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="w-9 h-9 rounded-xl bg-sueno-500/15 flex items-center justify-center shrink-0">
          <Target className="w-4 h-4 text-sueno-400" />
        </span>
        <div className="min-w-0">
          <p className="label-section">Mi meta</p>
          <p className="text-sm text-ink-400 truncate">por noche</p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onChange(Math.max(4, Math.round((goalHours - 0.5) * 2) / 2))}
          disabled={goalHours <= 4}
          aria-label="Bajar meta media hora"
          className="btn-icon text-ink-300 hover:bg-ink-700 disabled:opacity-30"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="font-mono text-lg font-black text-ink-100 w-14 text-center tabular-nums">{goalHours}h</span>
        <button
          onClick={() => onChange(Math.min(12, Math.round((goalHours + 0.5) * 2) / 2))}
          disabled={goalHours >= 12}
          aria-label="Subir meta media hora"
          className="btn-icon text-ink-300 hover:bg-ink-700 disabled:opacity-30"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function SleepDashboard({ sleepLogs, goalHours, onSelectDay, onChangeGoal }) {
  const week = useMemo(() => getLast7DaysSleep(sleepLogs), [sleepLogs]);
  const stats = useMemo(() => computeWeeklyStats(sleepLogs, goalHours), [sleepLogs, goalHours]);
  const maxHours = Math.max(goalHours, ...week.map((d) => d.hours), 1);

  const bedtimeConsistency = consistencyLabel(stats.bedtimeConsistencyMin);
  const wakeConsistency = consistencyLabel(stats.wakeConsistencyMin);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl surface p-4 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1.5 text-sueno-300">
            <Moon className="w-5 h-5" />
            <span className="font-mono text-2xl font-black text-ink-100">{stats.avgHours}h</span>
          </div>
          <p className="text-[11px] text-ink-500 mt-1 leading-tight">promedio esta semana</p>
        </div>
        <div className="rounded-2xl surface p-4 flex flex-col items-center justify-center text-center">
          <div className={`flex items-center gap-1.5 ${stats.sleepDebtHours > 0 ? 'text-amber-400' : 'text-brand-400'}`}>
            <TrendingDown className="w-5 h-5" />
            <span className="font-mono text-2xl font-black text-ink-100">{stats.sleepDebtHours}h</span>
          </div>
          <p className="text-[11px] text-ink-500 mt-1 leading-tight">
            {stats.sleepDebtHours > 0 ? 'déficit acumulado' : 'sin déficit'}
          </p>
        </div>
      </div>

      <div className="rounded-3xl surface p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="label-section">Últimos 7 días</h2>
          {onSelectDay && <span className="text-[10px] text-ink-500">Tocá un día para editarlo</span>}
        </div>

        {/* La meta va como línea punteada sobre las barras: comparar cada noche
            contra la meta sin tener que leer números. */}
        <div className="relative">
          <div
            className="absolute left-0 right-0 border-t border-dashed border-sueno-600/70 z-10 pointer-events-none"
            style={{ top: `${(1 - goalHours / maxHours) * 112}px` }}
          >
            <span className="absolute -top-2 right-0 text-[9px] font-mono text-sueno-400 bg-ink-800 px-1">
              {goalHours}h
            </span>
          </div>

          {/* Sin alto fijo en la fila: el alto lo fija la caja de barra (h-28)
              de cada celda, que es lo mismo contra lo que se posiciona la línea
              de meta de arriba. */}
          <div className="flex justify-between gap-2">
            {week.map((d) => {
              const h = Math.max(3, (d.hours / maxHours) * 100);
              const metGoal = d.hours >= goalHours;
              const Cell = onSelectDay ? 'button' : 'div';
              return (
                <Cell
                  key={d.key}
                  type={onSelectDay ? 'button' : undefined}
                  onClick={onSelectDay ? () => onSelectDay(d.key) : undefined}
                  aria-label={onSelectDay ? `Editar ${d.label} (${d.hours}h)` : undefined}
                  className={`flex-1 flex flex-col items-center gap-1.5 min-w-0 ${
                    onSelectDay ? 'rounded-lg hover:bg-ink-900 py-1 -my-1' : ''
                  }`}
                >
                  <div className="w-full h-28 flex items-end">
                    <div
                      className={`w-full rounded-t-md transition-all duration-500 ${
                        d.hours === 0 ? 'bg-ink-900' : metGoal ? 'bg-sueno-400' : 'bg-sueno-700'
                      }`}
                      style={{ height: `${h}%` }}
                      title={`${d.hours}h`}
                    />
                  </div>
                  <span className="text-sm leading-none">
                    {d.log ? ENERGY_LEVELS.find((e) => e.value === d.log.quality)?.emoji : '·'}
                  </span>
                  <span className="text-[10px] text-ink-500 uppercase font-medium">{d.label}</span>
                </Cell>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 text-[11px] text-ink-500">
          <span className="w-2.5 h-2.5 rounded-sm bg-sueno-400 inline-block" /> Cumplió meta
          <span className="w-2.5 h-2.5 rounded-sm bg-sueno-700 inline-block ml-3" /> Por debajo
        </div>
      </div>

      {onChangeGoal && <GoalStepper goalHours={goalHours} onChange={onChangeGoal} />}

      <div className="rounded-3xl surface p-5">
        <div className="flex items-center gap-2 mb-1">
          <Gauge className="w-4 h-4 text-sueno-400" />
          <h2 className="label-section">Consistencia de horarios</h2>
        </div>
        <p className="text-[11px] text-ink-500 mb-3.5">
          Dormir y despertar a horarios parecidos mejora el descanso, incluso más que las horas totales.
        </p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-ink-900 border border-ink-700 px-3 py-2.5">
            <p className="label-section">Me acuesto</p>
            <p className={`font-semibold mt-0.5 ${bedtimeConsistency.color}`}>{bedtimeConsistency.label}</p>
            {stats.bedtimeConsistencyMin != null && (
              <p className="text-[11px] text-ink-500 mt-0.5 font-mono">±{stats.bedtimeConsistencyMin} min</p>
            )}
          </div>
          <div className="rounded-xl bg-ink-900 border border-ink-700 px-3 py-2.5">
            <p className="label-section">Me despierto</p>
            <p className={`font-semibold mt-0.5 ${wakeConsistency.color}`}>{wakeConsistency.label}</p>
            {stats.wakeConsistencyMin != null && (
              <p className="text-[11px] text-ink-500 mt-0.5 font-mono">±{stats.wakeConsistencyMin} min</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
