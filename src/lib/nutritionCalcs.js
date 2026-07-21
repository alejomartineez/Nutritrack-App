// ---------------------------------------------------------------------------
// Cálculos nutricionales puros (sin estado ni efectos secundarios).
//
// Se extrajeron del componente para poder testearlos de forma aislada y
// reutilizarlos sin arrastrar React/localStorage. Todas las funciones son
// deterministas: reciben sus datos por parámetro y devuelven un valor nuevo.
// ---------------------------------------------------------------------------

import { macroColors } from './theme';

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

/** Factores de Atwater: kcal que aporta cada gramo de macronutriente. */
export const ATWATER = { protein: 4, carbs: 4, fat: 9, alcohol: 7 };

/**
 * Calorías de un ítem DERIVADAS de sus macros, no leídas de su campo `kcal`.
 *
 * Por qué: el campo `kcal` y los macros son dos datos independientes que se
 * cargan por separado, y nada garantizaba que cerraran entre sí. Un ítem del
 * catálogo tipeado como "400 kcal · P20 · C2 · G30" aportaba 400 al contador
 * del día pero solo 358 a las barras de macros, y la diferencia se multiplicaba
 * cada vez que se registraba. Derivando, el número grande de Mi Día es siempre
 * exactamente la suma de lo que se ve debajo.
 *
 * `alc` (gramos de alcohol) es la única vía para calorías que no son P/C/G: el
 * etanol aporta 7 kcal/g y no aparece en ningún macro, así que sin este término
 * una cerveza pasaría de 205 a 76 kcal. Vale 0 para todo alimento sólido, con
 * lo cual para el 99% del catálogo esto es literalmente 4p + 4c + 9f.
 */
export const hasMacros = (m = {}) => Boolean(m.p || m.c || m.f || m.alc);

export const kcalFromMacros = (m = {}) => {
  // Sin NINGÚN macro cargado no hay nada que derivar, así que manda el `kcal`
  // del ítem. Derivar acá daba 0 y hacía desaparecer comida real del contador:
  // un ítem cargado a las apuradas con solo las calorías pasaba a valer nada.
  // Ese caso no es una caloría "desalineada" (el problema que vinimos a
  // resolver) sino un ítem incompleto, y se resuelve completándolo, no
  // borrándolo. La fila lo marca para que se pueda arreglar.
  if (!hasMacros(m)) return m.kcal || 0;
  return (
    (m.p || 0) * ATWATER.protein +
    (m.c || 0) * ATWATER.carbs +
    (m.f || 0) * ATWATER.fat +
    (m.alc || 0) * ATWATER.alcohol
  );
};

/**
 * Suma los macros de todas las comidas del día (plan + libres).
 * Devuelve siempre un objeto completo aunque la lista esté vacía.
 *
 * `kcal` sale de `kcalFromMacros`, no del campo guardado en cada comida: ver
 * el porqué ahí arriba. El campo original se conserva intacto en localStorage,
 * así que esto es reversible y no hace falta migrar nada.
 */
