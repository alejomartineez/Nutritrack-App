// Catálogo y constantes del módulo de entreno.

export const MUSCLE_GROUPS = [
  'Pecho',
  'Espalda',
  'Hombro',
  'Bíceps',
  'Tríceps',
  'Cuádriceps',
  'Isquiotibiales',
  'Glúteos',
  'Pantorrillas',
  'Core',
  'Antebrazo',
  'Cardio / Full body',
];

export const EQUIPMENT_TYPES = ['Barra', 'Mancuernas', 'Máquina', 'Cable/Polea', 'Peso corporal', 'Bandas de resistencia'];

/** Tipos que se pueden elegir. Los legados (myorep, superset) se siguen mostrando. */
export const SET_TYPES = [
  { id: 'effective', label: 'Serie efectiva', short: '' },
  { id: 'warmup', label: 'Calentamiento', short: 'C' },
  { id: 'dropset', label: 'Drop set', short: 'D' },
];
const LEGACY_SET_TYPES = [
  { id: 'myorep', label: 'Myo-rep', short: 'M' },
  { id: 'superset', label: 'Superserie', short: 'S' },
];
export const setTypeInfo = (type) =>
  SET_TYPES.find((t) => t.id === type) || LEGACY_SET_TYPES.find((t) => t.id === type) || SET_TYPES[0];

export const RIR_OPTIONS = ['', 0, 1, 2, 3, '4+'];

export const WEEKDAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const DEFAULT_REST_SEC = 90;
export const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
export const BAR_OPTIONS_KG = [20, 15, 10, 0];

/** Series efectivas por músculo y semana que se consideran el rango útil. */
export const WEEKLY_SETS_TARGET = { min: 10, max: 20 };

const ex = (id, name, muscleGroup, equipment, extra) => ({ id, name, muscleGroup, equipment, isCustom: false, ...extra });

