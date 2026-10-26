// Design tokens. Las rampas viven como variables CSS (ver index.css) para que
// el modo claro sea solo un cambio de variables; acá están los nombres para
// Tailwind y los roles para SVG/estilos inline.

const RAMP = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

/** Rampa de Tailwind que lee `--<name>-<step>` (tripletes RGB, soporta /alpha). */
export const cssRamp = (name) =>
  Object.fromEntries(RAMP.map((step) => [step, `rgb(var(--${name}-${step}) / <alpha-value>)`]));

/** Color de un rol para atributos SVG y `style`. */
export const v = (name, step) => (step ? `rgb(var(--${name}-${step}))` : `rgb(var(--${name}))`);

const varRamp = (name) => Object.fromEntries(RAMP.map((step) => [step, v(name, step)]));
export const ink = varRamp('ink');
export const brand = varRamp('brand');
export const amber = varRamp('amber');
export const entreno = varRamp('entreno');
export const sueno = varRamp('sueno');

export const theme = {
  bg: v('ink', 900),
  surface: v('ink', 800),
  track: v('ink', 700),
  textPrimary: v('ink', 100),
  textMuted: v('ink', 500),
  textDisabled: v('ink', 600),
  accent: v('brand', 500),
  accentBright: v('brand', 400),
  warn: v('amber', 400),
  danger: v('red', 500),
  entreno: v('entreno', 400),
  sueno: v('sueno', 400),
};

export const macroColors = {
  protein: v('protein'),
  carbs: v('carbs'),
  fat: v('fat'),
  water: v('water'),
};

/** Escala de un tono para gráficos con muchas categorías (volumen por músculo). */
export const sequential = [
  v('brand', 200), v('brand', 300), v('brand', 400), v('brand', 500),
  v('brand', 600), v('brand', 700), v('brand', 800), v('brand', 900),
  v('brand', 300), v('brand', 500), v('brand', 700), v('brand', 900),
];

export const celebrationColors = [v('brand', 300), v('brand', 500), v('amber', 300), v('protein'), v('carbs')];
