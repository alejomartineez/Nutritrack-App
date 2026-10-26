import { DEFAULT_EXERCISES, ROUTINE_TEMPLATES, WEEKDAY_LABELS, DEFAULT_REST_SEC } from './workoutData';
import { readJSON, writeJSON, removeKey, uid } from '../lib/storage';
import { dateKeyOf, keyToDate, mondayIndex } from '../lib/dates';
import {
  isBlank,
  num,
  isWorkSet,
  setVolume,
  finishedSessions,
  sessionsInRange,
  computeRangePRs,
  computePersonalRecords,
} from './workoutStats';

export { computePersonalRecords };

const KEYS = {
  EXERCISES: 'workout_exercises',
  ROUTINES: 'workout_routines',
  ACTIVE_ROUTINE: 'workout_active_routine_id',
  SESSIONS: 'workout_sessions',
  ACTIVE_SESSION: 'workout_active_session',
  SETTINGS: 'workout_settings',
  REST_TIMER: 'workout_rest_timer',
};

// ------------------------------- Ejercicios -------------------------------

/** Lo guardado + los ejercicios de catálogo que todavía no estaban (por id). */
export const loadExercises = () => {
  const stored = readJSON(KEYS.EXERCISES, null);
  const list = Array.isArray(stored) ? stored.filter((e) => e && e.id) : [];
  const ids = new Set(list.map((e) => e.id));
  return [...list, ...DEFAULT_EXERCISES.filter((e) => !ids.has(e.id))];
};
export const saveExercises = (list) => writeJSON(KEYS.EXERCISES, list);

export const createCustomExercise = ({ name, muscleGroup, equipment }) => ({
  id: uid('exc'),
  name: name.trim(),
  muscleGroup,
  equipment,
  isCustom: true,
});

// -------------------------------- Rutinas ---------------------------------

export const loadRoutines = () => {
  const list = readJSON(KEYS.ROUTINES, []);
  return Array.isArray(list) ? list.filter((r) => r && Array.isArray(r.days)) : [];
};
export const saveRoutines = (list) => writeJSON(KEYS.ROUTINES, list);
export const loadActiveRoutineId = () => readJSON(KEYS.ACTIVE_ROUTINE, null);
export const saveActiveRoutineId = (id) => writeJSON(KEYS.ACTIVE_ROUTINE, id);

const routineExercise = (exerciseId, targetSets = 3, targetRepsMin = 8, targetRepsMax = 12) => ({
  id: uid('rex'),
  exerciseId,
  targetSets,
  targetRepsMin,
  targetRepsMax,
});

export const buildRoutineFromTemplate = (templateId, customName) => {
  const template = ROUTINE_TEMPLATES.find((t) => t.id === templateId) || ROUTINE_TEMPLATES[ROUTINE_TEMPLATES.length - 1];
  return {
    id: uid('rt'),
    name: customName?.trim() || template.name,
    templateId: template.id,
    createdAt: Date.now(),
    days: template.days.map((def, i) => ({
      id: uid('day'),
      name: def ? def[0] : 'Descanso',
      weekday: WEEKDAY_LABELS[i],
      isRest: !def,
      exercises: def ? def[1].map(([id, sets, min, max]) => routineExercise(id, sets, min, max)) : [],
    })),
  };
};

const mapDay = (routine, dayId, fn) => ({ ...routine, days: routine.days.map((d) => (d.id === dayId ? fn(d) : d)) });

export const updateDay = (routine, dayId, patch) => mapDay(routine, dayId, (d) => ({ ...d, ...patch }));

export const addExercisesToDay = (routine, dayId, exerciseIds) =>
  mapDay(routine, dayId, (d) => ({ ...d, exercises: [...(d.exercises || []), ...exerciseIds.map((id) => routineExercise(id))] }));

export const removeExerciseFromDay = (routine, dayId, routineExerciseId) =>
  mapDay(routine, dayId, (d) => ({ ...d, exercises: d.exercises.filter((e) => e.id !== routineExerciseId) }));

export const updateRoutineExerciseTarget = (routine, dayId, routineExerciseId, patch) =>
  mapDay(routine, dayId, (d) => ({ ...d, exercises: d.exercises.map((e) => (e.id === routineExerciseId ? { ...e, ...patch } : e)) }));

const move = (list, index, dir) => {
  const to = index + dir;
  if (index < 0 || to < 0 || to >= list.length) return list;
  const next = [...list];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
};

export const moveDayExercise = (routine, dayId, routineExerciseId, dir) =>
  mapDay(routine, dayId, (d) => ({ ...d, exercises: move(d.exercises, d.exercises.findIndex((e) => e.id === routineExerciseId), dir) }));

