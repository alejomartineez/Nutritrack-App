// ---------------------------------------------------------------------------
// EQUIVALENCIAS DE MACROS ("machete")
//
// Un sistema de intercambios como el que usan los nutricionistas (elegís un
// objetivo —"quiero 30g de proteína"— y ves cuánto de cada alimento te lo da),
// pero calculado desde valores reales por 100g / por unidad en vez de una tabla
// fija. Así las equivalencias salen del dato, no de la memoria, y sirven para
// cualquier objetivo, no solo para las porciones que alguien tabuló.
//
// Los macros de cada alimento están al `per` indicado (100 g, 100 ml o 1 unidad),
// con valores redondeados de referencia (crudos/cocidos según lo que se come).
// ---------------------------------------------------------------------------

// `unit` es la unidad del OBJETIVO (lo que el usuario pide), no la de la porción.
// Proteína/carbo/grasa se piden en gramos; calorías, en kcal.
export const MACROS = {
  p: { key: 'p', label: 'Proteína', unit: 'g', presets: [15, 20, 30, 40], step: 5, min: 5, max: 200 },
  c: { key: 'c', label: 'Carbohidratos', unit: 'g', presets: [15, 30, 45, 60], step: 5, min: 5, max: 300 },
  f: { key: 'f', label: 'Grasa', unit: 'g', presets: [5, 10, 15, 20], step: 5, min: 5, max: 150 },
  kcal: { key: 'kcal', label: 'Calorías', unit: 'kcal', presets: [100, 150, 200, 300], step: 25, min: 25, max: 900 },
};

// Orden de las categorías en pantalla (las más "fuente" de proteína primero).
export const EQUIV_CATEGORIES = [
  { id: 'proteina', label: 'Proteínas magras' },
  { id: 'lacteos', label: 'Lácteos' },
  { id: 'legumbres', label: 'Legumbres' },
  { id: 'carbos', label: 'Carbohidratos' },
  { id: 'frutas', label: 'Frutas' },
  { id: 'grasas', label: 'Grasas y frutos secos' },
];

