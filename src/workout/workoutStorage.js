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

// ------------------------------ Día de hoy --------------------------------
//
// La rutina guarda sus 7 días en orden de WEEKDAY_LABELS (lunes primero),
// mientras que `Date.getDay()` devuelve domingo=0. Todo lo que mapea una fecha
// a un día de rutina pasa por acá para no repetir el corrimiento.

/** Índice 0-6 del día de la semana con LUNES como 0. */
export const weekdayIndex = (date = new Date()) => (date.getDay() + 6) % 7;

/** El día de la rutina que corresponde a una fecha (o null si no hay rutina). */
export const getRoutineDayForDate = (routine, date = new Date()) =>
  routine?.days?.[weekdayIndex(date)] || null;

/** Sesiones ya finalizadas de una fecha concreta, de la más reciente a la más vieja. */
export const getSessionsForDate = (sessionsMap, dateKey = localDateKey()) =>
  Object.values(sessionsMap)
    .filter((s) => s.date === dateKey && s.endedAt)
    .sort((a, b) => b.endedAt - a.endedAt);

/** Sesiones finalizadas, de la más reciente a la más vieja. */
export const getRecentSessions = (sessionsMap, limit = Infinity) =>
  Object.values(sessionsMap)
    .filter((s) => s.endedAt)
    .sort((a, b) => b.endedAt - a.endedAt)
    .slice(0, limit);

/**
 * Números de cabecera de una sesión. Solo cuenta series completadas que no
 * sean calentamiento, igual que el resto de las analíticas: si el
 * calentamiento sumara volumen, dos sesiones idénticas darían distinto según
 * cuánto calentaste.
 */
export const summarizeSession = (session, exercisesById = {}) => {
  let volume = 0;
  let effectiveSets = 0;
  const muscleGroups = [];

  session.exercises.forEach((ex) => {
    const done = ex.sets.filter((s) => s.completed && s.type !== 'warmup');
    if (done.length === 0) return;
    effectiveSets += done.length;
    done.forEach((s) => {
      volume += (Number(s.weight) || 0) * (Number(s.reps) || 0);
    });
    const group = exercisesById[ex.exerciseId]?.muscleGroup;
    if (group && !muscleGroups.includes(group)) muscleGroups.push(group);
  });

  return {
    volume: Math.round(volume),
    effectiveSets,
    exercisesDone: session.exercises.filter((ex) => ex.sets.some((s) => s.completed)).length,
    durationMin: session.endedAt ? Math.max(1, Math.round((session.endedAt - session.startedAt) / 60000)) : null,
    muscleGroups,
  };
};

/**
 * Los 7 días de la semana en curso cruzados con lo que efectivamente se
 * entrenó. Es lo que alimenta la tira de puntos de la pestaña "Hoy": de un
 * vistazo se ve qué tocaba, qué se hizo y qué se salteó.
 */
export const computeWeekPlan = (routine, sessionsMap, referenceDate = new Date()) => {
  const weekStart = startOfWeek(referenceDate);
  const todayKey = localDateKey(referenceDate);

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    const key = localDateKey(date);
    const day = routine?.days?.[i] || null;
    const sessions = getSessionsForDate(sessionsMap, key);

    return {
      key,
      weekday: WEEKDAY_LABELS[i],
      short: WEEKDAY_LABELS[i].slice(0, 1),
      dayName: day?.name || null,
      dayId: day?.id || null,
      isRest: day ? day.isRest : false,
      exerciseCount: day?.exercises?.length || 0,
      isToday: key === todayKey,
      isPast: key < todayKey,
      isFuture: key > todayKey,
      trained: sessions.length > 0,
      sessions,
    };
  });
};

/**
 * Adherencia por semana: cuántos días de entreno programaba la rutina vs en
 * cuántos se registró sesión. Reemplaza al "volumen y ya": se puede levantar
 * menos kilos una semana y aun así haber cumplido, y eso es lo que sostiene
 * el hábito.
 */
export const computeWeeklyAdherence = (routine, sessionsMap, weeksBack = 4, referenceDate = new Date()) => {
  const plannedPerWeek = routine ? routine.days.filter((d) => !d.isRest).length : 0;
  const weeks = [];

  for (let i = weeksBack - 1; i >= 0; i--) {
    const ref = new Date(referenceDate);
    ref.setDate(ref.getDate() - i * 7);
    const weekStart = startOfWeek(ref);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Días distintos con sesión, no sesiones: dos entrenos el mismo día no
    // cuentan como dos días cumplidos.
    const daysTrained = new Set(
      Object.values(sessionsMap)
        .filter((s) => s.endedAt)
        .filter((s) => {
          const d = new Date(`${s.date}T00:00:00`);
          return d >= weekStart && d < weekEnd;
        })
        .map((s) => s.date)
    ).size;

    weeks.push({ weekStart: localDateKey(weekStart), planned: plannedPerWeek, done: daysTrained });
  }
  return weeks;
};

/** Volumen efectivo (peso × reps, sin calentamiento) en [start, end). */
const volumeInRange = (sessionsMap, start, end) => {
  let volume = 0;
  Object.values(sessionsMap).forEach((session) => {
    const date = new Date(`${session.date}T00:00:00`);
    if (date < start || date >= end) return;
    session.exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        if (s.completed && s.type !== 'warmup') volume += (Number(s.weight) || 0) * (Number(s.reps) || 0);
      });
    });
  });
  return Math.round(volume);
};

/**
 * Volumen de la semana en curso y variación contra la anterior.
 *
 * La comparación es contra los MISMOS días de la semana pasada, no contra la
 * semana entera: un martes lleva dos días de entreno y la semana anterior
 * lleva siete, así que comparar los totales daba siempre un desplome del 80%
 * y el número no significaba nada hasta el domingo.
 */
export const computeVolumeTrend = (sessionsMap, referenceDate = new Date()) => {
  const weekStart = startOfWeek(referenceDate);
  const daysElapsed = weekdayIndex(referenceDate) + 1;

  const currentEnd = new Date(weekStart);
  currentEnd.setDate(currentEnd.getDate() + daysElapsed);

  const previousStart = new Date(weekStart);
  previousStart.setDate(previousStart.getDate() - 7);
  const previousEnd = new Date(previousStart);
  previousEnd.setDate(previousEnd.getDate() + daysElapsed);

  const current = volumeInRange(sessionsMap, weekStart, currentEnd);
  const previous = volumeInRange(sessionsMap, previousStart, previousEnd);
  const pctChange = previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;

  return { current, previous, pctChange, daysElapsed };
};

/** Evolución del 1RM estimado de un ejercicio, sesión a sesión (para sparklines). */
export const computeExerciseProgress = (sessionsMap, exerciseId) =>
  getRecentSessions(sessionsMap)
    .slice()
    .reverse()
    .map((session) => {
      const best = session.exercises
        .filter((ex) => ex.exerciseId === exerciseId)
        .flatMap((ex) => ex.sets)
        .filter((s) => s.completed && s.type !== 'warmup')
        .reduce((max, s) => Math.max(max, epley1RM(s.weight, s.reps)), 0);
      return best > 0 ? { date: session.date, estOneRM: best } : null;
    })
    .filter(Boolean);

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
