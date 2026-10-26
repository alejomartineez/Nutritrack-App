import React from 'react';
import { Check, Plus, MoreHorizontal, TrendingUp, Trophy } from 'lucide-react';
import { setTypeInfo, isBodyweight, isTimed } from './workoutData';
import { isBlank, beatsBest, isWorkSet, referenceForSet } from './workoutStats';
import { fmtNum } from './format';

const COLS = 'grid grid-cols-[2rem_minmax(0,1fr)_4.25rem_3.5rem_2.75rem] items-center gap-1.5';

const show = (v) => (isBlank(v) ? '' : fmtNum(v));

function Cell({ value, placeholder, active, buffer, fresh, onClick, label }) {
  const editingText = active ? (buffer !== '' ? buffer : '') : null;
  const text = active ? editingText : value;
  return (
    <button
      type="button"
      data-cell
      aria-label={label}
      onClick={onClick}
      className={`h-10 rounded-[10px] num text-[17px] font-semibold flex items-center justify-center transition-shadow ${
        active ? 'bg-ink-900 ring-2 ring-entreno-500' : 'inset'
      }`}
      style={{ transform: 'none' }}
    >
      {text ? (
        <span className={active && fresh ? 'rounded px-0.5 bg-entreno-500/30 text-ink-50' : 'text-ink-100'}>{text}</span>
      ) : (
        <span className="text-ink-600">{placeholder || (active ? '' : '—')}</span>
      )}
      {active && !fresh && <span className="ml-px w-[2px] h-5 bg-entreno-400 animate-pulse" aria-hidden="true" />}
    </button>
  );
}

