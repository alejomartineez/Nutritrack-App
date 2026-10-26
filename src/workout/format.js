// Formatos de números del módulo (coma decimal, como se escribe en Argentina).

export const fmtNum = (n, digits = 2) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return '';
  return x.toLocaleString('es-AR', { maximumFractionDigits: digits });
};

export const formatVolume = (kg) => {
  const x = Math.round(Number(kg) || 0);
  return x >= 10000 ? `${fmtNum(x / 1000, 1)} t` : `${fmtNum(x, 0)} kg`;
};

export const formatClock = (totalSec) => {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

export const formatMinutes = (min) => {
  if (min == null) return '';
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
};

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
