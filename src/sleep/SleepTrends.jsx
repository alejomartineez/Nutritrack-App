import React from 'react';
import { CalendarRange, Lock, MoonStar, Sparkles } from 'lucide-react';
import { Card, ProgressBar } from '../ui';
import { keyToDate, mondayIndex, WEEKDAY_INITIALS } from '../lib/dates';
import { Duration, fmtDuration, fmtHours, nightTitle } from './sleepFormat';

const CHART_H = 132;

/** Barras por noche con la meta como línea punteada. Tocar una noche la abre. */
export function NightsChart({ series, summary, goalHours, todayKey, onSelect }) {
  const dense = series.length > 10;
  const goal = goalHours * 60;
  const top = Math.max(goal * 1.2, ...series.map((s) => s.minutes * 1.15));
  const px = (minutes) => (minutes / top) * CHART_H;

  return (
    <Card className="p-4 pb-3">
      <div className="flex items-end justify-between gap-3 mb-5">
        <div className="min-w-0">
          <p className="text-xs text-ink-500">Promedio</p>
          {summary.nights ? (
            <Duration minutes={summary.avgHours * 60} className="text-[1.75rem] leading-9 text-ink-50" />
          ) : (
            <p className="num-display text-[1.75rem] leading-9 text-ink-600">—</p>
          )}
        </div>
        <div className="text-right text-xs text-ink-500 leading-relaxed">
          <p>
            <span className="num text-ink-300">{summary.nights}</span> de {series.length} noches
          </p>
          <p className="flex items-center justify-end gap-1.5">
            <span className="inline-block w-4 border-t border-dashed border-ink-500" /> meta {fmtHours(goalHours)}
          </p>
        </div>
      </div>

      <div className="relative" style={{ height: CHART_H }}>
        <div className="absolute inset-x-0 border-t border-dashed border-ink-500/60 pointer-events-none" style={{ bottom: px(goal) }} />
        <div className={`absolute inset-0 flex items-end ${dense ? 'gap-[3px]' : 'gap-2'}`}>
          {series.map((s) => {
            const met = s.minutes >= goal - 10;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => onSelect(s.key)}
                aria-label={`${nightTitle(s.key, todayKey)}: ${s.minutes ? fmtDuration(s.minutes) : 'sin registro'}`}
                className="relative flex-1 h-full flex items-end justify-center"
                style={{ transform: 'none' }}
              >
                {s.minutes > 0 ? (
                  <span
                    className={`relative w-full ${dense ? 'rounded-[3px]' : 'rounded-lg max-w-[2rem]'} ${met ? 'bg-sueno-400' : 'bg-sueno-400/40'}`}
                    style={{ height: Math.max(4, px(s.minutes)), transition: 'height 0.6s cubic-bezier(0.16,1,0.3,1)' }}
                  >
                    {!dense && (
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 num text-[11px] text-ink-400 whitespace-nowrap">
                        {String(Math.round(s.minutes / 6) / 10).replace('.', ',')}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-ink-600 mb-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`flex mt-2 ${dense ? 'gap-[3px]' : 'gap-2'}`}>
        {series.map((s, i) => {
          const d = keyToDate(s.key);
          const isToday = s.key === todayKey;
          const label = dense ? ((series.length - 1 - i) % 7 === 0 ? d.getDate() : '') : WEEKDAY_INITIALS[mondayIndex(d)];
          return (
            <span key={s.key} className={`flex-1 text-center text-[11px] num ${isToday ? 'text-sueno-400 font-bold' : 'text-ink-500'}`}>
              {label}
            </span>
          );
        })}
      </div>
    </Card>
  );
}

function Tile({ label, value, sub, tone = 'text-ink-50', className = '' }) {
  return (
    <Card className={className}>
      <p className="text-xs text-ink-500">{label}</p>
      <p className={`num-display text-[1.75rem] leading-9 mt-0.5 ${tone}`}>{value}</p>
      {sub && <p className="text-xs text-ink-500 mt-0.5 leading-snug">{sub}</p>}
    </Card>
  );
}

export function RhythmCards({ debt, consistency, suggestion, goalHours }) {
  const surplus = debt.debtHours <= 0;
  return (
    <div className="space-y-3">
      {suggestion && (
        <Card className="flex items-center gap-4">
          <span className="w-12 h-12 rounded-2xl bg-sueno-500/15 text-sueno-300 flex items-center justify-center shrink-0">
            <MoonStar className="w-6 h-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ink-500">Hora ideal para acostarte</p>
            <p className="num-display text-[1.75rem] leading-9 text-ink-50">{suggestion.bedtime}</p>
            <p className="text-xs text-ink-500 leading-snug">
              Para levantarte a las {suggestion.wakeTime} con {fmtHours(goalHours)} de sueño
              {suggestion.fallAsleep > 0 ? ` (tardás ~${suggestion.fallAsleep} min en dormirte)` : ''}.
            </p>
          </div>
        </Card>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Tile
          label="Deuda de sueño"
          value={surplus ? (debt.debtHours < 0 ? `+${fmtHours(-debt.debtHours)}` : '0 h') : fmtHours(debt.debtHours)}
          tone={surplus ? 'text-brand-400' : debt.debtHours > 4 ? 'text-amber-400' : 'text-ink-50'}
          sub={surplus ? (debt.debtHours < 0 ? 'a favor, sin deuda' : 'sin deuda') : 'por debajo de tu meta'}
        />
        <Tile
          label="Constancia"
          value={consistency.stdDevMin == null ? '—' : `±${consistency.stdDevMin} min`}
          tone={consistency.stdDevMin != null && consistency.stdDevMin > 75 ? 'text-amber-400' : 'text-ink-50'}
          sub={consistency.label ? `${consistency.label} al acostarte` : 'Hacen falta 3 noches'}
        />
      </div>
      <p className="text-xs text-ink-500 leading-snug px-1">
        Últimas {debt.days} noches: registraste {debt.nights}. Las noches sin registrar no suman ni restan.
      </p>
    </div>
  );
}

function Locked({ text, have, need }) {
  return (
    <div className="mt-2">
      <p className="flex items-start gap-2 text-sm text-ink-400 leading-snug">
        <Lock className="w-3.5 h-3.5 shrink-0 mt-1" /> {text}
      </p>
      <div className="flex items-center gap-3 mt-3">
        <ProgressBar value={Math.min(have, need)} max={need} color="rgb(var(--sueno-400))" height={4} />
        <span className="num text-xs text-ink-500 shrink-0">
          {Math.min(have, need)} de {need}
        </span>
      </div>
    </div>
  );
}

const signedDuration = (minutes) => `${minutes > 0 ? '+' : '−'}${fmtDuration(Math.abs(minutes))}`;
const signedNumber = (n) => `${n > 0 ? '+' : '−'}${String(Math.abs(n)).replace('.', ',')}`;

export function Patterns({ factors, jetlag }) {
  return (
    <div className="space-y-3">
      <Card>
        <p className="flex items-center gap-2 text-[15px] font-semibold text-ink-100">
          <Sparkles className="w-4 h-4 text-sueno-400" /> Qué cambia tu sueño
        </p>
        {factors.checked === 0 ? (
          <Locked
            text={`Marcá lo que pasó ayer al registrar (cafeína, pantallas, estrés…). Cuando algo aparezca en ${factors.needed} noches y falte en otras ${factors.needed}, te muestro su efecto.`}
            have={factors.progress}
            need={factors.needed}
          />
        ) : factors.notable.length === 0 ? (
          <p className="text-sm text-ink-400 leading-snug mt-2">
            Por ahora nada de lo que marcaste mueve tu sueño más de 15 minutos. Tu descanso depende más del horario que de
            esos factores.
          </p>
        ) : (
          <div className="mt-3 -mx-4 divide-y divide-[var(--hairline)]">
            {factors.notable.slice(0, 4).map((f) => (
              <div key={f.id} className="px-4 py-2.5 flex items-center gap-3">
                <span className="text-xl w-7 text-center shrink-0">{f.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] text-ink-100 truncate">{f.label}</p>
                  <p className="text-xs text-ink-500">
                    {f.nightsWith} noches con, {f.nightsWithout} sin
                    {f.qualityDiff ? ` · energía ${signedNumber(f.qualityDiff)}` : ''}
                  </p>
                </div>
                <span className={`num text-sm font-semibold shrink-0 ${f.minutesDiff < 0 ? 'text-amber-400' : 'text-brand-400'}`}>
                  {f.minutesDiff === 0 ? '= horas' : signedDuration(f.minutesDiff)}
                </span>
              </div>
            ))}
          </div>
        )}
        {factors.notable.length > 0 && (
          <p className="text-xs text-ink-500 leading-snug mt-2">Promedios de tus últimos 90 días. Muestran una asociación, no la causa.</p>
        )}
      </Card>

      <Card>
        <p className="flex items-center gap-2 text-[15px] font-semibold text-ink-100">
          <CalendarRange className="w-4 h-4 text-sueno-400" /> Fines de semana
        </p>
        {!jetlag.ready ? (
          <Locked
            text="Comparo el punto medio de tu sueño entre semana y el finde. Necesito 3 noches de semana y 2 de finde en las últimas 4 semanas."
            have={Math.min(jetlag.weekdayNights, 3) + Math.min(jetlag.weekendNights, 2)}
            need={5}
          />
        ) : Math.abs(jetlag.shiftMinutes) < 30 ? (
          <p className="text-sm text-ink-300 leading-snug mt-2">
            Dormís en el mismo horario toda la semana (diferencia de {fmtDuration(Math.abs(jetlag.shiftMinutes))}). Eso ayuda
            mucho a descansar bien.
          </p>
        ) : (
          <p className="text-sm text-ink-300 leading-snug mt-2">
            El finde tu sueño se corre{' '}
            <span className={`font-semibold ${Math.abs(jetlag.shiftMinutes) >= 60 ? 'text-amber-400' : 'text-ink-100'}`}>
              {fmtDuration(Math.abs(jetlag.shiftMinutes))} {jetlag.shiftMinutes > 0 ? 'más tarde' : 'más temprano'}
            </span>
            .{' '}
            {Math.abs(jetlag.shiftMinutes) >= 60
              ? 'Más de una hora es «jet lag social»: el lunes el cuerpo lo siente como un cambio de huso horario.'
              : 'Mientras quede debajo de una hora, el cuerpo lo acompaña bien.'}
          </p>
        )}
      </Card>
    </div>
  );
}
