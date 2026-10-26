import { epley1RM, WEEKDAY_LABELS } from './workoutData';
import { dateKeyOf, addDaysToKey, keyToDate, mondayIndex } from '../lib/dates';

// Cálculos puros sobre sesiones (sin storage). Los datos viejos pueden traer
// peso/reps como '' o string, y tipos de serie legados: todo pasa por `num`.

export const isBlank = (v) => v == null || (typeof v === 'string' && v.trim() === '');

/** Número robusto: '62,5' → 62.5, '' → 0. */
export const num = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (isBlank(v)) return 0;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

export const isWorkSet = (s) => !!s?.completed && s.type !== 'warmup';
export const setVolume = (s) => num(s.weight) * num(s.reps);

const exercisesOf = (session) => (Array.isArray(session?.exercises) ? session.exercises : []);
const setsOf = (ex) => (Array.isArray(ex?.sets) ? ex.sets : []);

/** Más reciente primero: por fecha y, dentro del día, por hora de cierre. */
const byRecent = (a, b) => (a.date === b.date ? (b.endedAt || 0) - (a.endedAt || 0) : a.date < b.date ? 1 : -1);

/** Sesiones terminadas, de la más reciente a la más vieja. */
export const finishedSessions = (sessionsMap) =>
  Object.values(sessionsMap || {})
    .filter((s) => s && s.endedAt && s.date)
    .sort(byRecent);

export const sessionsInRange = (sessionsMap, fromKey, toKey) =>
  finishedSessions(sessionsMap).filter((s) => s.date >= fromKey && s.date <= toKey);

export const summarizeSession = (session, exercisesById = {}) => {
  let volume = 0;
  let effectiveSets = 0;
  let reps = 0;
  let exercisesDone = 0;
  const muscleGroups = [];
  exercisesOf(session).forEach((ex) => {
    const sets = setsOf(ex);
    if (sets.some((s) => s.completed)) exercisesDone++;
    const work = sets.filter(isWorkSet);
    if (!work.length) return;
    effectiveSets += work.length;
    work.forEach((s) => {
      volume += setVolume(s);
      reps += num(s.reps);
    });
    const group = exercisesById[ex.exerciseId]?.muscleGroup;
    if (group && !muscleGroups.includes(group)) muscleGroups.push(group);
  });
  return {
    volume: Math.round(volume),
    effectiveSets,
    reps,
    exercisesDone,
    durationMin: session?.endedAt && session.startedAt ? Math.max(1, Math.round((session.endedAt - session.startedAt) / 60000)) : null,
    muscleGroups,
  };
};

// ------------------------------- Récords -----------------------------------

/**
 * Puntaje de una serie para comparar récords: con peso, 1RM estimado (Epley);
 * sin peso (dominadas, fondos, plancha), repeticiones.
 */
export const setScore = (s) => {
  const w = num(s.weight);
  const r = num(s.reps);
  if (r <= 0) return null;
  return w > 0 ? { kind: 'load', value: epley1RM(w, r), weight: w, reps: r } : { kind: 'reps', value: r, weight: 0, reps: r };
};

const emptyBest = () => ({ load: null, reps: null });

const improve = (best, s) => {
  const sc = setScore(s);
  if (!sc) return null;
  const cur = best[sc.kind];
  if (!cur || sc.value > cur.value) {
    best[sc.kind] = sc;
    return sc;
  }
  return null;
};

/** ¿La serie supera al mejor previo? Nunca cuenta la primera vez que se hace el ejercicio. */
export const beatsBest = (s, best) => {
  if (!best || (!best.load && !best.reps)) return false;
  const sc = setScore(s);
  if (!sc) return false;
  const cur = best[sc.kind];
  return !!cur && sc.value > cur.value;
};

export const formatScore = (sc) => {
  if (!sc) return '';
  const n = (v) => String(Math.round(v * 100) / 100).replace('.', ',');
  return sc.kind === 'load' ? `${n(sc.weight)} kg × ${sc.reps}` : `${sc.reps} reps`;
};

/**
 * Índice por ejercicio, armado una sola vez por render de la sesión:
 * historial (más reciente primero) y mejores marcas previas.
 */
