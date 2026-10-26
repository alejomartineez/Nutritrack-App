import { describe, it, expect } from 'vitest';
import { loggingStreak, weightTrend, weightSlope, estimateTDEE, foodHistory, frequentFoods, recentFoods, dayStats } from './insights';
import { addDaysToKey } from '../lib/dates';

const T = '2026-10-26';
const set = (...offsets) => new Set(offsets.map((o) => addDaysToKey(T, -o)));

describe('loggingStreak', () => {
  it('cuenta días seguidos terminando hoy', () => {
    const s = set(0, 1, 2);
    expect(loggingStreak((k) => s.has(k), T).streak).toBe(3);
  });

  it('si hoy todavía no registraste, cuenta desde ayer', () => {
    const s = set(1, 2);
    expect(loggingStreak((k) => s.has(k), T).streak).toBe(2);
  });

  it('perdona un solo día salteado', () => {
    const s = set(0, 1, 3, 4, 6, 7);
    const r = loggingStreak((k) => s.has(k), T);
    expect(r.streak).toBe(4);
    expect(r.freezeUsed).toBe(true);
  });

  it('sin actividad es cero', () => {
    expect(loggingStreak(() => false, T).streak).toBe(0);
  });
});

describe('peso', () => {
  it('la tendencia suaviza y rellena días sin pesaje', () => {
    const t = weightTrend({ '2026-10-01': 80, '2026-10-03': 79 }, '2026-10-04');
    expect(t.map((p) => p.key)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
    expect(t[1].weight).toBeNull();
    expect(t[2].trend).toBeCloseTo(79.9, 5);
    expect(t[3].trend).toBe(t[2].trend);
  });

  it('pendiente por mínimos cuadrados', () => {
    expect(weightSlope([{ x: 0, y: 80 }, { x: 10, y: 79 }])).toBeCloseTo(-0.1);
  });
});

describe('estimateTDEE', () => {
  const kcal = {};
  const weights = {};
  for (let i = 0; i < 28; i++) {
    const k = addDaysToKey(T, -i);
    kcal[k] = 2000;
    if (i % 3 === 0) weights[k] = 80 - ((27 - i) * 0.5) / 7; // baja 0,5 kg/semana
  }

  it('déficit sostenido: el gasto es mayor que lo comido', () => {
    const r = estimateTDEE({ kcalByDay: kcal, weights, endKey: T });
    expect(r.ready).toBe(true);
    expect(r.weeklyChangeKg).toBeCloseTo(-0.5, 1);
    expect(r.tdee).toBe(Math.round((2000 + (0.5 / 7) * 7700) / 10) * 10);
  });

  it('con pocos datos dice qué falta', () => {
    const r = estimateTDEE({ kcalByDay: { [T]: 2000 }, weights: {}, endKey: T });
    expect(r.ready).toBe(false);
    expect(r.need.length).toBe(2);
  });

  it('ignora días casi vacíos (registro incompleto)', () => {
    const partial = { ...kcal, [T]: 300 };
    expect(estimateTDEE({ kcalByDay: partial, weights, endKey: T }).intakeDays).toBe(27);
  });
});

describe('historial de alimentos', () => {
  const log = (meals, free = []) => ({ water: 0, planMeals: meals, freeMeals: free });
  const logs = [
    { key: '2026-10-24', log: log([{ id: 1, name: 'Avena', kcal: 300, p: 10, c: 50, f: 5, time: '08:00' }]) },
    { key: '2026-10-25', log: log([{ id: 2, name: 'Avena', kcal: 300, p: 10, c: 50, f: 5, time: '08:10' }, { id: 3, name: 'Pollo', kcal: 250, p: 40, c: 0, f: 8, time: '13:00' }]) },
    { key: '2026-10-26', log: log([], [{ id: 4, name: 'Helado', kcal: 150, p: 2, c: 20, f: 7, time: '17:00' }]) },
  ];
  const h = foodHistory(logs);

  it('agrupa por nombre y cuenta', () => {
    expect(h.find((x) => x.name === 'Avena').count).toBe(2);
    expect(h.find((x) => x.name === 'Helado').free).toBe(true);
  });

  it('recientes por fecha, frecuentes priorizando el momento', () => {
    expect(recentFoods(h)[0].name).toBe('Helado');
    expect(frequentFoods(h, 'almuerzo')[0].name).toBe('Pollo');
    expect(frequentFoods(h, 'desayuno')[0].name).toBe('Avena');
  });
});

describe('dayStats', () => {
  it('marca en rango y excedido', () => {
    const goals = { calories: 2000, protein: 100, carbs: 200, fat: 60, water: 2000 };
    const mk = (kcal) => ({ water: 0, planMeals: [{ id: 1, name: 'x', kcal, time: '12:00' }], freeMeals: [] });
    expect(dayStats(mk(1950), goals).inRange).toBe(true);
    expect(dayStats(mk(2200), goals).over).toBe(true);
    expect(dayStats({ water: 0, planMeals: [], freeMeals: [] }, goals).hasFood).toBe(false);
  });
});
