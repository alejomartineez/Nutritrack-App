import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeTotalSleepMinutes,
  sleptMinutes,
  listNights,
  loadSleepLogs,
  loadSleepGoalHours,
  upsertSleepLog,
  deleteSleepLog,
  getFormDefaults,
  getTypicalTimes,
  computeSleepScore,
  scoreNight,
  computeSleepDebt,
  computeConsistency,
  suggestBedtime,
  computeFactorImpact,
  computeSocialJetlag,
  nightSeries,
  summarizeRange,
  getPendingSleep,
  startPendingSleep,
  clearPendingSleep,
  pendingNightKey,
  nightFromPending,
  getSleepDaySummary,
  getSleepRangeSummary,
  wakeCountOf,
  parseAnyTimeToMinutes,
} from './sleepStorage';
import { addDaysToKey } from '../lib/dates';

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
}

beforeEach(() => {
  globalThis.localStorage = new MemoryStorage();
});

const END = '2026-10-26'; // lunes
const ago = (n) => addDaysToKey(END, -n);

/** Noche con la forma que guarda upsertSleepLog. */
const night = (daysAgo, { bedtime = '23:00', wakeTime = '07:00', fall = 0, quality = null, factors = [], count = 0, awake = 0 } = {}) =>
  upsertSleepLog({}, ago(daysAgo), {
    bedtime,
    wakeTime,
    minutesToFallAsleep: fall,
    interruptions: { count, minutesAwake: awake },
    quality,
    factors,
  })[ago(daysAgo)];

const mapOf = (...logs) => Object.fromEntries(logs.map((l) => [l.date, l]));

const MALFORMED = {
  [ago(0)]: { date: ago(0), wakeTime: '07:00' },
  [ago(1)]: { bedtime: undefined, wakeTime: undefined, totalSleepMinutes: 420 },
  [ago(2)]: null,
  [ago(3)]: 'roto',
  [ago(4)]: { bedtime: '25:99', wakeTime: 'x', quality: 'mucho', interruptions: null, factors: 'pantallas' },
  basura: { bedtime: '23:00', wakeTime: '07:00' },
};

describe('computeTotalSleepMinutes', () => {
  it('cruza la medianoche', () => {
    expect(computeTotalSleepMinutes({ bedtime: '23:00', wakeTime: '07:00' })).toBe(480);
  });

  it('descuenta lo que tardaste en dormirte y lo despierto', () => {
    expect(computeTotalSleepMinutes({ bedtime: '23:00', wakeTime: '07:00', minutesToFallAsleep: 20, interruptions: { minutesAwake: 30 } })).toBe(430);
  });

  it('siesta en el mismo día', () => {
    expect(computeTotalSleepMinutes({ bedtime: '13:00', wakeTime: '15:30' })).toBe(150);
  });

  it('nunca negativo', () => {
    expect(computeTotalSleepMinutes({ bedtime: '23:00', wakeTime: '01:00', interruptions: { minutesAwake: 200 } })).toBe(0);
  });

  it('0 si falta o está mal un horario (sin tirar)', () => {
    expect(computeTotalSleepMinutes({ bedtime: '', wakeTime: '07:00' })).toBe(0);
    expect(computeTotalSleepMinutes({ bedtime: '23:00', wakeTime: null })).toBe(0);
    expect(computeTotalSleepMinutes({ bedtime: undefined, wakeTime: undefined })).toBe(0);
    expect(computeTotalSleepMinutes({ bedtime: '25:00', wakeTime: '07:00' })).toBe(0);
    expect(computeTotalSleepMinutes()).toBe(0);
  });
});