export const DEFAULT_EXERCISES = [
  ex('ex_press_banca', 'Press de banca con barra', 'Pecho', 'Barra'),
  ex('ex_press_banca_mancuerna', 'Press de banca con mancuernas', 'Pecho', 'Mancuernas'),
  ex('ex_press_inclinado', 'Press inclinado con mancuernas', 'Pecho', 'Mancuernas'),
  ex('ex_press_inclinado_barra', 'Press inclinado con barra', 'Pecho', 'Barra'),
  ex('ex_press_pecho_maquina', 'Press de pecho en máquina', 'Pecho', 'Máquina'),
  ex('ex_aperturas', 'Aperturas con mancuernas', 'Pecho', 'Mancuernas'),
  ex('ex_pec_deck', 'Contractora (pec deck)', 'Pecho', 'Máquina'),
  ex('ex_cruce_poleas', 'Cruce de poleas', 'Pecho', 'Cable/Polea'),
  ex('ex_flexiones', 'Flexiones de brazos', 'Pecho', 'Peso corporal'),
  ex('ex_dominadas', 'Dominadas', 'Espalda', 'Peso corporal'),
  ex('ex_remo_invertido', 'Remo invertido (australianas)', 'Espalda', 'Peso corporal'),
  ex('ex_remo_barra', 'Remo con barra', 'Espalda', 'Barra'),
  ex('ex_remo_t', 'Remo en T', 'Espalda', 'Barra'),
  ex('ex_remo_mancuerna', 'Remo a un brazo con mancuerna', 'Espalda', 'Mancuernas'),
  ex('ex_jalon_pecho', 'Jalón al pecho', 'Espalda', 'Cable/Polea'),
  ex('ex_remo_polea', 'Remo en polea baja', 'Espalda', 'Cable/Polea'),
  ex('ex_remo_maquina', 'Remo en máquina', 'Espalda', 'Máquina'),
  ex('ex_encogimientos', 'Encogimientos con mancuernas', 'Espalda', 'Mancuernas'),
  ex('ex_press_militar', 'Press militar con barra', 'Hombro', 'Barra'),
  ex('ex_press_hombro_mancuerna', 'Press hombro con mancuernas', 'Hombro', 'Mancuernas'),
  ex('ex_press_hombro_maquina', 'Press de hombro en máquina', 'Hombro', 'Máquina'),
  ex('ex_elevaciones_laterales', 'Elevaciones laterales', 'Hombro', 'Mancuernas'),
  ex('ex_elevaciones_frontales', 'Elevaciones frontales', 'Hombro', 'Mancuernas'),
  ex('ex_pajaros', 'Pájaros (vuelos posteriores)', 'Hombro', 'Mancuernas'),
  ex('ex_face_pull', 'Face pull', 'Hombro', 'Cable/Polea'),
  ex('ex_curl_biceps', 'Curl de bíceps con barra', 'Bíceps', 'Barra'),
  ex('ex_curl_mancuerna', 'Curl alternado con mancuernas', 'Bíceps', 'Mancuernas'),
  ex('ex_curl_martillo', 'Curl martillo', 'Bíceps', 'Mancuernas'),
  ex('ex_curl_scott', 'Curl en banco Scott', 'Bíceps', 'Barra'),
  ex('ex_curl_polea', 'Curl de bíceps en polea', 'Bíceps', 'Cable/Polea'),
  ex('ex_press_frances', 'Press francés', 'Tríceps', 'Barra'),
  ex('ex_extension_polea', 'Extensión de tríceps en polea', 'Tríceps', 'Cable/Polea'),
  ex('ex_extension_nuca', 'Extensión de tríceps sobre la cabeza', 'Tríceps', 'Mancuernas'),
  ex('ex_fondos', 'Fondos en paralelas', 'Tríceps', 'Peso corporal'),
  ex('ex_sentadilla', 'Sentadilla con barra', 'Cuádriceps', 'Barra'),
  ex('ex_sentadilla_goblet', 'Sentadilla goblet', 'Cuádriceps', 'Mancuernas'),
  ex('ex_sentadilla_hack', 'Sentadilla hack', 'Cuádriceps', 'Máquina'),
  ex('ex_sentadilla_bulgara', 'Sentadilla búlgara', 'Cuádriceps', 'Mancuernas'),
  ex('ex_prensa', 'Prensa de piernas', 'Cuádriceps', 'Máquina'),
  ex('ex_extension_cuadriceps', 'Extensión de cuádriceps (sillón)', 'Cuádriceps', 'Máquina'),
  ex('ex_zancadas', 'Zancadas', 'Cuádriceps', 'Mancuernas'),
  ex('ex_peso_muerto', 'Peso muerto', 'Isquiotibiales', 'Barra'),
  ex('ex_peso_muerto_rumano', 'Peso muerto rumano', 'Isquiotibiales', 'Barra'),
  ex('ex_curl_femoral', 'Curl femoral en máquina', 'Isquiotibiales', 'Máquina'),
  ex('ex_hip_thrust', 'Hip thrust', 'Glúteos', 'Barra'),
  ex('ex_puente_gluteo', 'Puente de glúteo', 'Glúteos', 'Peso corporal'),
  ex('ex_abduccion', 'Abducción de cadera en máquina', 'Glúteos', 'Máquina'),
  ex('ex_patada_gluteo', 'Patada de glúteo en polea', 'Glúteos', 'Cable/Polea'),
  ex('ex_gemelos_pie', 'Elevación de talones de pie', 'Pantorrillas', 'Máquina'),
  ex('ex_gemelos_sentado', 'Elevación de talones sentado', 'Pantorrillas', 'Máquina'),
  ex('ex_plancha', 'Plancha abdominal', 'Core', 'Peso corporal', { metric: 'time' }),
  ex('ex_crunch', 'Crunch abdominal', 'Core', 'Peso corporal'),
  ex('ex_elevacion_piernas', 'Elevación de piernas colgado', 'Core', 'Peso corporal'),
  ex('ex_rueda_abdominal', 'Rueda abdominal (ab wheel)', 'Core', 'Peso corporal'),
];

export const isBodyweight = (exercise) => exercise?.equipment === 'Peso corporal';
export const isTimed = (exercise) => exercise?.metric === 'time';

/** Minúsculas y sin tildes, para buscar "jalon" y encontrar "Jalón". */
export const normalizeText = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

