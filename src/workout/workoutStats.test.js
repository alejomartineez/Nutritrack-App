import { describe, it, expect } from 'vitest';
import {
  num,
  summarizeSession,
  finishedSessions,
  buildHistoryIndex,
  referenceForSet,
  overloadHint,
  beatsBest,
  computePersonalRecords,
  computeRangePRs,
  computeSessionPRs,
  computeExerciseHistory,
  computeWeeklyVolumeHistory,
  computeVolumeTrend,
  computeWeeklySetsByMuscle,
  computeWeekPlan,
  weekWindows,
  platesFor,
} from './workoutStats';

const exercisesById = {
  ex_a: { id: 'ex_a', name: 'Press banca', muscleGroup: 'Pecho', equipment: 'Barra' },
  ex_b: { id: 'ex_b', name: 'Remo', muscleGroup: 'Espalda', equipment: 'Barra' },
  ex_dom: { id: 'ex_dom', name: 'Dominadas', muscleGroup: 'Espalda', equipment: 'Peso corporal' },
};

const set = (weight, reps, extra = {}) => ({ id: Math.random().toString(36), type: 'effective', weight, reps, rir: '', completed: true, ...extra });
const session = (id, date, exercises, endedAt = Date.parse(`${date}T12:00:00`)) => ({
  id,
  date,
  dayName: 'Día',
  startedAt: endedAt - 3600000,
  endedAt,
  exercises: exercises.map(([exerciseId, sets], i) => ({ id: `${id}_${i}`, exerciseId, sets })),
});
const mapOf = (...list) => Object.fromEntries(list.map((s) => [s.id, s]));

describe('num', () => {
  it('lee strings legados, comas y vacíos', () => {
    expect(num('62,5')).toBe(62.5);
    expect(num('')).toBe(0);
    expect(num('4+')).toBe(4);
    expect(num(undefined)).toBe(0);
    expect(num(80)).toBe(80);
  });
});

describe('summarizeSession', () => {
  it('cuenta solo series efectivas completadas, sin calentamiento', () => {
    const s = session('s1', '2026-07-21', [
      ['ex_a', [set(40, 10, { type: 'warmup' }), set(100, 5), set(100, 5, { completed: false })]],
      ['ex_b', [set('60', '10')]],
    ]);
    const r = summarizeSession(s, exercisesById);
    expect(r.volume).toBe(500 + 600);
    expect(r.effectiveSets).toBe(2);
    expect(r.durationMin).toBe(60);
    expect(r.muscleGroups).toEqual(['Pecho', 'Espalda']);
  });

  it('muestra tipos legados (myorep/superset) como series de trabajo', () => {
    const s = session('s1', '2026-07-21', [['ex_a', [set(50, 10, { type: 'myorep' }), set(50, 8, { type: 'superset' })]]]);
    expect(summarizeSession(s).effectiveSets).toBe(2);
  });
});

describe('finishedSessions', () => {
  it('ordena por fecha y no por hora de cierre (sesiones cargadas a posteriori)', () => {
    const later = session('a', '2026-07-20', [], Date.parse('2026-07-25T10:00:00'));
    const earlier = session('b', '2026-07-22', [], Date.parse('2026-07-22T10:00:00'));
    const open = { ...session('c', '2026-07-23', []), endedAt: null };
    expect(finishedSessions(mapOf(later, earlier, open)).map((s) => s.id)).toEqual(['b', 'a']);
  });
});

describe('buildHistoryIndex / referenceForSet', () => {
  const s1 = session('s1', '2026-07-01', [['ex_a', [set(40, 10, { type: 'warmup' }), set(80, 8), set(80, 7)]]]);
  const s2 = session('s2', '2026-07-08', [['ex_a', [set(20, 10, { type: 'warmup' }), set(85, 8), set(85, 6), set(80, 8, { completed: false })]]]);

  it('indexa una sola vez: historial más reciente primero y mejores marcas', () => {
    const { entries, best } = buildHistoryIndex(mapOf(s1, s2));
    expect(entries.get('ex_a').map((e) => e.sessionId)).toEqual(['s2', 's1']);
    expect(entries.get('ex_a')[0].sets).toHaveLength(3); // la sin tildar no entra
    expect(best.get('ex_a').load.weight).toBe(85);
  });

  it('excluye la sesión indicada y las posteriores a una fecha', () => {
    const { entries } = buildHistoryIndex(mapOf(s1, s2), { excludeId: 's2' });
    expect(entries.get('ex_a').map((e) => e.sessionId)).toEqual(['s1']);
    const until = buildHistoryIndex(mapOf(s1, s2), { untilDate: '2026-07-05' });
    expect(until.entries.get('ex_a').map((e) => e.sessionId)).toEqual(['s1']);
  });

  it('alinea calentamientos con calentamientos y efectivas con efectivas', () => {
    const prev = buildHistoryIndex(mapOf(s2)).entries.get('ex_a')[0].sets;
    const current = [{ type: 'warmup' }, { type: 'effective' }, { type: 'effective' }, { type: 'effective' }];
    expect(referenceForSet(prev, current, 0)).toEqual({ weight: 20, reps: 10 });
    expect(referenceForSet(prev, current, 1)).toEqual({ weight: 85, reps: 8 });
    expect(referenceForSet(prev, current, 2)).toEqual({ weight: 85, reps: 6 });
    // Más series que la vez pasada: repite la última conocida.
    expect(referenceForSet(prev, current, 3)).toEqual({ weight: 85, reps: 6 });
    expect(referenceForSet([], current, 0)).toBeNull();
  });
});

