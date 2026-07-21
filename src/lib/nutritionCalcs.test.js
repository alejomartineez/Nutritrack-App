import { describe, it, expect } from 'vitest';
import {
  dateKeyOf,
  startOfDay,
  addDays,
  round1,
  computeTotals,
  kcalFromMacros,
  hasMacros,
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

  it('ignora el campo kcal guardado aunque esté descuadrado', () => {
    // El caso real que motivó el cambio: item tipeado con 400 kcal cuyos
    // macros dan 358. Manda el macro, no el número suelto.
    expect(kcalFromMacros({ kcal: 400, p: 20, c: 2, f: 30 })).toBe(358);
  });

  it('trata macros faltantes y objeto vacío como cero', () => {
    expect(kcalFromMacros({ p: 10 })).toBe(40);
    expect(kcalFromMacros({})).toBe(0);
    expect(kcalFromMacros()).toBe(0);
  });
});

describe('computeTotals', () => {
  it('deriva las kcal de los macros, no del campo kcal', () => {
    // Los `kcal` de abajo suman 800, pero los macros dan 765: gana el macro.
    const meals = [
      { kcal: 300, p: 20, c: 30, f: 10 },
      { kcal: 500, p: 40, c: 45, f: 15 },
    ];
    expect(computeTotals(meals)).toEqual({ kcal: 765, p: 60, c: 75, f: 25, alc: 0 });
  });

  it('el total siempre cierra con 4p + 4c + 9f cuando no hay alcohol', () => {
    const meals = [
      { kcal: 400, p: 20, c: 2, f: 30 },
      { kcal: 532, p: 26.6, c: 2.7, f: 39.9 },
      { kcal: 310, p: 14, c: 30, f: 11 },
    ];
    const t = computeTotals(meals);
    expect(t.kcal).toBeCloseTo(t.p * 4 + t.c * 4 + t.f * 9, 6);
  });

  it('devuelve ceros con lista vacía o sin argumento', () => {
    expect(computeTotals([])).toEqual({ kcal: 0, p: 0, c: 0, f: 0, alc: 0 });
    expect(computeTotals()).toEqual({ kcal: 0, p: 0, c: 0, f: 0, alc: 0 });
  });

  it('una comida sin macros conserva sus calorías en vez de desaparecer', () => {
    // Derivar acá daba 0 y borraba comida real del contador. Un ítem sin macros
    // está incompleto, no descuadrado: se arregla completándolo (la fila lo
    // marca), no descontándolo del día.
    expect(computeTotals([{ kcal: 100 }])).toEqual({ kcal: 100, p: 0, c: 0, f: 0, alc: 0 });
  });

  it('mezcla ítems completos e incompletos sin perder ninguno', () => {
    const t = computeTotals([
      { kcal: 400, p: 20, c: 2, f: 30 }, // completo: manda el macro (358)
      { kcal: 250 }, // incompleto: manda su kcal
    ]);
    expect(t.kcal).toBe(608);
  });

  it('acumula el alcohol aparte y lo suma a las kcal', () => {
    const t = computeTotals([{ p: 2, c: 17, f: 0, alc: 18.4 }]);
    expect(t.alc).toBeCloseTo(18.4, 1);
    expect(t.kcal).toBeCloseTo(204.8, 1);
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
  // Ojo con las kcal esperadas: NO son el `kcal` del alimento por el factor,
  // sino las que salen de los macros ya escalados. La banana de la base trae
  // 105 kcal de etiqueta pero sus macros dan 116.8 (la fibra no aporta las 4
  // kcal/g que le asigna Atwater), así que ×1 devuelve 117, no 105.
  const banana = { name: 'Banana (1 mediana)', kcal: 105, p: 1.3, c: 27, f: 0.4 };
  const nutella = { name: 'Nutella', kcal: 539, p: 6.3, c: 57.5, f: 30.9, basis: '100g' };

  it('multiplica una porción y anota la cantidad en el nombre', () => {
    const r = scaleFood(banana, 2);
    expect(r.kcal).toBe(234); // 2.6×4 + 54×4 + 0.8×9
    expect(r.p).toBe(2.6);
    expect(r.c).toBe(54);
    expect(r.name).toBe('Banana (1 mediana) ×2');
  });

  it('deja el nombre intacto con ×1', () => {
    const r = scaleFood(banana, 1);
    expect(r.kcal).toBe(117);
    expect(r.name).toBe('Banana (1 mediana)');
  });

  it('admite fracciones de porción', () => {
    const r = scaleFood(banana, 0.5);
    expect(r.kcal).toBe(59); // 58.6 redondeado
    expect(r.name).toBe('Banana (1 mediana) ×0.5');
  });

  it('escala por gramos cuando la base es 100g', () => {
    const r = scaleFood(nutella, 60);
    expect(r.kcal).toBe(320); // 3.8×4 + 34.5×4 + 18.5×9
    expect(r.p).toBe(3.8);
    expect(r.f).toBe(18.5);
    expect(r.name).toBe('Nutella (60 g)');
  });

  it('cae a la porción original si la cantidad es inválida', () => {
    expect(scaleFood(banana, 0).kcal).toBe(117);
    expect(scaleFood(banana, -3).kcal).toBe(117);
    expect(scaleFood(banana, NaN).kcal).toBe(117);
  });

  it('un alimento sin macros escala su kcal, que es el único dato que tiene', () => {
    const r = scaleFood({ name: 'Sin datos', kcal: 100 }, 2);
    expect(r).toMatchObject({ kcal: 200, p: 0, c: 0, f: 0 });
  });

  it('escala el alcohol y lo cuenta en las kcal', () => {
    const cerveza = { name: 'Cerveza', kcal: 205, p: 2, c: 17, f: 0, alc: 18.4 };
    const r = scaleFood(cerveza, 2);
    expect(r.alc).toBe(36.8);
    expect(r.kcal).toBe(410); // 4×4 + 34×4 + 36.8×7 = 409.6
  });

  it('no agrega el campo alc a los alimentos que no lo traen', () => {
    expect(scaleFood(banana, 2)).not.toHaveProperty('alc');
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
