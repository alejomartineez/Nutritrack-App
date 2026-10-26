import { readJSON, writeJSON, removeKey, uid } from '../lib/storage';
import { dateKeyOf, addDaysToKey, keyToDate, lastNKeys, hmToMinutes, minutesToHM } from '../lib/dates';
import {
  DEFAULT_SLEEP_GOAL_HOURS,
  DEFAULT_BEDTIME,
  DEFAULT_WAKE_TIME,
  DEFAULT_FALL_ASLEEP_MINUTES,
  FALL_ASLEEP_PRESETS,
  SLEEP_FACTORS,
  energyOf,
} from './sleepData';

// Registros por fecha de DESPERTAR: sleep_logs['2026-10-26'] es la noche del 25 al 26.
export { localDateKey, addDaysToKey } from '../lib/dates';

const KEYS = { LOGS: 'sleep_logs', GOAL: 'sleep_goal_hours', PENDING: 'sleep_pending' };
const DAY = 1440;
const PENDING_MAX_MS = 20 * 3600000;
export const WINDOW_NIGHTS = 14;

// ------------------------------- Utilidades --------------------------------

const isObj = (x) => Boolean(x) && typeof x === 'object' && !Array.isArray(x);
const isKey = (k) => /^\d{4}-\d{2}-\d{2}$/.test(k);
export const isHM = (s) => typeof s === 'string' && /^\d{1,2}:\d{2}$/.test(s) && hmToMinutes(s) < DAY;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const round1 = (n) => Math.round(n * 10) / 10;
const round5 = (n) => Math.round(n / 5) * 5;
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
export const median = (a) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const stdDev = (a) => {
  const m = mean(a);
  return Math.sqrt(mean(a.map((x) => (x - m) ** 2)));
};
const hmOf = (d) => minutesToHM(d.getHours() * 60 + d.getMinutes());

/** Hora de acostarse en una línea continua: 00:30 va después de 23:30 (1470 > 1410). */
const bedLine = (hm) => {
  const m = hmToMinutes(hm);
  return m < 12 * 60 ? m + DAY : m;
};

const nearestFallAsleep = (m) =>
  FALL_ASLEEP_PRESETS.reduce((best, p) => (Math.abs(p.value - m) < Math.abs(best - m) ? p.value : best), FALL_ASLEEP_PRESETS[0].value);

// ------------------------------- Lectura robusta ---------------------------

export const minutesInBed = (bedtime, wakeTime) => {
  if (!isHM(bedtime) || !isHM(wakeTime)) return 0;
  const d = hmToMinutes(wakeTime) - hmToMinutes(bedtime);
  return d <= 0 ? d + DAY : d;
};

/** Minutos dormidos: tiempo en cama menos lo que tardaste en dormirte y lo que estuviste despierto. */
export const computeTotalSleepMinutes = ({ bedtime, wakeTime, minutesToFallAsleep = 0, interruptions } = {}) => {
  const inBed = minutesInBed(bedtime, wakeTime);
  if (!inBed) return 0;
  const awake = (Number(minutesToFallAsleep) || 0) + (Number(interruptions?.minutesAwake) || 0);
  return Math.max(0, inBed - awake);
};

export const sleptMinutes = (log) => {
  if (!isObj(log)) return 0;
  const stored = Number(log.totalSleepMinutes);
  return Number.isFinite(stored) && stored > 0 ? stored : computeTotalSleepMinutes(log);
};

export const qualityOf = (log) => {
  const q = Number(log?.quality);
  return q >= 1 && q <= 5 ? Math.round(q) : null;
};

/** Despertares 0..3 (3 = "3 o más"; los viejos '4+' cuentan como 3). */
export const wakeCountOf = (log) => {
  const c = log?.interruptions?.count;
  if (c === '4+') return 3;
  return clamp(Math.round(Number(c) || 0), 0, 3);
};

const fallAsleepOf = (log) => {
  const m = Number(log?.minutesToFallAsleep);
  return Number.isFinite(m) && m >= 0 ? m : null;
};

const factorsOf = (log) => (Array.isArray(log?.factors) ? log.factors : []);

