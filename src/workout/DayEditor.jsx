import React, { useState } from 'react';
import { Plus, ChevronUp, ChevronDown, X, Play, Dumbbell } from 'lucide-react';
import { Sheet, Button, Switch, TextField, EmptyState } from '../ui';
import { isTimed } from './workoutData';
import { sanitizeTarget } from './workoutStorage';
import ExercisePicker from './ExercisePicker';

/** Campo chico para series/reps: se puede vaciar mientras se escribe; valida al salir. */
function TargetInput({ value, onCommit, label }) {
  const [draft, setDraft] = useState(null);
  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={label}
      value={draft ?? String(value ?? '')}
      onFocus={(e) => {
        setDraft(String(value ?? ''));
        e.target.select();
      }}
      onChange={(e) => setDraft(e.target.value.replace(/\D/g, '').slice(0, 3))}
      onBlur={() => {
        onCommit(draft);
        setDraft(null);
      }}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      className="w-11 h-9 rounded-lg inset text-center num text-[15px] font-semibold text-ink-100 outline-none focus:ring-2 focus:ring-entreno-500"
    />
  );
}

export default function DayEditor({ day, exercises, exercisesById, onChangeDay, onAddExercises, onRemoveExercise, onMoveExercise, onUpdateTarget, onStart, onClose, exerciseActions }) {
  const [picker, setPicker] = useState(false);
  const [name, setName] = useState(day.name);
  const list = day.exercises || [];

  const commitName = () => {
    const clean = name.trim();
    if (clean && clean !== day.name) onChangeDay({ name: clean });
    else setName(day.name);
  };

  const setTarget = (rex, field, raw) => {
    const next = sanitizeTarget({ ...rex, [field]: raw === '' ? rex[field] : raw });
    // Si el mínimo supera al máximo, el que se movió arrastra al otro.
    if (field === 'targetRepsMax' && Number(raw) > 0 && Number(raw) < rex.targetRepsMin) {
      next.targetRepsMin = next.targetRepsMax = Math.max(1, Number(raw));
    }
    onUpdateTarget(rex.id, next);
  };

  return (
    <Sheet
      onClose={() => {
        commitName();
        onClose();
      }}
      title={day.weekday}
      size="large"
      footer={
        !day.isRest && list.length > 0 && onStart ? (
          <Button block size="lg" tone="entreno" icon={Play} onClick={() => onStart(day)}>
            Empezar este día
          </Button>
        ) : null
      }
    >
      <div className="space-y-4">
        <TextField label="Nombre del día" value={name} onChange={setName} onBlur={commitName} placeholder="Ej.: Torso A" />
        <div className="surface rounded-2xl px-4 h-14 flex items-center justify-between">
          <span className="text-[15px] text-ink-100">Día de descanso</span>
          <Switch
            tone="entreno"
            label="Día de descanso"
            checked={!!day.isRest}
            onChange={(isRest) => {
              // Un día de plantilla llamado "Descanso" que pasa a entreno toma el nombre del día de la semana.
              if (!isRest && day.name === 'Descanso') {
                setName(day.weekday);
                onChangeDay({ isRest, name: day.weekday });
              } else onChangeDay({ isRest });
            }}
          />
        </div>

        {!day.isRest && (
          <>
            {list.length === 0 ? (
              <EmptyState icon={Dumbbell} title="Sin ejercicios" text="Agregá los ejercicios de este día. Las series y reps se ajustan después." />
            ) : (
              <ul className="surface rounded-2xl divide-y divide-[var(--hairline)]">
                {list.map((rex, i) => {
                  const ex = exercisesById[rex.exerciseId];
                  return (
                    <li key={rex.id} className="pl-4 pr-2 py-3">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0 pt-1">
                          <p className="text-[15px] font-medium text-ink-100 leading-snug">{ex?.name || 'Ejercicio'}</p>
                          <p className="text-xs text-ink-500 mt-0.5">{ex?.muscleGroup}</p>
                        </div>
                        <div className="flex items-center shrink-0">
                          <button onClick={() => onMoveExercise(rex.id, -1)} disabled={i === 0} aria-label="Subir" className="btn-icon w-8 h-8 text-ink-400 disabled:opacity-25">
                            <ChevronUp className="w-[18px] h-[18px]" />
                          </button>
                          <button onClick={() => onMoveExercise(rex.id, 1)} disabled={i === list.length - 1} aria-label="Bajar" className="btn-icon w-8 h-8 text-ink-400 disabled:opacity-25">
                            <ChevronDown className="w-[18px] h-[18px]" />
                          </button>
                          <button onClick={() => onRemoveExercise(rex.id)} aria-label={`Quitar ${ex?.name || 'ejercicio'}`} className="btn-icon w-8 h-8 text-ink-500">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-sm text-ink-500">
                        <TargetInput label="Series" value={rex.targetSets} onCommit={(v) => setTarget(rex, 'targetSets', v)} />
                        <span>series ×</span>
                        <TargetInput label="Reps mínimas" value={rex.targetRepsMin} onCommit={(v) => setTarget(rex, 'targetRepsMin', v)} />
                        <span>–</span>
                        <TargetInput label="Reps máximas" value={rex.targetRepsMax} onCommit={(v) => setTarget(rex, 'targetRepsMax', v)} />
                        <span>{isTimed(ex) ? 'seg' : 'reps'}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <Button variant="soft" tone="entreno" block icon={Plus} onClick={() => setPicker(true)}>
              Agregar ejercicios
            </Button>
          </>
        )}
      </div>

      {picker && (
        <ExercisePicker
          title="Agregar ejercicios"
          multi
          exercises={exercises}
          onClose={() => setPicker(false)}
          onPick={(ids) => {
            onAddExercises(ids);
            setPicker(false);
          }}
          {...exerciseActions}
        />
      )}
    </Sheet>
  );
}
