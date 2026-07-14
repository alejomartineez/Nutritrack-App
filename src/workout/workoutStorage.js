import { DEFAULT_EXERCISES, ROUTINE_TEMPLATES, WEEKDAY_LABELS, epley1RM } from './workoutData';

// ---------------------------------------------------------------------------
// PERSISTENCIA (localStorage — offline-first: todo funciona sin conexión;
// exportar/importar JSON sirve como respaldo manual mientras no exista backend)
// ---------------------------------------------------------------------------

const KEYS = {
  EXERCISES: 'workout_exercises',
  ROUTINES: 'workout_routines',
  ACTIVE_ROUTINE: 'workout_active_routine_id',
  SESSIONS: 'workout_sessions',
  ACTIVE_SESSION: 'workout_active_session',
};

const uid = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

/** Fecha local YYYY-MM-DD (no UTC), consistente con el resto de la app (ver dateKeyOf en App.jsx). */
const localDateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const readJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
};

const writeJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // almacenamiento no disponible, se continúa sin persistir
  }
};

// ------------------------------- Ejercicios -------------------------------

export const loadExercises = () => readJSON(KEYS.EXERCISES, DEFAULT_EXERCISES);
export const saveExercises = (list) => writeJSON(KEYS.EXERCISES, list);

export const createCustomExercise = ({ name, muscleGroup, equipment }) => ({
  id: uid('exc'),
  name: name.trim(),
  muscleGroup,
  equipment,
  isCustom: true,
});

// -------------------------------- Rutinas ---------------------------------

export const loadRoutines = () => readJSON(KEYS.ROUTINES, []);
export const saveRoutines = (list) => writeJSON(KEYS.ROUTINES, list);

export const loadActiveRoutineId = () => readJSON(KEYS.ACTIVE_ROUTINE, null);
export const saveActiveRoutineId = (id) => writeJSON(KEYS.ACTIVE_ROUTINE, id);

export const buildRoutineFromTemplate = (templateId, customName) => {
  const template = ROUTINE_TEMPLATES.find((t) => t.id === templateId) || ROUTINE_TEMPLATES[ROUTINE_TEMPLATES.length - 1];
  return {
    id: uid('rt'),
    name: customName?.trim() || template.name,
    templateId: template.id,
    createdAt: Date.now(),
    days: template.days.map((dayName, i) => ({
      id: uid('day'),
      name: dayName,
      weekday: WEEKDAY_LABELS[i],
      isRest: dayName.toLowerCase().includes('descanso'),
      exercises: [],
    })),
  };
};

export const addExerciseToDay = (routine, dayId, exerciseId) => ({
  ...routine,
  days: routine.days.map((d) =>
    d.id === dayId
      ? {
          ...d,
          exercises: [
            ...d.exercises,
            { id: uid('rex'), exerciseId, targetSets: 3, targetRepsMin: 8, targetRepsMax: 12 },
          ],
        }
      : d
  ),
});

export const removeExerciseFromDay = (routine, dayId, routineExerciseId) => ({
  ...routine,
  days: routine.days.map((d) =>
    d.id === dayId ? { ...d, exercises: d.exercises.filter((e) => e.id !== routineExerciseId) } : d
  ),
});

export const updateRoutineExerciseTarget = (routine, dayId, routineExerciseId, patch) => ({
  ...routine,
  days: routine.days.map((d) =>
    d.id === dayId
      ? {
          ...d,
          exercises: d.exercises.map((e) => (e.id === routineExerciseId ? { ...e, ...patch } : e)),
        }
      : d
  ),
});

// -------------------------------- Sesiones --------------------------------

export const loadSessions = () => readJSON(KEYS.SESSIONS, {});
export const saveSessions = (map) => writeJSON(KEYS.SESSIONS, map);

/** Sesión en curso (todavía no finalizada): se persiste aparte para poder resumir un entrenamiento
 * si se cierra la app o pierde conexión a mitad de la rutina (offline-first). */
export const loadActiveSession = () => readJSON(KEYS.ACTIVE_SESSION, null);
export const saveActiveSession = (session) => writeJSON(KEYS.ACTIVE_SESSION, session);
export const clearActiveSession = () => {
  try {
    localStorage.removeItem(KEYS.ACTIVE_SESSION);
  } catch (e) {
    // almacenamiento no disponible, se continúa sin persistir
  }
};

