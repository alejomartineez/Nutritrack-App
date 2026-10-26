import { describe, it, expect } from 'vitest';
import { dateKeyOf, startOfDay, addDays } from './dates';
import {
  round1,
  kcalFromMacros,
  kcalOf,
  hasMacros,
  mifflinStJeorBMR,
  computePlanFromProfile,
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

describe('hasMacros', () => {
  it('distingue un ítem completo de uno cargado solo con calorías', () => {
    expect(hasMacros({ p: 20, c: 2, f: 30 })).toBe(true);
    expect(hasMacros({ f: 0.2 })).toBe(true);
    expect(hasMacros({ alc: 18.4 })).toBe(true); // solo alcohol también cuenta
    expect(hasMacros({ kcal: 300 })).toBe(false);
    expect(hasMacros({ kcal: 300, p: 0, c: 0, f: 0 })).toBe(false);
    expect(hasMacros({})).toBe(false);
    expect(hasMacros()).toBe(false);
  });
});

describe('kcalFromMacros', () => {
  it('aplica los factores de Atwater 4/4/9', () => {
    expect(kcalFromMacros({ p: 20, c: 30, f: 10 })).toBe(290);
  });

  it('suma el alcohol a 7 kcal/g', () => {
    // Cerveza de 473ml: los macros solos dan 76, el etanol aporta el resto.
    expect(kcalFromMacros({ p: 2, c: 17, f: 0, alc: 18.4 })).toBeCloseTo(204.8, 1);
  });

  it('es un cálculo puro: no mira el campo kcal del ítem', () => {
    // Solo deriva. Quién gana entre el kcal cargado y este número lo decide
    // `kcalOf`, no esta función.
    expect(kcalFromMacros({ kcal: 400, p: 20, c: 2, f: 30 })).toBe(358);
    expect(kcalFromMacros({ kcal: 300 })).toBe(0);
  });

  it('trata macros faltantes y objeto vacío como cero', () => {
    expect(kcalFromMacros({ p: 10 })).toBe(40);
    expect(kcalFromMacros({})).toBe(0);
    expect(kcalFromMacros()).toBe(0);
  });
});

describe('kcalOf', () => {
  it('manda el kcal cargado aunque no cierre con los macros', () => {
    // El caso real: "3 Huevos doble yema" cargado a 400 con macros que dan 358.
    // La app respeta el 400 en vez de decidir por el usuario cuál dato está mal.
    expect(kcalOf({ kcal: 400, p: 20, c: 2, f: 30 })).toBe(400);
  });

  it('cae a los macros cuando no hay kcal cargado', () => {
    expect(kcalOf({ p: 20, c: 2, f: 30 })).toBe(358);
    expect(kcalOf({ kcal: 0, p: 20, c: 2, f: 30 })).toBe(358);
  });

  it('conserva las calorías de un ítem sin macros', () => {
    expect(kcalOf({ kcal: 250 })).toBe(250);
  });

  it('devuelve cero sin ningún dato', () => {
    expect(kcalOf({})).toBe(0);
    expect(kcalOf()).toBe(0);
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
