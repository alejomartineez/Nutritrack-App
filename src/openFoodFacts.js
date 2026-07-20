// ---------------------------------------------------------------------------
// OPEN FOOD FACTS
//
// Base abierta y gratuita de productos envasados (incluye productos argentinos).
// Cubre el hueco de FOOD_DB: lo que no está en la base local obligaba al usuario
// a buscar los macros en otra fuente y tipearlos a mano.
//
// Todo lo de acá es best-effort: si no hay red o la API falla, las funciones
// devuelven vacío o lanzan un error controlado, y la búsqueda local sigue
// funcionando igual. La app no depende de esto para nada crítico.
//
// Los macros de Open Food Facts vienen SIEMPRE por 100g, así que los alimentos
// que devolvemos llevan `basis: '100g'` y la hoja de cantidad pide gramos.
// ---------------------------------------------------------------------------

const SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
const PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product';
const FIELDS = 'code,product_name,brands,nutriments';
const TIMEOUT_MS = 8000;

/**
 * Nombre legible: "Producto · Marca" cuando hay marca.
 * Muchos productos repiten la marca en el nombre (Nutella con marca "Nutella"),
 * así que en ese caso se omite para no quedar con "Nutella · Nutella".
 */
const buildName = (product) => {
  const name = (product.product_name || '').trim();
  const brand = (product.brands || '').split(',')[0].trim();
  if (!name) return brand || '';
  if (!brand || name.toLowerCase().includes(brand.toLowerCase())) return name;
  return `${name} · ${brand}`;
};

/**
 * Convierte un producto crudo de la API al shape de alimento de la app.
 * Devuelve null si no tiene datos usables: muchísimos productos están cargados
 * sin tabla nutricional, y mostrarlos con 0 kcal sería peor que no mostrarlos.
 */
export const toFood = (product) => {
  if (!product) return null;
  const n = product.nutriments || {};
  const kcal = n['energy-kcal_100g'];
  if (typeof kcal !== 'number' || !Number.isFinite(kcal) || kcal <= 0) return null;

  const name = buildName(product);
  if (!name) return null;

  const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  return {
    id: `off_${product.code}`,
    name,
    kcal: Math.round(kcal),
    p: num(n.proteins_100g),
    c: num(n.carbohydrates_100g),
    f: num(n.fat_100g),
    basis: '100g',
  };
};

/** fetch con timeout, respetando una señal externa de cancelación. */
const fetchJson = async (url, signal) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const onAbort = () => ctrl.abort();
  if (signal) signal.addEventListener('abort', onAbort);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return { ok: false, status: res.status, data: null };
    return { ok: true, status: res.status, data: await res.json() };
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
};

/**
 * Busca productos por texto. Devuelve solo los que tienen datos nutricionales.
 * Lanza si la red falla, para que la UI pueda distinguir "sin resultados" de
 * "sin conexión" (son mensajes muy distintos para el usuario).
 */
export const searchProducts = async (query, { signal, limit = 6 } = {}) => {
  const q = query.trim();
  if (q.length < 2) return [];

  const url =
    `${SEARCH_URL}?search_terms=${encodeURIComponent(q)}` +
    `&search_simple=1&action=process&json=1&page_size=${limit * 3}&fields=${FIELDS}`;

  const { ok, data } = await fetchJson(url, signal);
  if (!ok || !data || !Array.isArray(data.products)) return [];

  const seen = new Set();
  const foods = [];
  for (const product of data.products) {
    const food = toFood(product);
    if (!food) continue;
    const key = food.name.toLowerCase();
    if (seen.has(key)) continue; // la API repite variantes del mismo producto
    seen.add(key);
    foods.push(food);
    if (foods.length >= limit) break;
  }
  return foods;
};

/**
 * Busca un producto por código de barras.
 * Devuelve null si no existe (404) o si no tiene datos nutricionales cargados.
 */
export const getProductByBarcode = async (barcode, { signal } = {}) => {
  const code = String(barcode || '').trim();
  if (!code) return null;

  const url = `${PRODUCT_URL}/${encodeURIComponent(code)}.json?fields=${FIELDS}`;
  const { ok, data } = await fetchJson(url, signal);
  if (!ok || !data || data.status !== 1) return null;
  return toFood(data.product);
};