// per: cantidad de referencia · unit: 'g' | 'ml' | 'u' (unidad, con single/plural)
export const EQUIV_FOODS = [
  // ----- Proteínas magras -----
  { id: 'eq_pollo', name: 'Pechuga de pollo', cat: 'proteina', per: 100, unit: 'g', kcal: 165, p: 31, c: 0, f: 3.6 },
  { id: 'eq_pavo', name: 'Pechuga de pavo (fiambre)', cat: 'proteina', per: 100, unit: 'g', kcal: 104, p: 17, c: 2, f: 2 },
  { id: 'eq_carne', name: 'Carne vacuna magra (cocida)', cat: 'proteina', per: 100, unit: 'g', kcal: 190, p: 30, c: 0, f: 8 },
  { id: 'eq_cerdo', name: 'Lomo de cerdo magro (cocido)', cat: 'proteina', per: 100, unit: 'g', kcal: 165, p: 28, c: 0, f: 5 },
  { id: 'eq_merluza', name: 'Merluza (cocida)', cat: 'proteina', per: 100, unit: 'g', kcal: 90, p: 20, c: 0, f: 1 },
  { id: 'eq_atun', name: 'Atún al natural (escurrido)', cat: 'proteina', per: 100, unit: 'g', kcal: 116, p: 26, c: 0, f: 1 },
  { id: 'eq_salmon', name: 'Salmón (cocido)', cat: 'proteina', per: 100, unit: 'g', kcal: 208, p: 22, c: 0, f: 13 },
  { id: 'eq_camaron', name: 'Camarones', cat: 'proteina', per: 100, unit: 'g', kcal: 99, p: 24, c: 0, f: 0.3 },
  { id: 'eq_jamon', name: 'Jamón cocido magro', cat: 'proteina', per: 100, unit: 'g', kcal: 110, p: 18, c: 1.5, f: 3.5 },
  { id: 'eq_huevo', name: 'Huevo entero', cat: 'proteina', per: 1, unit: 'u', single: 'huevo', plural: 'huevos', kcal: 72, p: 6.3, c: 0.4, f: 4.8 },
  { id: 'eq_clara', name: 'Clara de huevo', cat: 'proteina', per: 1, unit: 'u', single: 'clara', plural: 'claras', kcal: 17, p: 3.6, c: 0.2, f: 0.1 },
  { id: 'eq_whey', name: 'Proteína en polvo (whey)', cat: 'proteina', per: 1, unit: 'u', single: 'scoop', plural: 'scoops', kcal: 120, p: 24, c: 3, f: 1.5 },
  { id: 'eq_sardinas', name: 'Sardinas en lata', cat: 'proteina', per: 100, unit: 'g', kcal: 208, p: 25, c: 0, f: 11 },

  // ----- Lácteos -----
  { id: 'eq_leche_desc', name: 'Leche descremada', cat: 'lacteos', per: 100, unit: 'ml', kcal: 34, p: 3.4, c: 5, f: 0.2 },
  { id: 'eq_leche_ent', name: 'Leche entera', cat: 'lacteos', per: 100, unit: 'ml', kcal: 62, p: 3.1, c: 4.8, f: 3.3 },
  { id: 'eq_yogur_desc', name: 'Yogur descremado natural', cat: 'lacteos', per: 100, unit: 'g', kcal: 47, p: 4.4, c: 6, f: 0.2 },
  { id: 'eq_yogur_griego', name: 'Yogur griego 0%', cat: 'lacteos', per: 100, unit: 'g', kcal: 60, p: 10, c: 3.6, f: 0.4 },
  { id: 'eq_cottage', name: 'Queso cottage', cat: 'lacteos', per: 100, unit: 'g', kcal: 98, p: 11, c: 3.4, f: 4.3 },
  { id: 'eq_port_salut', name: 'Queso port salut light', cat: 'lacteos', per: 100, unit: 'g', kcal: 245, p: 24, c: 2, f: 15 },
  { id: 'eq_mozzarella', name: 'Queso mozzarella', cat: 'lacteos', per: 100, unit: 'g', kcal: 280, p: 22, c: 2.2, f: 21 },
  { id: 'eq_ricota', name: 'Ricota descremada', cat: 'lacteos', per: 100, unit: 'g', kcal: 138, p: 11, c: 4, f: 8 },
  { id: 'eq_untable', name: 'Queso untable light', cat: 'lacteos', per: 100, unit: 'g', kcal: 110, p: 10, c: 5, f: 6 },

  // ----- Legumbres y proteína vegetal -----
  { id: 'eq_lentejas', name: 'Lentejas (cocidas)', cat: 'legumbres', per: 100, unit: 'g', kcal: 116, p: 9, c: 20, f: 0.4 },
  { id: 'eq_garbanzos', name: 'Garbanzos (cocidos)', cat: 'legumbres', per: 100, unit: 'g', kcal: 164, p: 9, c: 27, f: 2.6 },
  { id: 'eq_porotos', name: 'Porotos (cocidos)', cat: 'legumbres', per: 100, unit: 'g', kcal: 127, p: 9, c: 23, f: 0.5 },
  { id: 'eq_arvejas', name: 'Arvejas', cat: 'legumbres', per: 100, unit: 'g', kcal: 84, p: 5.4, c: 14, f: 0.4 },
  { id: 'eq_tofu', name: 'Tofu firme', cat: 'legumbres', per: 100, unit: 'g', kcal: 145, p: 15, c: 3, f: 8.7 },
  { id: 'eq_soja_tex', name: 'Soja texturizada (hidratada)', cat: 'legumbres', per: 100, unit: 'g', kcal: 106, p: 16, c: 8, f: 0.7 },

  // ----- Carbohidratos -----
  { id: 'eq_arroz', name: 'Arroz blanco (cocido)', cat: 'carbos', per: 100, unit: 'g', kcal: 130, p: 2.7, c: 28, f: 0.3 },
  { id: 'eq_fideos', name: 'Fideos (cocidos)', cat: 'carbos', per: 100, unit: 'g', kcal: 158, p: 5.8, c: 31, f: 0.9 },
  { id: 'eq_papa', name: 'Papa (hervida)', cat: 'carbos', per: 100, unit: 'g', kcal: 87, p: 2, c: 20, f: 0.1 },
  { id: 'eq_batata', name: 'Batata (hervida)', cat: 'carbos', per: 100, unit: 'g', kcal: 86, p: 1.6, c: 20, f: 0.1 },
  { id: 'eq_pan_int', name: 'Pan integral', cat: 'carbos', per: 100, unit: 'g', kcal: 250, p: 9, c: 45, f: 3.5 },
  { id: 'eq_pan_fr', name: 'Pan francés', cat: 'carbos', per: 100, unit: 'g', kcal: 290, p: 9, c: 59, f: 1 },
  { id: 'eq_avena', name: 'Avena (en seco)', cat: 'carbos', per: 100, unit: 'g', kcal: 380, p: 13, c: 67, f: 7 },
  { id: 'eq_quinoa', name: 'Quinoa (cocida)', cat: 'carbos', per: 100, unit: 'g', kcal: 120, p: 4.4, c: 21, f: 1.9 },

  // ----- Frutas -----
  { id: 'eq_banana', name: 'Banana', cat: 'frutas', per: 100, unit: 'g', kcal: 89, p: 1.1, c: 23, f: 0.3 },
  { id: 'eq_manzana', name: 'Manzana', cat: 'frutas', per: 100, unit: 'g', kcal: 52, p: 0.3, c: 14, f: 0.2 },
  { id: 'eq_naranja', name: 'Naranja', cat: 'frutas', per: 100, unit: 'g', kcal: 47, p: 0.9, c: 12, f: 0.1 },
  { id: 'eq_frutilla', name: 'Frutillas', cat: 'frutas', per: 100, unit: 'g', kcal: 32, p: 0.7, c: 7.7, f: 0.3 },

  // ----- Grasas y frutos secos -----
  { id: 'eq_palta', name: 'Palta', cat: 'grasas', per: 100, unit: 'g', kcal: 160, p: 2, c: 8.5, f: 15 },
  { id: 'eq_almendras', name: 'Almendras', cat: 'grasas', per: 100, unit: 'g', kcal: 579, p: 21, c: 22, f: 50 },
  { id: 'eq_mani', name: 'Maní', cat: 'grasas', per: 100, unit: 'g', kcal: 567, p: 26, c: 16, f: 49 },
  { id: 'eq_nueces', name: 'Nueces', cat: 'grasas', per: 100, unit: 'g', kcal: 654, p: 15, c: 14, f: 65 },
  { id: 'eq_pasta_mani', name: 'Pasta de maní', cat: 'grasas', per: 100, unit: 'g', kcal: 588, p: 25, c: 20, f: 50 },
  { id: 'eq_aceite', name: 'Aceite de oliva', cat: 'grasas', per: 100, unit: 'ml', kcal: 884, p: 0, c: 0, f: 100 },
];