/** Normaliza los objetivos del editor: sets 1–20, reps 1–100 y min ≤ max. */
export const sanitizeTarget = ({ targetSets, targetRepsMin, targetRepsMax }) => {
  const clamp = (v, lo, hi, fallback) => {
    const n = Math.round(num(v));
    return n > 0 ? Math.min(hi, Math.max(lo, n)) : fallback;
  };
  const sets = clamp(targetSets, 1, 20, 3);
  const min = clamp(targetRepsMin, 1, 100, 8);
  const max = Math.max(min, clamp(targetRepsMax, 1, 100, Math.max(min, 12)));
  return { targetSets: sets, targetRepsMin: min, targetRepsMax: max };
};

export const getRoutineDayForDate = (routine, date = new Date()) => routine?.days?.[mondayIndex(date)] || null;

// -------------------------------- Ajustes ---------------------------------

export const loadWorkoutSettings = () => {
  const s = readJSON(KEYS.SETTINGS, {});
  return { restSec: DEFAULT_REST_SEC, barKg: 20, sound: true, ...(s && typeof s === 'object' ? s : {}) };
};
export const saveWorkoutSettings = (s) => writeJSON(KEYS.SETTINGS, s);

/** Descanso en curso: { endsAt, durationSec } o null. */
export const loadRestTimer = () => {
  const t = readJSON(KEYS.REST_TIMER, null);
  return t && Number.isFinite(t.endsAt) ? t : null;
};
export const saveRestTimer = (t) => (t ? writeJSON(KEYS.REST_TIMER, t) : removeKey(KEYS.REST_TIMER));

// -------------------------------- Sesiones --------------------------------

export const loadSessions = () => {
  const map = readJSON(KEYS.SESSIONS, {});
  return map && typeof map === 'object' && !Array.isArray(map) ? map : {};
};
export const saveSessions = (map) => writeJSON(KEYS.SESSIONS, map);

export const loadActiveSession = () => {
  const s = readJSON(KEYS.ACTIVE_SESSION, null);
  return s && Array.isArray(s.exercises) ? s : null;
};
export const saveActiveSession = (session) => writeJSON(KEYS.ACTIVE_SESSION, session);
export const clearActiveSession = () => removeKey(KEYS.ACTIVE_SESSION);

export const newSet = (patch = {}) => ({ id: uid('set'), type: 'effective', weight: '', reps: '', rir: '', completed: false, ...patch });

const sessionExercise = (exerciseId, { routineExerciseId = null, targetSets = null, targetRepsMin = null, targetRepsMax = null, setCount = 3, addedAdHoc } = {}) => ({
  id: uid('sex'),
  routineExerciseId,
  exerciseId,
  notes: '',
  substitutedFrom: null,
  ...(addedAdHoc ? { addedAdHoc: true } : {}),
  targetSets,
  targetRepsMin,
  targetRepsMax,
  sets: Array.from({ length: Math.max(1, setCount) }, () => newSet()),
});

/** Sesión desde un día de la rutina, con las series objetivo ya creadas. */
export const startSession = (routine, day, { date = dateKeyOf(), now = Date.now() } = {}) => ({
  id: uid('ses'),
  routineId: routine?.id || null,
  dayId: day?.id || null,
  dayName: day?.name || 'Entreno libre',
  date,
  startedAt: now,
  endedAt: null,
  exercises: (day?.exercises || []).map((rex) =>
    sessionExercise(rex.exerciseId, {
      routineExerciseId: rex.id,
      targetSets: rex.targetSets ?? null,
      targetRepsMin: rex.targetRepsMin ?? null,
      targetRepsMax: rex.targetRepsMax ?? null,
      setCount: rex.targetSets || 3,
    })
  ),
});

export const startFreeSession = (opts) => startSession(null, null, opts);

const mapExercise = (session, sexId, fn) => ({ ...session, exercises: session.exercises.map((ex) => (ex.id === sexId ? fn(ex) : ex)) });

/** `lastSetCount(exerciseId)` → cuántas series hizo la última vez (o 0). */
export const addExercisesToSession = (session, exerciseIds, lastSetCount = () => 0) => ({
  ...session,
  exercises: [
    ...session.exercises,
    ...exerciseIds.map((id) => sessionExercise(id, { addedAdHoc: true, setCount: lastSetCount(id) || 3 })),
  ],
});

/** Nueva serie: copia la última cargada; si no hay, la referencia de la vez pasada. */
export const addSetToExercise = (session, sexId, reference = null) =>
  mapExercise(session, sexId, (ex) => {
    const last = ex.sets[ex.sets.length - 1];
    const pick = (field) => (last && !isBlank(last[field]) ? last[field] : reference && !isBlank(reference[field]) ? reference[field] : '');
    const type = last?.type && last.type !== 'warmup' ? last.type : 'effective';
    return { ...ex, sets: [...ex.sets, newSet({ type: type === 'dropset' ? 'dropset' : 'effective', weight: pick('weight'), reps: pick('reps') })] };
  });

export const updateSet = (session, sexId, setId, patch) =>
  mapExercise(session, sexId, (ex) => ({ ...ex, sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }));

export const removeSet = (session, sexId, setId) => mapExercise(session, sexId, (ex) => ({ ...ex, sets: ex.sets.filter((s) => s.id !== setId) }));

