import { describe, it, expect } from 'vitest';
import { searchFoods } from './foodDatabase';

describe('searchFoods', () => {
  it('ignora consultas de menos de 2 caracteres', () => {
    expect(searchFoods('')).toEqual([]);
    expect(searchFoods('m')).toEqual([]);
  });

  it('encuentra por subcadena sin importar mayúsculas', () => {
    const res = searchFoods('MANZ');
    expect(res.some((f) => f.name.toLowerCase().includes('manzana'))).toBe(true);
  });

  it('es insensible a tildes', () => {
    // "naranja" con acento en la consulta debe matchear igual
    const res = searchFoods('banána');
    expect(res.some((f) => f.name.toLowerCase().includes('banana'))).toBe(true);
  });

  it('exige que todas las palabras aparezcan en el nombre', () => {
    const res = searchFoods('manzana zzz');
    expect(res).toEqual([]);
  });

  it('respeta el límite de resultados', () => {
    const res = searchFoods('de', 3); // subcadena frecuente
    expect(res.length).toBeLessThanOrEqual(3);
  });

  it('recorta espacios de la consulta', () => {
    expect(searchFoods('  manzana  ').length).toBeGreaterThan(0);
  });
});
