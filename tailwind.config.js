/** @type {import('tailwindcss').Config} */

/* ---------------------------------------------------------------------------
   Sistema de diseño: grafito + verde profundo.

   La app ya tenía cientos de clases repartidas en 20+ componentes, así que en
   vez de reescribir cada `bg-slate-800` a mano, redefinimos las rampas de
   Tailwind. Las clases existentes siguen igual pero ahora apuntan a la paleta
   nueva, y el resultado es coherente por construcción.

   Rampas fusionadas a propósito:
     slate · neutral · gray · zinc · stone · indigo · blue · sky · cyan → grafito
     emerald · green · teal · lime · violet · purple                    → acento
     amber · orange · yellow                                            → ámbar
     red · rose · pink                                                  → rojo

   Esto colapsa los 6 acentos que competían (nutrición verde, sueño violeta,
   agua cian, entreno índigo…) en un solo acento + grises, que es la decisión
   de diseño: los módulos se distinguen por ícono y jerarquía, no por color.
--------------------------------------------------------------------------- */

// Las rampas viven en src/lib/theme.js, que es también lo que importan los
// componentes que pintan SVG o estilos inline. Una sola fuente de verdad.
import { ink as graphite, brand as accent, amber, red } from './src/lib/theme.js';

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        slate: graphite,
        neutral: graphite,
        gray: graphite,
        zinc: graphite,
        stone: graphite,
        indigo: graphite,
        blue: graphite,
        sky: graphite,
        cyan: graphite,

        emerald: accent,
        green: accent,
        teal: accent,
        lime: accent,
        violet: accent,
        purple: accent,

        amber,
        orange: amber,
        yellow: amber,

        red,
        rose: red,
        pink: red,

        // Alias semánticos para código nuevo. Preferí estos a los de arriba.
        ink: graphite,
        brand: accent,
      },

      fontFamily: {
        // `font-mono` apunta a Inter a propósito: se usa en 47 lugares para
        // cifras (kcal, gramos, ml, series×reps) y caía en la monoespaciada
        // por defecto del navegador. Inter con cifras tabulares alinea igual
        // en columnas pero sin el aspecto de terminal. Ver .font-mono en index.css.
        sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },

      // Escala apenas más contenida en los tamaños de display, con tracking
      // negativo. Los tamaños de cuerpo (sm/xs) casi no se tocan: ya estaban bien.
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
        xs: ['0.75rem', { lineHeight: '1.05rem' }],
        sm: ['0.8125rem', { lineHeight: '1.2rem' }],
        base: ['0.9375rem', { lineHeight: '1.4rem', letterSpacing: '-0.006em' }],
        lg: ['1.0625rem', { lineHeight: '1.5rem', letterSpacing: '-0.011em' }],
        xl: ['1.1875rem', { lineHeight: '1.6rem', letterSpacing: '-0.016em' }],
        '2xl': ['1.375rem', { lineHeight: '1.75rem', letterSpacing: '-0.021em' }],
        '3xl': ['1.6875rem', { lineHeight: '2rem', letterSpacing: '-0.026em' }],
        '4xl': ['2.125rem', { lineHeight: '2.375rem', letterSpacing: '-0.03em' }],
        '5xl': ['2.75rem', { lineHeight: '1', letterSpacing: '-0.034em' }],
        '6xl': ['3.5rem', { lineHeight: '1', letterSpacing: '-0.038em' }],
      },

      // Radios más contenidos. `rounded-3xl` a 24px era lo que daba el aspecto
      // de app de juguete; 16px lee como producto. `rounded-full` no se toca
      // (botones circulares y pills son intencionales).
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.375rem',
        md: '0.5rem',
        lg: '0.625rem',
        xl: '0.75rem',
        '2xl': '0.875rem',
        '3xl': '1rem',
      },

      // En UI oscura la sombra difusa casi no se ve: la profundidad la dan los
      // bordes hairline. Estas son sombras de contacto, cortas y opacas.
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03)',
        raised: '0 2px 8px -2px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
        sheet: '0 -8px 32px -8px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)',
        accent: '0 2px 12px -2px rgba(38,165,120,0.35)',
        none: 'none',
      },
    },
  },
  plugins: [],
};