export const computeTotals = (meals = []) =>
  meals.reduce(
    (acc, m) => ({
      kcal: acc.kcal + kcalFromMacros(m),
      p: acc.p + (m.p || 0),
      c: acc.c + (m.c || 0),
      f: acc.f + (m.f || 0),
      alc: acc.alc + (m.alc || 0),
    }),
    { kcal: 0, p: 0, c: 0, f: 0, alc: 0 }
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

// ---------------------------------------------------------------------------
// CÁLCULO DE PLAN CALÓRICO A PARTIR DEL PERFIL
//
// Fórmula estándar y validada clínicamente: Mifflin-St Jeor para la tasa
// metabólica basal (BMR), multiplicada por un factor de actividad para obtener
// el gasto energético total diario (TDEE), y ajustada según el objetivo.
// Es la ecuación que recomienda la Academy of Nutrition and Dietetics por ser
// la más precisa en población general.
// ---------------------------------------------------------------------------

/** Factores de actividad (multiplican la BMR para estimar el gasto total). */
export const ACTIVITY_FACTORS = {
  sedentario: 1.2, // poco o nada de ejercicio, trabajo de escritorio
  ligero: 1.375, // ejercicio suave 1-3 días/semana
  moderado: 1.55, // ejercicio moderado 3-5 días/semana
  activo: 1.725, // ejercicio intenso 6-7 días/semana
  muy_activo: 1.9, // ejercicio muy intenso o trabajo físico
};

/** Ajuste calórico según objetivo (déficit para bajar, superávit para subir). */
export const OBJECTIVE_FACTORS = {
  perder: 0.8, // déficit del 20 %
  mantener: 1.0,
  ganar: 1.1, // superávit del 10 % (ganancia magra)
};

/** Proteína objetivo en g por kg de peso corporal, según objetivo. */
const PROTEIN_PER_KG = {
  perder: 2.0, // más alta en déficit para preservar masa muscular
  mantener: 1.8,
  ganar: 1.8,
};

/**
 * Tasa metabólica basal por Mifflin-St Jeor (kcal/día).
 * Hombres: 10·kg + 6.25·cm − 5·edad + 5
 * Mujeres: 10·kg + 6.25·cm − 5·edad − 161
 */
export const mifflinStJeorBMR = ({ sex, weightKg, heightCm, age }) => {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'mujer' ? base - 161 : base + 5;
};

/**
 * Plan nutricional completo a partir del perfil del usuario. Devuelve el mismo
 * shape que `goals` en la app (calories, protein, carbs, fat, water), listo para
 * guardarse. Redondea las calorías a la decena y los macros a un decimal.
 *
 * Reparto de macros: proteína según peso corporal, grasa al 25 % de las
 * calorías y el resto en carbohidratos (nunca negativo).
 * Agua: 35 ml por kg, redondeado al vaso (250 ml) y acotado entre 1.5 y 4 L.
 */
export const computePlanFromProfile = ({
  sex,
  weightKg,
  heightCm,
  age,
  activityLevel,
  objective,
}) => {
  const bmr = mifflinStJeorBMR({ sex, weightKg, heightCm, age });
  const activity = ACTIVITY_FACTORS[activityLevel] ?? ACTIVITY_FACTORS.sedentario;
  const objFactor = OBJECTIVE_FACTORS[objective] ?? OBJECTIVE_FACTORS.mantener;

  const calories = Math.round((bmr * activity * objFactor) / 10) * 10;

  const proteinPerKg = PROTEIN_PER_KG[objective] ?? PROTEIN_PER_KG.mantener;
  const protein = round1(weightKg * proteinPerKg);
  const fat = round1((calories * 0.25) / 9);
  const carbs = round1(Math.max(0, (calories - protein * 4 - fat * 9) / 4));

  const rawWater = weightKg * 35;
  const water = Math.min(4000, Math.max(1500, Math.round(rawWater / 250) * 250));

  return { calories, protein, carbs, fat, water };
};

/**
 * Escala un alimento a la cantidad que realmente comiste.
 *
 * Hay dos bases posibles según de dónde salga el alimento:
 *   - 'portion' (base local): los macros son de UNA porción, así que `qty` es un
 *     multiplicador (1.5 = una porción y media).
 *   - '100g' (Open Food Facts): los macros son por 100g, así que `qty` son gramos.
 *
 * Devuelve un alimento nuevo con los macros escalados y el nombre anotado con la
 * cantidad, para que el registro del día se lea solo ("Banana (1 mediana) ×2").
 */
export const scaleFood = (food, qty) => {
  const amount = Number(qty);
  const isGrams = food.basis === '100g';
  const factor = isGrams ? amount / 100 : amount;
  // Cantidad inválida o no positiva: se cae a la porción tal cual, nunca a NaN.
  const safe = Number.isFinite(factor) && factor > 0 ? factor : 1;

  // Gramos van entre paréntesis; el multiplicador va suelto al final para no
  // encadenar paréntesis con los que ya trae el nombre ("Banana (1 mediana) ×2").
  const name = isGrams
    ? `${food.name} (${round1(amount)} g)`
    : safe === 1
    ? food.name
    : `${food.name} ×${round1(safe)}`;

  const scaled = {
    ...food,
    name,
    p: round1((food.p || 0) * safe),
    c: round1((food.c || 0) * safe),
    f: round1((food.f || 0) * safe),
  };
  // El alcohol solo viaja si el alimento lo trae, para no ensuciar con `alc: 0`
  // los ~200 alimentos sólidos del catálogo.
  if (food.alc) scaled.alc = round1(food.alc * safe);
  // `kcal` se recalcula desde los macros ya escalados en vez de escalar el
  // valor original: si el ítem venía descuadrado, escalarlo multiplicaba también
  // el descuadre (los "3 Huevos doble yema" tenían +42 kcal de gap, y al
  // registrarlos ×1.3 el gap pasaba a +55.7).
  // Si el ítem no trae macros no hay nada que derivar, y ahí sí se escala el
  // `kcal` original: es el único dato que tiene.
  scaled.kcal = hasMacros(scaled)
    ? Math.round(kcalFromMacros(scaled))
    : Math.round((food.kcal || 0) * safe);
  return scaled;
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
    { color: macroColors.protein, pct: pKcal / macroTotal },
    { color: macroColors.carbs, pct: cKcal / macroTotal },
    { color: macroColors.fat, pct: fKcal / macroTotal },
  ];
};
