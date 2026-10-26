import { useCallback, useEffect, useRef, useState } from 'react';
import { haptic } from '../lib/haptics';
import { loadRestTimer, saveRestTimer } from './workoutStorage';

// Descanso entre series. Se calcula desde un instante de fin guardado (no con
// setTimeouts encadenados), así sobrevive a que iOS congele la app en segundo
// plano o a que se cierre y se vuelva a abrir.

let ctx = null;
let scheduled = null;

/**
 * iOS solo deja sonar audio si el AudioContext se creó/reanudó dentro de un
 * toque. Se llama desde el handler del tilde de la serie.
 */
export const primeAudio = () => {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    if (ctx.state !== 'running') ctx.resume?.()?.catch?.(() => {});
    // Un buffer mudo destraba la salida en Safari.
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, 1, 22050);
    src.connect(ctx.destination);
    src.start(0);
  } catch {
    // sin audio
  }
};

const cancelBeep = () => {
  scheduled?.forEach((o) => {
    try {
      o.stop();
      o.disconnect();
    } catch {
      // ya terminó
    }
  });
  scheduled = null;
};

/** Agenda el pitido en el reloj de audio: suena a horario aunque el JS se atrase. */
const scheduleBeep = (delayMs) => {
  cancelBeep();
  if (!ctx) return;
  try {
    // Recién creado puede estar 'suspended' hasta que resuelva resume(): lo
    // agendado igual suena a tiempo cuando arranca el reloj.
    if (ctx.state !== 'running') ctx.resume?.()?.catch?.(() => {});
    const t0 = ctx.currentTime + Math.max(0, delayMs) / 1000;
    scheduled = [0, 0.22].map((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, t0 + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0 + offset);
      osc.stop(t0 + offset + 0.2);
      return osc;
    });
  } catch {
    scheduled = null;
  }
};

/**
 * Estado del descanso: { endsAt, durationSec } persistido. `remaining` en
 * segundos (negativo cuando ya pasó). Alerta una vez por cada `endsAt`.
 */
export function useRestTimer({ sound = true } = {}) {
  const [timer, setTimer] = useState(loadRestTimer);
  const [now, setNow] = useState(() => Date.now());
  const timerRef = useRef(timer);
  const alerted = useRef(timer && timer.endsAt <= Date.now() ? timer.endsAt : null);

  const apply = useCallback(
    (next) => {
      timerRef.current = next;
      setTimer(next);
      saveRestTimer(next);
      setNow(Date.now());
      if (next && sound) scheduleBeep(next.endsAt - Date.now());
      else cancelBeep();
    },
    [sound]
  );

  const start = useCallback((sec) => apply({ endsAt: Date.now() + sec * 1000, durationSec: sec }), [apply]);

  const add = useCallback(
    (sec) => {
      const t = timerRef.current;
      if (!t) return;
      const at = Date.now();
      if (t.endsAt <= at) {
        // Ya había llegado a cero: +15 arranca de nuevo y vuelve a avisar.
        if (sec > 0) apply({ endsAt: at + sec * 1000, durationSec: sec });
        return;
      }
      apply({ endsAt: Math.max(at, t.endsAt + sec * 1000), durationSec: Math.max(1, t.durationSec + sec) });
    },
    [apply]
  );
  const stop = useCallback(() => apply(null), [apply]);

  useEffect(() => {
    if (!timer) return undefined;
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, 250);
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      tick();
      if (ctx && ctx.state !== 'running') ctx.resume?.()?.catch?.(() => {});
      // Al volver: si falta, se reagenda; si ya pasó, no suena tarde.
      if (sound && timer.endsAt > Date.now()) scheduleBeep(timer.endsAt - Date.now());
      else cancelBeep();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [timer, sound]);

  useEffect(() => {
    if (!timer || now < timer.endsAt || alerted.current === timer.endsAt) return;
    alerted.current = timer.endsAt;
    // Si volvés mucho después, no hace falta vibrar.
    if (now - timer.endsAt < 5000) haptic([200, 100, 200]);
  }, [now, timer]);

  // Terminado hace rato: se cierra solo.
  useEffect(() => {
    if (timer && now - timer.endsAt > 60000) apply(null);
  }, [now, timer, apply]);

  const remaining = timer ? Math.ceil((timer.endsAt - now) / 1000) : 0;
  return { timer, remaining, start, add, stop };
}
