import { DEFAULT_SLEEP_GOAL_HOURS, ALL_SLEEP_FACTORS } from './sleepData';

// ---------------------------------------------------------------------------
// PERSISTENCIA (localStorage — mismo enfoque offline-first que nutrición y
// entrenamiento). Las correlaciones leen directamente las claves de esos
// módulos (nutri_log_* y workout_sessions) como fuente de solo lectura.
// ---------------------------------------------------------------------------

const KEYS = {
  LOGS: 'sleep_logs',
  GOAL_HOURS: 'sleep_goal_hours',
};

const uid = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const readJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
};

const writeJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // almacenamiento no disponible, se continúa sin persistir
  }
};

/** Fecha local YYYY-MM-DD (no UTC), consistente con dateKeyOf en App.jsx. */
export const localDateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const addDaysToKey = (dateKey, amount) => {
  const d = new Date(`${dateKey}T00:00:00`);
  d.setDate(d.getDate() + amount);
  return localDateKey(d);
};

// --------------------------------- Logs -----------------------------------

export const loadSleepLogs = () => readJSON(KEYS.LOGS, {});
export const saveSleepLogs = (map) => writeJSON(KEYS.LOGS, map);

export const loadSleepGoalHours = () => readJSON(KEYS.GOAL_HOURS, DEFAULT_SLEEP_GOAL_HOURS);
export const saveSleepGoalHours = (hours) => writeJSON(KEYS.GOAL_HOURS, hours);

/** Convierte "HH:MM" a minutos desde medianoche. */
const timeToMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Minutos totales dormidos entre acostarse y despertar, restando el tiempo
 * en quedarse dormido y los minutos despierto por interrupciones. Asume que
 * wakeTime ocurre al día siguiente de bedtime si wakeTime <= bedtime.
 */
export const computeTotalSleepMinutes = ({ bedtime, wakeTime, minutesToFallAsleep = 0, interruptions }) => {
  if (!bedtime || !wakeTime) return 0;
  const bedMin = timeToMinutes(bedtime);
  let wakeMin = timeToMinutes(wakeTime);
  if (wakeMin <= bedMin) wakeMin += 24 * 60; // cruza medianoche
  const awakeMinutes = (interruptions?.minutesAwake || 0) + (Number(minutesToFallAsleep) || 0);
  const total = wakeMin - bedMin - awakeMinutes;
  return Math.max(0, total);
};

export const upsertSleepLog = (logsMap, dateKey, patch) => {
  const existing = logsMap[dateKey] || { id: uid('sleep'), date: dateKey, factors: [] };
  const merged = { ...existing, ...patch, date: dateKey };
  merged.totalSleepMinutes = computeTotalSleepMinutes(merged);
  return { ...logsMap, [dateKey]: merged };
};

export const deleteSleepLog = (logsMap, dateKey) => {
  const next = { ...logsMap };
  delete next[dateKey];
  return next;
};

// ------------------------------ Semana actual -------------------------------

const startOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // lunes como inicio de semana
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const getLast7DaysSleep = (logsMap, referenceDate = new Date()) => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - i);
    const key = localDateKey(d);
    const log = logsMap[key] || null;
    const label = d.toLocaleDateString('es-AR', { weekday: 'short' }).slice(0, 3);
    days.push({ key, label, log, hours: log ? Math.round((log.totalSleepMinutes / 60) * 10) / 10 : 0 });
  }
  return days;
};

const stdDevMinutes = (minutesArray) => {
  if (minutesArray.length < 2) return 0;
  const mean = minutesArray.reduce((a, b) => a + b, 0) / minutesArray.length;
  const variance = minutesArray.reduce((a, b) => a + (b - mean) ** 2, 0) / minutesArray.length;
  return Math.sqrt(variance);
};