describe('overloadHint', () => {
  it('sugiere subir peso cuando todas las efectivas llegaron al tope', () => {
    const entry = { sets: [set(60, 12), set(60, 12), set(40, 5, { type: 'warmup' })] };
    expect(overloadHint(entry, 12).text).toBe('Probá +2,5 kg');
  });
  it('no sugiere nada si alguna quedó corta', () => {
    expect(overloadHint({ sets: [set(60, 12), set(60, 10)] }, 12)).toBeNull();
  });
  it('en peso corporal sugiere una rep más', () => {
    expect(overloadHint({ sets: [set('', 10), set(0, 10)] }, 10).text).toBe('Probá +1 rep');
  });
});

describe('récords', () => {
  const s1 = session('s1', '2026-07-01', [['ex_a', [set(80, 8)]], ['ex_dom', [set('', 8)]]]);
  const s2 = session('s2', '2026-07-08', [['ex_a', [set(85, 8)]], ['ex_dom', [set('', 10)]], ['ex_b', [set(60, 10)]]]);

  it('beatsBest: compara 1RM con peso y reps sin peso; nunca la primera vez', () => {
    const { best } = buildHistoryIndex(mapOf(s1));
    expect(beatsBest(set(82.5, 8), best.get('ex_a'))).toBe(true);
    expect(beatsBest(set(80, 8), best.get('ex_a'))).toBe(false);
    expect(beatsBest(set('', 9), best.get('ex_dom'))).toBe(true);
    expect(beatsBest(set(60, 10), best.get('ex_b'))).toBe(false);
  });

  it('computeSessionPRs excluye ejercicios estrenados y muestra la marca previa como serie', () => {
    const prs = computeSessionPRs(s2, mapOf(s1, s2), exercisesById);
    expect(prs.map((p) => p.exerciseId).sort()).toEqual(['ex_a', 'ex_dom']);
    const bench = prs.find((p) => p.exerciseId === 'ex_a');
    expect(bench.label).toBe('85 kg × 8');
    expect(bench.prevLabel).toBe('80 kg × 8');
    expect(prs.find((p) => p.exerciseId === 'ex_dom').label).toBe('10 reps');
  });

  it('computeRangePRs solo reporta lo logrado en el rango', () => {
    const map = mapOf(s1, s2);
    expect(computeRangePRs(map, exercisesById, '2026-07-01', '2026-07-07')).toEqual([]);
    const week2 = computeRangePRs(map, exercisesById, '2026-07-06', '2026-07-12');
    expect(week2.map((p) => p.exerciseName).sort()).toEqual(['Dominadas', 'Press banca']);
  });

  it('computePersonalRecords mantiene el formato que usan otras pantallas', () => {
    const prs = computePersonalRecords(mapOf(s1, s2), exercisesById);
    expect(prs[0]).toMatchObject({ exerciseId: 'ex_a', weight: 85, reps: 8, date: '2026-07-08' });
    expect(prs[0].estOneRM).toBeGreaterThan(100);
  });

  it('computeExerciseHistory va de la más vieja a la más nueva', () => {
    const h = computeExerciseHistory(mapOf(s2, s1), 'ex_a');
    expect(h.map((e) => e.date)).toEqual(['2026-07-01', '2026-07-08']);
    expect(h[1].e1rm).toBeGreaterThan(h[0].e1rm);
  });
});

describe('semanas', () => {
  // Martes 21/07/2026.
  const REF = '2026-07-21';
  const mon = session('m', '2026-07-20', [['ex_a', [set(100, 5), set(50, 10, { type: 'warmup' })]], ['ex_dom', [set('', 10)]]]);
  const prevMon = session('pm', '2026-07-13', [['ex_a', [set(100, 4)]]]);
  const prevThu = session('pt', '2026-07-16', [['ex_a', [set(100, 10)]]]);

  it('weekWindows arma semanas de lunes a domingo', () => {
    expect(weekWindows(2, REF)).toEqual([
      { start: '2026-07-13', end: '2026-07-19' },
      { start: '2026-07-20', end: '2026-07-26' },
    ]);
  });

  it('volumen semanal y tendencia contra los mismos días de la semana pasada', () => {
    const map = mapOf(mon, prevMon, prevThu);
    const hist = computeWeeklyVolumeHistory(map, 2, REF);
    expect(hist.map((w) => w.volume)).toEqual([1400, 500]);
    const trend = computeVolumeTrend(map, REF);
    expect(trend).toEqual({ current: 500, previous: 400, pctChange: 25 });
  });

  it('series por músculo de esta semana', () => {
    expect(computeWeeklySetsByMuscle(mapOf(mon, prevMon), exercisesById, REF)).toEqual({ Pecho: 1, Espalda: 1 });
  });

  it('computeWeekPlan marca hoy y entrenado', () => {
    const routine = { days: Array.from({ length: 7 }, (_, i) => ({ id: `d${i}`, name: `D${i}`, isRest: i > 4, exercises: [] })) };
    const plan = computeWeekPlan(routine, mapOf(mon), REF);
    expect(plan[0]).toMatchObject({ key: '2026-07-20', trained: true, isPast: true });
    expect(plan[1]).toMatchObject({ isToday: true, trained: false });
    expect(plan[6].isRest).toBe(true);
  });
});

describe('platesFor', () => {
  const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
  it('reparte discos por lado', () => {
    expect(platesFor(100, 20, PLATES)).toEqual({ perSide: [25, 15], achieved: 100, remainder: 0 });
    expect(platesFor(62.5, 20, PLATES).perSide).toEqual([20, 1.25]);
  });
  it('avisa lo que no se puede cargar', () => {
    const r = platesFor(61, 20, PLATES);
    expect(r.achieved).toBe(60);
    expect(r.remainder).toBe(1);
  });
  it('peso menor a la barra', () => {
    expect(platesFor(15, 20, PLATES).perSide).toEqual([]);
  });
});
