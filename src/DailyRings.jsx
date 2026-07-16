import React, { useMemo } from 'react';
import { Utensils, Dumbbell, Moon, Flame } from 'lucide-react';
import { loadRoutines, loadActiveRoutineId, loadSessions } from './workout/workoutStorage';
import { loadSleepLogs } from './sleep/sleepStorage';

// ---------------------------------------------------------------------------
// ANILLOS DIARIOS + RACHA INDULGENTE
//
// El loop de hábito para "vení todos los días" sin ansiedad: 3 anillos (comida,
// movimiento, sueño) que se cierran al registrar cada pilar, y una racha de
// días activos que perdona UN día salteado (día libre), para que un olvido
// puntual no destruya semanas de constancia.
// ---------------------------------------------------------------------------

const NUTRI_LOG_PREFIX = 'nutri_log_';

const localDateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const prevKey = (dateKey) => {
  const d = new Date(`${dateKey}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return localDateKey(d);
};

const hasMeals = (log) => ((log?.planMeals?.length || 0) + (log?.freeMeals?.length || 0)) > 0;

/** Estado de los 3 anillos de hoy. La comida se lee del log en vivo; el resto de localStorage. */
const getTodayRings = (todayLog) => {
  const today = localDateKey();
  const mealsDone = hasMeals(todayLog);
  const sleepDone = Boolean(loadSleepLogs()[today]);

  // Movimiento (indulgente): entrenó hoy, o hoy es día de descanso en la rutina
  // activa, o todavía no tiene rutina (no lo penalizamos por no entrenar).
  const trainedToday = Object.values(loadSessions()).some((s) => s.date === today && s.endedAt);
  const activeRoutine = loadRoutines().find((r) => r.id === loadActiveRoutineId()) || null;
  let movementDone;
  if (trainedToday || !activeRoutine) {
    movementDone = true;
  } else {
    const idx = (new Date().getDay() + 6) % 7; // lunes = 0, como se arma la rutina
    const day = activeRoutine.days[idx];
    movementDone = Boolean(day && day.isRest);
  }

  return { mealsDone, movementDone, sleepDone };
};

/** Conjunto de días en que el usuario registró algo en cualquiera de los 3 pilares. */
const buildActiveDays = () => {
  const active = new Set();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(NUTRI_LOG_PREFIX)) continue;
      if (hasMeals(JSON.parse(localStorage.getItem(k)))) active.add(k.slice(NUTRI_LOG_PREFIX.length));
    }
  } catch (e) {
    // storage no disponible, se continúa con lo que haya
  }
  Object.keys(loadSleepLogs()).forEach((d) => active.add(d));
  Object.values(loadSessions()).forEach((s) => {
    if (s.endedAt) active.add(s.date);
  });
  return active;
};

/** Racha de días activos consecutivos, tolerando un único día salteado (freeze). */
export const computeLoggingStreak = () => {
  const active = buildActiveDays();
  const today = localDateKey();
  let cursor = active.has(today) ? today : prevKey(today); // el día en curso no rompe la racha
  let streak = 0;
  let freezeUsed = false;
  for (let i = 0; i < 400; i++) {
    if (active.has(cursor)) {
      streak++;
      cursor = prevKey(cursor);
      continue;
    }
    // cursor es un hueco. Solo gastamos el día libre si puentea a MÁS días activos;
    // un hueco al borde (fin de la racha) no debe consumir el freeze.
    if (freezeUsed) break;
    const beforeGap = prevKey(cursor);
    if (active.has(beforeGap)) {
      freezeUsed = true;
      cursor = beforeGap;
    } else {
      break;
    }
  }
  return { streak, freezeAvailable: !freezeUsed };
};

function Ring({ label, icon: Icon, done, color }) {
  const size = 58;
  const sw = 5;
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#334155" strokeWidth={sw} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={done ? 0 : c}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className="w-5 h-5" style={{ color: done ? color : '#64748b' }} />
        </div>
      </div>
      <span className={`text-[11px] font-medium ${done ? 'text-slate-200' : 'text-slate-500'}`}>{label}</span>
    </div>
  );
}

export default function DailyRings({ log }) {
  const rings = useMemo(() => getTodayRings(log), [log]);
  const { streak, freezeAvailable } = useMemo(() => computeLoggingStreak(), [log]);

  const items = [
    { key: 'comida', label: 'Comida', icon: Utensils, done: rings.mealsDone, color: '#10b981' },
    { key: 'movimiento', label: 'Movimiento', icon: Dumbbell, done: rings.movementDone, color: '#f97316' },
    { key: 'sueno', label: 'Sueño', icon: Moon, done: rings.sleepDone, color: '#8b5cf6' },
  ];

  return (
    <div className="rounded-3xl bg-slate-800/60 border border-slate-700 p-5">
      <div className="flex items-center justify-around">
        {items.map(({ key, ...it }) => (
          <Ring key={key} {...it} />
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-center gap-2 text-sm">
        <Flame className={`w-4 h-4 ${streak > 0 ? 'text-orange-400' : 'text-slate-500'}`} />
        <span className="font-mono font-bold text-slate-100">{streak}</span>
        <span className="text-slate-400">{streak === 1 ? 'día seguido' : 'días seguidos'}</span>
        {freezeAvailable && streak > 0 && <span className="text-[11px] text-slate-500">· 1 día libre disponible</span>}
      </div>
    </div>
  );
}