const MACRO_KCAL = { p: 4, c: 4, f: 9 };

// Un alimento cuenta como "fuente" de un macro si ese macro aporta al menos esta
// fracción de sus calorías. Es lo que evita ofrecer "1.1 kg de arroz" como
// equivalente de proteína: el arroz tiene algo de proteína, pero no es una fuente.
// El umbral es sobre energía, así que no depende de si el dato es por 100g o por
// unidad. Grasa/carbo piden más fracción porque casi todo tiene algo de ambos.
const SOURCE_THRESHOLD = { p: 0.22, c: 0.4, f: 0.4 };

// Tope de porción por unidad de medida: más que esto ya no es una porción real
// (nadie come 1.2 kg de algo para "una" equivalencia), así que se descarta.
const MAX_QTY = { g: 1000, ml: 1000, u: 10 };

const round1 = (x) => Math.round(x * 10) / 10;

/** Redondea la porción a un número "de la vida real" según cómo se mide el alimento. */
const roundQty = (qty, unit) => {
  if (unit === 'u') return Math.max(1, Math.round(qty));
  if (unit === 'ml') return Math.max(10, Math.round(qty / 10) * 10);
  if (qty < 100) return Math.max(5, Math.round(qty / 5) * 5); // gramos finos
  return Math.round(qty / 10) * 10;
};

/** "120 g" · "200 ml" · "3 huevos" (con singular/plural para las unidades). */
export const portionLabel = (qty, food) => {
  if (food.unit === 'u') return `${qty} ${qty === 1 ? food.single : food.plural}`;
  return `${qty} ${food.unit}`;
};

/**
 * Devuelve, para un objetivo (proteína/carbo/grasa en gramos, o calorías en
 * kcal) y una cantidad, la porción de cada alimento que lo aproxima, con sus
 * macros y kcal ya escalados. La UI agrupa por categoría respetando el orden.
 *
 * Orden:
 *  - por macro (p/c/f): kcal ascendente → la opción más magra primero (el
 *    espíritu del "sin cuerpos grasos"), y solo alimentos que SON fuente del macro.
 *  - por calorías: proteína descendente → "más proteína por esas calorías" arriba,
 *    y entran todos los alimentos (cualquier cosa aporta calorías).
 */
export const computeEquivalents = (macroKey, target) => {
  const t = Number(target) || 0;
  if (!MACROS[macroKey] || t <= 0) return [];
  const byKcal = macroKey === 'kcal';

  const results = [];
  for (const food of EQUIV_FOODS) {
    const macroAmount = byKcal ? food.kcal : food[macroKey];
    if (!macroAmount || macroAmount <= 0) continue;

    if (!byKcal) {
      const fraction = (macroAmount * MACRO_KCAL[macroKey]) / food.kcal;
      if (fraction < SOURCE_THRESHOLD[macroKey]) continue;
    }

    const density = macroAmount / food.per; // por gramo / ml / unidad
    const qty = roundQty(t / density, food.unit);
    if (qty > MAX_QTY[food.unit]) continue;

    const factor = qty / food.per;
    results.push({
      id: food.id,
      name: food.name,
      cat: food.cat,
      unit: food.unit,
      qty,
      label: portionLabel(qty, food),
      kcal: Math.round(food.kcal * factor),
      p: round1(food.p * factor),
      c: round1(food.c * factor),
      f: round1(food.f * factor),
    });
  }

  results.sort(byKcal ? (a, b) => b.p - a.p || a.kcal - b.kcal : (a, b) => a.kcal - b.kcal);
  return results;
};
