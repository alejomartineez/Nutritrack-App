import { useEffect, useRef, useState } from 'react';
import { dateKeyOf } from './nutritionCalcs';

// ---------------------------------------------------------------------------
// QUÉ DÍA ES HOY, EN VIVO.
//
// Antes esto era una constante de módulo (`const TODAY_KEY = dateKeyOf(new
// Date())`), evaluada una sola vez al cargar el bundle. Para una app que se
// abre y se cierra eso alcanza; para una PWA no, porque una PWA instalada NO SE
// CIERRA: iOS la congela y la despierta con el mismo estado de JS. Si la abrías
// a la noche y la volvías a mirar al otro día, el bundle seguía cargado y "hoy"
// seguía siendo ayer.
//
// No era un detalle cosmético: de `isToday` cuelga el label de la fecha, el
// botón de día siguiente (que quedaba habilitado hacia un día ya pasado), la
// tira de hábitos, los recordatorios y —lo peor— dónde se guardaba lo que
// registrabas. La comida del desayuno del martes se escribía en el log del
// lunes.
// ---------------------------------------------------------------------------

/**
 * Milisegundos que faltan para la próxima medianoche local.
 *
 * `setHours(24, ...)` es la forma correcta de decir "medianoche que viene":
 * la hora 24 desborda al día siguiente y el `Date` lo normaliza solo, contando
 * los cambios de horario de verano. Sumar 24h en milisegundos no lo hace, y
 * erraría por una hora las dos noches del año en que el reloj se mueve.
 */
export const msUntilNextMidnight = (now = new Date()) => {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
};

/**
 * La clave del día de hoy (YYYY-MM-DD), actualizada sola al cruzar la medianoche.
 *
 * Se combinan dos señales porque ninguna alcanza por su cuenta:
 *   - Un timer apuntado a la próxima medianoche cubre el caso de la app abierta
 *     y en primer plano.
 *   - `visibilitychange` cubre el caso real de la PWA: en segundo plano iOS
 *     suspende los temporizadores, así que el de medianoche puede no haber
 *     llegado a dispararse nunca. Al volver a primer plano se revisa el reloj.
 */
export function useTodayKey() {
  const [key, setKey] = useState(() => dateKeyOf(new Date()));
  const timerRef = useRef(null);

  useEffect(() => {
    const sync = () => {
      // Devolver la MISMA cadena cuando no cambió el día es lo que evita que
      // cada `visibilitychange` (que llega también al esconder la app, y en
      // cada cambio de pestaña) dispare un re-render de toda la app.
      setKey((prev) => {
        const current = dateKeyOf(new Date());
        return current === prev ? prev : current;
      });

      clearTimeout(timerRef.current);
      // El segundo de margen no es supersticioso: un timer apuntado justo al
      // límite puede dispararse unos milisegundos antes, leer todavía el día
      // viejo y reprogramarse a "dentro de 0 ms", quedando en un bucle corto.
      timerRef.current = setTimeout(sync, msUntilNextMidnight() + 1000);
    };

    sync();
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);

    return () => {
      clearTimeout(timerRef.current);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  return key;
}