describe('lectura robusta de registros viejos o rotos', () => {
  it('listNights ignora lo inválido y usa totalSleepMinutes si no hay horarios', () => {
    const nights = listNights(MALFORMED);
    expect(nights.map((n) => n.date)).toEqual([ago(1)]);
    expect(nights[0].minutes).toBe(420);
    expect(sleptMinutes(null)).toBe(0);
  });

  it('ningún cálculo tira con datos rotos', () => {
    const map = { ...MALFORMED, ...mapOf(night(5), night(6), night(7)) };
    expect(() => {
      computeSleepDebt(map, 8, END);
      computeConsistency(map, END);
      suggestBedtime(map, 8, END);
      getTypicalTimes(map, END);
      getFormDefaults(map, END);
      computeFactorImpact(map, END);
      computeSocialJetlag(map, END);
      nightSeries(map, 8, END, 30);
      summarizeRange(map, 8, ago(29), END);
      scoreNight(map, ago(1), 8);
    }).not.toThrow();
    expect(scoreNight(map, ago(1), 8).parts.find((p) => p.id === 'timing').points).toBeNull();
  });

  it('loadSleepLogs tolera JSON roto o con otra forma, sin borrar nada', () => {
    localStorage.setItem('sleep_logs', '{roto');
    expect(loadSleepLogs()).toEqual({});
    expect(localStorage.getItem('sleep_logs')).toBe('{roto');
    localStorage.setItem('sleep_logs', '[1,2]');
    expect(loadSleepLogs()).toEqual({});
  });

  it('loadSleepGoalHours vuelve a 8 si el valor no tiene sentido', () => {
    expect(loadSleepGoalHours()).toBe(8);
    localStorage.setItem('sleep_goal_hours', '7.5');
    expect(loadSleepGoalHours()).toBe(7.5);
    localStorage.setItem('sleep_goal_hours', '"x"');
    expect(loadSleepGoalHours()).toBe(8);
  });

  it("los despertares '4+' viejos cuentan como 3+", () => {
    expect(wakeCountOf({ interruptions: { count: '4+' } })).toBe(3);
    expect(wakeCountOf({})).toBe(0);
  });
});

describe('upsert / delete', () => {
  it('crea con id, fecha y total; al editar conserva lo que no cambia', () => {
    let map = upsertSleepLog({}, END, { bedtime: '23:30', wakeTime: '07:00', minutesToFallAsleep: 10, factors: ['alcohol'] });
    const id = map[END].id;
    expect(map[END]).toMatchObject({ date: END, totalSleepMinutes: 440, factors: ['alcohol'] });
    map = upsertSleepLog(map, END, { quality: 4 });
    expect(map[END]).toMatchObject({ id, quality: 4, totalSleepMinutes: 440, factors: ['alcohol'] });
  });

  it('delete saca solo esa noche', () => {
    const map = mapOf(night(0), night(1));
    expect(Object.keys(deleteSleepLog(map, END))).toEqual([ago(1)]);
  });
});

describe('valores por defecto del formulario', () => {
  it('sin registros: 23:00 → 07:00', () => {
    expect(getFormDefaults({}, END)).toEqual({ bedtime: '23:00', wakeTime: '07:00', minutesToFallAsleep: 10 });
  });

  it('con 1-2 noches: el último registro (aunque no sea de ayer)', () => {
    const map = mapOf(night(9, { bedtime: '00:15', wakeTime: '08:10', fall: 20 }));
    expect(getFormDefaults(map, END)).toEqual({ bedtime: '00:15', wakeTime: '08:10', minutesToFallAsleep: 20 });
  });

  it('con 3+ noches: la mediana de las últimas 14 (cruzando medianoche bien)', () => {
    const map = mapOf(
      night(1, { bedtime: '23:30', wakeTime: '07:00', fall: 10 }),
      night(2, { bedtime: '00:30', wakeTime: '07:30', fall: 10 }),
      night(3, { bedtime: '00:00', wakeTime: '07:10', fall: 30 })
    );
    expect(getFormDefaults(map, END)).toEqual({ bedtime: '00:00', wakeTime: '07:10', minutesToFallAsleep: 10 });
  });
});

