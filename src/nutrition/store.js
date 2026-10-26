import { useSyncExternalStore } from 'react';
import { readJSON, writeJSON, uid, keysWithPrefix } from '../lib/storage';
import { nowHM, addDaysToKey } from '../lib/dates';
import { DEFAULT_GOALS, normalizeLog, emptyLog, mealOf, makeEntry, toBase } from './model';

// Store de nutrición. Cada clave de localStorage se cachea en memoria y se
// escribe al toque en cada cambio (sin efectos de persistencia que puedan
// pisarse entre días). Los componentes leen con hooks que se re-renderizan
// solos cuando cambia la clave.

const cache = new Map();
const subs = new Map();

const notify = (key) => subs.get(key)?.forEach((fn) => fn());

const subscribers = new Map();
const subscribe = (key) => {
  if (!subscribers.has(key)) {
    subscribers.set(key, (fn) => {
      if (!subs.has(key)) subs.set(key, new Set());
      subs.get(key).add(fn);
      return () => subs.get(key)?.delete(fn);
    });
  }
  return subscribers.get(key);
};

export const get = (key, fallback, normalize = (x) => x) => {
  if (!cache.has(key)) cache.set(key, normalize(readJSON(key, fallback)));
  return cache.get(key);
};

export const set = (key, value) => {
  cache.set(key, value);
  writeJSON(key, value);
  notify(key);
};

const useKey = (key, fallback, normalize) => useSyncExternalStore(subscribe(key), () => get(key, fallback, normalize));

/** Olvida la caché (después de restaurar un backup, por ejemplo). */
export const resetCache = () => {
  const keys = [...cache.keys()];
  cache.clear();
  keys.forEach(notify);
};

// ---------------------------------------------------------------------------
// Registro diario
// ---------------------------------------------------------------------------
export const LOG_PREFIX = 'nutri_log_';
const logKey = (dateKey) => `${LOG_PREFIX}${dateKey}`;

export const getLog = (dateKey) => get(logKey(dateKey), null, (raw) => (raw ? normalizeLog(raw) : emptyLog()));
export const useLog = (dateKey) => useKey(logKey(dateKey), null, (raw) => (raw ? normalizeLog(raw) : emptyLog()));

const writeLog = (dateKey, log) => set(logKey(dateKey), log);

/** Agrega una comida. `free` = fuera de plan. Devuelve la entrada guardada. */
export const addEntry = (dateKey, { base, qty, meal, free = false, time }) => {
  const entry = makeEntry({ base, qty, meal, time: time || nowHM(), id: uid('m') });
  const log = getLog(dateKey);
  const list = free ? 'freeMeals' : 'planMeals';
  writeLog(dateKey, { ...log, [list]: [...log[list], entry] });
  return { ...entry, free };
};

/** Reemplaza una comida (puede cambiar de plan a fuera de plan). */
export const updateEntry = (dateKey, id, patch) => {
  const log = getLog(dateKey);
  const wasFree = log.freeMeals.some((e) => e.id === id);
  const current = (wasFree ? log.freeMeals : log.planMeals).find((e) => e.id === id);
  if (!current) return;
  const free = patch.free ?? wasFree;
  const { free: _ignored, ...rest } = patch;
  const next = { ...current, ...rest };
  const planMeals = log.planMeals.filter((e) => e.id !== id);
  const freeMeals = log.freeMeals.filter((e) => e.id !== id);
  (free ? freeMeals : planMeals).push(next);
  writeLog(dateKey, { ...log, planMeals, freeMeals });
};

/** Borra comidas y devuelve una función para deshacer (que no pisa lo agregado después). */
export const removeEntries = (dateKey, ids) => {
  const drop = new Set(ids);
  const before = getLog(dateKey);
  const removed = {
    planMeals: before.planMeals.filter((e) => drop.has(e.id)),
    freeMeals: before.freeMeals.filter((e) => drop.has(e.id)),
  };
  writeLog(dateKey, {
    ...before,
    planMeals: before.planMeals.filter((e) => !drop.has(e.id)),
    freeMeals: before.freeMeals.filter((e) => !drop.has(e.id)),
  });
  return () => {
    const cur = getLog(dateKey);
    writeLog(dateKey, {
      ...cur,
      planMeals: [...cur.planMeals, ...removed.planMeals],
      freeMeals: [...cur.freeMeals, ...removed.freeMeals],
    });
  };
};

export const removeEntry = (dateKey, id) => removeEntries(dateKey, [id]);

export const setWater = (dateKey, ml) => {
  const log = getLog(dateKey);
  writeLog(dateKey, { ...log, water: Math.max(0, Math.round(ml)) });
};

/** Copia comidas (de otro día o momento) al día y momento indicados. */
export const copyEntries = (dateKey, entries, meal) => {
  const log = getLog(dateKey);
  const time = nowHM();
  const plan = [];
  const free = [];
  entries.forEach((e) => {
    const { free: isFree, ...rest } = e;
    const copy = { ...rest, id: uid('m'), time, meal: meal || mealOf(e) };
    (isFree ? free : plan).push(copy);
  });
  writeLog(dateKey, { ...log, planMeals: [...log.planMeals, ...plan], freeMeals: [...log.freeMeals, ...free] });
};

