// Constantes del módulo de sueño. Los ids de factores y los valores de energía
// son los que ya están guardados en los teléfonos: no cambiarlos.

export const DEFAULT_SLEEP_GOAL_HOURS = 8;
export const GOAL_MIN_HOURS = 5;
export const GOAL_MAX_HOURS = 11;

export const DEFAULT_BEDTIME = '23:00';
export const DEFAULT_WAKE_TIME = '07:00';
export const DEFAULT_FALL_ASLEEP_MINUTES = 10;

export const FALL_ASLEEP_PRESETS = [
  { value: 0, label: 'Enseguida' },
  { value: 10, label: '10 min' },
  { value: 20, label: '20 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 h+' },
];

/** "3+" se guarda como 3; los registros viejos con '4+' se leen como 3+. */
export const WAKE_COUNT_PRESETS = [
  { value: 0, label: 'Ninguno' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3+' },
];

export const MINUTES_AWAKE_PRESETS = [5, 15, 30, 45, 60];

export const ENERGY_LEVELS = [
  { value: 1, emoji: '😫', label: 'Agotado' },
  { value: 2, emoji: '😴', label: 'Cansado' },
  { value: 3, emoji: '😐', label: 'Regular' },
  { value: 4, emoji: '🙂', label: 'Descansado' },
  { value: 5, emoji: '😄', label: 'Con energía' },
];

export const energyOf = (quality) => ENERGY_LEVELS.find((e) => e.value === quality) || null;

export const SLEEP_FACTORS = [
  { id: 'cafeina_tardia', emoji: '☕', label: 'Cafeína tarde' },
  { id: 'alcohol', emoji: '🍷', label: 'Alcohol' },
  { id: 'cena_pesada', emoji: '🍝', label: 'Cena pesada' },
  { id: 'hidratacion_tardia', emoji: '💧', label: 'Mucho líquido' },
  { id: 'ayuno', emoji: '⏳', label: 'Ayuno' },
  { id: 'pantallas', emoji: '📱', label: 'Pantallas' },
  { id: 'estres_alto', emoji: '😣', label: 'Estrés' },
  { id: 'entreno_nocturno', emoji: '🏋️', label: 'Entreno nocturno' },
  { id: 'dia_descanso', emoji: '🛋️', label: 'Día de descanso' },
  { id: 'lectura', emoji: '📖', label: 'Lectura' },
  { id: 'meditacion', emoji: '🧘', label: 'Meditación' },
];

export const factorOf = (id) => SLEEP_FACTORS.find((f) => f.id === id) || null;
