import { describe, it, expect } from 'vitest';
import {
  weekdayIndex,
  getRoutineDayForDate,
  getSessionsForDate,
  getRecentSessions,
  summarizeSession,
  computeWeekPlan,
  computeWeeklyAdherence,
  computeVolumeTrend,
} from './workoutStorage';

// Martes 21 de julio de 2026 (getDay() === 2).
const REF = new Date('2026-07-21T12:00:00');

const routine = {
  id: 'rt_1',
  name: 'PPL',
  days: [
    { id: 'd0', name: 'Push', weekday: 'Lunes', isRest: false, exercises: [{ id: 'r1' }, { id: 'r2' }] },
    { id: 'd1', name: 'Pull', weekday: 'Martes', isRest: false, exercises: [{ id: 'r3' }] },
    { id: 'd2', name: 'Legs', weekday: 'Miércoles', isRest: false, exercises: [] },
    { id: 'd3', name: 'Descanso', weekday: 'Jueves', isRest: true, exercises: [] },
    { id: 'd4', name: 'Push', weekday: 'Viernes', isRest: false, exercises: [] },
    { id: 'd5', name: 'Descanso', weekday: 'Sábado', isRest: true, exercises: [] },
    { id: 'd6', name: 'Descanso', weekday: 'Domingo', isRest: true, exercises: [] },
  ],
};

const exercisesById = {
  ex_a: { id: 'ex_a', name: 'Press banca', muscleGroup: 'Pecho' },
  ex_b: { id: 'ex_b', name: 'Remo', muscleGroup: 'Espalda' },
};

const session = (id, date, exercises, { startedAt = 0, endedAt = 3600000 } = {}) => ({
  id,
  date,
  dayName: 'Push',
  startedAt,
  endedAt,
  exercises,
});

describe('weekdayIndex', () => {
  it('usa lunes como 0', () => {
    expect(weekdayIndex(new Date('2026-07-20T12:00:00'))).toBe(0); // lunes
    expect(weekdayIndex(REF)).toBe(1); // martes
    expect(weekdayIndex(new Date('2026-07-26T12:00:00'))).toBe(6); // domingo
  });
});

describe('getRoutineDayForDate', () => {
  it('mapea la fecha al día correcto de la rutina', () => {
    expect(getRoutineDayForDate(routine, REF).name).toBe('Pull');
    expect(getRoutineDayForDate(routine, new Date('2026-07-26T12:00:00')).name).toBe('Descanso');
  });

  it('devuelve null sin rutina activa', () => {
    expect(getRoutineDayForDate(null, REF)).toBeNull();
  });
});

describe('summarizeSession', () => {
  it('suma volumen y series solo de las efectivas completadas', () => {
    const s = session('s1', '2026-07-21', [
      {
        id: 'sx1',
        exerciseId: 'ex_a',
        sets: [
          { id: 'a', completed: true, type: 'warmup', weight: 40, reps: 10 }, // no suma
          { id: 'b', completed: true, type: 'effective', weight: 100, reps: 5 }, // 500
          { id: 'c', completed: false, type: 'effective', weight: 100, reps: 5 }, // no suma
        ],
      },
      {
        id: 'sx2',
        exerciseId: 'ex_b',
        sets: [{ id: 'd', completed: true, type: 'effective', weight: 60, reps: 10 }], // 600
      },
    ]);

    const r = summarizeSession(s, exercisesById);
    expect(r.volume).toBe(1100);
    expect(r.effectiveSets).toBe(2);
    expect(r.durationMin).toBe(60);
    expect(r.muscleGroups).toEqual(['Pecho', 'Espalda']);
  });

  it('no repite grupos musculares', () => {
    const s = session('s1', '2026-07-21', [
      { id: 'sx1', exerciseId: 'ex_a', sets: [{ id: 'a', completed: true, type: 'effective', weight: 50, reps: 5 }] },
      { id: 'sx2', exerciseId: 'ex_a', sets: [{ id: 'b', completed: true, type: 'effective', weight: 50, reps: 5 }] },
    ]);
    expect(summarizeSession(s, exercisesById).muscleGroups).toEqual(['Pecho']);
  });

  it('deja la duración en null si la sesión sigue abierta', () => {
    const s = session('s1', '2026-07-21', [], { endedAt: null });
    expect(summarizeSession(s, exercisesById).durationMin).toBeNull();
  });
});