describe('puntaje', () => {
  it('noche perfecta = 100', () => {
    const r = computeSleepScore(night(0, { bedtime: '23:00', wakeTime: '07:00', quality: 5 }), { goalHours: 8, usualBedtime: '23:00' });
    expect(r.score).toBe(100);
    expect(r.label).toBe('Excelente');
  });

  it('sin energía ni historial: se reescala sobre lo medido', () => {
    const r = computeSleepScore(night(0, { bedtime: '23:00', wakeTime: '07:00' }), { goalHours: 8 });
    expect(r.parts.find((p) => p.id === 'energy').points).toBeNull();
    expect(r.parts.find((p) => p.id === 'timing').points).toBeNull();
    expect(r.score).toBe(100);
  });

  it('dormir la mitad de la meta da 0 en duración', () => {
    const r = computeSleepScore(night(0, { bedtime: '03:00', wakeTime: '07:00', quality: 3 }), { goalHours: 8, usualBedtime: '23:00' });
    expect(r.parts.find((p) => p.id === 'duration').points).toBe(0);
    expect(r.parts.find((p) => p.id === 'timing').points).toBe(0);
    expect(r.score).toBeLessThan(30);
  });

  it('scoreNight compara la hora contra la mediana de las noches previas', () => {
    const map = mapOf(night(1), night(2), night(3), night(0, { bedtime: '00:30', wakeTime: '08:30', quality: 5 }));
    const timing = scoreNight(map, END, 8).parts.find((p) => p.id === 'timing');
    expect(timing.usualBedtime).toBe('23:00');
    expect(timing.deltaMinutes).toBe(90);
    expect(timing.points).toBe(0);
  });

  it('despertares restan', () => {
    const base = { goalHours: 8, usualBedtime: '23:00' };
    const calm = computeSleepScore(night(0, { quality: 4 }), base).score;
    const rough = computeSleepScore(night(0, { quality: 4, count: 3 }), base).score;
    expect(rough).toBeLessThan(calm);
  });
});

describe('deuda, constancia y hora sugerida', () => {
  it('deuda: solo noches registradas de las últimas 14, el superávit compensa', () => {
    const map = mapOf(
      night(0, { bedtime: '01:00', wakeTime: '07:00' }), // 6h → +2 de deuda
      night(1, { bedtime: '22:00', wakeTime: '07:00' }), // 9h → -1
      night(20, { bedtime: '03:00', wakeTime: '07:00' }) // fuera de la ventana
    );
    expect(computeSleepDebt(map, 8, END)).toEqual({ debtHours: 1, nights: 2, days: 14 });
    const rested = mapOf(night(0, { bedtime: '21:00', wakeTime: '07:00' }));
    expect(computeSleepDebt(rested, 8, END).debtHours).toBe(-2);
  });

  it('constancia: desvío de la hora de acostarse alrededor de la medianoche', () => {
    expect(computeConsistency(mapOf(night(0), night(1)), END).stdDevMin).toBeNull();
    const map = mapOf(night(0, { bedtime: '23:30' }), night(1, { bedtime: '00:00' }), night(2, { bedtime: '00:30' }));
    const c = computeConsistency(map, END);
    expect(c.stdDevMin).toBe(24);
    expect(c.label).toBe('Constante');
  });

  it('hora sugerida = despertar habitual − meta − latencia', () => {
    const map = mapOf(night(0, { fall: 10 }), night(1, { fall: 10 }), night(2, { fall: 10 }));
    expect(suggestBedtime(map, 8, END)).toEqual({ bedtime: '22:50', wakeTime: '07:00', fallAsleep: 10 });
    expect(suggestBedtime({}, 8, END)).toBeNull();
  });
});

describe('patrones', () => {
  it('factores: no opina con menos de 4 noches de cada lado y el progreso no pasa del máximo', () => {
    const logs = [];
    for (let i = 0; i < 20; i++) logs.push(night(i, { factors: i < 3 ? ['alcohol'] : [] }));
    const r = computeFactorImpact(mapOf(...logs), END);
    expect(r.checked).toBe(0);
    expect(r.progress).toBe(3);
    expect(r.needed).toBe(4);
  });

  it('factores: muestra la diferencia con signo y oculta las chicas', () => {
    const logs = [];
    for (let i = 0; i < 10; i++) {
      const withAlcohol = i < 5;
      logs.push(night(i, { bedtime: withAlcohol ? '00:00' : '23:00', factors: withAlcohol ? ['alcohol', 'lectura'] : i < 7 ? [] : ['lectura'] }));
    }
    const r = computeFactorImpact(mapOf(...logs), END);
    expect(r.notable.map((f) => f.id)).toContain('alcohol');
    const alcohol = r.notable.find((f) => f.id === 'alcohol');
    expect(alcohol.minutesDiff).toBe(-60);
    expect(alcohol.qualityDiff).toBeNull();
  });

  it('jet lag social: corrimiento del punto medio el finde', () => {
    // END es lunes: ago(1) domingo y ago(2) sábado son noches de finde.
    const map = mapOf(
      night(0),
      night(3),
      night(4),
      night(1, { bedtime: '01:00', wakeTime: '09:00' }),
      night(2, { bedtime: '01:00', wakeTime: '09:00' })
    );
    expect(computeSocialJetlag(map, END)).toMatchObject({ ready: true, shiftMinutes: 120, weekendNights: 2, weekdayNights: 3 });
    expect(computeSocialJetlag(mapOf(night(0)), END).ready).toBe(false);
  });
});