export const computeWeeklyStats = (logsMap, goalHours = DEFAULT_SLEEP_GOAL_HOURS, referenceDate = new Date()) => {
  const week = getLast7DaysSleep(logsMap, referenceDate).filter((d) => d.log);
  if (week.length === 0) {
    return { avgHours: 0, sleepDebtHours: 0, bedtimeConsistencyMin: null, wakeConsistencyMin: null, nightsLogged: 0 };
  }
  const totalMinutes = week.reduce((sum, d) => sum + d.log.totalSleepMinutes, 0);
  const avgHours = Math.round((totalMinutes / week.length / 60) * 10) / 10;
  const sleepDebtHours = Math.round((goalHours * week.length - totalMinutes / 60) * 10) / 10;

  // Las horas de acostarse suelen rondar la medianoche (23:50 vs 00:10 están a 20min,
  // no a ~23.5h): se corren a una línea de tiempo continua antes de medir la dispersión.
  const normalizeNightMinutes = (mins) => (mins < 12 * 60 ? mins + 24 * 60 : mins);

  const bedtimes = week
    .map((d) => timeToMinutes(d.log.bedtime))
    .filter((n) => !Number.isNaN(n))
    .map(normalizeNightMinutes);
  const wakeTimes = week.map((d) => timeToMinutes(d.log.wakeTime)).filter((n) => !Number.isNaN(n));

  return {
    avgHours,
    sleepDebtHours: Math.max(0, sleepDebtHours),
    bedtimeConsistencyMin: bedtimes.length > 1 ? Math.round(stdDevMinutes(bedtimes)) : null,
    wakeConsistencyMin: wakeTimes.length > 1 ? Math.round(stdDevMinutes(wakeTimes)) : null,
    nightsLogged: week.length,
  };
};

// --------------------------- Análisis del propio sueño -----------------------
//
// Todo lo de esta sección se calcula SOLO con los registros de sueño. Las
// correlaciones de más abajo cruzan módulos y por eso tardan semanas en
// desbloquearse; estas empiezan a dar respuestas a los pocos días, que es lo
// que hace que valga la pena registrar el detalle.

const average = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
const round1 = (n) => Math.round(n * 10) / 10;

