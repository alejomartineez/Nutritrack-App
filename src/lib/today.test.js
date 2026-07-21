import { describe, it, expect } from 'vitest';
import { msUntilNextMidnight } from './today';
import { dateKeyOf } from './nutritionCalcs';

describe('msUntilNextMidnight', () => {
  it('cuenta lo que falta desde el mediodía', () => {
    const mediodia = new Date(2026, 6, 21, 12, 0, 0, 0);
    expect(msUntilNextMidnight(mediodia)).toBe(12 * 60 * 60 * 1000);
  });

  it('desde un minuto antes de medianoche falta un minuto', () => {
    const casiMedianoche = new Date(2026, 6, 21, 23, 59, 0, 0);
    expect(msUntilNextMidnight(casiMedianoche)).toBe(60 * 1000);
  });

  // Justo en medianoche el resultado tiene que ser un día entero, no cero: ya
  // empezó el día de hoy, el próximo cruce es el de mañana. Un cero acá dejaría
  // el timer reprogramándose sin parar.
  it('en medianoche exacta apunta a la medianoche siguiente, no a cero', () => {
    const medianoche = new Date(2026, 6, 21, 0, 0, 0, 0);
    expect(msUntilNextMidnight(medianoche)).toBe(24 * 60 * 60 * 1000);
  });

  it('siempre devuelve un tiempo positivo', () => {
    for (let hora = 0; hora < 24; hora++) {
      const t = msUntilNextMidnight(new Date(2026, 6, 21, hora, 30, 15, 500));
      expect(t).toBeGreaterThan(0);
      expect(t).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
    }
  });

  // La razón de usar setHours(24) y no "sumar 24 horas en milisegundos": las dos
  // noches del año en que cambia el horario de verano, el día dura 23 o 25
  // horas. Sumar milisegundos erraría el cruce por una hora entera.
  it('cae en la medianoche local del día siguiente, no a 24h de distancia', () => {
    const tarde = new Date(2026, 6, 21, 17, 45, 30, 250);
    const cruce = new Date(tarde.getTime() + msUntilNextMidnight(tarde));

    expect(cruce.getHours()).toBe(0);
    expect(cruce.getMinutes()).toBe(0);
    expect(cruce.getSeconds()).toBe(0);
    expect(cruce.getMilliseconds()).toBe(0);
    expect(dateKeyOf(cruce)).toBe('2026-07-22');
  });
});
