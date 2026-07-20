// ---------------------------------------------------------------------------
// DATOS BASE DEL MÓDULO DE ENTRENAMIENTO
// ---------------------------------------------------------------------------

import { sequential } from '../lib/theme';

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

export const EQUIPMENT_TYPES = [
  'Mancuernas',
  'Barra',
  'Máquina',
  'Peso corporal',
  'Bandas de resistencia',
  'Cable/Polea',
];

export const SET_TYPES = [
  { id: 'warmup', label: 'Calentamiento', short: 'W', color: 'text-slate-400 bg-slate-700/60' },
  { id: 'effective', label: 'Serie efectiva', short: 'E', color: 'text-emerald-300 bg-emerald-500/20' },
  { id: 'dropset', label: 'Drop set', short: 'D', color: 'text-rose-300 bg-rose-500/20' },
  { id: 'myorep', label: 'Myo-rep', short: 'M', color: 'text-purple-300 bg-purple-500/20' },
  { id: 'superset', label: 'Superserie', short: 'S', color: 'text-cyan-300 bg-cyan-500/20' },
];

export const ROUTINE_TEMPLATES = [
  {
    id: 'ppl',
    name: 'Push / Pull / Legs',
    days: ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs', 'Descanso'],
  },
  {
    id: 'upper_lower',
    name: 'Torso / Pierna',
    days: ['Torso', 'Pierna', 'Descanso', 'Torso', 'Pierna', 'Descanso', 'Descanso'],
  },
  {
    id: 'fullbody',
    name: 'Full Body',
    days: ['Full Body A', 'Descanso', 'Full Body B', 'Descanso', 'Full Body C', 'Descanso', 'Descanso'],
  },
  {
    id: 'calistenia',
    name: 'Calistenia / Peso corporal',
    days: ['Empuje', 'Tracción', 'Piernas y core', 'Descanso', 'Full body', 'Descanso', 'Descanso'],
  },
  {
    id: 'custom',
    name: 'Personalizada (en blanco)',
    days: ['Día 1', 'Día 2', 'Día 3', 'Día 4', 'Día 5', 'Día 6', 'Día 7'],
  },
];

export const WEEKDAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const REST_PRESETS_SEC = [60, 90, 120, 180];

