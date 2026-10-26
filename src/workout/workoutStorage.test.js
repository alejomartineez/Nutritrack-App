import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadExercises,
  loadSessions,
  loadRoutines,
  buildRoutineFromTemplate,
  startSession,
  startFreeSession,
  addExercisesToSession,
  addSetToExercise,
  substituteExercise,
  finishSession,
  sanitizeTarget,
  moveDayExercise,
  getTodayWorkoutSummary,
  getWorkoutRangeSummary,
  getRoutineDayForDate,
} from './workoutStorage';
import { DEFAULT_EXERCISES } from './workoutData';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  key: (i) => [...store.keys()][i] ?? null,
  get length() {
    return store.size;
  },
};
const put = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const set = (weight, reps, extra = {}) => ({ id: Math.random().toString(36), type: 'effective', weight, reps, rir: '', completed: true, ...extra });
const session = (id, date, exercises, hours = 1) => {
  const endedAt = Date.parse(`${date}T19:00:00`);
  return {
    id,
    routineId: null,
    dayId: null,
    dayName: 'Push',
    date,
    startedAt: endedAt - hours * 3600000,
    endedAt,
    exercises: exercises.map(([exerciseId, sets], i) => ({ id: `${id}_${i}`, exerciseId, sets })),
  };
};

beforeEach(() => store.clear());

describe('carga robusta', () => {
  it('suma los ejercicios de catálogo nuevos sin tocar los guardados', () => {
    put('workout_exercises', [
      { id: 'ex_press_banca', name: 'Press banca (mío)', muscleGroup: 'Pecho', equipment: 'Barra', isCustom: false },
      { id: 'exc_1', name: 'Custom', muscleGroup: 'Core', equipment: 'Máquina', isCustom: true },
    ]);
    const list = loadExercises();
    expect(list[0].name).toBe('Press banca (mío)');
    expect(list.find((e) => e.id === 'exc_1')).toBeTruthy();
    expect(list.filter((e) => e.id === 'ex_press_banca')).toHaveLength(1);
    expect(list.length).toBe(DEFAULT_EXERCISES.length + 1);
  });

  it('tolera JSON roto o formas inesperadas', () => {
    localStorage.setItem('workout_sessions', '{roto');
    expect(loadSessions()).toEqual({});
    put('workout_sessions', []);
    expect(loadSessions()).toEqual({});
    put('workout_routines', [{ id: 'x' }, null]);
    expect(loadRoutines()).toEqual([]);
  });
});

describe('rutinas', () => {
  it('las plantillas traen ejercicios reales y descansos', () => {
    const r = buildRoutineFromTemplate('fullbody3');
    expect(r.days).toHaveLength(7);
    expect(r.days[0].exercises.length).toBeGreaterThan(3);
    expect(r.days[1].isRest).toBe(true);
    const ids = new Set(DEFAULT_EXERCISES.map((e) => e.id));
    r.days.flatMap((d) => d.exercises).forEach((rex) => expect(ids.has(rex.exerciseId)).toBe(true));
  });

  it('sanitizeTarget valida y corrige min > max', () => {
    expect(sanitizeTarget({ targetSets: '', targetRepsMin: '12', targetRepsMax: '8' })).toEqual({ targetSets: 3, targetRepsMin: 12, targetRepsMax: 12 });
    expect(sanitizeTarget({ targetSets: 40, targetRepsMin: 0, targetRepsMax: 10 })).toEqual({ targetSets: 20, targetRepsMin: 8, targetRepsMax: 10 });
  });

  it('reordena ejercicios del día', () => {
    const r = buildRoutineFromTemplate('fullbody3');
    const day = r.days[0];
    const [a, b] = day.exercises;
    const moved = moveDayExercise(r, day.id, b.id, -1);
    expect(moved.days[0].exercises.slice(0, 2).map((e) => e.id)).toEqual([b.id, a.id]);
    expect(moveDayExercise(r, day.id, a.id, -1)).toEqual(r);
  });

  it('getRoutineDayForDate usa lunes = 0', () => {
    const r = buildRoutineFromTemplate('upper_lower4');
    expect(getRoutineDayForDate(r, new Date('2026-07-20T12:00:00')).name).toBe('Torso A');
  });
});

