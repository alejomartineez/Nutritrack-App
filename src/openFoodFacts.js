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

// Reintentos ante fallos TRANSITORIOS. El servidor de Open Food Facts devuelve
// 503 de forma intermitente cuando está saturado (medido: ~50% de las veces en
// horas pico), y como esa página de error NO trae cabeceras CORS, el navegador
// la reporta como "Failed to fetch" —indistinguible de estar sin internet—. Un
// par de reintentos con backoff corto convierte ese ~50% de éxito en ~90%+ sin
// que el usuario note nada. Los tiempos suman ~1.5s en el peor caso, por debajo
// del timeout, y se cortan apenas el caller cancela (tecla nueva en el buscador).
const RETRY_DELAYS_MS = [400, 1100];

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

/** Espera `ms`, cortando apenas el caller cancela (para no demorar un reintento que ya no importa). */
const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true }
    );
  });

/** Una única llamada con timeout propio. AbortError propio del timeout ≠ cancelación del caller. */
const fetchOnce = async (url, signal) => {
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
 * fetch con timeout y reintentos ante fallos transitorios (ver RETRY_DELAYS_MS).
 * Reintenta cuando la petición se cae por red/CORS (el 503 sin cabeceras de OFF)
 * o cuando la respuesta es 5xx; NO reintenta ante 4xx (404 = "no existe", que es
 * un resultado válido) ni ante la cancelación del caller (tecla nueva).
 */
const fetchJson = async (url, signal) => {
  let lastError;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (attempt > 0) await sleep(RETRY_DELAYS_MS[attempt - 1], signal);
    try {
      const result = await fetchOnce(url, signal);
      // 5xx es transitorio (servidor saturado): reintentar si quedan intentos.
      if (!result.ok && result.status >= 500 && attempt < RETRY_DELAYS_MS.length) {
        lastError = new Error(`HTTP ${result.status}`);
        continue;
      }
      return result;
    } catch (err) {
      // Cancelación real del caller: se corta, no es un fallo a reintentar.
      if (err.name === 'AbortError' && signal?.aborted) throw err;
      lastError = err; // "Failed to fetch" (503 sin CORS) o timeout: reintentable
      if (attempt >= RETRY_DELAYS_MS.length) throw err;
    }
  }
  throw lastError;
};

// Caché en memoria de búsquedas ya resueltas. Con un servidor tan intermitente,
// que una consulta que YA salió bien no vuelva a jugarse a los dados —al repetir
// el término o al volver a la pestaña— es la mitad de la robustez. Es por sesión
// (no se persiste): los datos de OFF cambian y no vale la pena guardarlos en disco.
const searchCache = new Map(); // `${limit}:${query}` -> foods[]
const SEARCH_CACHE_MAX = 40;

const cacheGet = (key) => {
  if (!searchCache.has(key)) return undefined;
  const value = searchCache.get(key); // re-inserta para LRU: lo recién usado no se desaloja
  searchCache.delete(key);
  searchCache.set(key, value);
  return value;
};

const cacheSet = (key, value) => {
  searchCache.set(key, value);
  if (searchCache.size > SEARCH_CACHE_MAX) searchCache.delete(searchCache.keys().next().value);
};

/**
 * Busca productos por texto. Devuelve solo los que tienen datos nutricionales.
 * Lanza si la red falla tras los reintentos, para que la UI pueda distinguir
 * "sin resultados" de "el servicio no responde" (mensajes muy distintos).
 */
export const searchProducts = async (query, { signal, limit = 6 } = {}) => {
  const q = query.trim();
  if (q.length < 2) return [];

  const cacheKey = `${limit}:${q.toLowerCase()}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

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
  // Solo se cachea cuando la consulta se resolvió (no cuando lanzó): así un fallo
  // transitorio no queda "pegado" como vacío y el próximo intento vuelve a probar.
  if (foods.length > 0) cacheSet(cacheKey, foods);
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