export const startSession = (routine, day) => ({
  id: uid('ses'),
  routineId: routine.id,
  dayId: day.id,
  dayName: day.name,
  date: localDateKey(),
  startedAt: Date.now(),
  endedAt: null,
  exercises: day.exercises.map((rex, i) => ({
    id: uid('sex'),
    routineExerciseId: rex.id,
    exerciseId: rex.exerciseId,
    order: i,
    notes: '',
    substitutedFrom: null,
    sets: [],
  })),
});

export const addSetToExercise = (session, sessionExerciseId, set) => ({
  ...session,
  exercises: session.exercises.map((ex) =>
    ex.id === sessionExerciseId
      ? { ...ex, sets: [...ex.sets, { id: uid('set'), completed: false, ...set }] }
      : ex
  ),
});

export const updateSet = (session, sessionExerciseId, setId, patch) => ({
  ...session,
  exercises: session.exercises.map((ex) =>
    ex.id === sessionExerciseId
      ? { ...ex, sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }
      : ex
  ),
});

export const removeSet = (session, sessionExerciseId, setId) => ({
  ...session,
  exercises: session.exercises.map((ex) =>
    ex.id === sessionExerciseId ? { ...ex, sets: ex.sets.filter((s) => s.id !== setId) } : ex
  ),
});

export const updateExerciseNotes = (session, sessionExerciseId, notes) => ({
  ...session,
  exercises: session.exercises.map((ex) => (ex.id === sessionExerciseId ? { ...ex, notes } : ex)),
});

export const substituteExercise = (session, sessionExerciseId, newExerciseId) => {
  const idx = session.exercises.findIndex((ex) => ex.id === sessionExerciseId);
  if (idx === -1) return session;
  const original = session.exercises[idx];
  const replacement = {
    id: uid('sex'),
    routineExerciseId: original.routineExerciseId,
    exerciseId: newExerciseId,
    order: original.order + 0.5,
    notes: '',
    substitutedFrom: original.exerciseId,
    sets: [],
  };
  const next = [...session.exercises];
  next.splice(idx + 1, 0, replacement);
  return { ...session, exercises: next };
};

export const finishSession = (session) => ({ ...session, endedAt: Date.now() });

// --------------------- Historial / auto-fill / analíticas ------------------

/** Devuelve el último set "efectivo" registrado para un ejercicio antes de la sesión actual. */
export const getLastPerformance = (sessionsMap, exerciseId, excludeSessionId) => {
  const candidates = Object.values(sessionsMap)
    .filter((s) => s.id !== excludeSessionId && s.endedAt)
    .sort((a, b) => b.endedAt - a.endedAt);

  for (const session of candidates) {
    const matches = session.exercises.filter((ex) => ex.exerciseId === exerciseId);
    for (const match of matches) {
      const completedSets = match.sets.filter((s) => s.completed && s.type !== 'warmup');
      if (completedSets.length > 0) {
        const last = completedSets[completedSets.length - 1];
        return { date: session.date, weight: last.weight, reps: last.reps, rir: last.rir, setsCount: completedSets.length };
      }
    }
  }
  return null;
};

const startOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // lunes como inicio de semana
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const computeWeeklyEffectiveSets = (sessionsMap, exercisesById, referenceDate = new Date()) => {
  const weekStart = startOfWeek(referenceDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const perMuscle = {};
  Object.values(sessionsMap).forEach((session) => {
    const sessionDate = new Date(`${session.date}T00:00:00`);
    if (sessionDate < weekStart || sessionDate >= weekEnd) return;
    session.exercises.forEach((ex) => {
      const exercise = exercisesById[ex.exerciseId];
      if (!exercise) return;
      const effectiveCount = ex.sets.filter((s) => s.completed && s.type !== 'warmup').length;
      if (effectiveCount === 0) return;
      perMuscle[exercise.muscleGroup] = (perMuscle[exercise.muscleGroup] || 0) + effectiveCount;
    });
  });
  return perMuscle;
};

export const computeWeeklyVolumeHistory = (sessionsMap, weeksBack = 8, referenceDate = new Date()) => {
  const weeks = [];
  for (let i = weeksBack - 1; i >= 0; i--) {
    const ref = new Date(referenceDate);
    ref.setDate(ref.getDate() - i * 7);
    const weekStart = startOfWeek(ref);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    let volume = 0;
    Object.values(sessionsMap).forEach((session) => {
      const sessionDate = new Date(`${session.date}T00:00:00`);
      if (sessionDate < weekStart || sessionDate >= weekEnd) return;
      session.exercises.forEach((ex) => {
        ex.sets.forEach((s) => {
          if (s.completed && s.type !== 'warmup') {
            volume += (Number(s.weight) || 0) * (Number(s.reps) || 0);
          }
        });
      });
    });
    weeks.push({ weekStart: localDateKey(weekStart), volume: Math.round(volume) });
  }
  return weeks;
};

export const computePersonalRecords = (sessionsMap, exercisesById) => {
  const prs = {};
  Object.values(sessionsMap).forEach((session) => {
    session.exercises.forEach((ex) => {
      const exercise = exercisesById[ex.exerciseId];
      if (!exercise) return;
      ex.sets.forEach((s) => {
        if (!s.completed || s.type === 'warmup') return;
        const est = epley1RM(s.weight, s.reps);
        if (est <= 0) return;
        const current = prs[ex.exerciseId];
        if (!current || est > current.estOneRM) {
          prs[ex.exerciseId] = {
            exerciseId: ex.exerciseId,
            exerciseName: exercise.name,
            estOneRM: est,
            weight: Number(s.weight) || 0,
            reps: Number(s.reps) || 0,
            date: session.date,
          };
        }
      });
    });
  });
  return Object.values(prs).sort((a, b) => b.estOneRM - a.estOneRM);
};

export const computeAverageRIRTrend = (sessionsMap, weeksBack = 8, referenceDate = new Date()) => {
  const weeks = [];
  for (let i = weeksBack - 1; i >= 0; i--) {
    const ref = new Date(referenceDate);
    ref.setDate(ref.getDate() - i * 7);
    const weekStart = startOfWeek(ref);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    let sum = 0;
    let count = 0;
    Object.values(sessionsMap).forEach((session) => {
      const sessionDate = new Date(`${session.date}T00:00:00`);
      if (sessionDate < weekStart || sessionDate >= weekEnd) return;
      session.exercises.forEach((ex) => {
        ex.sets.forEach((s) => {
          if (s.completed && s.type !== 'warmup' && s.rir !== '' && s.rir != null) {
            sum += s.rir === '4+' ? 4 : Number(s.rir);
            count++;
          }
        });
      });
    });
    weeks.push({ weekStart: localDateKey(weekStart), avgRir: count > 0 ? Math.round((sum / count) * 10) / 10 : null });
  }
  return weeks;
};

// ------------------------------- Exportación -------------------------------

const downloadBlob = (content, filename, mime) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const exportWorkoutDataAsJSON = () => {
  const payload = {
    exercises: loadExercises(),
    routines: loadRoutines(),
    sessions: loadSessions(),
    exportedAt: new Date().toISOString(),
  };
  downloadBlob(JSON.stringify(payload, null, 2), `entrenamiento_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
};

export const exportWorkoutDataAsCSV = () => {
  const sessions = loadSessions();
  const exercisesById = Object.fromEntries(loadExercises().map((e) => [e.id, e]));
  const rows = [['fecha', 'dia', 'ejercicio', 'grupo_muscular', 'serie', 'tipo', 'peso', 'reps', 'rir', 'completada']];
  Object.values(sessions).forEach((session) => {
    session.exercises.forEach((ex) => {
      const exercise = exercisesById[ex.exerciseId];
      ex.sets.forEach((s, i) => {
        rows.push([
          session.date,
          session.dayName,
          exercise?.name || ex.exerciseId,
          exercise?.muscleGroup || '',
          i + 1,
          s.type,
          s.weight,
          s.reps,
          s.rir,
          s.completed ? 'si' : 'no',
        ]);
      });
    });
  });
  const csv = rows.map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  downloadBlob(csv, `entrenamiento_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
};