describe('sesión', () => {
  const routine = buildRoutineFromTemplate('fullbody3');

  it('startSession precarga series vacías con el objetivo', () => {
    const s = startSession(routine, routine.days[0], { date: '2026-07-20' });
    expect(s.date).toBe('2026-07-20');
    expect(s.exercises[0].sets).toHaveLength(3);
    expect(s.exercises[0].sets[0]).toMatchObject({ weight: '', reps: '', completed: false, type: 'effective' });
  });

  it('entreno libre sin rutina', () => {
    const s = startFreeSession();
    expect(s).toMatchObject({ routineId: null, dayId: null, dayName: 'Entreno libre', exercises: [] });
    const withEx = addExercisesToSession(s, ['ex_dominadas', 'ex_fondos'], (id) => (id === 'ex_fondos' ? 4 : 0));
    expect(withEx.exercises.map((e) => e.sets.length)).toEqual([3, 4]);
    expect(withEx.exercises[0].addedAdHoc).toBe(true);
  });

  it('agregar serie copia la última, y si está vacía usa la referencia', () => {
    let s = startFreeSession();
    s = addExercisesToSession(s, ['ex_press_banca']);
    const sexId = s.exercises[0].id;
    const withRef = addSetToExercise(s, sexId, { weight: 60, reps: 10 });
    expect(withRef.exercises[0].sets.at(-1)).toMatchObject({ weight: 60, reps: 10 });
    s.exercises[0].sets[2] = { ...s.exercises[0].sets[2], weight: 70, reps: '' };
    const copied = addSetToExercise(s, sexId, { weight: 60, reps: 10 });
    expect(copied.exercises[0].sets.at(-1)).toMatchObject({ weight: 70, reps: 10 });
  });

  it('sustituir reemplaza en el lugar', () => {
    const s = startSession(routine, routine.days[0]);
    const first = s.exercises[0];
    const next = substituteExercise(s, first.id, 'ex_prensa');
    expect(next.exercises).toHaveLength(s.exercises.length);
    expect(next.exercises[0]).toMatchObject({ exerciseId: 'ex_prensa', substitutedFrom: first.exerciseId, routineExerciseId: first.routineExerciseId });
  });

  it('sustituir conserva las series ya hechas del original', () => {
    const s = startSession(routine, routine.days[0]);
    s.exercises[0].sets[0] = { ...s.exercises[0].sets[0], weight: 60, reps: 8, completed: true };
    const next = substituteExercise(s, s.exercises[0].id, 'ex_prensa');
    expect(next.exercises).toHaveLength(s.exercises.length + 1);
    expect(next.exercises[0].sets).toHaveLength(1);
    expect(next.exercises[1].exerciseId).toBe('ex_prensa');
    expect(next.exercises[1].sets).toHaveLength(2);
  });

  it('finishSession poda lo no tildado y respeta endedAt previo (edición)', () => {
    const s = startSession(routine, routine.days[0]);
    s.exercises[0].sets[0] = { ...s.exercises[0].sets[0], weight: 60, reps: 8, completed: true };
    const done = finishSession(s, 123);
    expect(done.endedAt).toBe(123);
    expect(done.exercises[0].sets).toHaveLength(1);
    expect(finishSession({ ...s, endedAt: 50 }, 999).endedAt).toBe(50);
  });
});

describe('getTodayWorkoutSummary', () => {
  const TODAY = '2026-07-21'; // martes
  const NOW = Date.parse('2026-07-21T20:00:00');

  it('no_routine sin rutina ni sesiones', () => {
    expect(getTodayWorkoutSummary(TODAY, NOW)).toEqual({ state: 'no_routine' });
  });

  it('planned y rest según la rutina activa', () => {
    const r = buildRoutineFromTemplate('upper_lower4');
    put('workout_routines', [r]);
    put('workout_active_routine_id', r.id);
    expect(getTodayWorkoutSummary(TODAY, NOW)).toEqual({ state: 'planned', dayName: 'Pierna A', exerciseCount: 5 });
    expect(getTodayWorkoutSummary('2026-07-22', NOW)).toEqual({ state: 'rest' });
  });

  it('done con totales sin calentamiento', () => {
    put('workout_sessions', {
      s1: session('s1', TODAY, [['ex_press_banca', [set(40, 10, { type: 'warmup' }), set(80, 8), set('80', '6')]], ['ex_dominadas', [set('', 10)]]]),
      old: session('old', '2026-07-20', [['ex_press_banca', [set(80, 8)]]]),
    });
    expect(getTodayWorkoutSummary(TODAY, NOW)).toEqual({
      state: 'done',
      dayName: 'Push',
      completedSets: 3,
      exerciseCount: 2,
      volumeKg: 1120,
      durationMin: 60,
    });
  });

  it('active cuando hay una sesión en curso', () => {
    const s = startFreeSession({ now: NOW - 25 * 60000 });
    const withEx = addExercisesToSession(s, ['ex_press_banca']);
    withEx.exercises[0].sets[0] = { ...withEx.exercises[0].sets[0], type: 'warmup', weight: 40, reps: 10, completed: true };
    withEx.exercises[0].sets[1] = { ...withEx.exercises[0].sets[1], weight: 60, reps: 10, completed: true };
    put('workout_active_session', withEx);
    expect(getTodayWorkoutSummary(TODAY, NOW)).toEqual({
      state: 'active',
      dayName: 'Entreno libre',
      completedSets: 1,
      exerciseCount: 1,
      volumeKg: 600,
      durationMin: 25,
    });
  });
});

describe('getWorkoutRangeSummary', () => {
  it('suma el rango y lista solo récords nuevos (sin estrenos)', () => {
    put('workout_sessions', {
      a: session('a', '2026-07-06', [['ex_press_banca', [set(80, 8)]], ['ex_dominadas', [set('', 8)]]]),
      b: session('b', '2026-07-14', [['ex_press_banca', [set(85, 8), set(40, 10, { type: 'warmup' })]], ['ex_dominadas', [set('', 7)]], ['ex_prensa', [set(150, 10)]]]),
      c: session('c', '2026-07-16', [['ex_dominadas', [set(0, 9)]]]),
      open: { ...session('open', '2026-07-15', [['ex_press_banca', [set(200, 10)]]]), endedAt: null },
    });
    const r = getWorkoutRangeSummary('2026-07-13', '2026-07-19');
    expect(r.sessions).toBe(2);
    expect(r.sets).toBe(4);
    expect(r.volumeKg).toBe(85 * 8 + 1500);
    expect(r.prs).toEqual(
      expect.arrayContaining([
        { exerciseName: 'Press de banca con barra', label: '85 kg × 8' },
        { exerciseName: 'Dominadas', label: '9 reps' },
      ])
    );
    expect(r.prs).toHaveLength(2);
  });

  it('rango vacío', () => {
    expect(getWorkoutRangeSummary('2026-01-01', '2026-01-07')).toEqual({ sessions: 0, sets: 0, volumeKg: 0, prs: [] });
  });
});
