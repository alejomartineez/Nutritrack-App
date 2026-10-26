import React from 'react';
import { addDaysToKey, keyToDate } from '../lib/dates';

const hm = (minutes) => {
  const t = Math.max(0, Math.round(minutes));
  return { h: Math.floor(t / 60), m: t % 60 };
};

/** "7 h 35 min", "45 min", "8 h" */
export const fmtDuration = (minutes) => {
  const { h, m } = hm(minutes);
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
};

/** 7.5 → "7,5 h" */
export const fmtHours = (hours) => `${String(Math.round(hours * 10) / 10).replace('.', ',')} h`;

const weekday = (key) => keyToDate(key).toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '');

/** Título de la noche que terminó en `key`. */
export const nightTitle = (key, todayKey) => {
  if (key === todayKey) return 'Anoche';
  if (key === addDaysToKey(todayKey, -1)) return 'Antenoche';
  return `Noche del ${weekday(addDaysToKey(key, -1))} al ${weekday(key)} ${keyToDate(key).getDate()}`;
};

/** Duración grande con unidades chicas: 7 h 35 min */
export function Duration({ minutes, className = '', unitClassName = 'text-[0.45em] font-semibold text-ink-500 ml-0.5 mr-1.5' }) {
  const { h, m } = hm(minutes);
  return (
    <span className={`num-display whitespace-nowrap ${className}`}>
      {h > 0 && (
        <>
          {h}
          <span className={unitClassName}>h</span>
        </>
      )}
      {String(m).padStart(h > 0 ? 2 : 1, '0')}
      <span className={unitClassName.replace('mr-1.5', '')}>min</span>
    </span>
  );
}