export const buildHistoryIndex = (sessionsMap, { excludeId = null, untilDate = null } = {}) => {
  const entries = new Map();
  const best = new Map();
  finishedSessions(sessionsMap).forEach((session) => {
    if (session.id === excludeId) return;
    if (untilDate && session.date > untilDate) return;
    exercisesOf(session).forEach((ex) => {
      const done = setsOf(ex).filter((s) => s.completed);
      if (!done.length) return;
      if (!entries.has(ex.exerciseId)) entries.set(ex.exerciseId, []);
      const list = entries.get(ex.exerciseId);
      const last = list[list.length - 1];
      // Mismo ejercicio dos veces en una sesión: se junta.
      if (last && last.sessionId === session.id) last.sets = [...last.sets, ...done];
      else list.push({ sessionId: session.id, date: session.date, sets: done });
      if (!best.has(ex.exerciseId)) best.set(ex.exerciseId, emptyBest());
      done.filter(isWorkSet).forEach((s) => improve(best.get(ex.exerciseId), s));
    });
  });
  return { entries, best };
};

/**
 * Referencia "Anterior" para la serie `index` de la sesión actual: se alinean
 * calentamientos con calentamientos y efectivas con efectivas.
 */
export const referenceForSet = (prevSets, currentSets, index) => {
  if (!prevSets?.length) return null;
  const set = currentSets[index];
  const warm = set?.type === 'warmup';
  const pos = currentSets.slice(0, index).filter((s) => (s.type === 'warmup') === warm).length;
  const pool = prevSets.filter((s) => (s.type === 'warmup') === warm);
  const ref = pool[pos] || (warm ? null : pool[pool.length - 1]) || null;
  if (!ref || (isBlank(ref.reps) && isBlank(ref.weight))) return null;
  return { weight: isBlank(ref.weight) ? '' : num(ref.weight), reps: isBlank(ref.reps) ? '' : num(ref.reps) };
};

/**
 * Sobrecarga progresiva: si la última vez todas las efectivas llegaron al tope
 * del rango, sugerir subir.
 */
export const overloadHint = (lastEntry, targetRepsMax, { timed = false } = {}) => {
  if (!lastEntry || !targetRepsMax) return null;
  const work = lastEntry.sets.filter(isWorkSet);
  if (!work.length || !work.every((s) => num(s.reps) >= targetRepsMax)) return null;
  if (work.some((s) => num(s.weight) > 0)) return { kind: 'load', text: 'Probá +2,5 kg' };
  return { kind: 'reps', text: timed ? 'Probá +5 s' : 'Probá +1 rep' };
};

/** Mejor marca de cada ejercicio en todo el historial (formato que ya usan otras pantallas). */
export const computePersonalRecords = (sessionsMap, exercisesById) => {
  const prs = {};
  finishedSessions(sessionsMap)
    .slice()
    .reverse()
    .forEach((session) => {
      exercisesOf(session).forEach((ex) => {
        const exercise = exercisesById[ex.exerciseId];
        if (!exercise) return;
        setsOf(ex).filter(isWorkSet).forEach((s) => {
          const est = epley1RM(num(s.weight), num(s.reps));
          if (est <= 0) return;
          const current = prs[ex.exerciseId];
          if (!current || est > current.estOneRM) {
            prs[ex.exerciseId] = {
              exerciseId: ex.exerciseId,
              exerciseName: exercise.name,
              estOneRM: est,
              weight: num(s.weight),
              reps: num(s.reps),
              date: session.date,
            };
          }
        });
      });
    });
  return Object.values(prs).sort((a, b) => b.estOneRM - a.estOneRM);
};

/**
 * Récords conseguidos dentro de [fromKey, toKey]: recorre el historial en orden
 * y marca cada vez que una serie supera la mejor marca previa. El primer
 * registro de un ejercicio no es récord.
 */
