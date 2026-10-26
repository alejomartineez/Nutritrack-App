import { describe, it, expect } from 'vitest';
import { mealForTime, mealOf, splitName, toBase, scaleBase, qtyLabel, makeEntry, baseOfEntry, entriesOf, totalsOf, matchScore, rankByQuery, normalizeLog } from './model';

describe('momentos del día', () => {
  it('deduce el momento por la hora', () => {
    expect(mealForTime('07:30')).toBe('desayuno');
    expect(mealForTime('13:00')).toBe('almuerzo');
    expect(mealForTime('17:45')).toBe('merienda');
    expect(mealForTime('21:10')).toBe('cena');
    expect(mealForTime('01:30')).toBe('cena');
  });

  it('respeta el momento elegido y cae a la hora en comidas viejas', () => {
    expect(mealOf({ meal: 'snack', time: '13:00' })).toBe('snack');
    expect(mealOf({ time: '08:00' })).toBe('desayuno');
    expect(mealOf({ meal: 'inventado', time: '08:00' })).toBe('desayuno');
    expect(mealOf({})).toBe('snack');
  });
});

describe('porciones', () => {
  it('separa el nombre de la porción', () => {
    expect(splitName('Banana (1 mediana)')).toEqual({ title: 'Banana', portion: '1 mediana' });
    expect(splitName('Lomito mediano')).toEqual({ title: 'Lomito mediano', portion: '' });
  });

  it('escala por porción y por gramos', () => {
    const banana = toBase({ name: 'Banana', kcal: 105, p: 1.3, c: 27, f: 0.4 });
    expect(scaleBase(banana, 2)).toEqual({ kcal: 210, p: 2.6, c: 54, f: 0.8 });
    const yogur = toBase({ name: 'Yogur', kcal: 60, p: 10, c: 4, f: 0.4, basis: '100g' });
    expect(scaleBase(yogur, 150)).toEqual({ kcal: 90, p: 15, c: 6, f: 0.6 });
  });

  it('cantidad inválida da cero, nunca NaN', () => {
    const b = toBase({ name: 'x', kcal: 100, p: 1, c: 1, f: 1 });
    expect(scaleBase(b, 'abc').kcal).toBe(0);
  });

  it('el alcohol escala y suma calorías', () => {
    const birra = toBase({ name: 'Cerveza', kcal: 0, p: 2, c: 17, f: 0, alc: 18.4 });
    const s = scaleBase(birra, 2);
    expect(s.alc).toBe(36.8);
    expect(s.kcal).toBe(Math.round((2 * 4 + 17 * 4 + 18.4 * 7) * 2));
  });

  it('etiqueta la cantidad', () => {
    expect(qtyLabel(toBase({ name: 'Banana (1 mediana)', kcal: 1 }), 1)).toBe('1 mediana');
    expect(qtyLabel(toBase({ name: 'Banana (1 mediana)', kcal: 1 }), 1.5)).toBe('1,5 × 1 mediana');
    expect(qtyLabel(toBase({ name: 'Yogur', kcal: 1, basis: '100g' }), 150)).toBe('150 g');
  });

  it('una entrada guarda base y cantidad, y se puede reabrir', () => {
    const base = toBase({ name: 'Avena', kcal: 380, p: 13, c: 67, f: 7, basis: '100g' });
    const e = makeEntry({ base, qty: 40, meal: 'desayuno', time: '08:00', id: 'x' });
    expect(e.kcal).toBe(152);
    expect(baseOfEntry(e)).toEqual({ base, qty: 40 });
    // las viejas, sin base, valen como porción ×1
    expect(baseOfEntry({ name: 'Pollo', kcal: 300, p: 40, c: 0, f: 10 }).qty).toBe(1);
  });
});

describe('registro del día', () => {
  it('normaliza logs rotos o viejos', () => {
    expect(normalizeLog(null)).toEqual({ water: 0, planMeals: [], freeMeals: [] });
    expect(normalizeLog({ water: '500', planMeals: 'x' })).toEqual({ water: 500, planMeals: [], freeMeals: [] });
  });

  it('junta plan y fuera de plan, ordenado por hora, y suma', () => {
    const log = {
      water: 0,
      planMeals: [{ id: 'a', name: 'Pollo', kcal: 300, p: 40, c: 0, f: 10, time: '13:00' }],
      freeMeals: [{ id: 'b', name: 'Helado', kcal: 150, p: 2, c: 20, f: 7, time: '09:00' }],
    };
    const entries = entriesOf(log);
    expect(entries.map((e) => [e.id, e.free, e.meal])).toEqual([
      ['b', true, 'desayuno'],
      ['a', false, 'almuerzo'],
    ]);
    expect(totalsOf(entries)).toEqual({ kcal: 450, p: 42, c: 20, f: 17 });
  });
});

describe('búsqueda', () => {
  it('ignora tildes y mayúsculas y exige todas las palabras', () => {
    expect(matchScore('Pan francés', 'FRANCES')).toBeGreaterThan(0);
    expect(matchScore('Pan francés', 'pan zzz')).toBe(0);
    expect(matchScore('Pan', 'p')).toBe(0);
  });

  it('prioriza lo que empieza igual', () => {
    const items = [{ name: 'Empanada de carne' }, { name: 'Pan francés' }, { name: 'Hamburguesa con pan' }];
    expect(rankByQuery(items, 'pan')[0].name).toBe('Pan francés');
  });
});
