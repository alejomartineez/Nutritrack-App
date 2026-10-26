// Cálculos de progreso: rachas, tendencia de peso, gasto estimado, frecuentes.
// Puras: reciben los datos y devuelven valores (testeables sin storage).

import { addDaysToKey, daysBetween } from '../lib/dates';
import { entriesOf, totalsOf, TOLERANCE, baseOfEntry, mealOf } from './model';

const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Resumen de un día. */
export const dayStats = (log, goals) => {
  const entries = entriesOf(log);
  const t = totalsOf(entries);
  const hasFood = entries.length > 0;
  return {
    ...t,
    water: log.water || 0,
    hasFood,
    freeCount: log.freeMeals.length,
    inRange: hasFood && Math.abs(t.kcal - goals.calories) <= TOLERANCE.calories,
    over: hasFood && t.kcal > goals.calories + TOLERANCE.calories,
  };
};

/**
 * Racha de días con comidas registradas que termina hoy (o ayer, si hoy
 * todavía no registraste). Perdona un único día salteado entre días activos.
 */
export const loggingStreak = (isActive, todayKey) => {
  let cursor = isActive(todayKey) ? todayKey : addDaysToKey(todayKey, -1);
  let streak = 0;
  let freezeUsed = false;
  for (let i = 0; i < 1000; i++) {
    if (isActive(cursor)) {
      streak++;
      cursor = addDaysToKey(cursor, -1);
      continue;
    }
    const before = addDaysToKey(cursor, -1);
    if (!freezeUsed && streak > 0 && isActive(before)) {
      freezeUsed = true;
      cursor = before;
      continue;
    }
    break;
  }
  return { streak, freezeUsed };
};

/**
 * Peso de tendencia: media móvil exponencial diaria (como Happy Scale / Libra).
 * Suaviza la variación de agua y sal para ver hacia dónde vas de verdad.
 * Devuelve [{ key, weight|null, trend }] desde el primer registro hasta `endKey`.
 */
export const weightTrend = (weights, endKey, alpha = 0.1) => {
  const keys = Object.keys(weights).sort();
  if (!keys.length) return [];
  const out = [];
  let trend = weights[keys[0]];
  const last = endKey && endKey > keys[keys.length - 1] ? endKey : keys[keys.length - 1];
  for (let k = keys[0]; k <= last; k = addDaysToKey(k, 1)) {
    const w = weights[k];
    if (w != null) trend = trend + alpha * (w - trend);
    out.push({ key: k, weight: w ?? null, trend: Math.round(trend * 100) / 100 });
  }
  return out;
};

/** Pendiente (kg/día) por mínimos cuadrados de los pesos de la ventana. */
export const weightSlope = (points) => {
  if (points.length < 2) return 0;
  const mx = avg(points.map((p) => p.x));
  const my = avg(points.map((p) => p.y));
  const num = points.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0);
  const den = points.reduce((s, p) => s + (p.x - mx) ** 2, 0);
  return den ? num / den : 0;
};

export const KCAL_PER_KG = 7700;

/**
 * Gasto energético real estimado (TDEE adaptativo, al estilo MacroFactor):
 * lo que comiste en promedio menos lo que explica el cambio de peso.
 *   TDEE = ingesta media − pendiente(kg/día) × 7700
 * Necesita datos suficientes; si no, devuelve `{ ready: false, need }`.
 *
 * @param days     tamaño de la ventana (días hacia atrás desde endKey)
 * @param kcalByDay { key: kcal } solo de días con comidas registradas
 */
export const estimateTDEE = ({ kcalByDay, weights, endKey, days = 28, minCalories = 800 }) => {
  const from = addDaysToKey(endKey, -(days - 1));
  const intakeDays = Object.entries(kcalByDay).filter(([k, v]) => k >= from && k <= endKey && v >= minCalories);
  const wPoints = Object.entries(weights)
    .filter(([k]) => k >= from && k <= endKey)
    .map(([k, y]) => ({ x: daysBetween(from, k), y }));
  const span = wPoints.length ? Math.max(...wPoints.map((p) => p.x)) - Math.min(...wPoints.map((p) => p.x)) : 0;

  const need = [];
  if (intakeDays.length < 10) need.push(`${10 - intakeDays.length} días más con comidas registradas`);
  if (wPoints.length < 4) need.push(`${4 - wPoints.length} pesajes más`);
  else if (span < 10) need.push('pesajes separados por al menos 10 días');
  if (need.length) return { ready: false, need, intakeDays: intakeDays.length, weighIns: wPoints.length };

  const intake = avg(intakeDays.map(([, v]) => v));
  const slope = weightSlope(wPoints);
  const tdee = intake - slope * KCAL_PER_KG;
  return {
    ready: true,
    tdee: Math.round(tdee / 10) * 10,
    intake: Math.round(intake),
    weeklyChangeKg: Math.round(slope * 7 * 100) / 100,
    intakeDays: intakeDays.length,
    weighIns: wPoints.length,
  };
};

/**
 * Alimentos del historial agrupados por nombre: base y cantidad de la última
 * vez, cuántas veces y en qué momento del día suele ir.
 * @param logs [{ key, log }]
 */
export const foodHistory = (logs) => {
  const byName = new Map();
  logs.forEach(({ key, log }) => {
    entriesOf(log).forEach((e) => {
      if (!e.name) return;
      const k = e.name.trim().toLowerCase();
      const prev = byName.get(k);
      const { base, qty } = baseOfEntry(e);
      const lastStamp = `${key} ${e.time || ''}`;
      if (!prev) {
        byName.set(k, { name: e.name, base, qty, free: e.free, count: 1, last: lastStamp, meals: { [mealOf(e)]: 1 } });
      } else {
        prev.count += 1;
        prev.meals[mealOf(e)] = (prev.meals[mealOf(e)] || 0) + 1;
        if (lastStamp > prev.last) Object.assign(prev, { base, qty, free: e.free, last: lastStamp, name: e.name });
      }
    });
  });
  return [...byName.values()];
};

export const recentFoods = (history, limit = 20) => [...history].sort((a, b) => b.last.localeCompare(a.last)).slice(0, limit);

/** Frecuentes, priorizando lo que solés comer en `meal`. */
export const frequentFoods = (history, meal, limit = 12) =>
  [...history]
    .map((h) => ({ h, s: h.count + (meal && h.meals[meal] ? h.meals[meal] * 2 : 0) }))
    .sort((a, b) => b.s - a.s || b.h.last.localeCompare(a.h.last))
    .slice(0, limit)
    .map((x) => x.h);

export { avg };