export const computeRangePRs = (sessionsMap, exercisesById, fromKey, toKey) => {
  const best = new Map();
  const found = new Map();
  finishedSessions(sessionsMap)
    .slice()
    .reverse()
    .forEach((session) => {
      if (session.date > toKey) return;
      const inRange = session.date >= fromKey;
      exercisesOf(session).forEach((ex) => {
        const work = setsOf(ex).filter(isWorkSet);
        if (!work.length) return;
        const had = best.get(ex.exerciseId);
        const b = had || emptyBest();
        const seenBefore = !!had && (had.load || had.reps);
        // Las series de la misma sesión se comparan contra lo previo a la sesión.
        const before = { load: b.load, reps: b.reps };
        work.forEach((s) => {
          const sc = setScore(s);
          if (!sc) return;
          if (inRange && seenBefore && before[sc.kind] && sc.value > before[sc.kind].value) {
            const cur = found.get(ex.exerciseId);
            const rank = (x) => (x.kind === 'load' ? 1e6 : 0) + x.value;
            if (!cur || rank(sc) > rank(cur.score)) found.set(ex.exerciseId, { score: sc, date: session.date, prev: before[sc.kind] });
          }
          improve(b, s);
        });
        best.set(ex.exerciseId, b);
      });
    });
  return [...found.entries()].map(([exerciseId, f]) => ({
    exerciseId,
    exerciseName: exercisesById[exerciseId]?.name || 'Ejercicio',
    label: formatScore(f.score),
    kind: f.score.kind,
    value: f.score.value,
    date: f.date,
    prevLabel: formatScore(f.prev),
  }));
};

/** Récords de una sesión concreta (para el resumen al terminar). */
export const computeSessionPRs = (session, sessionsMap, exercisesById) => {
  const { best } = buildHistoryIndex(sessionsMap, { excludeId: session.id });
  const out = new Map();
  exercisesOf(session).forEach((ex) => {
    const prev = best.get(ex.exerciseId);
    setsOf(ex).filter(isWorkSet).forEach((s) => {
      if (!beatsBest(s, prev)) return;
      const sc = setScore(s);
      const cur = out.get(ex.exerciseId);
      if (!cur || (sc.kind === 'load' && cur.score.kind !== 'load') || (sc.kind === cur.score.kind && sc.value > cur.score.value)) {
        out.set(ex.exerciseId, { score: sc, prev: prev[sc.kind] });
      }
    });
  });
  return [...out.entries()].map(([exerciseId, { score, prev }]) => ({
    exerciseId,
    exerciseName: exercisesById[exerciseId]?.name || 'Ejercicio',
    label: formatScore(score),
    prevLabel: formatScore(prev),
    kind: score.kind,
    estOneRM: score.kind === 'load' ? score.value : null,
  }));
};

/** Mejor marca vigente de cada ejercicio y cuándo se logró (más recientes primero). */
export const computeRecordsList = (sessionsMap, exercisesById) => {
  const best = new Map();
  finishedSessions(sessionsMap)
    .slice()
    .reverse()
    .forEach((session) =>
      exercisesOf(session).forEach((ex) =>
        setsOf(ex).filter(isWorkSet).forEach((s) => {
          if (!best.has(ex.exerciseId)) best.set(ex.exerciseId, { ...emptyBest(), dates: {} });
          const b = best.get(ex.exerciseId);
          const sc = improve(b, s);
          if (sc) b.dates[sc.kind] = session.date;
        })
      )
    );
  return [...best.entries()]
    .filter(([id]) => exercisesById[id])
    .map(([exerciseId, b]) => {
      const kind = b.load ? 'load' : 'reps';
      return { exerciseId, exerciseName: exercisesById[exerciseId].name, label: formatScore(b[kind]), kind, date: b.dates[kind] };
    })
    .sort((a, b) => (a.date === b.date ? a.exerciseName.localeCompare(b.exerciseName, 'es') : a.date < b.date ? 1 : -1));
};

/** Historial de un ejercicio, del más viejo al más nuevo, con su mejor marca por sesión. */
export const computeExerciseHistory = (sessionsMap, exerciseId) => {
  const out = [];
  finishedSessions(sessionsMap)
    .slice()
    .reverse()
    .forEach((session) => {
      const sets = exercisesOf(session)
        .filter((ex) => ex.exerciseId === exerciseId)
        .flatMap((ex) => setsOf(ex).filter((s) => s.completed));
      if (!sets.length) return;
      const b = emptyBest();
      sets.filter(isWorkSet).forEach((s) => improve(b, s));
      out.push({
        sessionId: session.id,
        date: session.date,
        sets,
        best: b.load || b.reps,
        e1rm: b.load ? b.load.value : null,
        maxReps: b.reps ? b.reps.value : null,
        volume: Math.round(sets.filter(isWorkSet).reduce((sum, s) => sum + setVolume(s), 0)),
      });
    });
  return out;
};

