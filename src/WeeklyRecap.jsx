import React, { useMemo } from 'react';
import { Sparkles, Utensils, Dumbbell, Moon, Trophy } from 'lucide-react';
import { loadSessions, loadExercises, computePersonalRecords } from './workout/workoutStorage';
import {
  loadSleepLogs,
  loadSleepGoalHours,
  computeWeeklyStats,
  correlateSleepWithWorkoutVolume,
  correlateLateDinnerWithQuality,
} from './sleep/sleepStorage';

// ---------------------------------------------------------------------------
// RECAP SEMANAL: una sola tarjeta que junta los 3 pilares de los últimos 7 días.
// Es el gancho de retención, presentado como recompensa (no como reporte): qué
// tan constante fuiste, cuánto entrenaste/dormiste, y un insight cruzado.
// ---------------------------------------------------------------------------

const KCAL_TOLERANCE = 100; // mismo criterio que el resto de la app

const localDateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const cutoffKey = () => {
  const d = new Date();
  d.setDate(d.getDate() - 6); // ventana de 7 días incluyendo hoy
  return localDateKey(d);
};

/** Elige el mejor insight disponible; si no hay datos cruzados suficientes, devuelve un resaltado propio. */
const buildInsight = (sleepLogs, nutrition, workout) => {
  const workoutCorr = correlateSleepWithWorkoutVolume(sleepLogs);
  if (workoutCorr.available && Math.abs(workoutCorr.pctDiff) >= 5) {
    return workoutCorr.pctDiff > 0
      ? `Rendiste un ${workoutCorr.pctDiff}% más en el gym las noches que dormiste +${workoutCorr.thresholdHours}h.`
      : `Con menos de ${workoutCorr.thresholdHours}h de sueño tu volumen en el gym baja notablemente.`;
  }

  const dinnerCorr = correlateLateDinnerWithQuality(sleepLogs);
  if (dinnerCorr.available && dinnerCorr.pctDiff > 0) {
    return `Las noches que cenaste después de las 22:00, tu descanso bajó un ${dinnerCorr.pctDiff}%.`;
  }

  // Sin correlaciones: resaltamos el punto más fuerte de la semana.
  if (nutrition.daysLogged >= 5) return `Tu punto fuerte: constancia. Registraste ${nutrition.daysLogged} de 7 días.`;
  if (workout.sessions >= 3) return `Semana sólida de entreno: ${workout.sessions} sesiones completadas.`;
  if (nutrition.daysLogged > 0) return 'Seguí registrando: cuantos más días cargues, mejores insights vas a ver.';
  return 'Seguí registrando tu semana para desbloquear insights automáticos.';
};

export default function WeeklyRecap({ weekStats, goals, modules = { entreno: true, sueno: true } }) {
  const data = useMemo(() => {
    // Nutrición: reutiliza lo ya calculado en Progreso (últimos 7 días).
    const daysLogged = weekStats.filter((d) => d.hasData).length;
    const daysInRange = weekStats.filter(
      (d) => d.hasData && Math.abs(d.kcal - (goals.calories || 0)) <= KCAL_TOLERANCE
    ).length;
    const nutrition = { daysLogged, daysInRange };

    // Sueño: promedio de la semana.
    const sleepLogs = loadSleepLogs();
    const sleepStats = computeWeeklyStats(sleepLogs, loadSleepGoalHours());

    // Entreno: sesiones terminadas en la ventana + PR nuevo esta semana.
    const cutoff = cutoffKey();
    const sessions = loadSessions();
    const weekSessions = Object.values(sessions).filter((s) => s.endedAt && s.date >= cutoff);
    const exercisesById = Object.fromEntries(loadExercises().map((e) => [e.id, e]));
    const newPRs = computePersonalRecords(sessions, exercisesById).filter((pr) => pr.date >= cutoff);
    const workout = { sessions: weekSessions.length, newPRs: newPRs.length };

    const insight = buildInsight(sleepLogs, nutrition, workout);

    return { nutrition, sleepStats, workout, insight };
  }, [weekStats, goals]);

  const stats = [
    {
      icon: Utensils,
      color: 'text-emerald-400',
      value: `${data.nutrition.daysLogged}/7`,
      label: data.nutrition.daysLogged === 1 ? 'día registrado' : 'días registrados',
    },
    modules.entreno && {
      icon: Dumbbell,
      color: 'text-emerald-400',
      value: `${data.workout.sessions}`,
      label: data.workout.sessions === 1 ? 'entreno' : 'entrenos',
    },
    modules.sueno && {
      icon: Moon,
      color: 'text-violet-400',
      value: data.sleepStats.nightsLogged > 0 ? `${data.sleepStats.avgHours}h` : '—',
      label: 'sueño prom.',
    },
  ].filter(Boolean);

  return (
    <div className="rounded-3xl surface-accent p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-300" />
          <h2 className="label-section">Tu semana</h2>
        </div>
        {data.workout.newPRs > 0 && (
          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded-full px-2.5 py-1">
            <Trophy className="w-3 h-3" /> {data.workout.newPRs} PR{data.workout.newPRs === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <div className={`grid gap-3 ${stats.length === 1 ? 'grid-cols-1' : stats.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-slate-900/40 border border-slate-700/60 p-3 flex flex-col items-center text-center">
            <s.icon className={`w-4 h-4 ${s.color} mb-1`} />
            <span className="font-mono text-xl font-black text-slate-100">{s.value}</span>
            <span className="text-[10px] text-slate-400 leading-tight mt-0.5">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-2xl bg-slate-900/40 border border-slate-700/60 px-3.5 py-3">
        <Sparkles className="w-4 h-4 text-emerald-300 mt-0.5 shrink-0" />
        <p className="text-sm text-slate-200 leading-snug">{data.insight}</p>
      </div>
    </div>
  );
}