describe('getSessionsForDate / getRecentSessions', () => {
  const sessions = {
    s1: session('s1', '2026-07-21', [], { endedAt: 100 }),
    s2: session('s2', '2026-07-21', [], { endedAt: 300 }),
    s3: session('s3', '2026-07-20', [], { endedAt: 200 }),
    s4: session('s4', '2026-07-21', [], { endedAt: null }), // en curso
  };

  it('filtra por fecha e ignora las sesiones sin terminar', () => {
    const r = getSessionsForDate(sessions, '2026-07-21');
    expect(r.map((s) => s.id)).toEqual(['s2', 's1']); // más reciente primero
  });

  it('ordena el historial de la más reciente a la más vieja', () => {
    expect(getRecentSessions(sessions).map((s) => s.id)).toEqual(['s2', 's3', 's1']);
  });

  it('respeta el límite', () => {
    expect(getRecentSessions(sessions, 1).map((s) => s.id)).toEqual(['s2']);
  });
});

describe('computeWeekPlan', () => {
  it('devuelve los 7 días con hoy marcado', () => {
    const plan = computeWeekPlan(routine, {}, REF);

    expect(plan).toHaveLength(7);
    expect(plan[0].weekday).toBe('Lunes');
    expect(plan.filter((d) => d.isToday)).toHaveLength(1);
    expect(plan.find((d) => d.isToday).dayName).toBe('Pull');
  });

  it('marca pasado, futuro y entrenado', () => {
    const sessions = { s1: session('s1', '2026-07-20', []) }; // lunes
    const plan = computeWeekPlan(routine, sessions, REF);

    expect(plan[0].isPast).toBe(true);
    expect(plan[0].trained).toBe(true);
    expect(plan[1].isToday).toBe(true);
    expect(plan[1].trained).toBe(false);
    expect(plan[2].isFuture).toBe(true);
  });

  it('funciona sin rutina activa', () => {
    const plan = computeWeekPlan(null, {}, REF);
    expect(plan).toHaveLength(7);
    expect(plan.every((d) => d.dayName === null && d.isRest === false)).toBe(true);
  });
});

describe('computeWeeklyAdherence', () => {
  it('cuenta días distintos con sesión, no sesiones', () => {
    const sessions = {
      s1: session('s1', '2026-07-20', []),
      s2: session('s2', '2026-07-20', []), // mismo día
      s3: session('s3', '2026-07-21', []),
    };
    const weeks = computeWeeklyAdherence(routine, sessions, 1, REF);

    expect(weeks[0].done).toBe(2);
    expect(weeks[0].planned).toBe(4); // Push, Pull, Legs, Push
  });

  it('separa las semanas correctamente', () => {
    const sessions = {
      s1: session('s1', '2026-07-14', []), // semana anterior
      s2: session('s2', '2026-07-21', []), // semana en curso
    };
    const weeks = computeWeeklyAdherence(routine, sessions, 2, REF);

    expect(weeks).toHaveLength(2);
    expect(weeks[0].done).toBe(1);
    expect(weeks[1].done).toBe(1);
  });

  it('deja planned en 0 sin rutina', () => {
    expect(computeWeeklyAdherence(null, {}, 1, REF)[0].planned).toBe(0);
  });
});

describe('computeVolumeTrend', () => {
  const withVolume = (id, date, weight, reps) =>
    session(id, date, [
      { id: `sx_${id}`, exerciseId: 'ex_a', sets: [{ id: `s_${id}`, completed: true, type: 'effective', weight, reps }] },
    ]);

  it('compara contra los mismos días de la semana pasada, no contra la semana entera', () => {
    const sessions = {
      // Semana en curso: lunes 20 y martes 21 (hoy) = 2000
      a: withVolume('a', '2026-07-20', 100, 10),
      b: withVolume('b', '2026-07-21', 100, 10),
      // Semana pasada, mismos dos días = 1000
      c: withVolume('c', '2026-07-13', 100, 10),
      // Semana pasada, jueves: fuera de la ventana de comparación
      d: withVolume('d', '2026-07-16', 500, 10),
    };
    const r = computeVolumeTrend(sessions, REF);

    expect(r.daysElapsed).toBe(2); // lunes y martes
    expect(r.current).toBe(2000);
    expect(r.previous).toBe(1000); // no incluye el jueves
    expect(r.pctChange).toBe(100);
  });

  it('deja pctChange en null si no hay con qué comparar', () => {
    const r = computeVolumeTrend({ a: withVolume('a', '2026-07-21', 100, 10) }, REF);
    expect(r.previous).toBe(0);
    expect(r.pctChange).toBeNull();
  });

  it('ignora el calentamiento', () => {
    const sessions = {
      a: session('a', '2026-07-21', [
        {
          id: 'sx',
          exerciseId: 'ex_a',
          sets: [
            { id: '1', completed: true, type: 'warmup', weight: 100, reps: 10 },
            { id: '2', completed: true, type: 'effective', weight: 50, reps: 10 },
          ],
        },
      ]),
    };
    expect(computeVolumeTrend(sessions, REF).current).toBe(500);
  });
});
