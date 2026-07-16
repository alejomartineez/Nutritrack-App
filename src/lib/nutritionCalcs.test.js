import { describe, it, expect } from 'vitest';
import {
  dateKeyOf,
  startOfDay,
  addDays,
  round1,
  computeTotals,
  computeStreak,
  computeMacroSegments,
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
