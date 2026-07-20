import React, { useMemo } from 'react';
import { Download, FileJson, Trophy, TrendingUp } from 'lucide-react';
import { MUSCLE_GROUP_COLORS } from './workoutData';
import { theme } from '../lib/theme';
import {
  computeWeeklyEffectiveSets,
  computeWeeklyVolumeHistory,
  computePersonalRecords,
  computeAverageRIRTrend,
  exportWorkoutDataAsJSON,
  exportWorkoutDataAsCSV,
} from './workoutStorage';

const EFFECTIVE_SETS_TARGET = 12; // referencia orientativa por grupo muscular/semana

export default function Analytics({ sessionsMap, exercisesById }) {
  const weeklySets = useMemo(() => computeWeeklyEffectiveSets(sessionsMap, exercisesById), [sessionsMap, exercisesById]);
  const volumeHistory = useMemo(() => computeWeeklyVolumeHistory(sessionsMap, 8), [sessionsMap]);
  const rirTrend = useMemo(() => computeAverageRIRTrend(sessionsMap, 8), [sessionsMap]);
  const prs = useMemo(() => computePersonalRecords(sessionsMap, exercisesById), [sessionsMap, exercisesById]);

  const maxVolume = Math.max(1, ...volumeHistory.map((w) => w.volume));
  const muscleEntries = Object.entries(weeklySets).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl surface p-5">
        <h2 className="label-section mb-4">Series efectivas esta semana</h2>
        {muscleEntries.length === 0 ? (
          <p className="text-sm text-slate-500">Todavía no registraste series efectivas esta semana.</p>
        ) : (
          <div className="space-y-3">
            {muscleEntries.map(([muscle, count]) => {
              const pct = Math.min(100, (count / EFFECTIVE_SETS_TARGET) * 100);
              return (
                <div key={muscle}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">{muscle}</span>
                    <span className="font-mono text-slate-400">{count} series</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-neutral-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: MUSCLE_GROUP_COLORS[muscle] || theme.accent }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-3xl surface p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <h2 className="label-section">Volumen semanal (últimas 8 semanas)</h2>
        </div>
        <div className="flex items-end justify-between gap-1.5 h-32">
          {volumeHistory.map((w) => {
            const h = Math.max(4, (w.volume / maxVolume) * 100);
            return (
              <div key={w.weekStart} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full h-28 flex items-end">
                  <div
                    className={`w-full rounded-t-md ${w.volume === 0 ? 'bg-neutral-800' : 'bg-emerald-500'}`}
                    style={{ height: `${h}%` }}
                    title={`${w.volume} kg`}
                  />
                </div>
                <span className="text-[9px] text-slate-600">{w.weekStart.slice(5)}</span>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-500 mt-2">Volumen = peso × repeticiones de series efectivas (sin calentamiento).</p>
      </div>

      <div className="rounded-3xl surface p-5">
        <h2 className="label-section mb-3">RIR promedio por semana</h2>
        <div className="flex items-end justify-between gap-1.5 h-20">
          {rirTrend.map((w) => (
            <div key={w.weekStart} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] font-mono text-slate-400">{w.avgRir ?? '–'}</span>
              <div className="w-full h-12 flex items-end">
                <div
                  className={`w-full rounded-t-md ${w.avgRir == null ? 'bg-neutral-800' : 'bg-emerald-400/70'}`}
                  style={{ height: w.avgRir == null ? '4%' : `${Math.min(100, (w.avgRir / 5) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl surface-accent p-5">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-emerald-400" />
          <h2 className="label-section">1RM estimado y récords personales</h2>
        </div>
        {prs.length === 0 ? (
          <p className="text-sm text-slate-500">Completá series efectivas para ver tus estimaciones de 1RM.</p>
        ) : (
          <ul className="space-y-2">
            {prs.slice(0, 8).map((pr) => (
              <li key={pr.exerciseId} className="flex items-center justify-between rounded-xl surface px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm text-slate-200 font-medium truncate">{pr.exerciseName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    PR: {pr.weight}kg x {pr.reps} · {pr.date}
                  </p>
                </div>
                <span className="font-mono text-lg font-black text-emerald-300 shrink-0">{pr.estOneRM}kg</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl surface p-4 flex gap-3">
        <button
          onClick={exportWorkoutDataAsJSON}
          className="flex-1 rounded-xl border border-emerald-500/30 text-emerald-300 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-emerald-500/10"
        >
          <FileJson className="w-3.5 h-3.5" /> Exportar JSON
        </button>
        <button
          onClick={exportWorkoutDataAsCSV}
          className="flex-1 rounded-xl border border-emerald-500/30 text-emerald-300 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-emerald-500/10"
        >
          <Download className="w-3.5 h-3.5" /> Exportar CSV
        </button>
      </div>
    </div>
  );
}