/** Logs de un rango de días, sin pasar por la caché si no hace falta. */
export const logsInRange = (fromKey, toKey) => {
  const out = [];
  for (let k = fromKey; k <= toKey; k = addDaysToKey(k, 1)) out.push({ key: k, log: getLog(k) });
  return out;
};

export const allLogKeys = () => keysWithPrefix(LOG_PREFIX).map((k) => k.slice(LOG_PREFIX.length)).sort();

// ---------------------------------------------------------------------------
// Metas
// ---------------------------------------------------------------------------
const GOALS_KEY = 'nutri_goals';
const normalizeGoals = (g) => ({ ...DEFAULT_GOALS, ...(g && typeof g === 'object' ? g : {}) });
export const getGoals = () => get(GOALS_KEY, null, normalizeGoals);
export const useGoals = () => useKey(GOALS_KEY, null, normalizeGoals);
export const setGoals = (goals) => set(GOALS_KEY, normalizeGoals(goals));

// ---------------------------------------------------------------------------
// Mis comidas: dos listas por compatibilidad (plan y fuera de plan).
// ---------------------------------------------------------------------------
const PLAN_CATALOG = 'nutri_catalog';
const FREE_CATALOG = 'nutri_free_catalog';
const FREE_PRESETS = [
  { id: 'f1', name: '1 Factura', kcal: 300, p: 5, c: 35, f: 15 },
  { id: 'f2', name: '2 Porciones de pizza', kcal: 560, p: 22, c: 60, f: 24 },
  { id: 'f3', name: '3 Empanadas', kcal: 450, p: 18, c: 45, f: 21 },
  { id: 'f4', name: '1 Bocha de helado', kcal: 150, p: 2, c: 20, f: 7 },
  { id: 'f5', name: 'Lomito mediano', kcal: 650, p: 35, c: 55, f: 30 },
  { id: 'f6', name: '1 Vaso de cerveza / vino', kcal: 150, p: 1, c: 12, f: 0 },
];
// Antes se guardaba agrupado por momento ({ desayuno: [...] }).
const normalizeCatalog = (raw) => (Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? Object.values(raw).flat() : []);

export const useCatalogs = () => ({
  plan: useKey(PLAN_CATALOG, [], normalizeCatalog),
  free: useKey(FREE_CATALOG, FREE_PRESETS, normalizeCatalog),
});
export const getCatalogs = () => ({
  plan: get(PLAN_CATALOG, [], normalizeCatalog),
  free: get(FREE_CATALOG, FREE_PRESETS, normalizeCatalog),
});

/** Crea o actualiza un ítem. Si cambia de lista (plan ↔ fuera de plan) se mueve. */
export const saveCatalogItem = (item, free) => {
  const { plan, free: freeList } = getCatalogs();
  const id = item.id || uid(free ? 'free' : 'custom');
  const clean = { ...toBase(item), id, name: item.name.trim() };
  delete clean.basis;
  if (item.basis === '100g') clean.basis = '100g';
  const without = (list) => list.filter((x) => x.id !== id);
  const upsert = (list) => {
    const i = list.findIndex((x) => x.id === id);
    return i === -1 ? [...list, clean] : list.map((x) => (x.id === id ? clean : x));
  };
  set(PLAN_CATALOG, free ? without(plan) : upsert(plan));
  set(FREE_CATALOG, free ? upsert(freeList) : without(freeList));
  return clean;
};

export const deleteCatalogItem = (id) => {
  const { plan, free } = getCatalogs();
  set(PLAN_CATALOG, plan.filter((x) => x.id !== id));
  set(FREE_CATALOG, free.filter((x) => x.id !== id));
};

export const findCatalogByName = (name) => {
  const { plan, free } = getCatalogs();
  const n = name.trim().toLowerCase();
  return plan.find((x) => x.name.toLowerCase() === n) || free.find((x) => x.name.toLowerCase() === n) || null;
};

// ---------------------------------------------------------------------------
// Peso: { 'YYYY-MM-DD': kg }
// ---------------------------------------------------------------------------
const WEIGHT_KEY = 'weight_logs';
const normalizeWeights = (raw) => {
  const out = {};
  if (raw && typeof raw === 'object') {
    Object.entries(raw).forEach(([k, v]) => {
      const n = Number(v);
      if (/^\d{4}-\d{2}-\d{2}$/.test(k) && Number.isFinite(n) && n > 0) out[k] = n;
    });
  }
  return out;
};
export const getWeights = () => get(WEIGHT_KEY, {}, normalizeWeights);
export const useWeights = () => useKey(WEIGHT_KEY, {}, normalizeWeights);
export const setWeight = (dateKey, kg) => set(WEIGHT_KEY, { ...getWeights(), [dateKey]: Math.round(kg * 10) / 10 });
export const removeWeight = (dateKey) => {
  const next = { ...getWeights() };
  delete next[dateKey];
  set(WEIGHT_KEY, next);
};

// ---------------------------------------------------------------------------
// Perfil (para recalcular el plan). Puede valer el texto 'skipped'.
// ---------------------------------------------------------------------------
export const getProfile = () => {
  const p = readJSON('nutri_profile', null);
  return p && typeof p === 'object' ? p : null;
};
export const saveProfile = (profile) => writeJSON('nutri_profile', profile);
