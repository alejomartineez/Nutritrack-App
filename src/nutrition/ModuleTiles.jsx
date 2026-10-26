import React, { useMemo } from 'react';
import { Dumbbell, MoonStar, Trophy } from 'lucide-react';
import * as workout from '../workout/workoutStorage';
import * as sleep from '../sleep/sleepStorage';
import { addDaysToKey, dateKeyOf } from '../lib/dates';
import { Card } from '../ui';
import { fmt, fmt1 } from './parts';

// Resúmenes de Entreno y Sueño para Hoy y Progreso. Leen lo que exponen los
// módulos (getTodayWorkoutSummary, getSleepDaySummary, ...).

const workoutTile = () => {
  const s = workout.getTodayWorkoutSummary?.();
  if (!s) return { main: 'Entreno', sub: '' };
  switch (s.state) {
    case 'active':
      return { main: 'En curso', sub: 'Tocá para seguir' };
    case 'done':
      return { main: `${s.dayName || 'Hecho'} ✓`, sub: `${s.completedSets} series` };
    case 'planned':
      return { main: s.dayName, sub: s.exerciseCount ? `${s.exerciseCount} ejercicios` : 'Tocá para empezar' };
    case 'rest':
      return { main: 'Descanso', sub: 'Día libre' };
    default:
      return { main: 'Sin rutina', sub: 'Armá tu semana' };
  }
};

const sleepTile = (todayKey) => {
  const s = sleep.getSleepDaySummary?.(todayKey);
  if (!s) return { main: 'Sueño', sub: '' };
  if (s.logged) return { main: `${fmt1(s.hours)} h`, sub: s.score != null ? `Puntaje ${s.score}` : s.label || '' };
  if (s.pendingBedtime) return { main: 'Durmiendo', sub: `desde ${s.pendingBedtime}` };
  return { main: '¿Dormiste?', sub: 'Registrá anoche' };
};

function Tile({ icon: Icon, tone, label, main, sub, onClick }) {
  return (
    <button onClick={onClick} className="surface rounded-3xl p-4 text-left min-h-[6.5rem] flex flex-col flex-1 min-w-0">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-400">
        <Icon className={`w-4 h-4 ${tone}`} /> {label}
      </span>
      <span className="mt-auto text-[17px] font-bold text-ink-50 truncate">{main}</span>
      <span className="text-xs text-ink-500 truncate mt-0.5">{sub}</span>
    </button>
  );
}

export function ModuleTiles({ modules, onGoTo }) {
  const w = useMemo(workoutTile, []);
  const s = useMemo(() => sleepTile(dateKeyOf()), []);
  return (
    <>
      {modules.entreno && <Tile icon={Dumbbell} tone="text-entreno-400" label="Entreno" {...w} onClick={() => onGoTo('entreno')} />}
      {modules.sueno && <Tile icon={MoonStar} tone="text-sueno-400" label="Sueño" {...s} onClick={() => onGoTo('sueno')} />}
    </>
  );
}

/** Resumen de la última semana de entreno y sueño, para Progreso. */
export function ModuleRecap({ modules, todayKey }) {
  const from = addDaysToKey(todayKey, -6);
  const w = useMemo(() => (modules.entreno ? workout.getWorkoutRangeSummary?.(from, todayKey) : null), [modules.entreno, from, todayKey]);
  const s = useMemo(() => (modules.sueno ? sleep.getSleepRangeSummary?.(from, todayKey) : null), [modules.sueno, from, todayKey]);
  if (!w && !s) return null;

  return (
    <Card className="p-5">
      <p className="text-xs text-ink-500 mb-3">Últimos 7 días</p>
      <div className="grid grid-cols-2 gap-4">
        {w && (
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-entreno-400">
              <Dumbbell className="w-4 h-4" /> Entreno
            </p>
            <p className="num-display text-2xl text-ink-50 mt-1.5">
              {w.sessions}
              <span className="text-sm text-ink-500 font-semibold ml-1">{w.sessions === 1 ? 'sesión' : 'sesiones'}</span>
            </p>
            <p className="text-xs text-ink-500 mt-0.5">
              {w.sets} series · {fmt(w.volumeKg)} kg
            </p>
          </div>
        )}
        {s && (
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-sueno-400">
              <MoonStar className="w-4 h-4" /> Sueño
            </p>
            <p className="num-display text-2xl text-ink-50 mt-1.5">
              {s.nights ? fmt1(s.avgHours) : '—'}
              <span className="text-sm text-ink-500 font-semibold ml-1">h/noche</span>
            </p>
            <p className="text-xs text-ink-500 mt-0.5">
              {s.nights} {s.nights === 1 ? 'noche' : 'noches'}
              {s.avgScore != null && s.nights ? ` · puntaje ${Math.round(s.avgScore)}` : ''}
            </p>
          </div>
        )}
      </div>
      {w?.prs?.length > 0 && (
        <div className="mt-4 pt-3 border-t hairline">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 mb-1.5">
            <Trophy className="w-3.5 h-3.5" /> Récords de la semana
          </p>
          <ul className="space-y-1">
            {w.prs.slice(0, 4).map((pr, i) => (
              <li key={i} className="text-sm text-ink-200 flex justify-between gap-2">
                <span className="truncate">{pr.exerciseName}</span>
                <span className="num text-ink-400 shrink-0">{pr.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
