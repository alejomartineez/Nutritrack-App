import { describe, it, expect } from 'vitest';
import { computeEquivalents, portionLabel } from './equivalences';

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

describe('portionLabel', () => {
  it('formatea gramos, ml y unidades (singular/plural)', () => {
    expect(portionLabel(120, { unit: 'g' })).toBe('120 g');
    expect(portionLabel(200, { unit: 'ml' })).toBe('200 ml');
    expect(portionLabel(1, { unit: 'u', single: 'huevo', plural: 'huevos' })).toBe('1 huevo');
    expect(portionLabel(3, { unit: 'u', single: 'huevo', plural: 'huevos' })).toBe('3 huevos');
  });
});
