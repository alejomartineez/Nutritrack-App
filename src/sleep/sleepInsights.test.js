import { describe, it, expect } from 'vitest';
import {
  computeSleepSummary,
  computeGoalStreak,
  computeFactorImpact,
  computeBedtimeComparison,
  computeBestWorstNights,
  localDateKey,
  addDaysToKey,
} from './sleepStorage';

// Fecha fija para que los tests no dependan del día en que corren.
const REF = new Date('2026-07-21T12:00:00');
const dayAgo = (n) => addDaysToKey(localDateKey(REF), -n);

/** Construye un log con la forma que guarda upsertSleepLog. */
const log = ({ daysAgo, hours, quality, factors = [], bedtime = '23:00', wakeTime = '07:00' }) => ({
  id: `sleep_${daysAgo}`,
  date: dayAgo(daysAgo),
  bedtime,
  wakeTime,
  quality,
  factors,
  totalSleepMinutes: Math.round(hours * 60),
});

const mapOf = (logs) => Object.fromEntries(logs.map((l) => [l.date, l]));

describe('computeSleepSummary', () => {
  it('promedia horas y energía y calcula el cumplimiento de meta', () => {
    const logs = mapOf([
      log({ daysAgo: 0, hours: 8, quality: 4 }),
      log({ daysAgo: 1, hours: 6, quality: 2 }),
      log({ daysAgo: 2, hours: 8, quality: 5 }),
      log({ daysAgo: 3, hours: 6, quality: 3 }),
    ]);
    const s = computeSleepSummary(logs, 8, 30, REF);

    expect(s.nights).toBe(4);
    expect(s.avgHours).toBe(7);
    expect(s.avgQuality).toBe(3.5);
    expect(s.goalHits).toBe(2);
    expect(s.goalHitRate).toBe(50);
  });

  it('ignora noches fuera de la ventana', () => {
    const logs = mapOf([log({ daysAgo: 0, hours: 8, quality: 4 }), log({ daysAgo: 45, hours: 3, quality: 1 })]);
    expect(computeSleepSummary(logs, 8, 30, REF).nights).toBe(1);
  });

  it('devuelve ceros sin registros', () => {
    expect(computeSleepSummary({}, 8, 30, REF)).toEqual({
      nights: 0,
      avgHours: 0,
      avgQuality: null,
      goalHitRate: 0,
      goalHits: 0,
    });
  });
});

describe('computeGoalStreak', () => {
  it('cuenta noches consecutivas que cumplen la meta', () => {
    const logs = mapOf([
      log({ daysAgo: 0, hours: 8, quality: 4 }),
      log({ daysAgo: 1, hours: 8.5, quality: 4 }),
      log({ daysAgo: 2, hours: 6, quality: 2 }), // corta
      log({ daysAgo: 3, hours: 9, quality: 5 }),
    ]);
    expect(computeGoalStreak(logs, 8, REF)).toBe(2);
  });

  it('arranca desde ayer si todavía no se registró hoy', () => {
    const logs = mapOf([log({ daysAgo: 1, hours: 8, quality: 4 }), log({ daysAgo: 2, hours: 8, quality: 4 })]);
    expect(computeGoalStreak(logs, 8, REF)).toBe(2);
  });

  it('un día sin registro corta la racha', () => {
    const logs = mapOf([log({ daysAgo: 0, hours: 8, quality: 4 }), log({ daysAgo: 2, hours: 8, quality: 4 })]);
    expect(computeGoalStreak(logs, 8, REF)).toBe(1);
  });

  it('es 0 sin registros', () => {
    expect(computeGoalStreak({}, 8, REF)).toBe(0);
  });
});

