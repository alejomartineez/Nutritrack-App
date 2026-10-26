// ---------------------------------------------------------------------------
// Cálculos nutricionales puros (sin estado ni efectos secundarios).
//
// Se extrajeron del componente para poder testearlos de forma aislada y
// reutilizarlos sin arrastrar React/localStorage. Todas las funciones son
// deterministas: reciben sus datos por parámetro y devuelven un valor nuevo.
// ---------------------------------------------------------------------------

/** Redondea a un decimal, evitando ruido de coma flotante en las sumas. */
export const round1 = (n) => Math.round(n * 10) / 10;

/** Factores de Atwater: kcal que aporta cada gramo de macronutriente. */
export const ATWATER = { protein: 4, carbs: 4, fat: 9, alcohol: 7 };

export const hasMacros = (m = {}) => Boolean(m.p || m.c || m.f || m.alc);

/**
 * Calorías DERIVADAS de los macros por Atwater. Cálculo puro: no mira el campo
 * `kcal` del ítem ni cae a él.
 *
 * `alc` (gramos de alcohol) es la única vía para calorías que no son P/C/G: el
 * etanol aporta 7 kcal/g y no aparece en ningún macro, así que sin este término
 * una cerveza pasaría de 205 a 76 kcal. Vale 0 para todo alimento sólido, con
 * lo cual para el 99% del catálogo esto es literalmente 4p + 4c + 9f.
 */
export const kcalFromMacros = (m = {}) =>
  (m.p || 0) * ATWATER.protein +
  (m.c || 0) * ATWATER.carbs +
  (m.f || 0) * ATWATER.fat +
  (m.alc || 0) * ATWATER.alcohol;

/**
 * Calorías de un ítem: manda el valor cargado; los macros son el respaldo
 * cuando no hay ninguno. Es decisión: no se "corrige" lo que tipeó el usuario,
 * así que el total del día puede no coincidir con 4p + 4c + 9f.
 */
export const kcalOf = (m = {}) => {
  const typed = Number(m.kcal);
  if (Number.isFinite(typed) && typed > 0) return typed;
  return kcalFromMacros(m);
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
