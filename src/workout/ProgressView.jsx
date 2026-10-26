import React, { useMemo, useState } from 'react';
import { BarChart3, Plus, Trophy, History } from 'lucide-react';
import { Card, Button, EmptyState, ListGroup, ListRow, SectionTitle, Stat } from '../ui';
import { dateKeyOf, formatShortDate, formatDisplayDate, keyToDate } from '../lib/dates';
import { MUSCLE_GROUPS, WEEKLY_SETS_TARGET } from './workoutData';
import {
  finishedSessions,
  summarizeSession,
  computeWeeklyVolumeHistory,
  computeVolumeTrend,
  computeWeeklySetsByMuscle,
  computeRecordsList,
  weekStartKey,
} from './workoutStats';
import { formatVolume, plural } from './format';

function VolumeBars({ weeks }) {
  const max = Math.max(1, ...weeks.map((w) => w.volume));
  return (
    <div>
      <div className="flex items-end gap-2 h-28" role="img" aria-label={`Volumen semanal: ${weeks.map((w) => formatVolume(w.volume)).join(', ')}`}>
        {weeks.map((w, i) => {
          const current = i === weeks.length - 1;
          const h = w.volume > 0 ? Math.max(4, (w.volume / max) * 85) : 0;
          return (
            <div key={w.weekStart} className="flex-1 h-full flex flex-col justify-end items-center">
              {current && w.volume > 0 && <span className="text-[11px] num font-semibold text-entreno-300 mb-1 whitespace-nowrap">{formatVolume(w.volume)}</span>}
              <div
                className={`w-full rounded-md transition-[height] duration-700 ${current ? 'bg-entreno-500' : 'bg-entreno-500/30'}`}
                style={{ height: `${h}%`, minHeight: w.volume > 0 ? 4 : 0 }}
              />
              {w.volume === 0 && <div className="w-full h-1 rounded-full bg-ink-700" />}
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 mt-2">
        {weeks.map((w, i) => (
          <span key={w.weekStart} className="flex-1 text-center text-[10px] text-ink-500 num whitespace-nowrap">
            {(weeks.length - 1 - i) % 2 === 0 ? (i === weeks.length - 1 ? 'Esta' : formatShortDate(w.weekStart)) : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

function MuscleSets({ perMuscle }) {
  const SCALE = 24;
  const rows = MUSCLE_GROUPS.filter((g) => perMuscle[g]).map((g) => [g, perMuscle[g]]);
  if (!rows.length) return <p className="text-sm text-ink-500">Todavía no entrenaste esta semana.</p>;
  const left = (WEEKLY_SETS_TARGET.min / SCALE) * 100;
  const width = ((WEEKLY_SETS_TARGET.max - WEEKLY_SETS_TARGET.min) / SCALE) * 100;
  return (
    <div className="space-y-3">
      {rows.map(([group, n]) => {
        const inRange = n >= WEEKLY_SETS_TARGET.min && n <= WEEKLY_SETS_TARGET.max;
        return (
          <div key={group} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-3">
            <span className="text-sm text-ink-200 truncate">{group}</span>
            <div className="relative h-2.5 rounded-full bg-ink-700 overflow-hidden">
              <span className="absolute inset-y-0 bg-ink-600/60" style={{ left: `${left}%`, width: `${width}%` }} aria-hidden="true" />
              <span
                className={`absolute inset-y-0 left-0 rounded-full ${inRange ? 'bg-entreno-500' : 'bg-entreno-500/50'}`}
                style={{ width: `${Math.min(100, (n / SCALE) * 100)}%` }}
              />
            </div>
            <span className={`num text-sm text-right font-semibold ${inRange ? 'text-entreno-300' : 'text-ink-400'}`}>{n}</span>
          </div>
        );
      })}
      <p className="text-xs text-ink-500 pt-1">
        La franja gris marca {WEEKLY_SETS_TARGET.min}–{WEEKLY_SETS_TARGET.max} series efectivas por semana, el rango que más suele servir para crecer.
      </p>
    </div>
  );
}

export default function ProgressView({ sessionsMap, exercisesById, routine, onOpenSession, onOpenExercise, onLogPast }) {
  const [shown, setShown] = useState(10);
  const [allRecords, setAllRecords] = useState(false);
  const today = dateKeyOf();

  const sessions = useMemo(() => finishedSessions(sessionsMap), [sessionsMap]);
  const weeks = useMemo(() => computeWeeklyVolumeHistory(sessionsMap, 8, today), [sessionsMap, today]);
  const trend = useMemo(() => computeVolumeTrend(sessionsMap, today), [sessionsMap, today]);
  const perMuscle = useMemo(() => computeWeeklySetsByMuscle(sessionsMap, exercisesById, today), [sessionsMap, exercisesById, today]);
  const records = useMemo(() => computeRecordsList(sessionsMap, exercisesById), [sessionsMap, exercisesById]);

  if (!sessions.length) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Todavía no hay entrenos"
        text="Cuando termines el primero vas a ver acá tu volumen, las series por músculo, tus récords y el historial."
        action={
          <Button variant="soft" tone="entreno" icon={Plus} onClick={onLogPast}>
            Registrar un entreno pasado
          </Button>
        }
        className="mt-2"
      />
    );
  }

  const thisWeek = weeks[weeks.length - 1];
  const planned = routine ? routine.days.filter((d) => !d.isRest).length : 0;
  const weekStart = weekStartKey(today);
  const daysTrained = new Set(sessions.filter((s) => s.date >= weekStart).map((s) => s.date)).size;
  const delta = trend.pctChange;

  return (
    <div className="space-y-7 pt-1">
      <Card className="grid grid-cols-3 gap-3">
        <Stat label="Entrenos" value={planned ? `${daysTrained}/${planned}` : daysTrained} sub="esta semana" />
        <Stat label="Series" value={thisWeek.sets} sub="efectivas" />
        <Stat
          label="Volumen"
          value={formatVolume(thisWeek.volume)}
          sub={delta == null ? 'esta semana' : `${delta > 0 ? '+' : ''}${delta}% vs. sem. ant.`}
        />
      </Card>

      <section>
        <SectionTitle>Volumen por semana</SectionTitle>
        <Card>
          <VolumeBars weeks={weeks} />
        </Card>
      </section>

      <section>
        <SectionTitle>Series por músculo · esta semana</SectionTitle>
        <Card>
          <MuscleSets perMuscle={perMuscle} />
        </Card>
      </section>

      {records.length > 0 && (
        <section>
          <SectionTitle
            action={
              records.length > 6 && (
                <button onClick={() => setAllRecords((v) => !v)} className="text-[13px] font-semibold text-entreno-400">
                  {allRecords ? 'Ver menos' : `Ver todos (${records.length})`}
                </button>
              )
            }
          >
            Récords
          </SectionTitle>
          <ListGroup>
            {(allRecords ? records : records.slice(0, 6)).map((r) => (
              <ListRow
                key={r.exerciseId}
                icon={Trophy}
                iconTone="entreno"
                title={r.exerciseName}
                subtitle={r.date ? formatDisplayDate(keyToDate(r.date)) : undefined}
                value={r.label}
                onClick={() => onOpenExercise(r.exerciseId)}
              />
            ))}
          </ListGroup>
        </section>
      )}

      <section>
        <SectionTitle
          action={
            <button onClick={onLogPast} className="text-[13px] font-semibold text-entreno-400 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> Registrar pasado
            </button>
          }
        >
          Historial
        </SectionTitle>
        <ListGroup footer={sessions.length > shown ? undefined : plural(sessions.length, 'entreno en total', 'entrenos en total')}>
          {sessions.slice(0, shown).map((s) => {
            const sum = summarizeSession(s, exercisesById);
            return (
              <ListRow
                key={s.id}
                icon={History}
                iconTone="ink"
                title={s.dayName || 'Entreno'}
                subtitle={`${formatDisplayDate(keyToDate(s.date))} · ${plural(sum.effectiveSets, 'serie', 'series')} · ${formatVolume(sum.volume)}`}
                chevron
                onClick={() => onOpenSession(s)}
              />
            );
          })}
        </ListGroup>
        {sessions.length > shown && (
          <Button variant="ghost" tone="entreno" block className="mt-2" onClick={() => setShown((n) => n + 20)}>
            Ver más
          </Button>
        )}
      </section>
    </div>
  );
}
