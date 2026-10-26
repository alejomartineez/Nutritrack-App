import { describe, it, expect, beforeEach } from 'vitest';
import { buildFullBackup, restoreFullBackup } from './backupStorage';

// localStorage mínimo para el entorno `node` de vitest. Alcanza con lo que usa
// el módulo: getItem, setItem, key y length (recorre las claves por índice para
// juntar los logs diarios).
class MemoryStorage {
  constructor() {
    this.map = new Map();
  }
  get length() {
    return this.map.size;
  }
  key(i) {
    return [...this.map.keys()][i] ?? null;
  }
  getItem(k) {
    return this.map.has(k) ? this.map.get(k) : null;
  }
  setItem(k, v) {
    this.map.set(k, String(v));
  }
  removeItem(k) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}

// Un estado completo de la app, con al menos un valor por cada clave que
// NutriTrack escribe en localStorage.
const FULL_STATE = {
  nutri_goals: { calories: 2100, protein: 150, carbs: 200, fat: 60, water: 2500 },
  nutri_catalog: [{ id: 'c1', name: 'Avena con banana', kcal: 320, p: 10, c: 55, f: 6 }],
  nutri_free_catalog: [{ id: 'f1', name: 'Alfajor', kcal: 220, p: 3, c: 30, f: 10 }],
  nutri_profile: { sex: 'varon', weightKg: 78, heightCm: 180, age: 30 },
  nutri_modules: { entreno: true, sueno: false },
  'nutri_log_2026-07-20': { water: 1500, planMeals: [{ id: 'm1', name: 'Pollo', kcal: 300 }], freeMeals: [] },
  'nutri_log_2026-07-21': { water: 750, planMeals: [], freeMeals: [] },
  workout_exercises: [{ id: 'e1', name: 'Sentadilla' }],
  workout_routines: [{ id: 'r1', name: 'Full body' }],
  workout_active_routine_id: 'r1',
  workout_sessions: [{ id: 's1', date: '2026-07-20' }],
  workout_active_session: { id: 's2', startedAt: 1234567890 },
  sleep_logs: [{ date: '2026-07-20', bedtime: '23:30', wakeTime: '07:00' }],
  sleep_goal_hours: 8,
  weight_logs: [{ date: '2026-07-20', kg: 78.4 }],
  reminder_settings: { enabled: true },
  nutri_notes: [{ id: 'note_1', body: 'Machete desayuno', createdAt: 1, updatedAt: 2 }],
};

const seed = (state) => {
  globalThis.localStorage = new MemoryStorage();
  Object.entries(state).forEach(([k, v]) => globalThis.localStorage.setItem(k, JSON.stringify(v)));
};

describe('backup completo', () => {
  beforeEach(() => seed(FULL_STATE));

  // Vuelta completa: cubre todas las claves, incluidas las que se agreguen.
  it('sobrevive una vuelta completa exportar → restaurar sin perder nada', () => {
    const backup = JSON.parse(JSON.stringify(buildFullBackup()));

    globalThis.localStorage = new MemoryStorage(); // teléfono nuevo, vacío
    restoreFullBackup(backup);

    Object.entries(FULL_STATE).forEach(([key, value]) => {
      const restored = globalThis.localStorage.getItem(key);
      expect(restored, `falta "${key}" en la copia de seguridad`).not.toBeNull();
      expect(JSON.parse(restored), `"${key}" no volvió igual`).toEqual(value);
    });
  });

  it('guarda cada clave tal cual, incluso valores que no son JSON', () => {
    globalThis.localStorage.setItem('nutri_profile', 'skipped');
    const backup = buildFullBackup();
    expect(backup.version).toBe(4);
    expect(backup.keys.nutri_profile).toBe('skipped');
    expect(Object.keys(backup.keys).filter((k) => k.startsWith('nutri_log_')).sort()).toEqual(['nutri_log_2026-07-20', 'nutri_log_2026-07-21']);
  });

  it('no mete en la copia claves ajenas ni la foto previa a la actualización', () => {
    globalThis.localStorage.setItem('otra_app', '1');
    globalThis.localStorage.setItem('nutri_pre_v2_backup', '{}');
    const backup = buildFullBackup();
    expect(backup.keys.otra_app).toBeUndefined();
    expect(backup.keys.nutri_pre_v2_backup).toBeUndefined();
  });

  it('al restaurar una v4 reemplaza: lo que no estaba en el archivo se va', () => {
    const backup = JSON.parse(JSON.stringify(buildFullBackup()));
    globalThis.localStorage.setItem('nutri_log_2030-01-01', '{"water":1}');
    restoreFullBackup(backup);
    expect(globalThis.localStorage.getItem('nutri_log_2030-01-01')).toBeNull();
  });

  it('restaura un archivo v3 (formato anterior por secciones)', () => {
    const v3 = {
      version: 3,
      nutrition: { goals: FULL_STATE.nutri_goals, logs: { '2026-07-20': FULL_STATE['nutri_log_2026-07-20'] } },
      sleep: { logs: FULL_STATE.sleep_logs },
      notes: FULL_STATE.nutri_notes,
    };
    globalThis.localStorage = new MemoryStorage();
    restoreFullBackup(v3);
    expect(JSON.parse(globalThis.localStorage.getItem('nutri_log_2026-07-20'))).toEqual(FULL_STATE['nutri_log_2026-07-20']);
    expect(JSON.parse(globalThis.localStorage.getItem('nutri_notes'))).toEqual(FULL_STATE.nutri_notes);
  });

  it('restaura un archivo v1 sin las claves nuevas, en vez de romperse', () => {
    const v1 = {
      version: 1,
      nutrition: { goals: FULL_STATE.nutri_goals, catalog: FULL_STATE.nutri_catalog, logs: {} },
    };

    globalThis.localStorage = new MemoryStorage();
    expect(() => restoreFullBackup(v1)).not.toThrow();
    expect(JSON.parse(globalThis.localStorage.getItem('nutri_goals'))).toEqual(FULL_STATE.nutri_goals);
    // Lo que el archivo viejo no traía simplemente no se escribe: restaurar no
    // puede inventar datos, pero tampoco tiene que dejar basura.
    expect(globalThis.localStorage.getItem('nutri_free_catalog')).toBeNull();
  });

  it('rechaza un archivo que no es un backup', () => {
    expect(() => restoreFullBackup({ cualquier: 'cosa' })).toThrow();
    expect(() => restoreFullBackup(null)).toThrow();
  });
});
