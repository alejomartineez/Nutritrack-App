import React, { useMemo, useState } from 'react';
import { Play, Check, Moon, Dumbbell, Zap, CalendarDays, ChevronRight } from 'lucide-react';
import { Button, Card, Sheet, ListGroup, ListRow, Stat, SectionTitle } from '../ui';
import { formatLongDate, formatDisplayDate, keyToDate, WEEKDAY_INITIALS } from '../lib/dates';
import { summarizeSession } from './workoutStats';
import { countWorkSets } from './workoutStorage';
import { formatVolume, formatMinutes, plural } from './format';

function WeekStrip({ plan }) {
  const planned = plan.filter((d) => !d.isRest).length;
  const trained = plan.filter((d) => d.trained).length;
  return (
    <section>
      <SectionTitle
        action={
          <span className="text-[13px] text-ink-500 num">
            {trained}
            {planned > 0 ? ` de ${planned}` : ''} {trained === 1 && !planned ? 'entreno' : 'entrenos'}
          </span>
        }
      >
        Esta semana
      </SectionTitle>
      <Card className="flex justify-between px-3">
        {plan.map((d) => {
          const state = d.trained ? 'done' : d.isToday ? 'today' : d.isRest ? 'rest' : d.isPast ? 'missed' : 'next';
          return (
            <div key={d.key} className="flex flex-col items-center gap-2 w-9" aria-label={`${d.weekday}: ${d.trained ? 'entrenado' : d.isRest ? 'descanso' : d.day?.name || ''}`}>
              <span className={`text-[11px] font-semibold ${d.isToday ? 'text-entreno-400' : 'text-ink-500'}`}>{WEEKDAY_INITIALS[d.index]}</span>
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  {
                    done: 'bg-entreno-500 text-onaccent',
                    today: 'ring-2 ring-entreno-500 ring-inset',
                    rest: '',
                    missed: 'bg-ink-700/50',
                    next: 'ring-1 ring-ink-600 ring-inset',
                  }[state]
                }`}
              >
                {state === 'done' && <Check className="w-4 h-4" strokeWidth={3} />}
                {state === 'rest' && <span className="w-2.5 h-[3px] rounded-full bg-ink-600" />}
              </span>
            </div>
          );
        })}
      </Card>
    </section>
  );
}

function DayChooser({ routine, onPick, onClose }) {
  const days = routine.days.filter((d) => !d.isRest && d.exercises?.length);
  return (
    <Sheet onClose={onClose} title="¿Qué entrenás?">
      <ListGroup>
        {days.map((d) => (
          <ListRow key={d.id} title={d.name} subtitle={`${d.weekday} · ${plural(d.exercises.length, 'ejercicio', 'ejercicios')}`} chevron onClick={() => onPick(d)} />
        ))}
      </ListGroup>
      {days.length === 0 && <p className="text-sm text-ink-500 px-1">Tu rutina no tiene días con ejercicios todavía.</p>}
    </Sheet>
  );
}

export default function TodayView({ routine, todayDay, todaySessions, activeSession, weekPlan, lastSession, exercisesById, onStart, onStartFree, onResume, onGoRoutine, onEditDay, onOpenSession }) {
  const [chooser, setChooser] = useState(false);
  const todaySummary = useMemo(() => {
    if (!todaySessions.length) return null;
    const parts = todaySessions.map((s) => summarizeSession(s, exercisesById));
    return {
      sets: parts.reduce((a, p) => a + p.effectiveSets, 0),
      volume: parts.reduce((a, p) => a + p.volume, 0),
      minutes: parts.reduce((a, p) => a + (p.durationMin || 0), 0),
    };
  }, [todaySessions, exercisesById]);
  const today = formatLongDate(new Date());

  const secondary = (
    <div className="grid grid-cols-2 gap-2 mt-3">
      <Button variant="soft" tone="ink" icon={Zap} onClick={onStartFree}>
        Entreno libre
      </Button>
      <Button variant="soft" tone="ink" icon={CalendarDays} onClick={routine ? () => setChooser(true) : onGoRoutine}>
        {routine ? 'Otro día' : 'Rutinas'}
      </Button>
    </div>
  );

  let hero;
  if (activeSession) {
    const done = countWorkSets(activeSession);
    const mins = Math.max(0, Math.round((Date.now() - activeSession.startedAt) / 60000));
    hero = (
      <Card className="surface-accent surface-accent-entreno p-5">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-entreno-400">En curso</p>
        <h2 className="text-2xl font-bold text-ink-50 mt-1 truncate">{activeSession.dayName}</h2>
        <p className="text-sm text-ink-400 mt-0.5 num">
          {formatMinutes(mins)} · {plural(done, 'serie', 'series')}
        </p>
        <Button block size="lg" tone="entreno" icon={Play} className="mt-5" onClick={onResume}>
          Continuar entreno
        </Button>
      </Card>
    );
  } else if (todaySummary) {
    hero = (
      <>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-full bg-entreno-500 text-onaccent flex items-center justify-center shrink-0">
              <Check className="w-6 h-6" strokeWidth={3} />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-ink-50">Entrenaste hoy</h2>
              <p className="text-sm text-ink-500 truncate">{todaySessions.map((s) => s.dayName).join(' + ')}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t hairline">
            <Stat label="Series" value={todaySummary.sets} />
            <Stat label="Volumen" value={formatVolume(todaySummary.volume)} />
            <Stat label="Duración" value={todaySummary.minutes} unit="min" />
          </div>
        </Card>
        {secondary}
      </>
    );
  } else if (!routine) {
    hero = (
      <Card className="surface-accent surface-accent-entreno p-6 text-center">
        <span className="inline-flex w-14 h-14 rounded-2xl bg-entreno-500/15 text-entreno-400 items-center justify-center">
          <Dumbbell className="w-7 h-7" />
        </span>
        <h2 className="text-xl font-bold text-ink-50 mt-4">Empezá a entrenar</h2>
        <p className="text-sm text-ink-400 mt-1 leading-snug">Elegí una rutina lista (se arma en dos toques) o arrancá un entreno libre ahora.</p>
        <Button block size="lg" tone="entreno" className="mt-5" onClick={onGoRoutine}>
          Elegir una rutina
        </Button>
        <Button block variant="ghost" tone="entreno" icon={Zap} className="mt-1" onClick={onStartFree}>
          Entreno libre
        </Button>
      </Card>
    );
  } else if (!todayDay || todayDay.isRest) {
    hero = (
      <>
        <Card className="p-5">
          <span className="inline-flex w-11 h-11 rounded-full bg-ink-700/70 text-ink-300 items-center justify-center">
            <Moon className="w-5 h-5" />
          </span>
          <h2 className="text-xl font-bold text-ink-50 mt-3">Hoy toca descanso</h2>
          <p className="text-sm text-ink-400 mt-1 leading-snug">El músculo crece entre sesiones. Si igual tenés ganas, elegí un día o hacé un entreno libre.</p>
        </Card>
        {secondary}
      </>
    );
  } else {
    const list = todayDay.exercises || [];
    hero = (
      <>
        <Card className="surface-accent surface-accent-entreno p-5">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-entreno-400">Hoy te toca</p>
          <h2 className="text-[28px] leading-tight font-bold text-ink-50 mt-1">{todayDay.name}</h2>
          {list.length > 0 ? (
            <>
              <ul className="mt-4 space-y-2">
                {list.slice(0, 5).map((rex) => (
                  <li key={rex.id} className="flex items-baseline justify-between gap-3 text-[15px]">
                    <span className="text-ink-200 truncate">{exercisesById[rex.exerciseId]?.name || 'Ejercicio'}</span>
                    <span className="text-ink-500 num text-sm shrink-0">
                      {rex.targetSets} × {rex.targetRepsMin}–{rex.targetRepsMax}
                    </span>
                  </li>
                ))}
              </ul>
              {list.length > 5 && <p className="text-sm text-ink-500 mt-2">y {plural(list.length - 5, 'ejercicio más', 'ejercicios más')}</p>}
              <Button block size="lg" tone="entreno" icon={Play} className="mt-5" onClick={() => onStart(todayDay)}>
                Empezar
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-ink-400 mt-1">Este día todavía no tiene ejercicios.</p>
              <Button block size="lg" tone="entreno" className="mt-5" onClick={() => onEditDay(todayDay)}>
                Armar el día
              </Button>
            </>
          )}
        </Card>
        {secondary}
      </>
    );
  }

  return (
    <div className="space-y-7 pt-1">
      <div>
        <p className="text-sm text-ink-500 px-1 mb-2 first-letter:uppercase">{today}</p>
        {hero}
      </div>

      <WeekStrip plan={weekPlan} />

      {lastSession && !todaySessions.some((s) => s.id === lastSession.id) && (
        <ListGroup title="Último entreno">
          <ListRow
            title={lastSession.dayName || 'Entreno'}
            subtitle={`${formatDisplayDate(keyToDate(lastSession.date))} · ${plural(summarizeSession(lastSession).effectiveSets, 'serie', 'series')} · ${formatVolume(summarizeSession(lastSession).volume)}`}
            right={<ChevronRight className="w-4 h-4 text-ink-600 shrink-0" />}
            onClick={() => onOpenSession(lastSession)}
          />
        </ListGroup>
      )}

      {chooser && routine && (
        <DayChooser
          routine={routine}
          onClose={() => setChooser(false)}
          onPick={(d) => {
            setChooser(false);
            onStart(d);
          }}
        />
      )}
    </div>
  );
}
