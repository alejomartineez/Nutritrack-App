import React, { useMemo, useState } from 'react';
import { Pencil, Trash2, Zap } from 'lucide-react';
import { Sheet, Button, ListGroup, ListRow } from '../ui';
import { dateKeyOf, addDaysToKey, formatDisplayDate, keyToDate } from '../lib/dates';
import { setTypeInfo, isTimed } from './workoutData';
import { summarizeSession, num } from './workoutStats';
import { formatVolume, formatMinutes, fmtNum, plural } from './format';

/** Detalle de un entreno guardado, con editar y borrar. */
export function SessionDetailSheet({ session, exercisesById, onEdit, onDelete, onOpenExercise, onClose }) {
  const summary = useMemo(() => summarizeSession(session, exercisesById), [session, exercisesById]);
  const meta = [formatDisplayDate(keyToDate(session.date)), summary.durationMin && formatMinutes(summary.durationMin), formatVolume(summary.volume)].filter(Boolean).join(' · ');

  return (
    <Sheet
      onClose={onClose}
      title={session.dayName || 'Entreno'}
      subtitle={meta}
      size="large"
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button variant="soft" tone="red" icon={Trash2} onClick={onDelete}>
            Borrar
          </Button>
          <Button tone="entreno" icon={Pencil} onClick={onEdit}>
            Editar
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {session.exercises
          .filter((ex) => ex.sets.some((s) => s.completed))
          .map((ex) => {
            const exercise = exercisesById[ex.exerciseId];
            const timed = isTimed(exercise);
            let n = 0;
            return (
              <section key={ex.id} className="surface rounded-2xl px-4 py-3">
                <button onClick={() => onOpenExercise(ex.exerciseId)} className="text-left" style={{ transform: 'none' }}>
                  <h3 className="text-[15px] font-semibold text-entreno-400">{exercise?.name || 'Ejercicio'}</h3>
                </button>
                {ex.notes && <p className="text-xs text-ink-500 mt-0.5">{ex.notes}</p>}
                <ol className="mt-2 space-y-1">
                  {ex.sets
                    .filter((s) => s.completed)
                    .map((s) => {
                      const info = setTypeInfo(s.type);
                      if (s.type !== 'warmup') n++;
                      const w = num(s.weight);
                      return (
                        <li key={s.id} className="flex items-center gap-3 text-sm num">
                          <span className={`w-6 text-center font-semibold ${info.short ? 'text-entreno-300' : 'text-ink-500'}`}>{info.short || n}</span>
                          <span className="text-ink-200">
                            {w > 0 ? `${fmtNum(w)} kg × ${num(s.reps)}` : `${num(s.reps)} ${timed ? 's' : 'reps'}`}
                          </span>
                          {s.rir !== '' && s.rir != null && <span className="text-xs text-ink-500">RIR {s.rir}</span>}
                        </li>
                      );
                    })}
                </ol>
              </section>
            );
          })}
        {summary.effectiveSets === 0 && <p className="text-sm text-ink-500 text-center py-6">Este entreno no tiene series registradas.</p>}
      </div>
    </Sheet>
  );
}

/** Cargar un entreno que no se registró en el momento. */
export function LogPastSheet({ routine, onCreate, onClose }) {
  const today = dateKeyOf();
  const [date, setDate] = useState(addDaysToKey(today, -1));
  const days = routine ? routine.days.filter((d) => !d.isRest && d.exercises?.length) : [];

  return (
    <Sheet onClose={onClose} title="Registrar entreno pasado">
      <label className="block">
        <span className="block text-xs font-medium text-ink-500 mb-1.5 px-1">Fecha</span>
        <input type="date" value={date} max={today} onChange={(e) => e.target.value && e.target.value <= today && setDate(e.target.value)} className="field num" />
      </label>
      <ListGroup title="¿Qué hiciste?" className="mt-5">
        {days.map((d) => (
          <ListRow key={d.id} title={d.name} subtitle={plural(d.exercises.length, 'ejercicio', 'ejercicios')} chevron onClick={() => onCreate(date, d)} />
        ))}
        <ListRow icon={Zap} iconTone="entreno" title="Entreno libre" subtitle="Elegís los ejercicios" chevron onClick={() => onCreate(date, null)} />
      </ListGroup>
    </Sheet>
  );
}