/** Noches válidas (con minutos > 0), ordenadas de la más vieja a la más nueva. */
export const listNights = (map) =>
  Object.entries(isObj(map) ? map : {})
    .filter(([key, log]) => isKey(key) && isObj(log))
    .map(([key, log]) => ({ ...log, date: key, minutes: sleptMinutes(log) }))
    .filter((n) => n.minutes > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

/** Noches con fecha en (endKey - days, endKey]. */
const windowNights = (nights, endKey, days = WINDOW_NIGHTS) => {
  const from = addDaysToKey(endKey, -days);
  return nights.filter((n) => n.date > from && n.date <= endKey);
};

// ------------------------------- Persistencia ------------------------------

export const loadSleepLogs = () => {
  const map = readJSON(KEYS.LOGS, {});
  return isObj(map) ? map : {};
};
export const saveSleepLogs = (map) => writeJSON(KEYS.LOGS, map);

export const loadSleepGoalHours = () => {
  const g = Number(readJSON(KEYS.GOAL, DEFAULT_SLEEP_GOAL_HOURS));
  return g >= 3 && g <= 14 ? g : DEFAULT_SLEEP_GOAL_HOURS;
};
export const saveSleepGoalHours = (hours) => writeJSON(KEYS.GOAL, hours);

export const upsertSleepLog = (map, dateKey, patch) => {
  const existing = isObj(map[dateKey]) ? map[dateKey] : { id: uid('sleep'), factors: [] };
  const merged = { ...existing, ...patch, date: dateKey };
  merged.totalSleepMinutes = computeTotalSleepMinutes(merged);
  return { ...map, [dateKey]: merged };
};

export const deleteSleepLog = (map, dateKey) => {
  const next = { ...map };
  delete next[dateKey];
  return next;
};

// ------------------------- "Me voy a dormir" (pendiente) -------------------

export const getPendingSleep = (now = Date.now()) => {
  const p = readJSON(KEYS.PENDING, null);
  if (!isObj(p) || !isHM(p.bedtime) || !Number.isFinite(p.startedAt)) return null;
  const age = now - p.startedAt;
  return age >= 0 && age <= PENDING_MAX_MS ? { bedtime: p.bedtime, startedAt: p.startedAt } : null;
};

export const startPendingSleep = (now = new Date()) => {
  const p = { bedtime: hmOf(now), startedAt: now.getTime() };
  writeJSON(KEYS.PENDING, p);
  return p;
};

export const clearPendingSleep = () => removeKey(KEYS.PENDING);

/** Día de despertar al que corresponde un pendiente: desde el mediodía, el de mañana. */
export const pendingNightKey = (p) => {
  const d = new Date(p.startedAt);
  const key = dateKeyOf(d);
  return d.getHours() >= 12 ? addDaysToKey(key, 1) : key;
};

/** Datos de la noche al tocar "Me desperté". */
export const nightFromPending = (pending, now = new Date(), fallAsleep = DEFAULT_FALL_ASLEEP_MINUTES) => ({
  dateKey: dateKeyOf(now),
  patch: { bedtime: pending.bedtime, wakeTime: hmOf(now), minutesToFallAsleep: fallAsleep },
});

// ---------------------------- Horario habitual -----------------------------

/** Mediana de horarios de las noches de la ventana que termina en endKey. */
export const getTypicalTimes = (map, endKey = dateKeyOf(), days = WINDOW_NIGHTS) => {
  const recent = windowNights(listNights(map), endKey, days);
  const beds = recent.filter((n) => isHM(n.bedtime)).map((n) => bedLine(n.bedtime));
  const wakes = recent.filter((n) => isHM(n.wakeTime)).map((n) => hmToMinutes(n.wakeTime));
  const lat = recent.map(fallAsleepOf).filter((m) => m != null);
  return {
    nights: recent.length,
    bedtime: beds.length ? minutesToHM(round5(median(beds))) : null,
    wakeTime: wakes.length ? minutesToHM(round5(median(wakes))) : null,
    fallAsleep: lat.length ? nearestFallAsleep(median(lat)) : null,
  };
};

/** Valores iniciales del formulario: tu horario típico (3+ noches) o tu último registro. */
export const getFormDefaults = (map, endKey = dateKeyOf()) => {
  const typical = getTypicalTimes(map, endKey);
  if (typical.nights >= 3 && typical.bedtime && typical.wakeTime) {
    return {
      bedtime: typical.bedtime,
      wakeTime: typical.wakeTime,
      minutesToFallAsleep: typical.fallAsleep ?? DEFAULT_FALL_ASLEEP_MINUTES,
    };
  }
  const last = listNights(map).filter((n) => n.date <= endKey).pop();
  const lat = fallAsleepOf(last);
  return {
    bedtime: isHM(last?.bedtime) ? last.bedtime : DEFAULT_BEDTIME,
    wakeTime: isHM(last?.wakeTime) ? last.wakeTime : DEFAULT_WAKE_TIME,
    minutesToFallAsleep: lat != null ? nearestFallAsleep(lat) : DEFAULT_FALL_ASLEEP_MINUTES,
  };
};

// --------------------------------- Puntaje ---------------------------------

export const SCORE_WEIGHTS = { duration: 50, timing: 20, energy: 20, wakes: 10 };
const WAKE_POINTS = [1, 0.7, 0.4, 0.1];

/**
 * Puntaje 0–100 de una noche. Cada parte suma puntos sobre su máximo; las que
 * no se pueden medir (sin energía, sin historial) quedan afuera y el total se
 * reescala sobre lo medido.
 */
export const computeSleepScore = (log, { goalHours = DEFAULT_SLEEP_GOAL_HOURS, usualBedtime = null } = {}) => {
  const minutes = sleptMinutes(log);
  if (!minutes) return null;
  const goal = goalHours * 60;
  const quality = qualityOf(log);
  const count = wakeCountOf(log);
  const delta = isHM(usualBedtime) && isHM(log.bedtime) ? bedLine(log.bedtime) - bedLine(usualBedtime) : null;
  const diff = delta == null ? null : Math.abs(delta);

  const parts = [
    { id: 'duration', max: SCORE_WEIGHTS.duration, ratio: clamp((minutes - goal / 2) / (goal / 2), 0, 1), minutes, goalMinutes: goal },
    { id: 'timing', max: SCORE_WEIGHTS.timing, ratio: diff == null ? null : clamp(1 - (diff - 15) / 75, 0, 1), deltaMinutes: delta, usualBedtime },
    { id: 'energy', max: SCORE_WEIGHTS.energy, ratio: quality == null ? null : (quality - 1) / 4, quality },
    { id: 'wakes', max: SCORE_WEIGHTS.wakes, ratio: WAKE_POINTS[count], count },
  ].map(({ ratio, ...p }) => ({ ...p, points: ratio == null ? null : Math.round(ratio * p.max) }));

  const counted = parts.filter((p) => p.points != null);
  const score = Math.round((100 * counted.reduce((s, p) => s + p.points, 0)) / counted.reduce((s, p) => s + p.max, 0));
  return { score, label: scoreLabel(score), parts };
};

export const scoreLabel = (score) => (score >= 85 ? 'Excelente' : score >= 70 ? 'Buena' : score >= 50 ? 'Regular' : 'Floja');

/** Mediana de la hora de acostarse en las 14 noches ANTERIORES a dateKey (mínimo 3). */
const usualBedtimeBefore = (nights, dateKey) => {
  const prev = windowNights(nights, addDaysToKey(dateKey, -1)).filter((n) => isHM(n.bedtime));
  return prev.length >= 3 ? minutesToHM(median(prev.map((n) => bedLine(n.bedtime)))) : null;
};

const scoreIn = (nights, night, goalHours) =>
  computeSleepScore(night, { goalHours, usualBedtime: usualBedtimeBefore(nights, night.date) });

export const scoreNight = (map, dateKey, goalHours = DEFAULT_SLEEP_GOAL_HOURS) => {
  const nights = listNights(map);
  const night = nights.find((n) => n.date === dateKey);
  return night ? scoreIn(nights, night, goalHours) : null;
};

// ------------------------------ Tendencias ---------------------------------

/** Una entrada por día (de la más vieja a endKey), con o sin registro. */
export const nightSeries = (map, goalHours, endKey, days) => {
  const nights = listNights(map);
  const byDate = Object.fromEntries(nights.map((n) => [n.date, n]));
  return lastNKeys(days, endKey).map((key) => {
    const night = byDate[key];
    return { key, minutes: night ? night.minutes : 0, score: night ? scoreIn(nights, night, goalHours).score : null };
  });
};

/** Deuda de las últimas 14 noches: lo que faltó (o sobró) contra la meta en las noches registradas. */
export const computeSleepDebt = (map, goalHours, endKey, days = WINDOW_NIGHTS) => {
  const recent = windowNights(listNights(map), endKey, days);
  const debt = recent.reduce((s, n) => s + (goalHours * 60 - n.minutes), 0);
  return { debtHours: round1(debt / 60), nights: recent.length, days };
};

/** Desvío estándar de la hora de acostarse en las últimas 14 noches (mínimo 3). */
export const computeConsistency = (map, endKey, days = WINDOW_NIGHTS) => {
  const beds = windowNights(listNights(map), endKey, days)
    .filter((n) => isHM(n.bedtime))
    .map((n) => bedLine(n.bedtime));
  if (beds.length < 3) return { stdDevMin: null, nights: beds.length, label: null };
  const sd = Math.round(stdDev(beds));
  const label = sd <= 20 ? 'Muy constante' : sd <= 45 ? 'Constante' : sd <= 75 ? 'Variable' : 'Irregular';
  return { stdDevMin: sd, nights: beds.length, label };
};

/** Hora para acostarte: tu despertar habitual menos la meta y lo que tardás en dormirte. */
export const suggestBedtime = (map, goalHours, endKey) => {
  const typical = getTypicalTimes(map, endKey);
  const last = listNights(map).filter((n) => n.date <= endKey && isHM(n.wakeTime)).pop();
  const wakeTime = typical.wakeTime || last?.wakeTime;
  if (!wakeTime) return null;
  const fallAsleep = typical.fallAsleep ?? DEFAULT_FALL_ASLEEP_MINUTES;
  return { bedtime: minutesToHM(round5(hmToMinutes(wakeTime) - goalHours * 60 - fallAsleep)), wakeTime, fallAsleep };
};

// ------------------------------- Patrones ----------------------------------

/**
 * Factores: promedio de horas (y energía, si hay) con el factor vs sin él, en
 * los últimos 90 días. Recién opina con `minNights` noches de cada lado y solo
 * muestra diferencias de al menos 15 min o medio punto de energía.
 */
export const computeFactorImpact = (map, endKey, { minNights = 4, days = 90 } = {}) => {
  const nights = windowNights(listNights(map), endKey, days);
  let progress = 0;
  const ready = [];
  SLEEP_FACTORS.forEach((f) => {
    const withF = nights.filter((n) => factorsOf(n).includes(f.id));
    const without = nights.filter((n) => !factorsOf(n).includes(f.id));
    const have = Math.min(withF.length, without.length);
    progress = Math.max(progress, Math.min(have, minNights));
    if (have < minNights) return;
    const qW = withF.map(qualityOf).filter((q) => q != null);
    const qWo = without.map(qualityOf).filter((q) => q != null);
    ready.push({
      ...f,
      nightsWith: withF.length,
      nightsWithout: without.length,
      hoursDiff: round1((mean(withF.map((n) => n.minutes)) - mean(without.map((n) => n.minutes))) / 60),
      minutesDiff: Math.round(mean(withF.map((n) => n.minutes)) - mean(without.map((n) => n.minutes))),
      qualityDiff: qW.length >= 3 && qWo.length >= 3 ? round1(mean(qW) - mean(qWo)) : null,
    });
  });
  const weight = (r) => Math.abs(r.minutesDiff) / 60 + Math.abs(r.qualityDiff || 0) / 2;
  const notable = ready
    .filter((r) => Math.abs(r.minutesDiff) >= 15 || Math.abs(r.qualityDiff || 0) >= 0.5)
    .sort((a, b) => weight(b) - weight(a));
  return { needed: minNights, progress, checked: ready.length, notable };
};

/**
 * "Jet lag social": cuánto se corre el punto medio de tu sueño las noches que
 * terminan sábado o domingo respecto del resto (últimos 28 días).
 */
export const computeSocialJetlag = (map, endKey, days = 28) => {
  const mid = (n) => bedLine(n.bedtime) + minutesInBed(n.bedtime, n.wakeTime) / 2;
  const nights = windowNights(listNights(map), endKey, days).filter((n) => isHM(n.bedtime) && isHM(n.wakeTime));
  const isWeekend = (n) => [0, 6].includes(keyToDate(n.date).getDay());
  const weekend = nights.filter(isWeekend).map(mid);
  const weekday = nights.filter((n) => !isWeekend(n)).map(mid);
  const ready = weekend.length >= 2 && weekday.length >= 3;
  return {
    ready,
    weekendNights: weekend.length,
    weekdayNights: weekday.length,
    shiftMinutes: ready ? Math.round(median(weekend) - median(weekday)) : null,
  };
};

// ------------------------- API para otras pantallas ------------------------

/** Resumen de la noche que terminó en dateKey (Hoy / Progreso). */
export const getSleepDaySummary = (dateKey = dateKeyOf(), now = Date.now()) => {
  const map = loadSleepLogs();
  const nights = listNights(map);
  const night = nights.find((n) => n.date === dateKey);
  if (!night) {
    const pending = dateKey === dateKeyOf(new Date(now)) ? getPendingSleep(now) : null;
    return pending ? { logged: false, pendingBedtime: pending.bedtime } : { logged: false };
  }
  const { score, label } = scoreIn(nights, night, loadSleepGoalHours());
  const quality = qualityOf(night);
  const energy = energyOf(quality);
  return {
    logged: true,
    hours: round1(night.minutes / 60),
    minutes: night.minutes,
    score,
    quality,
    emoji: energy ? energy.emoji : '',
    label: energy ? energy.label : label,
    bedtime: isHM(night.bedtime) ? night.bedtime : null,
    wakeTime: isHM(night.wakeTime) ? night.wakeTime : null,
  };
};

export const summarizeRange = (map, goalHours, fromKey, toKey) => {
  const [from, to] = fromKey <= toKey ? [fromKey, toKey] : [toKey, fromKey];
  const nights = listNights(map);
  const inRange = nights.filter((n) => n.date >= from && n.date <= to);
  if (!inRange.length) return { nights: 0, avgHours: null, avgScore: null, avgQuality: null, goalHours };
  const qualities = inRange.map(qualityOf).filter((q) => q != null);
  return {
    nights: inRange.length,
    avgHours: round1(mean(inRange.map((n) => n.minutes)) / 60),
    avgScore: Math.round(mean(inRange.map((n) => scoreIn(nights, n, goalHours).score))),
    avgQuality: qualities.length ? round1(mean(qualities)) : null,
    goalHours,
  };
};

/** Promedios de las noches que terminan entre fromKey y toKey (inclusive). */
export const getSleepRangeSummary = (fromKey, toKey) => summarizeRange(loadSleepLogs(), loadSleepGoalHours(), fromKey, toKey);

// ---- Compatibilidad: solo para WeeklyRecap.jsx y reminders.js (se reescriben aparte). Borrar cuando no los importen.

export const computeWeeklyStats = (map, goalHours = DEFAULT_SLEEP_GOAL_HOURS, ref = new Date()) => {
  const to = dateKeyOf(ref);
  const s = summarizeRange(map, goalHours, addDaysToKey(to, -6), to);
  return { avgHours: s.avgHours ?? 0, nightsLogged: s.nights };
};
export const correlateLateDinnerWithQuality = () => ({ available: false, sampleSize: 0 });
export const correlateSleepWithWorkoutVolume = () => ({ available: false, sampleSize: 0 });
export const parseAnyTimeToMinutes = (raw) => {
  const match = typeof raw === 'string' ? raw.match(/(\d{1,2}):(\d{2})/) : null;
  if (!match) return null;
  let hour = Number(match[1]);
  if (/p\.?\s?m\.?/i.test(raw) && hour !== 12) hour += 12;
  if (/a\.?\s?m\.?/i.test(raw) && hour === 12) hour = 0;
  return hour * 60 + Number(match[2]);
};
