import { describe, it, expect } from 'vitest';
import { computeEquivalents, portionLabel, EQUIV_FOODS, swapMatchKey, computeFoodSwap } from './equivalences';

describe('computeEquivalents — proteína', () => {
  const res = computeEquivalents('p', 30);

  it('cada porción aproxima el objetivo del macro elegido', () => {
    expect(res.length).toBeGreaterThan(3);
    for (const item of res) {
      // Tolerancia por el redondeo de porciones (más amplia en unidades enteras).
      expect(item.p).toBeGreaterThanOrEqual(30 * 0.7);
      expect(item.p).toBeLessThanOrEqual(30 * 1.3);
    }
  });

  it('incluye fuentes reales de proteína y excluye las que no lo son', () => {
    const ids = res.map((r) => r.id);
    expect(ids).toContain('eq_pollo');
    expect(ids).toContain('eq_huevo');
    expect(ids).not.toContain('eq_arroz'); // tiene algo de proteína, pero no es fuente
    expect(ids).not.toContain('eq_aceite'); // 0 proteína
  });

  it('ordena de lo más magro (menos kcal) a lo más pesado', () => {
    const kcals = res.map((r) => r.kcal);
    expect(kcals).toEqual([...kcals].sort((a, b) => a - b));
  });

  it('los alimentos por unidad devuelven porciones enteras con plural', () => {
    const huevo = res.find((r) => r.id === 'eq_huevo');
    expect(huevo).toBeTruthy();
    expect(huevo.label).toMatch(/^\d+ huevos?$/);
  });

  it('escala kcal y el resto de los macros junto con la porción', () => {
    const pollo = res.find((r) => r.id === 'eq_pollo');
    // 30g de proteína ~ 95-100g de pechuga ~ 155-165 kcal
    expect(pollo.kcal).toBeGreaterThan(140);
    expect(pollo.kcal).toBeLessThan(180);
    expect(pollo.label).toMatch(/g$/);
  });
});

describe('computeEquivalents — otros macros y bordes', () => {
  it('grasa: incluye aceite y frutos secos, excluye la pechuga', () => {
    const ids = computeEquivalents('f', 15).map((r) => r.id);
    expect(ids).toContain('eq_aceite');
    expect(ids).toContain('eq_almendras');
    expect(ids).not.toContain('eq_pollo');
  });

  it('carbohidratos: incluye arroz y fruta, excluye la pechuga', () => {
    const ids = computeEquivalents('c', 45).map((r) => r.id);
    expect(ids).toContain('eq_arroz');
    expect(ids).toContain('eq_banana');
    expect(ids).not.toContain('eq_pollo');
  });

  it('objetivo cero o negativo devuelve vacío', () => {
    expect(computeEquivalents('p', 0)).toEqual([]);
    expect(computeEquivalents('p', -10)).toEqual([]);
  });

  it('macro inexistente devuelve vacío', () => {
    expect(computeEquivalents('x', 30)).toEqual([]);
  });
});

describe('computeEquivalents — calorías', () => {
  const res = computeEquivalents('kcal', 200);

  it('cada porción aproxima las calorías objetivo', () => {
    expect(res.length).toBeGreaterThan(5);
    for (const item of res) {
      expect(item.kcal).toBeGreaterThanOrEqual(200 * 0.75);
      expect(item.kcal).toBeLessThanOrEqual(200 * 1.25);
    }
  });

  it('incluye todo tipo de alimento (cualquiera aporta calorías), incluso el aceite', () => {
    const ids = res.map((r) => r.id);
    expect(ids).toContain('eq_aceite'); // pura grasa: no es fuente de P/C pero sí de kcal
    expect(ids).toContain('eq_pollo');
    expect(ids).toContain('eq_banana');
  });

  it('ordena por proteína descendente (más proteína por esas calorías primero)', () => {
    for (let i = 0; i < res.length - 1; i++) {
      expect(res[i].p).toBeGreaterThanOrEqual(res[i + 1].p);
    }
  });
});

describe('alimentos agregados', () => {
  it('incluye la proteína en polvo entre las fuentes de proteína, en scoops', () => {
    const res = computeEquivalents('p', 24);
    const whey = res.find((r) => r.id === 'eq_whey');
    expect(whey).toBeTruthy();
    expect(whey.label).toMatch(/scoops?$/);
  });

  it('incluye tofu y soja texturizada como proteína vegetal (legumbres)', () => {
    const ids = computeEquivalents('p', 30).map((r) => r.id);
    expect(ids).toContain('eq_tofu');
    expect(ids).toContain('eq_soja_tex');
  });
});

describe('portionLabel', () => {
  it('formatea gramos, ml y unidades (singular/plural)', () => {
    expect(portionLabel(120, { unit: 'g' })).toBe('120 g');
    expect(portionLabel(200, { unit: 'ml' })).toBe('200 ml');
    expect(portionLabel(1, { unit: 'u', single: 'huevo', plural: 'huevos' })).toBe('1 huevo');
    expect(portionLabel(3, { unit: 'u', single: 'huevo', plural: 'huevos' })).toBe('3 huevos');
  });
});

describe('reemplazo alimento ↔ alimento', () => {
  const huevo = EQUIV_FOODS.find((f) => f.id === 'eq_huevo');

  it('2 huevos se igualan por proteína por defecto (es fuente, aunque tenga grasa)', () => {
    expect(swapMatchKey(huevo)).toBe('p');
  });

  it('2 huevos encuentran recambios de proteína y no se listan a sí mismos', () => {
    const { source, results } = computeFoodSwap(huevo, 2, 'p');
    expect(source.label).toBe('2 huevos');
    expect(source.p).toBeGreaterThan(10);
    expect(results.length).toBeGreaterThan(3);
    expect(results.map((r) => r.id)).not.toContain('eq_huevo');
    const pollo = results.find((r) => r.id === 'eq_pollo');
    expect(pollo).toBeTruthy();
    expect(pollo.p).toBeGreaterThanOrEqual(source.p * 0.7);
    expect(pollo.p).toBeLessThanOrEqual(source.p * 1.3);
    expect(pollo.delta.p).toBeCloseTo(pollo.p - source.p, 5);
  });

  it('el arroz se iguala por carbohidratos', () => {
    const arroz = EQUIV_FOODS.find((f) => f.id === 'eq_arroz');
    expect(swapMatchKey(arroz)).toBe('c');
  });
});

