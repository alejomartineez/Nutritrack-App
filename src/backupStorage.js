// Copia de seguridad: todo vive en localStorage, así que un archivo JSON con
// todas las claves de la app es la red de seguridad para cambiar de teléfono.
// Los PDFs (IndexedDB) no entran: son binarios y pesan demasiado.

import { readRaw, writeRaw, removeKey, readJSON } from './lib/storage';

const APP_PREFIXES = ['nutri_', 'workout_', 'sleep_', 'weight_', 'reminder_'];
const EXCLUDED = new Set(['nutri_pre_v2_backup', 'nutri_last_backup', 'workout_rest_timer']);
const NUTRI_LOG_PREFIX = 'nutri_log_';

const isAppKey = (k) => APP_PREFIXES.some((p) => k.startsWith(p)) && !EXCLUDED.has(k);

const appKeys = () => {
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && isAppKey(k)) out.push(k);
    }
  } catch {
    // sin storage
  }
  return out.sort();
};

/** Pide al navegador que no libere este storage bajo presión de espacio. */
export const requestPersistentStorage = async () => {
  try {
    await navigator.storage?.persist?.();
  } catch {
    // best-effort
  }
};

/** v4: copia literal de cada clave (incluye las que agreguen versiones futuras). */
export const buildFullBackup = () => ({
  version: 4,
  app: 'nutritrack',
  exportedAt: new Date().toISOString(),
  keys: Object.fromEntries(appKeys().map((k) => [k, readRaw(k)])),
});

export const backupFileName = () => `nutritrack_${new Date().toISOString().slice(0, 10)}.json`;

/**
 * Comparte el archivo (en iPhone abre la hoja de compartir: Guardar en Archivos,
 * WhatsApp, etc.) o lo descarga donde compartir archivos no existe.
 */
export const downloadFullBackup = async () => {
  const json = JSON.stringify(buildFullBackup());
  const name = backupFileName();
  const file = typeof File === 'function' ? new File([json], name, { type: 'application/json' }) : null;
  if (file && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Copia de NutriTrack' });
      writeRaw('nutri_last_backup', new Date().toISOString());
      return 'shared';
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  writeRaw('nutri_last_backup', new Date().toISOString());
  return 'downloaded';
};

export const lastBackupAt = () => {
  const raw = readRaw('nutri_last_backup');
  const d = raw ? new Date(raw) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};

const isLegacyBackup = (data) => Boolean(data && typeof data === 'object' && (data.nutrition || data.workout || data.sleep));
const isV4Backup = (data) => Boolean(data && typeof data === 'object' && data.version >= 4 && data.keys && typeof data.keys === 'object');

/** Convierte un backup v1–v3 a mapa de claves → valor crudo. */
const legacyToKeys = (data) => {
  const keys = {};
  const put = (k, v) => {
    if (v !== null && v !== undefined) keys[k] = JSON.stringify(v);
  };
  const n = data.nutrition || {};
  put('nutri_goals', n.goals);
  put('nutri_catalog', n.catalog);
  put('nutri_free_catalog', n.freeCatalog);
  put('nutri_profile', n.profile);
  put('nutri_modules', n.modules);
  Object.entries(n.logs || {}).forEach(([day, log]) => put(`${NUTRI_LOG_PREFIX}${day}`, log));
  const w = data.workout || {};
  put('workout_exercises', w.exercises);
  put('workout_routines', w.routines);
  put('workout_active_routine_id', w.activeRoutineId);
  put('workout_sessions', w.sessions);
  put('workout_active_session', w.activeSession);
  const s = data.sleep || {};
  put('sleep_logs', s.logs);
  put('sleep_goal_hours', s.goalHours);
  put('weight_logs', data.body?.weightLogs);
  put('reminder_settings', data.settings?.reminders);
  put('nutri_notes', data.notes);
  return keys;
};

/**
 * Reemplaza los datos actuales por los del archivo. El caller recarga la app
 * después para que todo relea el estado nuevo.
 */
export const restoreFullBackup = (data) => {
  let keys;
  if (isV4Backup(data)) keys = data.keys;
  else if (isLegacyBackup(data)) keys = legacyToKeys(data);
  else throw new Error('El archivo no tiene el formato de una copia de NutriTrack.');

  // v4 es una foto completa: lo que no está en el archivo no existía.
  if (isV4Backup(data)) appKeys().forEach((k) => !(k in keys) && removeKey(k));
  else if (!('workout_active_session' in keys)) removeKey('workout_active_session');

  Object.entries(keys).forEach(([k, raw]) => {
    if (typeof raw === 'string' && isAppKey(k)) writeRaw(k, raw);
  });
};

export const readBackupFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result));
      } catch {
        reject(new Error('El archivo no es un JSON válido.'));
      }
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsText(file);
  });

/**
 * Foto local de todos los datos antes de la primera apertura de esta versión,
 * por si algo de la migración sale mal. Se guarda una sola vez.
 */
export const snapshotBeforeUpgrade = () => {
  if (readRaw('nutri_pre_v2_backup')) return;
  const snap = JSON.stringify(buildFullBackup());
  if (snap.length < 1_500_000) writeRaw('nutri_pre_v2_backup', snap);
  else writeRaw('nutri_pre_v2_backup', JSON.stringify({ skipped: true, size: snap.length }));
};

export const preUpgradeBackup = () => {
  const data = readJSON('nutri_pre_v2_backup', null);
  return isV4Backup(data) ? data : null;
};
