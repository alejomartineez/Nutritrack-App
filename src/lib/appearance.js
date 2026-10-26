import { getSettings } from './settings';

// Aplica el tema (auto/oscuro/claro) como atributo en <html>. En 'auto' sigue
// al sistema en vivo. index.html hace lo mismo inline antes del primer paint.

const media = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;

const resolve = (pref) => (pref === 'light' || (pref === 'auto' && media?.matches) ? 'light' : 'dark');

export const applyTheme = (pref = getSettings().theme) => {
  const mode = resolve(pref);
  document.documentElement.dataset.theme = mode;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', mode === 'light' ? '#F2F2F7' : '#0B0B0D');
};

export const initAppearance = () => {
  applyTheme();
  media?.addEventListener?.('change', () => applyTheme());
};
