// ---------------------------------------------------------------------------
// TOKENS DE DISEÑO — fuente única de verdad
//
// `tailwind.config.js` importa este archivo para armar las rampas, y los
// componentes que pintan SVG o estilos inline (anillos, gráficos, confeti)
// importan los roles semánticos de abajo. Antes había hex sueltos repartidos
// en 8 archivos y cada cambio de paleta se olvidaba de la mitad.
//
// Regla: en JSX usá clases de Tailwind. Este módulo es solo para donde no
// llegan las clases — atributos SVG (`stroke`, `fill`) y `style` inline.
// ---------------------------------------------------------------------------

/** Grafito. Frío y desaturado. 400/500 calibrados a ≥4.5:1 sobre `surface`. */
export const ink = {
  50: '#F6F8F9',
  100: '#E7ECEF',
  200: '#CFD6DB',
  300: '#AEB8BF',
  400: '#949EA6',
  500: '#79838B',
  600: '#4A545C',
  700: '#262D34',
  800: '#12161A',
  900: '#0A0C0E',
  950: '#050709',
};

/** Acento único de la app: esmeralda bajado en luminosidad y saturación. */
export const brand = {
  50: '#EAF7F1',
  100: '#CBEBDD',
  200: '#A3DCC5',
  300: '#7AD6AE',
  400: '#45C48F',
  500: '#26A578',
  600: '#1E8862',
  700: '#196B4D',
  800: '#144E39',
  900: '#0E3527',
  950: '#09211A',
};

/**
 * Acento del módulo de Entreno: bronce cálido. Deliberadamente más oscuro y
 * más rojizo que `amber` (que es semántico: "fuera de rango") para que no se
 * confundan cuando aparecen juntos en Mi Día.
 */
export const entreno = {
  200: '#EBC4A6',
  300: '#D9A07A',
  400: '#C68558', // íconos y texto sobre card — 6.0:1
  500: '#B0743F', // relleno de botón, con texto oscuro encima — 5.1:1
  600: '#8A5636',
  700: '#6B4229',
  800: '#4A2E1C',
  900: '#33200F',
  950: '#1E1309',
};

/**
 * Acento del módulo de Sueño: índigo frío, la asociación nocturna de siempre.
 * La rampa está corrida hacia arriba respecto de un índigo "normal": el azul es
 * intrínsecamente oscuro, y con los valores habituales el texto oscuro sobre el
 * relleno del 500 no llegaba a 4.5:1.
 */
export const sueno = {
  200: '#C6CCE2',
  300: '#AEB6D6',
  400: '#939DC5', // íconos y texto sobre card — 6.8:1
  500: '#7A85B0', // relleno de botón, con texto oscuro encima — 5.5:1
  600: '#5F6A93',
  700: '#495275',
  800: '#333A54',
  900: '#1E2238',
  950: '#131624',
};

/** Ámbar apagado: "fuera de rango", "fuera de plan", gustos. */
export const amber = {
  50: '#FAF3E8',
  100: '#F2E2C7',
  200: '#E8CE9F',
  300: '#E8C07A',
  400: '#D9A85A',
  500: '#BC8840',
  600: '#9A6D31',
  700: '#7A5527',
  800: '#563C1D',
  900: '#3A2814',
  950: '#241809',
};

/** Rojo apagado: destructivo y errores. Nunca decorativo. */
export const red = {
  50: '#FBEDED',
  100: '#F6D6D6',
  200: '#F0B8B8',
  300: '#F0A0A0',
  400: '#E07878',
  500: '#C25555',
  600: '#A03F3F',
  700: '#7E3030',
  800: '#5A2222',
  900: '#3C1818',
  950: '#240E0E',
};

// ---------------------------------------------------------------------------
// Roles semánticos. Preferí estos a las rampas crudas: dicen para qué sirve
// el color, no de qué color es.
// ---------------------------------------------------------------------------
export const theme = {
  bg: ink[900],
  surface: ink[800],
  border: ink[700],
  /** Fondo de anillos y barras de progreso: casi invisible, solo insinúa el recorrido. */
  track: ink[700],
  textPrimary: ink[100],
  textMuted: ink[500],
  textDisabled: ink[600],

  accent: brand[500],
  accentBright: brand[400],
  warn: amber[400],
  danger: red[500],
};

/**
 * Acento por módulo. Regla de uso: SOLO en detalles finos —íconos, hairlines,
 * etiquetas chicas, el estado activo del nav—. Los rellenos grandes y los CTA
 * primarios siguen en verde (`brand`) en toda la app, así los módulos se
 * distinguen sin que cada pantalla parezca una app distinta.
 */
export const moduleAccents = {
  nutricion: brand,
  entreno,
  sueno,
};

/** Macros. La grasa va en gris a propósito: es la que menos se mira a diario. */
export const macroColors = {
  protein: brand[400],
  carbs: amber[400],
  fat: ink[400],
};

/**
 * Rampa secuencial de un solo tono para gráficos con muchas categorías
 * (volumen por grupo muscular). Un solo tono variando en luminosidad se lee
 * como una escala ordenada; 12 naranjas distintos se leen como ruido.
 */
export const sequential = [
  '#7AD6AE', '#61CDA1', '#4AC492', '#36B583',
  '#28A676', '#219668', '#1B865B', '#17754F',
  '#146343', '#125238', '#12412E', '#123324',
];

/** Confeti de celebración: acento + ámbar, no arcoíris. */
export const celebrationColors = [brand[300], brand[500], amber[300], ink[300]];
