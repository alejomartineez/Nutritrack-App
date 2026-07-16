import { describe, it, expect } from 'vitest';
import { buildReminderMessage } from './reminders';

// `now` fijo para que la lógica horaria sea determinista.
const at = (h, m = 0) => new Date(2026, 6, 16, h, m);

describe('buildReminderMessage', () => {
  it('no molesta de madrugada ni de noche (fuera de 8–23h)', () => {
    expect(buildReminderMessage({}, at(7, 59))).toBeNull();
    expect(buildReminderMessage({}, at(23, 0))).toBeNull();
  });

  it('avisa si no hay comidas después de las 11', () => {
    expect(buildReminderMessage({ planMeals: [], freeMeals: [] }, at(12))).toBe(
      'Todavía no registraste ninguna comida hoy.'
    );
  });

  it('no avisa por comidas antes de las 11 (recién arranca el día)', () => {
    // sin agua tampoco, para aislar el caso de comidas
    expect(buildReminderMessage({ planMeals: [], water: 500 }, at(9))).toBeNull();
  });

  it('avisa si pasaron más de 4h desde la última comida', () => {
    const log = { planMeals: [{ time: '08:00' }], water: 2000 };
    expect(buildReminderMessage(log, at(12, 30))).toBe(
      'Pasaron más de 4 horas desde tu última comida registrada.'
    );
  });

  it('no avisa si la última comida fue hace menos de 4h', () => {
    const log = { planMeals: [{ time: '10:00' }], water: 2000 };
    expect(buildReminderMessage(log, at(12, 30))).toBeNull();
  });

  it('usa la comida más reciente cuando hay varias', () => {
    const log = { planMeals: [{ time: '08:00' }], freeMeals: [{ time: '12:00' }], water: 2000 };
    // última fue 12:00, a las 13:00 sólo pasó 1h => sin aviso de comida
    expect(buildReminderMessage(log, at(13))).toBeNull();
  });

  it('recuerda el agua después de las 13 si no se registró nada', () => {
    const log = { planMeals: [{ time: '12:30' }], water: 0 };
    expect(buildReminderMessage(log, at(13, 30))).toBe('Todavía no registraste agua hoy.');
  });

  it('omite el aviso de agua con includeWater=false (banner in-app)', () => {
    const log = { planMeals: [{ time: '12:30' }], water: 0 };
    expect(buildReminderMessage(log, at(13, 30), { includeWater: false })).toBeNull();
  });

  it('prioriza el hueco entre comidas por sobre el agua', () => {
    const log = { planMeals: [{ time: '08:00' }], water: 0 };
    expect(buildReminderMessage(log, at(14))).toBe(
      'Pasaron más de 4 horas desde tu última comida registrada.'
    );
  });
});