export default function ExerciseBlock({
  sex,
  exercise,
  prevEntry,
  best,
  hint,
  editing,
  onOpenCell,
  onCheck,
  onAdopt,
  onSetMenu,
  onAddSet,
  onMenu,
  onHistory,
}) {
  const bodyweight = isBodyweight(exercise);
  const timed = isTimed(exercise);
  const done = sex.sets.filter((s) => s.completed).length;
  const hasTarget = sex.targetRepsMin && sex.targetRepsMax;
  let workN = 0;

  return (
    <section className="surface rounded-3xl overflow-hidden">
      <div className="flex items-start gap-2 pl-4 pr-2 pt-3.5">
        <button type="button" onClick={onHistory} className="flex-1 min-w-0 text-left py-0.5" style={{ transform: 'none' }}>
          <h3 className="text-[17px] font-semibold text-entreno-400 leading-snug">{exercise?.name || 'Ejercicio'}</h3>
          <p className="text-xs text-ink-500 mt-0.5">
            {exercise?.muscleGroup}
            {hasTarget ? ` · ${sex.targetSets || sex.sets.length} × ${sex.targetRepsMin}–${sex.targetRepsMax}${timed ? ' s' : ''}` : ''}
            {done > 0 && ` · ${done}/${sex.sets.length} hechas`}
          </p>
        </button>
        <button type="button" onClick={onMenu} aria-label={`Opciones de ${exercise?.name || 'ejercicio'}`} className="btn-icon w-10 h-10 text-ink-400 shrink-0">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {(hint || sex.notes) && (
        <div className="px-4 pt-1.5 space-y-1.5">
          {hint && (
            <p className="inline-flex items-center gap-1.5 rounded-full bg-entreno-500/12 text-entreno-300 text-xs font-semibold px-2.5 py-1">
              <TrendingUp className="w-3.5 h-3.5" strokeWidth={2.5} />
              {hint.text}
            </p>
          )}
          {sex.notes && <p className="text-[13px] text-ink-400 leading-snug whitespace-pre-wrap">{sex.notes}</p>}
        </div>
      )}

      <div className="px-2.5 pt-2.5">
        <div className={`${COLS} px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-500`}>
          <span className="text-center">Serie</span>
          <span className="pl-1">Anterior</span>
          <span className="text-center">{bodyweight ? '+kg' : 'kg'}</span>
          <span className="text-center">{timed ? 'seg' : 'reps'}</span>
          <span className="sr-only">Hecha</span>
        </div>

        {sex.sets.map((set, i) => {
          const ref = referenceForSet(prevEntry?.sets, sex.sets, i);
          const info = setTypeInfo(set.type);
          const isWork = set.type !== 'warmup';
          if (isWork) workN++;
          const pr = set.completed && isWorkSet(set) && beatsBest(set, best);
          const editingThis = editing && editing.setId === set.id;
          const refText = ref ? (isBlank(ref.weight) || ref.weight === 0 ? `${show(ref.reps)}${timed ? ' s' : ' reps'}` : `${show(ref.weight)} × ${show(ref.reps)}`) : null;

          return (
            <div
              key={set.id}
              data-set={set.id}
              className={`${COLS} px-1 py-1 -mx-1 rounded-xl transition-colors ${set.completed ? 'bg-entreno-500/10' : ''}`}
              style={{ scrollMarginBottom: 16, scrollMarginTop: 72 }}
            >
              <button
                type="button"
                onClick={() => onSetMenu(set)}
                aria-label={`Serie ${i + 1}: ${info.label}. Opciones`}
                className={`h-9 rounded-lg num text-[15px] font-bold flex items-center justify-center ${
                  info.short ? 'text-entreno-300 bg-entreno-500/12' : 'text-ink-300'
                }`}
              >
                {info.short || workN}
              </button>

              <button
                type="button"
                onClick={() => ref && onAdopt(set, ref)}
                disabled={!ref || set.completed}
                className="min-w-0 h-9 pl-1 text-left num text-sm text-ink-500 truncate disabled:opacity-100"
                style={{ transform: 'none' }}
              >
                {pr ? (
                  <span className="anim-pop inline-flex items-center gap-1 rounded-full bg-entreno-500 text-onaccent px-2 py-0.5 text-[11px] font-bold">
                    <Trophy className="w-3 h-3" strokeWidth={2.75} /> Récord
                  </span>
                ) : (
                  <>
                    {refText || '—'}
                    {set.rir !== '' && set.rir != null && <span className="ml-1.5 text-[11px] text-ink-400">RIR {set.rir}</span>}
                  </>
                )}
              </button>

              <Cell
                label={`Peso serie ${i + 1}`}
                value={show(set.weight)}
                placeholder={ref && !isBlank(ref.weight) && ref.weight !== 0 ? show(ref.weight) : ''}
                active={editingThis && editing.field === 'weight'}
                buffer={editing?.buffer}
                fresh={editing?.fresh}
                onClick={() => onOpenCell(set, 'weight')}
              />
              <Cell
                label={`Repeticiones serie ${i + 1}`}
                value={show(set.reps)}
                placeholder={ref ? show(ref.reps) : ''}
                active={editingThis && editing.field === 'reps'}
                buffer={editing?.buffer}
                fresh={editing?.fresh}
                onClick={() => onOpenCell(set, 'reps')}
              />

              <button
                type="button"
                onClick={() => onCheck(set, ref)}
                aria-label={set.completed ? `Desmarcar serie ${i + 1}` : `Completar serie ${i + 1}`}
                aria-pressed={!!set.completed}
                className={`h-10 w-full rounded-[10px] flex items-center justify-center transition-colors ${
                  set.completed ? 'bg-entreno-500 text-onaccent' : 'bg-ink-700/70 text-ink-500'
                }`}
              >
                <Check className={`w-5 h-5 ${set.completed ? 'anim-pop' : ''}`} strokeWidth={3} />
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onAddSet}
        className="mt-1.5 w-full h-12 flex items-center justify-center gap-1.5 text-[15px] font-semibold text-entreno-400 border-t hairline active:bg-ink-700/30"
        style={{ transform: 'none' }}
      >
        <Plus className="w-4 h-4" strokeWidth={2.5} /> Agregar serie
      </button>
    </section>
  );
}