// ------------------------------- Semanas -----------------------------------

/** Clave del lunes de la semana de `dateKey`. */
export const weekStartKey = (dateKey) => addDaysToKey(dateKey, -mondayIndex(keyToDate(dateKey)));

/** Las últimas `n` semanas (lunes a domingo), de la más vieja a la actual. */
export const weekWindows = (n, refKey = dateKeyOf()) => {
  const current = weekStartKey(refKey);
  return Array.from({ length: n }, (_, i) => {
    const start = addDaysToKey(current, (i - (n - 1)) * 7);
    return { start, end: addDaysToKey(start, 6) };
  });
};

const workTotals = (sessions) => {
  let volume = 0;
  let sets = 0;
  sessions.forEach((s) =>
    exercisesOf(s).forEach((ex) =>
      setsOf(ex).filter(isWorkSet).forEach((set) => {
        volume += setVolume(set);
        sets++;
      })
    )
  );
  return { volume: Math.round(volume), sets };
};

export const computeWeeklyVolumeHistory = (sessionsMap, weeks = 8, refKey = dateKeyOf()) =>
  weekWindows(weeks, refKey).map(({ start, end }) => {
    const list = sessionsInRange(sessionsMap, start, end);
    return { weekStart: start, sessions: list.length, ...workTotals(list) };
  });

/** Esta semana vs los mismos días de la semana pasada (comparar semanas enteras un martes no dice nada). */
export const computeVolumeTrend = (sessionsMap, refKey = dateKeyOf()) => {
  const start = weekStartKey(refKey);
  const prevStart = addDaysToKey(start, -7);
  const prevEnd = addDaysToKey(refKey, -7);
  const current = workTotals(sessionsInRange(sessionsMap, start, refKey)).volume;
  const previous = workTotals(sessionsInRange(sessionsMap, prevStart, prevEnd)).volume;
  return { current, previous, pctChange: previous > 0 ? Math.round(((current - previous) / previous) * 100) : null };
};

export const computeWeeklySetsByMuscle = (sessionsMap, exercisesById, refKey = dateKeyOf()) => {
  const start = weekStartKey(refKey);
  const perMuscle = {};
  sessionsInRange(sessionsMap, start, addDaysToKey(start, 6)).forEach((session) =>
    exercisesOf(session).forEach((ex) => {
      const group = exercisesById[ex.exerciseId]?.muscleGroup;
      const n = setsOf(ex).filter(isWorkSet).length;
      if (group && n) perMuscle[group] = (perMuscle[group] || 0) + n;
    })
  );
  return perMuscle;
};

/** Los 7 días de la semana de `refKey` cruzados con lo entrenado. */
export const computeWeekPlan = (routine, sessionsMap, refKey = dateKeyOf()) => {
  const start = weekStartKey(refKey);
  const done = finishedSessions(sessionsMap);
  return Array.from({ length: 7 }, (_, i) => {
    const key = addDaysToKey(start, i);
    const day = routine?.days?.[i] || null;
    return {
      key,
      index: i,
      weekday: WEEKDAY_LABELS[i],
      day,
      isRest: day ? !!day.isRest : true,
      isToday: key === refKey,
      isPast: key < refKey,
      trained: done.some((s) => s.date === key),
    };
  });
};

// ------------------------------- Discos -------------------------------------

/** Discos por lado para llegar a `target` con una barra de `bar` kg (greedy). */
export const platesFor = (target, bar, plates) => {
  const perSide = (num(target) - num(bar)) / 2;
  if (perSide <= 0) return { perSide: [], achieved: Math.max(num(bar), 0), remainder: 0 };
  let left = Math.round(perSide * 1000) / 1000;
  const out = [];
  plates.forEach((p) => {
    while (left + 1e-9 >= p) {
      out.push(p);
      left = Math.round((left - p) * 1000) / 1000;
    }
  });
  const loaded = out.reduce((a, b) => a + b, 0);
  return { perSide: out, achieved: Math.round((num(bar) + loaded * 2) * 100) / 100, remainder: Math.round(left * 2 * 100) / 100 };
};