// Catálogo inicial de ejercicios (se puede ampliar con ejercicios personalizados)
export const DEFAULT_EXERCISES = [
  { id: 'ex_press_banca', name: 'Press de banca con barra', muscleGroup: 'Pecho', equipment: 'Barra', isCustom: false },
  { id: 'ex_press_banca_mancuerna', name: 'Press de banca con mancuernas', muscleGroup: 'Pecho', equipment: 'Mancuernas', isCustom: false },
  { id: 'ex_press_inclinado', name: 'Press inclinado con mancuernas', muscleGroup: 'Pecho', equipment: 'Mancuernas', isCustom: false },
  { id: 'ex_aperturas', name: 'Aperturas con mancuernas', muscleGroup: 'Pecho', equipment: 'Mancuernas', isCustom: false },
  { id: 'ex_flexiones', name: 'Flexiones de brazos', muscleGroup: 'Pecho', equipment: 'Peso corporal', isCustom: false },
  { id: 'ex_dominadas', name: 'Dominadas', muscleGroup: 'Espalda', equipment: 'Peso corporal', isCustom: false },
  { id: 'ex_remo_barra', name: 'Remo con barra', muscleGroup: 'Espalda', equipment: 'Barra', isCustom: false },
  { id: 'ex_remo_mancuerna', name: 'Remo a un brazo con mancuerna', muscleGroup: 'Espalda', equipment: 'Mancuernas', isCustom: false },
  { id: 'ex_jalon_pecho', name: 'Jalón al pecho', muscleGroup: 'Espalda', equipment: 'Cable/Polea', isCustom: false },
  { id: 'ex_remo_polea', name: 'Remo en polea baja', muscleGroup: 'Espalda', equipment: 'Cable/Polea', isCustom: false },
  { id: 'ex_press_militar', name: 'Press militar con barra', muscleGroup: 'Hombro', equipment: 'Barra', isCustom: false },
  { id: 'ex_press_hombro_mancuerna', name: 'Press hombro con mancuernas', muscleGroup: 'Hombro', equipment: 'Mancuernas', isCustom: false },
  { id: 'ex_elevaciones_laterales', name: 'Elevaciones laterales', muscleGroup: 'Hombro', equipment: 'Mancuernas', isCustom: false },
  { id: 'ex_face_pull', name: 'Face pull', muscleGroup: 'Hombro', equipment: 'Cable/Polea', isCustom: false },
  { id: 'ex_curl_biceps', name: 'Curl de bíceps con barra', muscleGroup: 'Bíceps', equipment: 'Barra', isCustom: false },
  { id: 'ex_curl_mancuerna', name: 'Curl alternado con mancuernas', muscleGroup: 'Bíceps', equipment: 'Mancuernas', isCustom: false },
  { id: 'ex_curl_martillo', name: 'Curl martillo', muscleGroup: 'Bíceps', equipment: 'Mancuernas', isCustom: false },
  { id: 'ex_press_frances', name: 'Press francés', muscleGroup: 'Tríceps', equipment: 'Barra', isCustom: false },
  { id: 'ex_extension_polea', name: 'Extensión de tríceps en polea', muscleGroup: 'Tríceps', equipment: 'Cable/Polea', isCustom: false },
  { id: 'ex_fondos', name: 'Fondos en paralelas', muscleGroup: 'Tríceps', equipment: 'Peso corporal', isCustom: false },
  { id: 'ex_sentadilla', name: 'Sentadilla con barra', muscleGroup: 'Cuádriceps', equipment: 'Barra', isCustom: false },
  { id: 'ex_sentadilla_goblet', name: 'Sentadilla goblet', muscleGroup: 'Cuádriceps', equipment: 'Mancuernas', isCustom: false },
  { id: 'ex_prensa', name: 'Prensa de piernas', muscleGroup: 'Cuádriceps', equipment: 'Máquina', isCustom: false },
  { id: 'ex_zancadas', name: 'Zancadas', muscleGroup: 'Cuádriceps', equipment: 'Mancuernas', isCustom: false },
  { id: 'ex_peso_muerto', name: 'Peso muerto', muscleGroup: 'Isquiotibiales', equipment: 'Barra', isCustom: false },
  { id: 'ex_peso_muerto_rumano', name: 'Peso muerto rumano', muscleGroup: 'Isquiotibiales', equipment: 'Barra', isCustom: false },
  { id: 'ex_curl_femoral', name: 'Curl femoral en máquina', muscleGroup: 'Isquiotibiales', equipment: 'Máquina', isCustom: false },
  { id: 'ex_hip_thrust', name: 'Hip thrust', muscleGroup: 'Glúteos', equipment: 'Barra', isCustom: false },
  { id: 'ex_puente_gluteo', name: 'Puente de glúteo', muscleGroup: 'Glúteos', equipment: 'Peso corporal', isCustom: false },
  { id: 'ex_gemelos_pie', name: 'Elevación de talones de pie', muscleGroup: 'Pantorrillas', equipment: 'Máquina', isCustom: false },
  { id: 'ex_plancha', name: 'Plancha abdominal', muscleGroup: 'Core', equipment: 'Peso corporal', isCustom: false },
  { id: 'ex_crunch', name: 'Crunch abdominal', muscleGroup: 'Core', equipment: 'Peso corporal', isCustom: false },
  { id: 'ex_rueda_abdominal', name: 'Rueda abdominal (ab wheel)', muscleGroup: 'Core', equipment: 'Peso corporal', isCustom: false },
];

// Rampa de un solo tono en vez de 12 naranjas distintos. En un ranking de
// volumen por grupo el color no codifica categoría (ya está la etiqueta al
// lado): codifica magnitud, así que una escala ordenada se lee de un vistazo
// y no compite con el acento del resto de la app.
export const MUSCLE_GROUP_COLORS = Object.fromEntries(
  [
    'Pecho',
    'Espalda',
    'Cuádriceps',
    'Glúteos',
    'Hombro',
    'Isquiotibiales',
    'Bíceps',
    'Tríceps',
    'Core',
    'Pantorrillas',
    'Antebrazo',
    'Cardio / Full body',
  ].map((group, i) => [group, sequential[i % sequential.length]]),
);

export const epley1RM = (weight, reps) => {
  const w = Number(weight) || 0;
  const r = Number(reps) || 0;
  if (w <= 0 || r <= 0) return 0;
  if (r === 1) return w;
  return Math.round(w * (1 + r / 30) * 10) / 10;
};
