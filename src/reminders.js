import { parseAnyTimeToMinutes } from './sleep/sleepStorage';

// ---------------------------------------------------------------------------
// RECORDATORIOS DE REGISTRO (agua y comidas)
//
// Limitación honesta: sin un servidor de push, las notificaciones solo pueden
// dispararse mientras la app está abierta (aunque sea en otra pestaña, en
// Android/desktop). En iPhone el sistema suspende la PWA en segundo plano,
// así que ahí el recordatorio se ve como banner al volver a abrir la app.
// ---------------------------------------------------------------------------

const KEY = 'reminder_settings';
const MEAL_GAP_MINUTES = 4 * 60;

export const loadReminderSettings = () => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { enabled: false };
  } catch (e) {
    return { enabled: false };
  }
};

export const saveReminderSettings = (settings) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch (e) {
    // almacenamiento no disponible, se continúa sin persistir
  }
};

export const requestNotificationPermission = async () => {
  try {
    if (typeof Notification === 'undefined') return 'unsupported';
    if (Notification.permission === 'default') return await Notification.requestPermission();
    return Notification.permission;
  } catch (e) {
    return 'unsupported';
  }
};

/**
 * Devuelve el texto del recordatorio pendiente para el día de hoy, o null.
 * Solo molesta en horario diurno (8 a 23) y prioriza comidas sobre agua.
 * `includeWater: false` sirve para el banner in-app, donde el feedback de
 * hidratación existente ya cubre ese caso y sería redundante repetirlo.
 */
export const buildReminderMessage = (log, now = new Date(), { includeWater = true } = {}) => {
  const h = now.getHours();
  if (h < 8 || h >= 23) return null;

  const meals = [...(log.planMeals || []), ...(log.freeMeals || [])];
  const nowMinutes = h * 60 + now.getMinutes();

  if (meals.length === 0) {
    if (h >= 11) return 'Todavía no registraste ninguna comida hoy.';
  } else {
    const times = meals.map((m) => parseAnyTimeToMinutes(m.time)).filter((n) => n != null);
    if (times.length > 0) {
      const lastMeal = Math.max(...times);
      if (nowMinutes - lastMeal >= MEAL_GAP_MINUTES) {
        return 'Pasaron más de 4 horas desde tu última comida registrada.';
      }
    }
  }

  if (includeWater && (log.water || 0) === 0 && h >= 13) return 'Todavía no registraste agua hoy.';

  return null;
};

/** Muestra el recordatorio como notificación del sistema si la app está en segundo plano y hay permiso. Devuelve true si la notificación salió. */
export const notifyInBackground = async (message) => {
  if (!document.hidden) return false;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
  if (!navigator.serviceWorker) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification('NutriTrack', {
      body: message,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'nutritrack-reminder', // reemplaza la anterior en vez de acumular
    });
    return true;
  } catch (e) {
    return false;
  }
};
