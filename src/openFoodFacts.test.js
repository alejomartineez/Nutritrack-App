import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toFood, searchProducts } from './openFoodFacts';

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

describe('searchProducts — resiliencia ante el servidor intermitente de OFF', () => {
  const okResponse = (products) => ({ ok: true, status: 200, json: async () => ({ products }) });
  const mkProduct = (name) => ({
    code: `c_${name}`,
    product_name: name,
    brands: '',
    nutriments: { 'energy-kcal_100g': 100, proteins_100g: 1, carbohydrates_100g: 2, fat_100g: 3 },
  });

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('reintenta ante un 503 sin CORS (Failed to fetch) y termina devolviendo resultados', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch')) // OFF caído: el navegador no ve el 503
      .mockResolvedValueOnce(okResponse([mkProduct('galletas-a')]));
    vi.stubGlobal('fetch', fetchMock);

    const promise = searchProducts('galletas retry unico', { limit: 3 });
    await vi.advanceTimersByTimeAsync(600); // cubre el primer backoff (400ms)
    const foods = await promise;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(foods).toHaveLength(1);
    expect(foods[0].name).toBe('galletas-a');
  });

  it('lanza si el servicio falla en todos los intentos (para que la UI muestre el error)', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    const promise = searchProducts('fantasma sin red', { limit: 3 });
    const assertion = expect(promise).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(2000); // cubre los dos backoffs (400 + 1100)
    await assertion;

    expect(fetchMock).toHaveBeenCalledTimes(3); // intento inicial + 2 reintentos
  });

  it('cachea una búsqueda ya resuelta: no vuelve a pegarle a la red', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse([mkProduct('yogur-x')]));
    vi.stubGlobal('fetch', fetchMock);

    const first = await searchProducts('yogur cache unico', { limit: 3 });
    const second = await searchProducts('yogur cache unico', { limit: 3 });

    expect(first).toEqual(second);
    expect(fetchMock).toHaveBeenCalledTimes(1); // la segunda salió de caché
  });

  it('no reintenta ante 404 (resultado válido: no hay producto) y devuelve []', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    const foods = await searchProducts('inexistente 404 unico', { limit: 3 });

    expect(foods).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