/** Registros de los últimos `days` días, del más viejo al más nuevo. */
export const getRecentLogs = (logsMap, days = 30, referenceDate = new Date()) => {
  const cutoff = localDateKey(new Date(referenceDate.getTime() - (days - 1) * 86400000));
  const todayKey = localDateKey(referenceDate);
  return Object.values(logsMap)
    .filter((log) => log.date >= cutoff && log.date <= todayKey && log.totalSleepMinutes > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
};

/** Cifras de cabecera del período: noches, promedio, energía y cumplimiento de meta. */
export const computeSleepSummary = (logsMap, goalHours = DEFAULT_SLEEP_GOAL_HOURS, days = 30, referenceDate = new Date()) => {
  const logs = getRecentLogs(logsMap, days, referenceDate);
  if (logs.length === 0) {
    return { nights: 0, avgHours: 0, avgQuality: null, goalHitRate: 0, goalHits: 0 };
  }
  const hours = logs.map((l) => l.totalSleepMinutes / 60);
  const qualities = logs.map((l) => l.quality).filter((q) => q != null);
  const goalHits = hours.filter((h) => h >= goalHours).length;

  return {
    nights: logs.length,
    avgHours: round1(average(hours)),
    avgQuality: qualities.length ? round1(average(qualities)) : null,
    goalHits,
    goalHitRate: Math.round((goalHits / logs.length) * 100),
  };
};

/**
 * Noches consecutivas cumpliendo la meta, contando hacia atrás desde hoy.
 * Un hueco sin registro corta la racha igual que una noche corta: la racha
 * mide el hábito, y no registrar es no tener el hábito.
 */
export const computeGoalStreak = (logsMap, goalHours = DEFAULT_SLEEP_GOAL_HOURS, referenceDate = new Date()) => {
  let streak = 0;
  let key = localDateKey(referenceDate);

  // Si hoy todavía no se registró, la racha se mide desde ayer: registrar el
  // sueño de la noche pasada es lo primero que hacés a la mañana, pero no
  // necesariamente antes de abrir la app.
  if (!logsMap[key]) key = addDaysToKey(key, -1);

  while (logsMap[key] && logsMap[key].totalSleepMinutes / 60 >= goalHours) {
    streak++;
    key = addDaysToKey(key, -1);
  }
  return streak;
};

/**
 * Impacto de cada factor marcado (cafeína tardía, pantallas, estrés…) sobre
 * las horas dormidas y la energía al despertar: promedio de las noches con el
 * factor vs las noches sin él.
 *
 * Es una comparación de medias, no una prueba estadística — con 4 noches de
 * un lado no hay significancia posible. Por eso la UI la presenta como
 * "lo que veo en tus datos" y muestra siempre el tamaño de muestra.
 */
export const computeFactorImpact = (logsMap, minOccurrences = 3, days = 90, referenceDate = new Date()) => {
  const logs = getRecentLogs(logsMap, days, referenceDate).filter((l) => l.quality != null);

  return ALL_SLEEP_FACTORS.map((factor) => {
    const withFactor = logs.filter((l) => (l.factors || []).includes(factor.id));
    const withoutFactor = logs.filter((l) => !(l.factors || []).includes(factor.id));

    if (withFactor.length < minOccurrences || withoutFactor.length < minOccurrences) {
      return { ...factor, available: false, nights: withFactor.length, needed: minOccurrences };
    }

    const qualityWith = average(withFactor.map((l) => l.quality));
    const qualityWithout = average(withoutFactor.map((l) => l.quality));
    const hoursWith = average(withFactor.map((l) => l.totalSleepMinutes / 60));
    const hoursWithout = average(withoutFactor.map((l) => l.totalSleepMinutes / 60));

    return {
      ...factor,
      available: true,
      nights: withFactor.length,
      nightsWithout: withoutFactor.length,
      qualityWith: round1(qualityWith),
      qualityWithout: round1(qualityWithout),
      qualityDiff: round1(qualityWith - qualityWithout),
      hoursDiff: round1(hoursWith - hoursWithout),
    };
  })
    .filter((f) => f.available)
    .sort((a, b) => Math.abs(b.qualityDiff) - Math.abs(a.qualityDiff));
};

/**
 * ¿Te conviene acostarte temprano o tarde? Parte tus noches por la mediana de
 * tu propia hora de acostarte y compara las dos mitades. Es relativo a vos, no
 * a una hora "correcta" universal: alguien que se acuesta 1:00 todos los días
 * igual puede descubrir que a las 0:30 duerme mejor.
 */
export const computeBedtimeComparison = (logsMap, minPerGroup = 3, days = 90, referenceDate = new Date()) => {
  const logs = getRecentLogs(logsMap, days, referenceDate)
    .filter((l) => l.quality != null && l.bedtime)
    .map((l) => {
      const mins = timeToMinutes(l.bedtime);
      // Misma línea de tiempo continua que en computeWeeklyStats: 23:50 y 00:10
      // están a 20 minutos, no a 23 horas y media.
      return { ...l, bedMinutes: mins < 12 * 60 ? mins + 24 * 60 : mins };
    })
    .sort((a, b) => a.bedMinutes - b.bedMinutes);

  if (logs.length < minPerGroup * 2) {
    return { available: false, nights: logs.length, needed: minPerGroup * 2 };
  }

  const half = Math.floor(logs.length / 2);
  const early = logs.slice(0, half);
  const late = logs.slice(logs.length - half);

  const formatBed = (mins) => {
    const m = Math.round(mins) % (24 * 60);
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  };

  const earlyQuality = average(early.map((l) => l.quality));
  const lateQuality = average(late.map((l) => l.quality));
  const earlyHours = average(early.map((l) => l.totalSleepMinutes / 60));
  const lateHours = average(late.map((l) => l.totalSleepMinutes / 60));

  return {
    available: true,
    nights: logs.length,
    earlyBedtime: formatBed(average(early.map((l) => l.bedMinutes))),
    lateBedtime: formatBed(average(late.map((l) => l.bedMinutes))),
    earlyQuality: round1(earlyQuality),
    lateQuality: round1(lateQuality),
    earlyHours: round1(earlyHours),
    lateHours: round1(lateHours),
    better: Math.abs(earlyQuality - lateQuality) < 0.3 ? 'igual' : earlyQuality > lateQuality ? 'temprano' : 'tarde',
  };
};

/** Mejor y peor noche del período, por energía al despertar y horas como desempate. */
export const computeBestWorstNights = (logsMap, days = 30, referenceDate = new Date()) => {
  const logs = getRecentLogs(logsMap, days, referenceDate).filter((l) => l.quality != null);
  if (logs.length < 3) return { available: false, nights: logs.length };

  const score = (l) => l.quality * 100 + l.totalSleepMinutes / 60;
  const sorted = [...logs].sort((a, b) => score(b) - score(a));

  return { available: true, nights: logs.length, best: sorted[0], worst: sorted[sorted.length - 1] };
};

// ------------------------- Correlaciones entre módulos -----------------------

/** Parsea horas tipo "11:15 p. m." / "8:05 a.m." / "23:15" a minutos desde medianoche. */
export const parseAnyTimeToMinutes = (raw) => {
  if (!raw) return null;
  const match = raw.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const isPM = /p\.?\s?m\.?/i.test(raw);
  const isAM = /a\.?\s?m\.?/i.test(raw);
  if (isPM && hour !== 12) hour += 12;
  if (isAM && hour === 12) hour = 0;
  return hour * 60 + minute;
};

const readNutritionLog = (dateKey) => {
  try {
    const raw = localStorage.getItem(`nutri_log_${dateKey}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

const readWorkoutSessions = () => {
  try {
    const raw = localStorage.getItem('workout_sessions');
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};

const sessionVolume = (session) =>
  session.exercises.reduce(
    (sum, ex) =>
      sum +
      ex.sets.reduce((s, set) => s + (set.completed && set.type !== 'warmup' ? (Number(set.weight) || 0) * (Number(set.reps) || 0) : 0), 0),
    0
  );

const MIN_SAMPLE_SIZE = 3;

/**
 * Correlación nutrición + sueño: compara la calidad del descanso las noches
 * en que la última comida del día anterior fue después de las 22:00 vs el resto.
 */
export const correlateLateDinnerWithQuality = (logsMap) => {
  const lateQualities = [];
  const normalQualities = [];

  Object.values(logsMap).forEach((log) => {
    if (!log.quality) return;
    const prevDay = addDaysToKey(log.date, -1);
    const nutriLog = readNutritionLog(prevDay);
    if (!nutriLog) return;
    const meals = [...(nutriLog.planMeals || []), ...(nutriLog.freeMeals || [])];
    if (meals.length === 0) return;
    const lastMealMinutes = Math.max(...meals.map((m) => parseAnyTimeToMinutes(m.time)).filter((n) => n != null));
    if (!Number.isFinite(lastMealMinutes)) return;
    if (lastMealMinutes >= 22 * 60) lateQualities.push(log.quality);
    else normalQualities.push(log.quality);
  });

  if (lateQualities.length < MIN_SAMPLE_SIZE || normalQualities.length < MIN_SAMPLE_SIZE) {
    return { available: false, sampleSize: lateQualities.length + normalQualities.length };
  }

  const lateAvg = average(lateQualities);
  const normalAvg = average(normalQualities);
  const pctDiff = normalAvg > 0 ? Math.round(((normalAvg - lateAvg) / normalAvg) * 100) : 0;

  return {
    available: true,
    lateAvg: Math.round(lateAvg * 10) / 10,
    normalAvg: Math.round(normalAvg * 10) / 10,
    pctDiff,
    lateNights: lateQualities.length,
    normalNights: normalQualities.length,
  };
};

/**
 * Correlación sueño + entrenamiento: compara el volumen total levantado en el
 * gimnasio los días con >= 7.5h de descanso esa misma noche vs el resto.
 */
export const correlateSleepWithWorkoutVolume = (logsMap, sleepThresholdHours = 7.5) => {
  const sessions = Object.values(readWorkoutSessions()).filter((s) => s.endedAt);
  const highSleepVolumes = [];
  const lowSleepVolumes = [];

  sessions.forEach((session) => {
    const log = logsMap[session.date];
    if (!log || !log.totalSleepMinutes) return;
    const volume = sessionVolume(session);
    if (volume <= 0) return;
    const hours = log.totalSleepMinutes / 60;
    if (hours >= sleepThresholdHours) highSleepVolumes.push(volume);
    else lowSleepVolumes.push(volume);
  });

  if (highSleepVolumes.length < MIN_SAMPLE_SIZE || lowSleepVolumes.length < MIN_SAMPLE_SIZE) {
    return { available: false, sampleSize: highSleepVolumes.length + lowSleepVolumes.length };
  }

  const highAvg = average(highSleepVolumes);
  const lowAvg = average(lowSleepVolumes);
  const pctDiff = lowAvg > 0 ? Math.round(((highAvg - lowAvg) / lowAvg) * 100) : 0;

  return {
    available: true,
    highAvg: Math.round(highAvg),
    lowAvg: Math.round(lowAvg),
    pctDiff,
    highNights: highSleepVolumes.length,
    lowNights: lowSleepVolumes.length,
    thresholdHours: sleepThresholdHours,
  };
};
