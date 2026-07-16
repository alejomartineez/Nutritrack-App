// ---------------------------------------------------------------------------
// FRECUENTES: alimentos más registrados por el usuario, para acceso de un toque
//
// La gente come ~20 cosas en loop. En vez de tipear/buscar cada vez, ofrecemos
// sus alimentos más usados como chips. Se derivan del propio historial
// (nutri_log_*), sin configuración manual. Agrupa por nombre; rankea por
// cantidad de veces registrado y desempata por lo más reciente.
// ---------------------------------------------------------------------------

const NUTRI_LOG_PREFIX = 'nutri_log_';

const localDateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const dateKeyDaysAgo = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return localDateKey(d);
};

export const getFrequentFoods = (days = 30, limit = 8) => {
  const since = dateKeyDaysAgo(days); // YYYY-MM-DD es comparable lexicográficamente
  const byName = new Map();

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(NUTRI_LOG_PREFIX)) continue;
      const date = key.slice(NUTRI_LOG_PREFIX.length);
      if (date < since) continue;

      const log = JSON.parse(localStorage.getItem(key));
      const meals = [...(log.planMeals || []), ...(log.freeMeals || [])];
      for (const m of meals) {
        if (!m || !m.name) continue;
        const existing = byName.get(m.name);
        if (existing) {
          existing.count += 1;
          if (date >= existing.lastDate) {
            // refresca los macros a la última versión registrada de ese nombre
            existing.lastDate = date;
            existing.kcal = m.kcal;
            existing.p = m.p;
            existing.c = m.c;
            existing.f = m.f;
          }
        } else {
          byName.set(m.name, { name: m.name, kcal: m.kcal, p: m.p, c: m.c, f: m.f, count: 1, lastDate: date });
        }
      }
    }
  } catch (e) {
    return [];
  }

  return [...byName.values()]
    .sort((a, b) => b.count - a.count || (a.lastDate < b.lastDate ? 1 : -1))
    .slice(0, limit);
};
