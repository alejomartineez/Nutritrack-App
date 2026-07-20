import { describe, it, expect } from 'vitest';
import {
  dateKeyOf,
  startOfDay,
  addDays,
  round1,
  computeTotals,
  computeStreak,
  computeMacroSegments,
  mifflinStJeorBMR,
  computePlanFromProfile,
  scaleFood,
} from './nutritionCalcs';

describe('dateKeyOf', () => {
  it('formatea con mes y día en dos dígitos', () => {
    expect(dateKeyOf(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(dateKeyOf(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('usa la fecha local, no UTC', () => {
    // 16 de julio a las 23:30 locales sigue siendo día 16
    expect(dateKeyOf(new Date(2026, 6, 16, 23, 30))).toBe('2026-07-16');
  });
});

describe('startOfDay', () => {
  it('pone la hora a medianoche sin mutar el original', () => {
    const original = new Date(2026, 6, 16, 14, 25, 10);
    const start = startOfDay(original);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(original.getHours()).toBe(14); // no mutó
  });
});

describe('addDays', () => {
  it('avanza y retrocede días cruzando meses', () => {
    expect(dateKeyOf(addDays(new Date(2026, 6, 31), 1))).toBe('2026-08-01');
    expect(dateKeyOf(addDays(new Date(2026, 6, 1), -1))).toBe('2026-06-30');
  });

  it('no muta la fecha original', () => {
    const original = new Date(2026, 6, 16);
    addDays(original, 5);
    expect(dateKeyOf(original)).toBe('2026-07-16');
  });
});

describe('round1', () => {
  it('redondea a un decimal', () => {
    expect(round1(0.1 + 0.2)).toBe(0.3);
    expect(round1(116.449)).toBe(116.4);
    expect(round1(116.45)).toBe(116.5);
  });
});

describe('computeTotals', () => {
  it('suma los macros de todas las comidas', () => {
    const meals = [
      { kcal: 300, p: 20, c: 30, f: 10 },
      { kcal: 500, p: 40, c: 45, f: 15 },
    ];
    expect(computeTotals(meals)).toEqual({ kcal: 800, p: 60, c: 75, f: 25 });
  });

  it('devuelve ceros con lista vacía o sin argumento', () => {
    expect(computeTotals([])).toEqual({ kcal: 0, p: 0, c: 0, f: 0 });
    expect(computeTotals()).toEqual({ kcal: 0, p: 0, c: 0, f: 0 });
  });

  it('trata macros faltantes como cero', () => {
    expect(computeTotals([{ kcal: 100 }])).toEqual({ kcal: 100, p: 0, c: 0, f: 0 });
  });
});

describe('computeStreak', () => {
  const goal = 1610;
  const tol = 100;

  it('cuenta días consecutivos en rango terminando en el último', () => {
    const week = [
      { hasData: true, kcal: 1600 },
      { hasData: true, kcal: 1650 },
      { hasData: true, kcal: 1580 },
    ];
    expect(computeStreak(week, goal, tol)).toBe(3);
  });

  it('se corta ante un día fuera de rango', () => {
    const week = [
      { hasData: true, kcal: 1600 },
      { hasData: true, kcal: 2000 }, // fuera de rango
      { hasData: true, kcal: 1580 },
      { hasData: true, kcal: 1620 },
    ];
    expect(computeStreak(week, goal, tol)).toBe(2);
  });

  it('se corta ante un día sin datos', () => {
    const week = [
      { hasData: true, kcal: 1600 },
      { hasData: false, kcal: 0 },
      { hasData: true, kcal: 1580 },
    ];
    expect(computeStreak(week, goal, tol)).toBe(1);
  });

  it('respeta el límite de tolerancia exacto (inclusive)', () => {
    expect(computeStreak([{ hasData: true, kcal: 1710 }], goal, tol)).toBe(1); // borde superior
    expect(computeStreak([{ hasData: true, kcal: 1711 }], goal, tol)).toBe(0); // apenas fuera
  });

  it('devuelve 0 con semana vacía', () => {
    expect(computeStreak([], goal, tol)).toBe(0);
  });
});

describe('computeMacroSegments', () => {
  it('reparte por aporte calórico (4/4/9 kcal por gramo)', () => {
    // 10g p (40kcal), 10g c (40kcal), 10g f (90kcal) => total 170
    const segs = computeMacroSegments({ p: 10, c: 10, f: 10 });
    expect(segs).toHaveLength(3);
    expect(segs[0].pct).toBeCloseTo(40 / 170);
    expect(segs[1].pct).toBeCloseTo(40 / 170);
    expect(segs[2].pct).toBeCloseTo(90 / 170);
    // las porciones suman 1
    expect(segs.reduce((s, x) => s + x.pct, 0)).toBeCloseTo(1);
  });

  it('devuelve lista vacía sin macros', () => {
    expect(computeMacroSegments({ p: 0, c: 0, f: 0 })).toEqual([]);
    expect(computeMacroSegments({})).toEqual([]);
  });
});

describe('scaleFood', () => {
  const banana = { name: 'Banana (1 mediana)', kcal: 105, p: 1.3, c: 27, f: 0.4 };
  const nutella = { name: 'Nutella', kcal: 539, p: 6.3, c: 57.5, f: 30.9, basis: '100g' };

  it('multiplica una porción y anota la cantidad en el nombre', () => {
    const r = scaleFood(banana, 2);
    expect(r.kcal).toBe(210);
    expect(r.p).toBe(2.6);
    expect(r.c).toBe(54);
    expect(r.name).toBe('Banana (1 mediana) ×2');
  });

  it('deja el nombre intacto con ×1', () => {
    const r = scaleFood(banana, 1);
    expect(r.kcal).toBe(105);
    expect(r.name).toBe('Banana (1 mediana)');
  });

  it('admite fracciones de porción', () => {
    const r = scaleFood(banana, 0.5);
    expect(r.kcal).toBe(53); // 52.5 redondeado
    expect(r.name).toBe('Banana (1 mediana) ×0.5');
  });

  it('escala por gramos cuando la base es 100g', () => {
    const r = scaleFood(nutella, 60);
    expect(r.kcal).toBe(323); // 539 × 0.6 = 323.4
    expect(r.p).toBe(3.8);
    expect(r.f).toBe(18.5);
    expect(r.name).toBe('Nutella (60 g)');
  });

  it('cae a la porción original si la cantidad es inválida', () => {
    expect(scaleFood(banana, 0).kcal).toBe(105);
    expect(scaleFood(banana, -3).kcal).toBe(105);
    expect(scaleFood(banana, NaN).kcal).toBe(105);
  });

  it('trata macros faltantes como cero', () => {
    const r = scaleFood({ name: 'Sin datos', kcal: 100 }, 2);
    expect(r).toMatchObject({ kcal: 200, p: 0, c: 0, f: 0 });
  });
});

describe('mifflinStJeorBMR', () => {
  it('calcula la BMR de un hombre (fórmula +5)', () => {
    // 10·80 + 6.25·180 − 5·30 + 5 = 1780
    expect(mifflinStJeorBMR({ sex: 'hombre', weightKg: 80, heightCm: 180, age: 30 })).toBe(1780);
  });

  it('calcula la BMR de una mujer (fórmula −161)', () => {
    // 10·65 + 6.25·165 − 5·28 − 161 = 1380.25
    expect(mifflinStJeorBMR({ sex: 'mujer', weightKg: 65, heightCm: 165, age: 28 })).toBe(1380.25);
  });
});

describe('computePlanFromProfile', () => {
  it('mantenimiento: hombre 80kg/180cm/30a, actividad moderada', () => {
    const plan = computePlanFromProfile({
      sex: 'hombre', weightKg: 80, heightCm: 180, age: 30,
      activityLevel: 'moderado', objective: 'mantener',
    });
    // TDEE = 1780 · 1.55 = 2759 → 2760 kcal
    expect(plan.calories).toBe(2760);
    expect(plan.protein).toBe(144); // 80 · 1.8
    expect(plan.fat).toBe(76.7); // 2760 · 0.25 / 9
    expect(plan.carbs).toBe(373.4); // resto de calorías
    expect(plan.water).toBe(2750); // 80 · 35 = 2800 → al vaso más cercano
  });

  it('déficit: mujer 65kg/165cm/28a, actividad ligera, objetivo perder', () => {
    const plan = computePlanFromProfile({
      sex: 'mujer', weightKg: 65, heightCm: 165, age: 28,
      activityLevel: 'ligero', objective: 'perder',
    });
    // TDEE = 1380.25 · 1.375 · 0.8 = 1518.27 → 1520 kcal
    expect(plan.calories).toBe(1520);
    expect(plan.protein).toBe(130); // 65 · 2.0 (más alta en déficit)
    expect(plan.fat).toBe(42.2);
    expect(plan.carbs).toBe(155.1);
    expect(plan.water).toBe(2250);
  });

  it('acota el agua a un mínimo de 1.5 L para pesos bajos', () => {
    const plan = computePlanFromProfile({
      sex: 'mujer', weightKg: 40, heightCm: 155, age: 25,
      activityLevel: 'sedentario', objective: 'mantener',
    });
    expect(plan.water).toBe(1500); // 40 · 35 = 1400 → sube al mínimo
  });

  it('nunca devuelve carbohidratos negativos', () => {
    const plan = computePlanFromProfile({
      sex: 'hombre', weightKg: 120, heightCm: 165, age: 60,
      activityLevel: 'sedentario', objective: 'perder',
    });
    expect(plan.carbs).toBeGreaterThanOrEqual(0);
  });
});
