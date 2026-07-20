import React, { useMemo } from 'react';
import { Moon, TrendingDown, Gauge } from 'lucide-react';
import { ENERGY_LEVELS } from './sleepData';
import { getLast7DaysSleep, computeWeeklyStats } from './sleepStorage';

const consistencyLabel = (stdevMin) => {
  if (stdevMin == null) return { label: 'Sin datos suficientes', color: 'text-indigo-400' };
  if (stdevMin <= 20) return { label: 'Muy consistente', color: 'text-emerald-300' };
  if (stdevMin <= 45) return { label: 'Consistente', color: 'text-violet-300' };
  return { label: 'Irregular', color: 'text-amber-300' };
};

export default function SleepDashboard({ sleepLogs, goalHours, onSelectDay }) {
  const week = useMemo(() => getLast7DaysSleep(sleepLogs), [sleepLogs]);
  const stats = useMemo(() => computeWeeklyStats(sleepLogs, goalHours), [sleepLogs, goalHours]);
  const maxHours = Math.max(goalHours, ...week.map((d) => d.hours), 1);

  const bedtimeConsistency = consistencyLabel(stats.bedtimeConsistencyMin);
  const wakeConsistency = consistencyLabel(stats.wakeConsistencyMin);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl surface p-4 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1.5 text-violet-300">
            <Moon className="w-5 h-5" />
            <span className="font-mono text-2xl font-black text-slate-100">{stats.avgHours}h</span>
          </div>
          <p className="text-[11px] text-indigo-400 mt-1 leading-tight">promedio esta semana</p>
        </div>
        <div className="rounded-2xl surface p-4 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1.5 text-amber-300">
            <TrendingDown className="w-5 h-5" />
            <span className="font-mono text-2xl font-black text-slate-100">{stats.sleepDebtHours}h</span>
          </div>
          <p className="text-[11px] text-indigo-400 mt-1 leading-tight">déficit de sueño</p>
        </div>
      </div>

      <div className="rounded-3xl surface p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="label-section">Últimos 7 días</h2>
          {onSelectDay && <span className="text-[10px] text-indigo-400">Tocá un día para editarlo</span>}
        </div>
        <div className="flex items-end justify-between gap-2 h-36">
          {week.map((d) => {
            const h = Math.max(4, (d.hours / maxHours) * 100);
            const metGoal = d.hours >= goalHours;
            const Cell = onSelectDay ? 'button' : 'div';
            return (
              <Cell
                key={d.key}
                type={onSelectDay ? 'button' : undefined}
                onClick={onSelectDay ? () => onSelectDay(d.key) : undefined}
                aria-label={onSelectDay ? `Editar ${d.label} (${d.hours}h)` : undefined}
                className={`flex-1 flex flex-col items-center gap-1.5 ${
                  onSelectDay ? 'rounded-lg hover:bg-indigo-900/40 focus-visible:ring-2 focus-visible:ring-violet-400 py-1 -my-1' : ''
                }`}
              >
                <div className="w-full h-28 flex items-end">
                  <div
                    className={`w-full rounded-t-md ${d.hours === 0 ? 'bg-indigo-900/40' : metGoal ? 'bg-violet-500' : 'bg-indigo-500'}`}
                    style={{ height: `${h}%` }}
                    title={`${d.hours}h`}
                  />
                </div>
                <span className="text-sm">{d.log ? ENERGY_LEVELS.find((e) => e.value === d.log.quality)?.emoji : '·'}</span>
                <span className="text-[10px] text-indigo-400 uppercase font-medium">{d.label}</span>
              </Cell>
            );
          })}
        </div>
        <div className="flex items-center gap-2 mt-3 text-[11px] text-indigo-400">
          <span className="w-2.5 h-2.5 rounded-sm bg-violet-500 inline-block" /> Cumplió meta ({goalHours}h)
          <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block ml-3" /> Por debajo
        </div>
      </div>

      <div className="rounded-3xl surface p-5">
        <div className="flex items-center gap-2 mb-4">
          <Gauge className="w-4 h-4 text-violet-300" />
          <h2 className="label-section">Consistencia de horarios</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-indigo-900/40 border border-indigo-500/20 px-3 py-2.5">
            <p className="text-[10px] uppercase text-indigo-400 font-semibold">Hora de acostarse</p>
            <p className={`font-semibold mt-0.5 ${bedtimeConsistency.color}`}>{bedtimeConsistency.label}</p>
          </div>
          <div className="rounded-xl bg-indigo-900/40 border border-indigo-500/20 px-3 py-2.5">
            <p className="text-[10px] uppercase text-indigo-400 font-semibold">Hora de despertar</p>
            <p className={`font-semibold mt-0.5 ${wakeConsistency.color}`}>{wakeConsistency.label}</p>
          </div>
        </div>
        <p className="text-xs text-indigo-400 mt-3">
          Dormir y despertar a horarios parecidos todos los días mejora la calidad del descanso, incluso más que las horas totales.
        </p>
      </div>
    </div>
  );
}
