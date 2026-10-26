/** @type {import('tailwindcss').Config} */
import { cssRamp } from './src/lib/theme.js';

const single = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: cssRamp('ink'),
        brand: cssRamp('brand'),
        amber: cssRamp('amber'),
        red: cssRamp('red'),
        entreno: cssRamp('entreno'),
        sueno: cssRamp('sueno'),
        protein: single('protein'),
        carbs: single('carbs'),
        fat: single('fat'),
        water: single('water'),
        // Texto sobre rellenos de acento: siempre oscuro, en ambos temas.
        onaccent: single('onaccent'),
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"Segoe UI"', 'Inter', 'Roboto', 'system-ui', 'sans-serif'],
        // Cifras: SF Pro Rounded en Apple, la sans del sistema en el resto.
        mono: ['ui-rounded', '"SF Pro Rounded"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'system-ui', 'sans-serif'],
        rounded: ['ui-rounded', '"SF Pro Rounded"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        xs: ['0.75rem', { lineHeight: '1.05rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.4rem' }],
        lg: ['1.0625rem', { lineHeight: '1.5rem', letterSpacing: '-0.01em' }],
        xl: ['1.25rem', { lineHeight: '1.6rem', letterSpacing: '-0.015em' }],
        '2xl': ['1.5rem', { lineHeight: '1.85rem', letterSpacing: '-0.02em' }],
        '3xl': ['1.875rem', { lineHeight: '2.15rem', letterSpacing: '-0.025em' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.03em' }],
        '5xl': ['3rem', { lineHeight: '1', letterSpacing: '-0.035em' }],
        '6xl': ['3.75rem', { lineHeight: '1', letterSpacing: '-0.04em' }],
      },
      borderRadius: {
        sm: '0.375rem',
        DEFAULT: '0.5rem',
        md: '0.625rem',
        lg: '0.75rem',
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.375rem',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        raised: 'var(--shadow-raised)',
        sheet: 'var(--shadow-sheet)',
        accent: '0 6px 20px -6px rgb(var(--brand-500) / 0.55)',
        none: 'none',
      },
      minHeight: { 11: '2.75rem', 12: '3rem' },
    },
  },
  plugins: [],
};
