import { describe, it, expect } from 'vitest';
import { computeTotalSleepMinutes, parseAnyTimeToMinutes } from './sleepStorage';

describe('computeTotalSleepMinutes', () => {
  it('calcula sueño cruzando la medianoche', () => {
    // 23:00 -> 07:00 = 8h
    expect(computeTotalSleepMinutes({ bedtime: '23:00', wakeTime: '07:00' })).toBe(8 * 60);
  });

  it('descuenta minutos para dormirse y despertares', () => {
    // 23:00 -> 07:00 (480) menos 20 para dormir menos 30 despierto = 430
    expect(
      computeTotalSleepMinutes({
        bedtime: '23:00',
        wakeTime: '07:00',
        minutesToFallAsleep: 20,
        interruptions: { minutesAwake: 30 },
      })
    ).toBe(430);
  });

  it('maneja acostarse y despertar el mismo día (siesta)', () => {
    // 13:00 -> 15:30 = 2.5h
    expect(computeTotalSleepMinutes({ bedtime: '13:00', wakeTime: '15:30' })).toBe(150);
  });

  it('nunca devuelve negativo aunque el tiempo despierto exceda al dormido', () => {
    expect(
      computeTotalSleepMinutes({
        bedtime: '23:00',
        wakeTime: '01:00',
        interruptions: { minutesAwake: 200 },
      })
    ).toBe(0);
  });

  it('devuelve 0 si falta un horario', () => {
    expect(computeTotalSleepMinutes({ bedtime: '', wakeTime: '07:00' })).toBe(0);
    expect(computeTotalSleepMinutes({ bedtime: '23:00', wakeTime: null })).toBe(0);
  });
});

describe('parseAnyTimeToMinutes', () => {
  it('parsea formato 24h', () => {
    expect(parseAnyTimeToMinutes('07:30')).toBe(7 * 60 + 30);
    expect(parseAnyTimeToMinutes('23:00')).toBe(23 * 60);
  });

  it('interpreta PM sumando 12h (salvo las 12 PM)', () => {
    expect(parseAnyTimeToMinutes('1:00 p.m.')).toBe(13 * 60);
    expect(parseAnyTimeToMinutes('12:00 p. m.')).toBe(12 * 60);
  });

  it('interpreta la medianoche AM como 0', () => {
    expect(parseAnyTimeToMinutes('12:15 a.m.')).toBe(15);
  });

  it('devuelve null cuando no hay hora reconocible', () => {
    expect(parseAnyTimeToMinutes('')).toBeNull();
    expect(parseAnyTimeToMinutes('sin hora')).toBeNull();
    expect(parseAnyTimeToMinutes(null)).toBeNull();
  });
});