describe('"Me voy a dormir"', () => {
  it('guarda, lee y limpia el pendiente; uno de hace más de 20 h se ignora', () => {
    const start = new Date(2026, 9, 25, 23, 40);
    expect(startPendingSleep(start)).toEqual({ bedtime: '23:40', startedAt: start.getTime() });
    expect(getPendingSleep(start.getTime() + 8 * 3600000)).toEqual({ bedtime: '23:40', startedAt: start.getTime() });
    expect(getPendingSleep(start.getTime() + 21 * 3600000)).toBeNull();
    clearPendingSleep();
    expect(getPendingSleep(start.getTime())).toBeNull();
  });

  it('el pendiente de la noche corresponde al día en que te despertás', () => {
    expect(pendingNightKey({ startedAt: new Date(2026, 9, 25, 23, 40).getTime() })).toBe('2026-10-26');
    expect(pendingNightKey({ startedAt: new Date(2026, 9, 26, 0, 30).getTime() })).toBe('2026-10-26');
    const { dateKey, patch } = nightFromPending({ bedtime: '23:40' }, new Date(2026, 9, 26, 7, 5), 10);
    expect(dateKey).toBe('2026-10-26');
    expect(patch).toEqual({ bedtime: '23:40', wakeTime: '07:05', minutesToFallAsleep: 10 });
  });
});

describe('API para Hoy / Progreso', () => {
  it('getSleepDaySummary: sin registro, con pendiente y registrado', () => {
    const now = new Date(2026, 9, 26, 6, 0).getTime();
    expect(getSleepDaySummary(END, now)).toEqual({ logged: false });

    startPendingSleep(new Date(2026, 9, 25, 23, 40));
    expect(getSleepDaySummary(END, now)).toEqual({ logged: false, pendingBedtime: '23:40' });
    expect(getSleepDaySummary(ago(3), now)).toEqual({ logged: false });

    localStorage.setItem('sleep_logs', JSON.stringify(mapOf(night(0, { bedtime: '23:30', wakeTime: '07:00', quality: 4 }))));
    expect(getSleepDaySummary(END, now)).toEqual({
      logged: true,
      hours: 7.5,
      minutes: 450,
      score: expect.any(Number),
      quality: 4,
      emoji: '🙂',
      label: 'Descansado',
      bedtime: '23:30',
      wakeTime: '07:00',
    });
  });

  it('getSleepDaySummary sin energía usa la etiqueta del puntaje', () => {
    localStorage.setItem('sleep_logs', JSON.stringify(mapOf(night(0))));
    const s = getSleepDaySummary(END);
    expect(s).toMatchObject({ logged: true, quality: null, emoji: '', label: 'Excelente', score: 100 });
  });

  it('getSleepRangeSummary promedia las noches del rango (en cualquier orden)', () => {
    localStorage.setItem('sleep_goal_hours', '7');
    localStorage.setItem(
      'sleep_logs',
      JSON.stringify(mapOf(night(0, { quality: 4 }), night(1, { bedtime: '01:00', quality: 2 }), night(10), { date: 'x' }))
    );
    expect(getSleepRangeSummary(ago(6), END)).toEqual({ nights: 2, avgHours: 7, avgScore: expect.any(Number), avgQuality: 3, goalHours: 7 });
    expect(getSleepRangeSummary(END, ago(6)).nights).toBe(2);
    expect(getSleepRangeSummary('2020-01-01', '2020-01-07')).toEqual({ nights: 0, avgHours: null, avgScore: null, avgQuality: null, goalHours: 7 });
  });
});

describe('parseAnyTimeToMinutes (compat)', () => {
  it('24 h, a.m./p.m. y basura', () => {
    expect(parseAnyTimeToMinutes('07:30')).toBe(450);
    expect(parseAnyTimeToMinutes('1:00 p.m.')).toBe(780);
    expect(parseAnyTimeToMinutes('12:15 a.m.')).toBe(15);
    expect(parseAnyTimeToMinutes(null)).toBeNull();
    expect(parseAnyTimeToMinutes('sin hora')).toBeNull();
  });
});
