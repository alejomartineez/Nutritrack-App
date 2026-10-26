// Modelo de nutrición: funciones puras (sin React ni storage) para comidas,
// porciones, totales y búsqueda.

import { Sunrise, Sun, Coffee, Moon, Apple } from 'lucide-react';
import { kcalOf, round1 } from '../lib/nutritionCalcs';
import { hmToMinutes } from '../lib/dates';

export const DEFAULT_GOALS = { calories: 1610, protein: 116.5, carbs: 159, fat: 56.5, water: 2000 };
export const TOLERANCE = { calories: 100, protein: 10, carbs: 10, fat: 10 };

// ---------------------------------------------------------------------------
// Momentos del día. Las comidas viejas no tienen `meal`: se deducen por hora.
// ---------------------------------------------------------------------------
export const MEALS = [
  { id: 'desayuno', label: 'Desayuno', icon: Sunrise, until: 11 * 60 },
  { id: 'almuerzo', label: 'Almuerzo', icon: Sun, until: 15 * 60 + 30 },
  { id: 'merienda', label: 'Merienda', icon: Coffee, until: 19 * 60 + 30 },
  { id: 'cena', label: 'Cena', icon: Moon, until: 28 * 60 },
  { id: 'snack', label: 'Colaciones', icon: Apple },
];
export const MEAL_BY_ID = Object.fromEntries(MEALS.map((m) => [m.id, m]));

/** Momento que corresponde a una hora "HH:MM" (la madrugada cuenta como cena). */
export const mealForTime = (hm) => {
  const mins = hmToMinutes(hm);
  if (!Number.isFinite(mins)) return 'snack';
  if (mins < 4 * 60) return 'cena';
  return MEALS.find((m) => m.until && mins < m.until)?.id || 'cena';
};

export const mealOf = (entry) => (entry.meal && MEAL_BY_ID[entry.meal] ? entry.meal : mealForTime(entry.time));

// ---------------------------------------------------------------------------
// Registro del día: { water, planMeals: Entry[], freeMeals: Entry[] }.
// Entry: { id, name, kcal, p, c, f, alc?, time, meal?, qty?, base? }
//   base = el alimento por unidad ({ name, kcal, p, c, f, alc?, basis, portion? })
//   qty  = multiplicador de la porción, o gramos si basis === '100g'
// ---------------------------------------------------------------------------
export const emptyLog = () => ({ water: 0, planMeals: [], freeMeals: [] });

export const normalizeLog = (log) => ({
  water: Number(log?.water) || 0,
  planMeals: Array.isArray(log?.planMeals) ? log.planMeals : [],
  freeMeals: Array.isArray(log?.freeMeals) ? log.freeMeals : [],
});

/** Todas las comidas con su clase (`free`) y momento, ordenadas por hora. */
export const entriesOf = (log) =>
  [
    ...log.planMeals.map((e) => ({ ...e, free: false })),
    ...log.freeMeals.map((e) => ({ ...e, free: true })),
  ]
    .map((e) => ({ ...e, meal: mealOf(e) }))
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

export const totalsOf = (entries) =>
  entries.reduce(
    (t, e) => ({
      kcal: t.kcal + kcalOf(e),
      p: t.p + (Number(e.p) || 0),
      c: t.c + (Number(e.c) || 0),
      f: t.f + (Number(e.f) || 0),
    }),
    { kcal: 0, p: 0, c: 0, f: 0 }
  );

// ---------------------------------------------------------------------------
// Porciones
// ---------------------------------------------------------------------------

/** "Banana (1 mediana)" → { title: 'Banana', portion: '1 mediana' } */
export const splitName = (name = '') => {
  const m = name.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  return m ? { title: m[1], portion: m[2] } : { title: name, portion: '' };
};

/** Base de un alimento cualquiera (DB local, Open Food Facts, catálogo, entrada vieja). */
export const toBase = (food) => {
  const base = {
    name: food.name,
    kcal: Number(food.kcal) || 0,
    p: Number(food.p) || 0,
    c: Number(food.c) || 0,
    f: Number(food.f) || 0,
    basis: food.basis === '100g' ? '100g' : 'portion',
  };
  if (food.alc) base.alc = Number(food.alc);
  if (food.portion) base.portion = food.portion;
  return base;
};

export const defaultQty = (base) => (base.basis === '100g' ? 100 : 1);

/** Macros de `qty` de la base. kcal se escala tal cual (manda lo cargado, ver kcalOf). */
export const scaleBase = (base, qty) => {
  const n = Number(qty);
  const factor = base.basis === '100g' ? n / 100 : n;
  const k = Number.isFinite(factor) && factor > 0 ? factor : 0;
  const out = {
    kcal: Math.round(kcalOf(base) * k),
    p: round1(base.p * k),
    c: round1(base.c * k),
    f: round1(base.f * k),
  };
  if (base.alc) out.alc = round1(base.alc * k);
  return out;
};

/** Texto de cantidad: "150 g", "×1,5", "1 porción". */
export const qtyLabel = (base, qty) => {
  if (!base) return '';
  if (base.basis === '100g') return `${round1(qty)} g`;
  const portion = base.portion || splitName(base.name).portion;
  if (Number(qty) === 1) return portion || '1 porción';
  return `${String(round1(qty)).replace('.', ',')} × ${portion || 'porción'}`;
};

/** Entrada lista para guardar. */
export const makeEntry = ({ base, qty, meal, time, id }) => ({
  id,
  name: base.name,
  ...scaleBase(base, qty),
  time,
  meal,
  qty: Number(qty),
  base,
});

/** Base y cantidad de una entrada (las viejas no tienen base: valen como porción ×1). */
export const baseOfEntry = (entry) =>
  entry.base ? { base: entry.base, qty: Number(entry.qty) || defaultQty(entry.base) } : { base: toBase(entry), qty: 1 };

// ---------------------------------------------------------------------------
// Búsqueda
// ---------------------------------------------------------------------------
export const normalizeText = (s = '') =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

/**
 * Puntaje de coincidencia (0 = no coincide). Todas las palabras tienen que
 * aparecer; suma si el nombre arranca con la consulta o alguna palabra empieza
 * igual, así "pan" muestra "Pan francés" antes que "Empanada".
 */
export const matchScore = (name, query) => {
  const q = normalizeText(query);
  if (q.length < 2) return 0;
  const n = normalizeText(name);
  const words = q.split(/\s+/);
  if (!words.every((w) => n.includes(w))) return 0;
  let score = 1;
  if (n.startsWith(q)) score += 4;
  const nameWords = n.split(/[\s(),/]+/);
  words.forEach((w) => {
    if (nameWords.some((nw) => nw.startsWith(w))) score += 2;
  });
  return score - n.length / 200;
};

export const rankByQuery = (items, query, getName = (x) => x.name) =>
  items
    .map((it) => ({ it, s: matchScore(getName(it), query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.it);
