import { describe, it, expect } from 'vitest';
import { toFood } from './openFoodFacts';

// Datos con la forma real que devuelve la API (claves verificadas contra
// world.openfoodfacts.org: energy-kcal_100g, proteins_100g, etc.).
const nutella = {
  code: '3017620422003',
  product_name: 'Nutella',
  brands: 'Ferrero',
  nutriments: {
    'energy-kcal_100g': 539,
    proteins_100g: 6.3,
    carbohydrates_100g: 57.5,
    fat_100g: 30.9,
  },
};

describe('toFood', () => {
  it('mapea un producto completo a alimento por 100g', () => {
    expect(toFood(nutella)).toEqual({
      id: 'off_3017620422003',
      name: 'Nutella · Ferrero',
      kcal: 539,
      p: 6.3,
      c: 57.5,
      f: 30.9,
      basis: '100g',
    });
  });

  it('usa solo la primera marca cuando vienen varias', () => {
    expect(toFood({ ...nutella, brands: 'Ferrero,Nutella,Ferrero España' }).name).toBe('Nutella · Ferrero');
  });

  it('omite la marca si no hay', () => {
    expect(toFood({ ...nutella, brands: '' }).name).toBe('Nutella');
  });

  it('no repite la marca si ya está en el nombre', () => {
    // Caso real: Nutella viene con brands "Nutella, Ferrero, Yum yum"
    expect(toFood({ ...nutella, brands: 'Nutella, Ferrero' }).name).toBe('Nutella');
  });

  it('descarta productos sin datos nutricionales', () => {
    expect(toFood({ ...nutella, nutriments: {} })).toBeNull();
    expect(toFood({ ...nutella, nutriments: { 'energy-kcal_100g': 0 } })).toBeNull();
    expect(toFood({ ...nutella, nutriments: { 'energy-kcal_100g': 'muchas' } })).toBeNull();
  });

  it('descarta productos sin nombre ni marca', () => {
    expect(toFood({ ...nutella, product_name: '', brands: '' })).toBeNull();
  });

  it('trata macros faltantes como cero, sin perder el producto', () => {
    const parcial = toFood({ ...nutella, nutriments: { 'energy-kcal_100g': 250 } });
    expect(parcial).toMatchObject({ kcal: 250, p: 0, c: 0, f: 0 });
  });

  it('redondea las calorías', () => {
    expect(toFood({ ...nutella, nutriments: { ...nutella.nutriments, 'energy-kcal_100g': 122.6 } }).kcal).toBe(123);
  });

  it('no explota con entrada nula', () => {
    expect(toFood(null)).toBeNull();
    expect(toFood(undefined)).toBeNull();
  });
});
