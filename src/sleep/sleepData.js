// ---------------------------------------------------------------------------
// DATOS BASE DEL MÓDULO DE SUEÑO Y RECUPERACIÓN
// ---------------------------------------------------------------------------

export const DEFAULT_SLEEP_GOAL_HOURS = 8;

export const FALL_ASLEEP_MINUTES_PRESETS = [0, 10, 20, 30, 45, 60];

export const INTERRUPTION_COUNT_PRESETS = [0, 1, 2, 3, '4+'];

export const ENERGY_LEVELS = [
  { value: 1, emoji: '😫', label: 'Agotado' },
  { value: 2, emoji: '😴', label: 'Cansado' },
  { value: 3, emoji: '😐', label: 'Regular' },
  { value: 4, emoji: '🙂', label: 'Descansado' },
  { value: 5, emoji: '😄', label: 'Con energía' },
];

export const SLEEP_FACTOR_GROUPS = [
  {
    id: 'nutricion',
    label: 'Nutrición',
    factors: [
      { id: 'cena_pesada', label: 'Cena pesada' },
      { id: 'cafeina_tardia', label: 'Cafeína tardía' },
      { id: 'alcohol', label: 'Alcohol' },
      { id: 'hidratacion_tardia', label: 'Hidratación tardía' },
      { id: 'ayuno', label: 'Ayuno' },
    ],
  },
  {
    id: 'estilo_vida',
    label: 'Estilo de vida',
    factors: [
      { id: 'pantallas', label: 'Pantallas antes de dormir' },
      { id: 'lectura', label: 'Lectura' },
      { id: 'meditacion', label: 'Meditación' },
      { id: 'estres_alto', label: 'Estrés alto' },
    ],
  },
  {
    id: 'entrenamiento',
    label: 'Entrenamiento',
    factors: [
      { id: 'entreno_nocturno', label: 'Entreno nocturno intenso' },
      { id: 'dia_descanso', label: 'Día de descanso' },
    ],
  },
];

export const ALL_SLEEP_FACTORS = SLEEP_FACTOR_GROUPS.flatMap((g) => g.factors);