export const updateExerciseNotes = (session, sexId, notes) => mapExercise(session, sexId, (ex) => ({ ...ex, notes }));

export const removeExerciseFromSession = (session, sexId) => ({ ...session, exercises: session.exercises.filter((ex) => ex.id !== sexId) });

export const moveSessionExercise = (session, sexId, dir) => ({
  ...session,
  exercises: move(session.exercises, session.exercises.findIndex((ex) => ex.id === sexId), dir),
});

/**
 * Reemplaza el ejercicio en su lugar. Si ya tenía series hechas, esas se
 * conservan y el reemplazo va justo después.
 */
export const substituteExercise = (session, sexId, newExerciseId) => {
  const idx = session.exercises.findIndex((ex) => ex.id === sexId);
  if (idx === -1) return session;
  const original = session.exercises[idx];
  const replacement = {
    ...sessionExercise(newExerciseId, {
      routineExerciseId: original.routineExerciseId ?? null,
      targetSets: original.targetSets ?? null,
      targetRepsMin: original.targetRepsMin ?? null,
      targetRepsMax: original.targetRepsMax ?? null,
      setCount: Math.max(1, original.sets.filter((s) => !s.completed).length || original.targetSets || 3),
    }),
    substitutedFrom: original.exerciseId,
  };
  const next = [...session.exercises];
  const done = original.sets.filter((s) => s.completed);
  if (done.length) next.splice(idx, 1, { ...original, sets: done }, replacement);
  else next.splice(idx, 1, replacement);
  return { ...session, exercises: next };
};

/** Cierra la sesión: el tilde es el registro, las series sin tildar se descartan. */
export const finishSession = (session, now = Date.now()) => ({
  ...session,
  endedAt: session.endedAt || now,
  exercises: session.exercises.map((ex) => ({ ...ex, sets: ex.sets.filter((s) => s.completed) })),
});

export const countWorkSets = (session) =>
  (session?.exercises || []).reduce((n, ex) => n + (ex.sets || []).filter(isWorkSet).length, 0);

// ------------------------- Resúmenes para otras pantallas ------------------------

const totals = (sessions) => {
  let sets = 0;
  let volume = 0;
  let exercises = 0;
  sessions.forEach((s) =>
    (s.exercises || []).forEach((ex) => {
      const work = (ex.sets || []).filter(isWorkSet);
      if (work.length) exercises++;
      sets += work.length;
      work.forEach((set) => (volume += setVolume(set)));
    })
  );
  return { sets, volumeKg: Math.round(volume), exercises };
};

/**
 * Estado del entreno de un día, para el dashboard.
 * @returns {{ state: 'active'|'done'|'planned'|'rest'|'no_routine', dayName?, completedSets?, exerciseCount?, volumeKg?, durationMin? }}
 */
export const getTodayWorkoutSummary = (dateKey = dateKeyOf(), now = Date.now()) => {
  const active = loadActiveSession();
  if (active && !active.endedAt && dateKey === dateKeyOf(new Date(now))) {
    const t = totals([active]);
    return {
      state: 'active',
      dayName: active.dayName,
      completedSets: t.sets,
      exerciseCount: active.exercises.length,
      volumeKg: t.volumeKg,
      durationMin: Math.max(0, Math.round((now - (active.startedAt || now)) / 60000)),
    };
  }

  const done = finishedSessions(loadSessions()).filter((s) => s.date === dateKey);
  if (done.length) {
    const t = totals(done);
    return {
      state: 'done',
      dayName: done.map((s) => s.dayName).filter(Boolean).join(' + ') || 'Entreno',
      completedSets: t.sets,
      exerciseCount: t.exercises,
      volumeKg: t.volumeKg,
      durationMin: done.reduce((m, s) => m + Math.max(1, Math.round(((s.endedAt || 0) - (s.startedAt || s.endedAt || 0)) / 60000)), 0),
    };
  }

  const routine = loadRoutines().find((r) => r.id === loadActiveRoutineId()) || null;
  if (!routine) return { state: 'no_routine' };
  const day = routine.days[mondayIndex(keyToDate(dateKey))];
  if (!day || day.isRest) return { state: 'rest' };
  return { state: 'planned', dayName: day.name, exerciseCount: (day.exercises || []).length };
};

/**
 * Totales de [fromKey, toKey] (inclusive). `prs` son récords logrados en ese
 * rango; la primera vez que se hace un ejercicio no cuenta.
 */
export const getWorkoutRangeSummary = (fromKey, toKey) => {
  const sessionsMap = loadSessions();
  const list = sessionsInRange(sessionsMap, fromKey, toKey);
  const t = totals(list);
  const exercisesById = Object.fromEntries(loadExercises().map((e) => [e.id, e]));
  const prs = computeRangePRs(sessionsMap, exercisesById, fromKey, toKey).map(({ exerciseName, label }) => ({ exerciseName, label }));
  return { sessions: list.length, sets: t.sets, volumeKg: t.volumeKg, prs };
};
