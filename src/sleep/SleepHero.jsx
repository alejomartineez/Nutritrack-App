import React from 'react';
import { Moon, MoonStar, Pencil, Sun } from 'lucide-react';
import { Card, Button, Ring } from '../ui';
import { energyOf } from './sleepData';
import { EnergyPicker } from './SleepLogSheet';
import { Duration } from './sleepFormat';
import { scoreColor } from './SleepSheets';

const Times = ({ bedtime, wakeTime }) => (
  <p className="flex items-center gap-1.5 text-sm text-ink-400 num">
    <Moon className="w-3.5 h-3.5 text-sueno-400" /> {bedtime}
    <span className="text-ink-600 mx-0.5">→</span>
    <Sun className="w-3.5 h-3.5 text-amber-400" /> {wakeTime}
  </p>
);

export function SleepingHero({ pending, now, onWake, onCancel }) {
  const elapsed = Math.max(0, (now.getTime() - pending.startedAt) / 60000);
  return (
    <Card padded={false} className="surface-accent-sueno p-5">
      <p className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-sueno-300">
        <span className="w-2 h-2 rounded-full bg-sueno-400 motion-safe:animate-pulse" /> Durmiendo
      </p>
      <Duration minutes={elapsed} className="block text-[3.25rem] leading-[3.75rem] text-ink-50 mt-2" />
      <p className="text-sm text-ink-400">
        en la cama desde las <span className="num text-ink-200">{pending.bedtime}</span>
      </p>
      <Button tone="sueno" size="lg" block icon={Sun} className="mt-5" onClick={onWake}>
        Me desperté
      </Button>
      <Button variant="ghost" tone="ink" size="sm" block className="mt-1.5 text-ink-500" onClick={onCancel}>
        Cancelar
      </Button>
    </Card>
  );
}

export function LastNightHero({ night, score, evening, onScore, onEdit, onRate, onBed }) {
  const energy = energyOf(night.quality);
  return (
    <Card padded={false} className="surface-accent-sueno p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-sueno-300">Anoche</p>
          <Duration minutes={night.minutes} className="block text-[3.25rem] leading-[3.75rem] text-ink-50 mt-1" />
          {night.bedtime && night.wakeTime && <Times bedtime={night.bedtime} wakeTime={night.wakeTime} />}
          {energy && (
            <p className="mt-2 text-sm text-ink-300">
              {energy.emoji} {energy.label}
            </p>
          )}
        </div>
        <button type="button" onClick={onScore} aria-label={`Puntaje ${score.score}: ver detalle`} className="shrink-0 -mr-1">
          <Ring value={score.score} max={100} size={96} stroke={9} color={scoreColor(score.score)}>
            <span className="num-display text-[1.9rem] leading-none text-ink-50">{score.score}</span>
            <span className="text-[11px] font-semibold text-ink-500 mt-0.5">{score.label}</span>
          </Ring>
        </button>
      </div>

      {!energy && (
        <div className="mt-4 pt-4 border-t hairline">
          <p className="text-[13px] font-medium text-ink-400 mb-2">¿Cómo te levantaste?</p>
          <EnergyPicker value={null} onChange={(q) => q && onRate(q)} />
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <Button variant="soft" tone="ink" size="sm" icon={Pencil} onClick={onEdit}>
          Editar
        </Button>
        {evening && (
          <Button tone="sueno" size="sm" icon={MoonStar} className="ml-auto" onClick={onBed}>
            Me voy a dormir
          </Button>
        )}
      </div>
    </Card>
  );
}

export function LogPromptHero({ evening, firstTime, defaults, onLog, onBed }) {
  return (
    <Card padded={false} className="surface-accent-sueno p-5">
      <span className="w-12 h-12 rounded-2xl bg-sueno-500/15 text-sueno-300 flex items-center justify-center">
        <MoonStar className="w-6 h-6" />
      </span>
      <h2 className="text-xl font-bold text-ink-50 mt-3">{evening ? 'Hora de ir bajando' : firstTime ? 'Tu primera noche' : '¿Cómo dormiste?'}</h2>
      <p className="text-sm text-ink-400 mt-1 leading-snug">
        {evening
          ? 'Tocá «Me voy a dormir» al acostarte. Mañana solo tocás «Me desperté» y queda registrado.'
          : firstTime
          ? 'Contame a qué hora te acostaste y te levantaste. Lleva 10 segundos.'
          : `Ya viene cargado tu horario habitual: ${defaults.bedtime} → ${defaults.wakeTime}.`}
      </p>
      {evening ? (
        <>
          <Button tone="sueno" size="lg" block icon={MoonStar} className="mt-5" onClick={onBed}>
            Me voy a dormir
          </Button>
          <Button variant="ghost" tone="sueno" size="sm" block className="mt-1.5" onClick={onLog}>
            Registrar anoche
          </Button>
        </>
      ) : (
        <>
          <Button tone="sueno" size="lg" block className="mt-5" onClick={onLog}>
            Registrar anoche
          </Button>
          {firstTime && (
            <p className="text-xs text-ink-500 text-center mt-3 leading-snug">
              Tip: a la noche tocá «Me voy a dormir» y a la mañana «Me desperté».
            </p>
          )}
        </>
      )}
    </Card>
  );
}
