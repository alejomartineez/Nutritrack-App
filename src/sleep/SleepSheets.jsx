import React from 'react';
import { Sheet, Button, Stepper, Ring, ProgressBar } from '../ui';
import { energyOf, GOAL_MIN_HOURS, GOAL_MAX_HOURS } from './sleepData';
import { EnergyPicker } from './SleepLogSheet';
import { fmtDuration, fmtHours } from './sleepFormat';

export const scoreColor = (score) => (score >= 50 ? 'rgb(var(--sueno-400))' : 'rgb(var(--amber-400))');

const PART_COPY = {
  duration: (p) => ({ label: 'Duración', detail: `${fmtDuration(p.minutes)} de ${fmtHours(p.goalMinutes / 60)}` }),
  timing: (p) => ({
    label: 'Horario',
    detail:
      p.deltaMinutes == null
        ? 'Hacen falta 3 noches previas para comparar'
        : Math.abs(p.deltaMinutes) <= 15
        ? `A tu hora habitual (~${p.usualBedtime})`
        : `${fmtDuration(Math.abs(p.deltaMinutes))} ${p.deltaMinutes > 0 ? 'más tarde' : 'más temprano'} que tu habitual (~${p.usualBedtime})`,
  }),
  energy: (p) => ({
    label: 'Energía al levantarte',
    detail: p.quality == null ? 'Sin registrar' : `${energyOf(p.quality).emoji} ${energyOf(p.quality).label}`,
  }),
  wakes: (p) => ({
    label: 'Despertares',
    detail: p.count === 0 ? 'Ninguno' : p.count >= 3 ? '3 o más' : `${p.count}`,
  }),
};

export function ScoreSheet({ title, result, onClose }) {
  return (
    <Sheet onClose={onClose} title="Puntaje de sueño" subtitle={title}>
      <div className="flex flex-col items-center pt-1 pb-5">
        <Ring value={result.score} max={100} size={132} stroke={11} color={scoreColor(result.score)}>
          <span className="num-display text-[2.75rem] leading-none text-ink-50">{result.score}</span>
          <span className="text-xs font-semibold text-ink-500 mt-1">{result.label}</span>
        </Ring>
      </div>
      <div className="bg-ink-700/50 rounded-2xl divide-y divide-[var(--hairline)]">
        {result.parts.map((p) => {
          const { label, detail } = PART_COPY[p.id](p);
          const off = p.points == null;
          return (
            <div key={p.id} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[15px] text-ink-100">{label}</p>
                <p className="num text-sm text-ink-400 shrink-0">{off ? 'no cuenta' : `${p.points}/${p.max}`}</p>
              </div>
              <p className="text-xs text-ink-500 mt-0.5">{detail}</p>
              {!off && <ProgressBar value={p.points} max={p.max} color="rgb(var(--sueno-400))" height={4} className="mt-2" />}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-ink-500 leading-snug mt-3 px-1">
        Duración contra tu meta (50), hora de acostarte contra tu mediana de las 14 noches previas (20), energía (20) y
        despertares (10). Lo que no registraste no cuenta y el total se reescala.
      </p>
    </Sheet>
  );
}

export function GoalSheet({ goalHours, onChange, onClose }) {
  return (
    <Sheet onClose={onClose} title="Tu meta de sueño">
      <div className="bg-ink-700/50 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
        <span className="text-[15px] text-ink-100">Horas por noche</span>
        <Stepper value={goalHours} onChange={onChange} step={0.5} min={GOAL_MIN_HOURS} max={GOAL_MAX_HOURS} format={fmtHours} tone="sueno" />
      </div>
      <p className="text-xs text-ink-500 leading-snug mt-2 px-1">
        Se usa para el puntaje, la deuda de sueño y la hora sugerida para acostarte. La mayoría de los adultos necesita
        entre 7 y 9 horas.
      </p>
    </Sheet>
  );
}

export function RateSheet({ minutes, bedtime, wakeTime, onRate, onDetails, onClose }) {
  return (
    <Sheet
      onClose={onClose}
      title="¡Buen día!"
      subtitle={`Dormiste ${fmtDuration(minutes)} · ${bedtime} → ${wakeTime}`}
      footer={
        <div className="flex gap-2">
          <Button variant="soft" tone="sueno" size="lg" block onClick={onDetails}>
            Agregar detalles
          </Button>
          <Button variant="ghost" tone="ink" size="lg" onClick={onClose}>
            Listo
          </Button>
        </div>
      }
    >
      <p className="text-[13px] font-semibold text-ink-300 px-1 mb-2">¿Cómo te levantaste?</p>
      <EnergyPicker value={null} onChange={(q) => q && onRate(q)} size="lg" />
    </Sheet>
  );
}
