// ---------------------------------------------------------------------------
// COPIA DE SEGURIDAD Y ROBUSTEZ DE ALMACENAMIENTO
//
// Toda la app vive en localStorage (sin backend). Esto cubre dos riesgos:
// 1) Que el navegador libere el storage bajo presión de espacio (pedimos
//    almacenamiento persistente al sistema operativo).
// 2) Que el usuario pierda el dispositivo, desinstale la app o limpie datos
//    del navegador: exportamos/restauramos TODO (nutrición + entreno + sueño)
//    en un único archivo JSON descargable.
//
// No reemplaza un backend con sync real entre dispositivos, pero da una red
// de seguridad manual mientras esa migración no exista.
// ---------------------------------------------------------------------------

const NUTRI_LOG_PREFIX = 'nutri_log_';

/** Le pide al navegador que no libere este storage bajo presión de espacio. Best-effort: no rompe nada si el navegador no lo soporta o lo deniega. */
export const requestPersistentStorage = async () => {
  try {
    if (navigator.storage && navigator.storage.persist) {
      await navigator.storage.persist();
    }
  } catch (e) {
    // no disponible en este navegador, se continúa sin persistencia garantizada
  }
};

const readJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
};

const writeJSON = (key, value) => {
  if (value === null || value === undefined) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // almacenamiento no disponible, se continúa sin persistir
  }
};

const collectNutritionLogs = () => {
  const logs = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(NUTRI_LOG_PREFIX)) {
      logs[key.slice(NUTRI_LOG_PREFIX.length)] = readJSON(key, null);
    }
  }
  return logs;
};

// Versión 2: suma `freeCatalog`, `profile`, `modules` y la sesión de entreno en
// curso. Los archivos v1 se restauran igual —cada campo se escribe solo si
// viene— así que un backup viejo sigue sirviendo, nada más que sin esas partes.
export const buildFullBackup = () => ({
  version: 2,
  exportedAt: new Date().toISOString(),
  nutrition: {
    goals: readJSON('nutri_goals', null),
    catalog: readJSON('nutri_catalog', null),
    // El catálogo de fuera de plan es tan del usuario como el del plan: son los
    // gustos que fue cargando a mano. Faltaba acá, así que el backup —que
    // existe justamente para cambiar de teléfono— los descartaba en silencio.
    freeCatalog: readJSON('nutri_free_catalog', null),
    // Sin el perfil, en el teléfono nuevo "Recalcular mi plan" abre el
    // formulario vacío y hay que volver a cargar peso, altura y objetivo.
    profile: readJSON('nutri_profile', null),
    // Qué módulos tenías encendidos: es configuración, y restaurar sin ella
    // deja la app con pestañas que el usuario ya había apagado.
    modules: readJSON('nutri_modules', null),
    logs: collectNutritionLogs(),
  },
  workout: {
    exercises: readJSON('workout_exercises', null),
    routines: readJSON('workout_routines', null),
    activeRoutineId: readJSON('workout_active_routine_id', null),
    sessions: readJSON('workout_sessions', null),
    // Un entrenamiento a medio hacer también es dato: si exportás justo entre
    // series, sin esto se pierde la sesión entera al restaurar.
    activeSession: readJSON('workout_active_session', null),
  },
  sleep: {
    logs: readJSON('sleep_logs', null),
    goalHours: readJSON('sleep_goal_hours', null),
  },
  body: {
    weightLogs: readJSON('weight_logs', null),
  },
  settings: {
    reminders: readJSON('reminder_settings', null),
  },
});

export const downloadFullBackup = () => {
  const backup = buildFullBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nutritrack_backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const isValidBackup = (data) =>
  Boolean(data) && typeof data === 'object' && (data.nutrition || data.workout || data.sleep);

/** Escribe un backup completo de vuelta en localStorage. El caller es responsable de recargar la app para que los tres módulos relean el estado nuevo. */
export const restoreFullBackup = (data) => {
  if (!isValidBackup(data)) {
    throw new Error('El archivo no tiene el formato esperado de copia de seguridad.');
  }

  if (data.nutrition) {
    writeJSON('nutri_goals', data.nutrition.goals);
    writeJSON('nutri_catalog', data.nutrition.catalog);
    writeJSON('nutri_free_catalog', data.nutrition.freeCatalog);
    writeJSON('nutri_profile', data.nutrition.profile);
    writeJSON('nutri_modules', data.nutrition.modules);
    Object.entries(data.nutrition.logs || {}).forEach(([dateKey, log]) => {
      writeJSON(`${NUTRI_LOG_PREFIX}${dateKey}`, log);
    });
  }

  if (data.workout) {
    writeJSON('workout_exercises', data.workout.exercises);
    writeJSON('workout_routines', data.workout.routines);
    writeJSON('workout_active_routine_id', data.workout.activeRoutineId);
    writeJSON('workout_sessions', data.workout.sessions);
    writeJSON('workout_active_session', data.workout.activeSession);
  }

  if (data.sleep) {
    writeJSON('sleep_logs', data.sleep.logs);
    writeJSON('sleep_goal_hours', data.sleep.goalHours);
  }

  if (data.body) {
    writeJSON('weight_logs', data.body.weightLogs);
  }

  if (data.settings) {
    writeJSON('reminder_settings', data.settings.reminders);
  }
};

export const readBackupFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result));
      } catch (e) {
        reject(new Error('El archivo no es un JSON válido.'));
      }
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsText(file);
  });