describe('computeFactorImpact', () => {
  it('compara noches con y sin el factor', () => {
    const logs = mapOf([
      // 3 noches con cafeína tardía: energía 2, 6h
      ...[0, 1, 2].map((d) => log({ daysAgo: d, hours: 6, quality: 2, factors: ['cafeina_tardia'] })),
      // 3 noches sin: energía 4, 8h
      ...[3, 4, 5].map((d) => log({ daysAgo: d, hours: 8, quality: 4 })),
    ]);

    const [top] = computeFactorImpact(logs, 3, 90, REF);
    expect(top.id).toBe('cafeina_tardia');
    expect(top.nights).toBe(3);
    expect(top.qualityDiff).toBe(-2);
    expect(top.hoursDiff).toBe(-2);
  });

  it('descarta factores sin muestra suficiente de los dos lados', () => {
    const logs = mapOf([
      log({ daysAgo: 0, hours: 6, quality: 2, factors: ['alcohol'] }),
      ...[1, 2, 3].map((d) => log({ daysAgo: d, hours: 8, quality: 4 })),
    ]);
    expect(computeFactorImpact(logs, 3, 90, REF)).toEqual([]);
  });

  it('ordena por magnitud del efecto, sin importar el signo', () => {
    const logs = mapOf([
      ...[0, 1, 2].map((d) => log({ daysAgo: d, hours: 6, quality: 1, factors: ['estres_alto', 'lectura'] })),
      ...[3, 4, 5].map((d) => log({ daysAgo: d, hours: 8, quality: 5, factors: ['pantallas'] })),
    ]);
    const result = computeFactorImpact(logs, 3, 90, REF);
    const diffs = result.map((f) => Math.abs(f.qualityDiff));
    expect(diffs).toEqual([...diffs].sort((a, b) => b - a));
  });

  it('ignora noches sin energía registrada', () => {
    const logs = mapOf([
      ...[0, 1, 2].map((d) => log({ daysAgo: d, hours: 6, quality: null, factors: ['alcohol'] })),
      ...[3, 4, 5].map((d) => log({ daysAgo: d, hours: 8, quality: 4 })),
    ]);
    expect(computeFactorImpact(logs, 3, 90, REF)).toEqual([]);
  });
});

describe('computeBedtimeComparison', () => {
  it('parte las noches por la mediana y señala la mitad mejor', () => {
    const logs = mapOf([
      ...[0, 1, 2].map((d) => log({ daysAgo: d, hours: 8, quality: 5, bedtime: '22:30' })),
      ...[3, 4, 5].map((d) => log({ daysAgo: d, hours: 6, quality: 2, bedtime: '01:30' })),
    ]);
    const r = computeBedtimeComparison(logs, 3, 90, REF);

    expect(r.available).toBe(true);
    expect(r.better).toBe('temprano');
    expect(r.earlyBedtime).toBe('22:30');
    expect(r.lateBedtime).toBe('01:30');
    expect(r.earlyQuality).toBe(5);
    expect(r.lateQuality).toBe(2);
  });

  it('normaliza las horas después de medianoche para no romper el orden', () => {
    // 23:50 y 00:10 están a 20 min: sin normalizar, 00:10 quedaría "temprano".
    const logs = mapOf([
      ...[0, 1, 2].map((d) => log({ daysAgo: d, hours: 8, quality: 4, bedtime: '21:00' })),
      ...[3, 4, 5].map((d) => log({ daysAgo: d, hours: 8, quality: 4, bedtime: '00:10' })),
    ]);
    const r = computeBedtimeComparison(logs, 3, 90, REF);
    expect(r.earlyBedtime).toBe('21:00');
    expect(r.lateBedtime).toBe('00:10');
  });

  it('reporta "igual" cuando la diferencia es despreciable', () => {
    const logs = mapOf([
      ...[0, 1, 2].map((d) => log({ daysAgo: d, hours: 8, quality: 4, bedtime: '22:00' })),
      ...[3, 4, 5].map((d) => log({ daysAgo: d, hours: 8, quality: 4, bedtime: '00:00' })),
    ]);
    expect(computeBedtimeComparison(logs, 3, 90, REF).better).toBe('igual');
  });

  it('no está disponible sin noches suficientes para dos grupos', () => {
    const logs = mapOf([0, 1, 2].map((d) => log({ daysAgo: d, hours: 8, quality: 4 })));
    const r = computeBedtimeComparison(logs, 3, 90, REF);
    expect(r.available).toBe(false);
    expect(r.needed).toBe(6);
  });
});

describe('computeBestWorstNights', () => {
  it('ordena por energía y usa las horas como desempate', () => {
    const logs = mapOf([
      log({ daysAgo: 0, hours: 7, quality: 5 }),
      log({ daysAgo: 1, hours: 9, quality: 5 }), // mismo puntaje de energía, más horas
      log({ daysAgo: 2, hours: 4, quality: 1 }),
    ]);
    const r = computeBestWorstNights(logs, 30, REF);

    expect(r.available).toBe(true);
    expect(r.best.date).toBe(dayAgo(1));
    expect(r.worst.date).toBe(dayAgo(2));
  });

  it('no está disponible con menos de 3 noches', () => {
    const logs = mapOf([log({ daysAgo: 0, hours: 8, quality: 4 }), log({ daysAgo: 1, hours: 7, quality: 3 })]);
    expect(computeBestWorstNights(logs, 30, REF).available).toBe(false);
  });
});