// Plantillas. Cada día: [nombre, [[exerciseId, series, repsMin, repsMax], ...]] o null = descanso.
const FB_A = [['ex_sentadilla', 3, 6, 8], ['ex_press_banca', 3, 6, 8], ['ex_remo_barra', 3, 8, 10], ['ex_press_hombro_mancuerna', 2, 10, 12], ['ex_curl_femoral', 2, 10, 12], ['ex_plancha', 3, 30, 45]];
const FB_B = [['ex_peso_muerto_rumano', 3, 8, 10], ['ex_press_inclinado', 3, 8, 12], ['ex_jalon_pecho', 3, 8, 12], ['ex_zancadas', 2, 10, 12], ['ex_elevaciones_laterales', 3, 12, 15], ['ex_crunch', 2, 12, 15]];
const FB_C = [['ex_prensa', 3, 10, 12], ['ex_press_militar', 3, 6, 8], ['ex_remo_polea', 3, 10, 12], ['ex_hip_thrust', 3, 8, 12], ['ex_curl_mancuerna', 2, 10, 12], ['ex_extension_polea', 2, 10, 12]];
const UPPER_A = [['ex_press_banca', 4, 6, 8], ['ex_remo_barra', 4, 6, 8], ['ex_press_hombro_mancuerna', 3, 8, 10], ['ex_jalon_pecho', 3, 8, 12], ['ex_curl_biceps', 2, 10, 12], ['ex_extension_polea', 2, 10, 12]];
const LOWER_A = [['ex_sentadilla', 4, 6, 8], ['ex_peso_muerto_rumano', 3, 8, 10], ['ex_prensa', 3, 10, 12], ['ex_curl_femoral', 3, 10, 12], ['ex_gemelos_pie', 3, 12, 15]];
const UPPER_B = [['ex_press_inclinado', 4, 8, 10], ['ex_dominadas', 4, 6, 10], ['ex_remo_mancuerna', 3, 10, 12], ['ex_elevaciones_laterales', 3, 12, 15], ['ex_curl_martillo', 2, 10, 12], ['ex_press_frances', 2, 10, 12]];
const LOWER_B = [['ex_peso_muerto', 3, 4, 6], ['ex_sentadilla_bulgara', 3, 8, 10], ['ex_hip_thrust', 3, 8, 12], ['ex_extension_cuadriceps', 3, 12, 15], ['ex_gemelos_sentado', 3, 12, 15], ['ex_elevacion_piernas', 3, 10, 15]];
const PUSH = [['ex_press_banca', 4, 6, 8], ['ex_press_hombro_mancuerna', 3, 8, 10], ['ex_press_inclinado', 3, 8, 12], ['ex_elevaciones_laterales', 3, 12, 15], ['ex_extension_polea', 3, 10, 12], ['ex_fondos', 2, 8, 12]];
const PULL = [['ex_dominadas', 3, 6, 10], ['ex_remo_barra', 3, 8, 10], ['ex_remo_polea', 3, 10, 12], ['ex_face_pull', 3, 12, 15], ['ex_curl_biceps', 3, 8, 12], ['ex_curl_martillo', 2, 10, 12]];
const LEGS = [['ex_sentadilla', 4, 6, 8], ['ex_peso_muerto_rumano', 3, 8, 10], ['ex_prensa', 3, 10, 12], ['ex_curl_femoral', 3, 10, 12], ['ex_gemelos_pie', 4, 12, 15], ['ex_plancha', 3, 30, 60]];

export const ROUTINE_TEMPLATES = [
  {
    id: 'fullbody3',
    name: 'Full body 3 días',
    description: 'Todo el cuerpo lunes, miércoles y viernes. Ideal para empezar.',
    days: [['Full body A', FB_A], null, ['Full body B', FB_B], null, ['Full body C', FB_C], null, null],
  },
  {
    id: 'upper_lower4',
    name: 'Torso / Pierna 4 días',
    description: 'Dos de torso y dos de pierna. Buen equilibrio entre volumen y descanso.',
    days: [['Torso A', UPPER_A], ['Pierna A', LOWER_A], null, ['Torso B', UPPER_B], ['Pierna B', LOWER_B], null, null],
  },
  {
    id: 'ppl6',
    name: 'Push / Pull / Legs',
    description: 'Empuje, tracción y piernas, dos veces por semana. Para quien ya entrena.',
    days: [['Push', PUSH], ['Pull', PULL], ['Legs', LEGS], ['Push', PUSH], ['Pull', PULL], ['Legs', LEGS], null],
  },
  {
    id: 'blank',
    name: 'En blanco',
    description: 'Tres días vacíos para armar a tu manera.',
    days: [['Día 1', []], null, ['Día 2', []], null, ['Día 3', []], null, null],
  },
];

export const epley1RM = (weight, reps) => {
  const w = Number(weight) || 0;
  const r = Number(reps) || 0;
  if (w <= 0 || r <= 0) return 0;
  if (r === 1) return w;
  return Math.round(w * (1 + r / 30) * 10) / 10;
};
