import React, { useMemo } from 'react';
import { Dumbbell, MoonStar, Moon, Check, ChevronRight } from 'lucide-react';
import { loadRoutines, loadActiveRoutineId, loadSessions } from './workout/workoutStorage';
import { loadSleepLogs, localDateKey } from './sleep/sleepStorage';
import { ENERGY_LEVELS } from './sleep/sleepData';

// ---------------------------------------------------------------------------
// RESUMEN "HOY": une los tres módulos en la pantalla inicial.
// Lee entreno y sueño en modo solo-lectura desde localStorage; se recalcula
// en cada montaje (el tab se desmonta al navegar, así que siempre está fresco).
// ---------------------------------------------------------------------------

const todayWorkoutSummary = () => {
  const routines = loadRoutines();
  const activeId = loadActiveRoutineId();
  const routine = routines.find((r) => r.id === activeId) || null;

  const todayKey = localDateKey();
  const sessions = Object.values(loadSessions()).filter((s) => s.date === todayKey && s.endedAt);
  if (sessions.length > 0) {
    const completedSets = sessions.reduce(
      (sum, s) => sum + s.exercises.reduce((acc, ex) => acc + ex.sets.filter((set) => set.completed).length, 0),
      0
    );
    return { state: 'done', dayName: sessions[0].dayName, completedSets };
  }

  if (!routine) return { state: 'no_routine' };

  const mondayFirstIndex = (new Date().getDay() + 6) % 7; // la rutina arranca en lunes
  const day = routine.days[mondayFirstIndex];
  if (!day || day.isRest) return { state: 'rest' };
  return { state: 'planned', dayName: day.name, exerciseCount: day.exercises.length };
};

const todaySleepSummary = () => {
  const log = loadSleepLogs()[localDateKey()] || null;
  if (!log) return { state: 'pending' };
  const hours = Math.round((log.totalSleepMinutes / 60) * 10) / 10;
  const energy = ENERGY_LEVELS.find((e) => e.value === log.quality) || null;
  return { state: 'logged', hours, emoji: energy?.emoji || '', label: energy?.label || '' };
};

function SummaryCard({ onClick, accentClasses, icon, title, main, sub }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-3.5 text-left flex flex-col gap-1 min-w-0 ${accentClasses}`}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {icon}
          <span className="text-[10px] uppercase tracking-wide font-bold truncate">{title}</span>
        </div>
        <ChevronRight className="w-3.5 h-3.5 opacity-50 shrink-0" />
      </div>
      <p className="text-sm font-bold text-slate-100 truncate">{main}</p>
      {sub && <p className="text-[11px] text-slate-400 truncate">{sub}</p>}
    </button>
  );
}

export default function TodayDashboard({ onGoToTab, modules = { entreno: true, sueno: true } }) {
  const workout = useMemo(todayWorkoutSummary, []);
  const sleep = useMemo(todaySleepSummary, []);

  const workoutCard = (() => {
    switch (workout.state) {
      case 'done':
        return {
          icon: <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />,
          main: `${workout.dayName} completado`,
          sub: `${workout.completedSets} series registradas`,
        };
      case 'planned':
        return {
          icon: <Dumbbell className="w-3.5 h-3.5 text-orange-400 shrink-0" />,
          main: `Hoy: ${workout.dayName}`,
          sub:
            workout.exerciseCount > 0
              ? `${workout.exerciseCount} ejercicio${workout.exerciseCount === 1 ? '' : 's'} · tocá para empezar`
              : 'Agregale ejercicios al día',
        };
      case 'rest':
        return {
          icon: <Moon className="w-3.5 h-3.5 text-orange-400 shrink-0" />,
          main: 'Día de descanso',
          sub: 'Tu rutina no tiene entreno hoy',
        };
      default:
        return {
          icon: <Dumbbell className="w-3.5 h-3.5 text-orange-400 shrink-0" />,
          main: 'Sin rutina todavía',
          sub: 'Tocá para armar tu semana',
        };
    }
  })();

  const sleepCard =
    sleep.state === 'logged'
      ? {
          main: `${sleep.hours}h dormidas ${sleep.emoji}`,
          sub: sleep.label,
        }
      : {
          main: '¿Cómo dormiste?',
          sub: 'Registrá tu descanso de anoche',
        };

  const cards = [
    modules.entreno && (
      <SummaryCard
        key="entreno"
        onClick={() => onGoToTab('entreno')}
        accentClasses="bg-orange-500/5 border-orange-500/25 text-orange-300 hover:bg-orange-500/10"
        icon={workoutCard.icon}
        title="Entreno"
        main={workoutCard.main}
        sub={workoutCard.sub}
      />
    ),
    modules.sueno && (
      <SummaryCard
        key="sueno"
        onClick={() => onGoToTab('sueno')}
        accentClasses="bg-violet-500/5 border-violet-500/25 text-violet-300 hover:bg-violet-500/10"
        icon={<MoonStar className="w-3.5 h-3.5 text-violet-400 shrink-0" />}
        title="Sueño"
        main={sleepCard.main}
        sub={sleepCard.sub}
      />
    ),
  ].filter(Boolean);

  if (cards.length === 0) return null;

  return <div className={`grid gap-3 ${cards.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>{cards}</div>;
}
