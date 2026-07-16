// ---------------------------------------------------------------------------
// Cálculos nutricionales puros (sin estado ni efectos secundarios).
//
// Se extrajeron del componente para poder testearlos de forma aislada y
// reutilizarlos sin arrastrar React/localStorage. Todas las funciones son
// deterministas: reciben sus datos por parámetro y devuelven un valor nuevo.
// ---------------------------------------------------------------------------

/** Clave de día local en formato YYYY-MM-DD (sin depender de UTC). */
export const dateKeyOf = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;

/** Copia de la fecha con la hora puesta a medianoche local. */
export const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/** Copia de la fecha desplazada `amount` días (acepta negativos). */
export const addDays = (d, amount) => {
  const x = new Date(d);
  x.setDate(x.getDate() + amount);
  return x;
};

/** Etiqueta legible: "Hoy", "Ayer" o "Mié, 16 jul" (relativa a hoy). */
export const formatDisplayDate = (date) => {
  const today = startOfDay(new Date());
  const yesterday = addDays(today, -1);
  if (dateKeyOf(date) === dateKeyOf(today)) return 'Hoy';
  if (dateKeyOf(date) === dateKeyOf(yesterday)) return 'Ayer';
  const text = date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** Redondea a un decimal, evitando ruido de coma flotante en las sumas. */
export const round1 = (n) => Math.round(n * 10) / 10;

/**
 * Suma los macros de todas las comidas del día (plan + libres).
 * Devuelve siempre un objeto completo aunque la lista esté vacía.
 */
export const computeTotals = (meals = []) =>
  meals.reduce(
    (acc, m) => ({
      kcal: acc.kcal + (m.kcal || 0),
      p: acc.p + (m.p || 0),
      c: acc.c + (m.c || 0),
      f: acc.f + (m.f || 0),
    }),
    { kcal: 0, p: 0, c: 0, f: 0 }
  );

/**
 * Racha de días consecutivos (terminando en el último de `weekStats`) que
 * tienen datos y cuyas calorías caen dentro de `tolerance` respecto a la meta.
 * Se corta en el primer día sin datos o fuera de rango.
 */
export const computeStreak = (weekStats = [], calorieGoal, tolerance) => {
  let count = 0;
  for (let i = weekStats.length - 1; i >= 0; i--) {
    const d = weekStats[i];
    if (d.hasData && Math.abs(d.kcal - calorieGoal) <= tolerance) {
      count++;
    } else {
      break;
    }
  }
  return count;
};

/**
 * Segmentos del anillo de composición por aporte calórico de cada macro.
 * Proteína y carbohidratos aportan 4 kcal/g, grasa 9 kcal/g. Si no hay macros
 * cargados devuelve una lista vacía (el anillo se dibuja sin arcos).
 */
export const computeMacroSegments = (totals) => {
  const pKcal = (totals.p || 0) * 4;
  const cKcal = (totals.c || 0) * 4;
  const fKcal = (totals.f || 0) * 9;
  const macroTotal = pKcal + cKcal + fKcal;
  if (macroTotal <= 0) return [];
  return [
    { color: '#10b981', pct: pKcal / macroTotal }, // proteína - emerald-500
    { color: '#fbbf24', pct: cKcal / macroTotal }, // carbohidratos - amber-400
    { color: '#94a3b8', pct: fKcal / macroTotal }, // grasas - slate-400
  ];
};
