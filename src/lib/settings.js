import { useSyncExternalStore } from 'react';
import { readJSON, writeJSON } from './storage';

// Preferencias de la app (no del plan). Un store mínimo con suscripción para
// que cualquier pantalla lea el valor vivo sin pasar props.

const KEY = 'nutri_settings';
const MODULES_KEY = 'nutri_modules';

export const DEFAULT_SETTINGS = {
  theme: 'auto', // 'auto' | 'dark' | 'light'
  glassMl: 250,
  modules: { entreno: true, sueno: true },
};

let state = load();
const listeners = new Set();

function load() {
  const stored = readJSON(KEY, {});
  // Los módulos vivían en su propia clave; se siguen leyendo de ahí.
  const modules = { ...DEFAULT_SETTINGS.modules, ...readJSON(MODULES_KEY, {}) };
  return { ...DEFAULT_SETTINGS, ...stored, modules };
}

export const getSettings = () => state;

export const updateSettings = (patch) => {
  state = { ...state, ...patch };
  const { modules, ...rest } = state;
  writeJSON(KEY, rest);
  writeJSON(MODULES_KEY, modules);
  listeners.forEach((l) => l());
};

export const reloadSettings = () => {
  state = load();
  listeners.forEach((l) => l());
};

const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useSettings = () => useSyncExternalStore(subscribe, getSettings);
