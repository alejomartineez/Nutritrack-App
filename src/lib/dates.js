// Fechas locales como claves YYYY-MM-DD (comparables como texto). Una sola
// implementación para toda la app.

const pad = (n) => String(n).padStart(2, '0');

export const dateKeyOf = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const localDateKey = dateKeyOf;

/** Clave → Date a medianoche local. */
export const keyToDate = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const addDays = (d, amount) => {
  const x = new Date(d);
  x.setDate(x.getDate() + amount);
  return x;
};

export const addDaysToKey = (key, amount) => dateKeyOf(addDays(keyToDate(key), amount));

/** Días enteros entre dos claves (b - a). */
export const daysBetween = (a, b) => Math.round((keyToDate(b) - keyToDate(a)) / 86400000);

/** Índice de día con la semana empezando en lunes (lunes = 0). */
export const mondayIndex = (d = new Date()) => (d.getDay() + 6) % 7;

/** Lunes de la semana de `d`. */
export const startOfWeek = (d) => addDays(startOfDay(d), -mondayIndex(d));

/** Las `n` claves que terminan en `endKey` (inclusive), de la más vieja a la más nueva. */
export const lastNKeys = (n, endKey = dateKeyOf()) => {
  const end = keyToDate(endKey);
  return Array.from({ length: n }, (_, i) => dateKeyOf(addDays(end, i - (n - 1))));
};

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Hoy", "Ayer", "Mañana" o "Mié 16 jul". */
export const formatDisplayDate = (date, now = new Date()) => {
  const key = dateKeyOf(date);
  const today = dateKeyOf(now);
  if (key === today) return 'Hoy';
  if (key === addDaysToKey(today, -1)) return 'Ayer';
  if (key === addDaysToKey(today, 1)) return 'Mañana';
  return cap(date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', ''));
};

/** "lunes 26 de octubre" */
export const formatLongDate = (date) => date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

/** "26 oct" */
export const formatShortDate = (dateOrKey) => {
  const d = typeof dateOrKey === 'string' ? keyToDate(dateOrKey) : dateOrKey;
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }).replace('.', '');
};

export const WEEKDAY_INITIALS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export const nowHM = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const hmToMinutes = (hm) => {
  if (typeof hm !== 'string' || !hm.includes(':')) return NaN;
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
};

export const minutesToHM = (mins) => {
  const m = ((Math.round(mins) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
};
