import React, { useMemo, useState } from 'react';
import { Check, Plus, Trash2, Repeat, StickyNote, ChevronDown, ChevronUp, Flag, X } from 'lucide-react';
import { SET_TYPES } from './workoutData';
import NumberPad from './NumberPad';
import RestTimer from './RestTimer';
import ExercisePickerModal from './ExercisePickerModal';
import { getLastPerformance } from './workoutStorage';

function WatermarkHint({ last }) {
  if (!last) return <p className="text-xs text-slate-600 italic mt-0.5">Primera vez que registrás este ejercicio</p>;
  return (
    <p className="text-xs text-emerald-400/70 italic mt-0.5">
      Última vez: {last.weight}kg x {last.reps} @ RIR {last.rir ?? '-'}
    </p>
  );
}

const RIR_CYCLE = ['', 0, 1, 2, 3, '4+'];

function SetRow({ set, index, onOpenPad, onUpdate, onRemove, onComplete }) {
  const typeInfo = SET_TYPES.find((t) => t.id === set.type) || SET_TYPES[1];
  const isDefaultType = !set.type || set.type === 'effective';
  const hasRir = set.rir !== '' && set.rir != null;

  const cycleType = () => {
    const i = SET_TYPES.findIndex((t) => t.id === set.type);
    const next = SET_TYPES[(i + 1) % SET_TYPES.length];
    onUpdate({ type: next.id });
  };

  const cycleRir = () => {
    const i = RIR_CYCLE.findIndex((v) => String(v) === String(set.rir ?? ''));
    const next = RIR_CYCLE[(i + 1) % RIR_CYCLE.length];
    onUpdate({ rir: next });
  };

  return (
    <div
      className={`rounded-xl border p-2 flex items-center gap-1.5 ${
        set.completed ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-neutral-800/60 border-neutral-700'
      }`}
    >
      <span className="w-4 text-center text-xs font-mono text-slate-500 shrink-0">{index + 1}</span>

      {/* Tipo de serie: punto discreto para "efectiva" (el caso común), chip de color solo para tipos especiales */}
      <button
        onClick={cycleType}
        aria-label={`Tipo de serie: ${typeInfo.label}. Tocar para cambiar`}
        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
      >
        {isDefaultType ? (
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
        ) : (
          <span className={`w-full h-full rounded-lg text-[10px] font-bold flex items-center justify-center ${typeInfo.color}`}>
            {typeInfo.short}
          </span>
        )}
      </button>

      <button
        onClick={() => onOpenPad('weight', String(set.weight ?? ''), 'Peso (kg)', [-5, -2.5, -1, 1, 2.5, 5])}
        className="flex-1 min-w-0 bg-neutral-900 border border-neutral-700 rounded-lg py-2.5 text-center font-mono text-base font-semibold text-slate-100"
      >
        {set.weight !== '' && set.weight != null ? `${set.weight}kg` : '—'}
      </button>

      <button
        onClick={() => onOpenPad('reps', String(set.reps ?? ''), 'Repeticiones', [-1, 1], false)}
        className="flex-1 min-w-0 bg-neutral-900 border border-neutral-700 rounded-lg py-2.5 text-center font-mono text-base font-semibold text-slate-100"
      >
        {set.reps !== '' && set.reps != null ? `${set.reps}` : '—'}
      </button>

      {/* RIR: un solo chip que rota en cada toque, en vez de 5 botones siempre visibles */}
      <button
        onClick={cycleRir}
        aria-label="RIR (repeticiones en reserva). Tocar para cambiar"
        className={`shrink-0 w-11 h-9 rounded-lg text-[11px] font-bold flex items-center justify-center ${
          hasRir ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-600 border border-neutral-700'
        }`}
      >
        {hasRir ? `RIR${set.rir}` : 'RIR'}
      </button>

      <button
        onClick={onComplete}
        aria-label="Marcar serie completa"
        className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center focus-visible:ring-2 focus-visible:ring-emerald-400 ${
          set.completed ? 'bg-emerald-500 text-neutral-900' : 'bg-neutral-700 text-slate-400 hover:bg-neutral-600'
        }`}
      >
        <Check className="w-4 h-4" />
      </button>

      {/* Una serie ya completada queda protegida: hay que descompletarla (tocar el check) para poder borrarla */}
      {!set.completed && (
        <button onClick={onRemove} aria-label="Eliminar serie" className="shrink-0 p-1 rounded-full hover:bg-neutral-700">
          <Trash2 className="w-3.5 h-3.5 text-slate-600" />
        </button>
      )}
    </div>
  );
}

function ExerciseCard({
  sessionExercise,
  exercise,
  lastPerformance,
  onAddSet,
  onUpdateSet,
  onRemoveSet,
  onUpdateNotes,
  onSubstitute,
  onSetComplete,
  exercises,
  onCreateCustomExercise,
}) {
  const [notesOpen, setNotesOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pad, setPad] = useState(null); // { setId, field, value, label, quickSteps, allowDecimal }
  const [collapsed, setCollapsed] = useState(false);

  const openPad = (setId) => (field, value, label, quickSteps, allowDecimal = true) =>
    setPad({ setId, field, value, label, quickSteps, allowDecimal });

  const commitPad = () => {
    if (!pad) return;
    onUpdateSet(pad.setId, { [pad.field]: pad.field === 'reps' ? parseInt(pad.value) || 0 : parseFloat(pad.value) || 0 });
    setPad(null);
  };

  const addQuickSet = () => {
    const last = sessionExercise.sets[sessionExercise.sets.length - 1];
    onAddSet({
      type: last?.type || 'effective',
      weight: last?.weight ?? lastPerformance?.weight ?? '',
      reps: last?.reps ?? lastPerformance?.reps ?? '',
      rir: last?.rir ?? '',
    });
  };

  if (!exercise) return null;

  return (
    <div className="rounded-2xl surface overflow-hidden">
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <button className="min-w-0 text-left flex-1" onClick={() => setCollapsed((c) => !c)}>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">
                {exercise.muscleGroup}
              </span>
              {sessionExercise.substitutedFrom && (
                <span className="text-[10px] text-slate-500">sustitución</span>
              )}
            </div>
            <p className="text-sm font-bold text-slate-100 mt-1 truncate">{exercise.name}</p>
            <WatermarkHint last={lastPerformance} />
          </button>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setNotesOpen((v) => !v)}
              aria-label="Notas rápidas"
              className={`p-2 rounded-full hover:bg-neutral-800 ${sessionExercise.notes ? 'text-emerald-400' : 'text-slate-500'}`}
            >
              <StickyNote className="w-4 h-4" />
            </button>
            <button onClick={() => setPickerOpen(true)} aria-label="Sustituir ejercicio" className="p-2 rounded-full hover:bg-neutral-800 text-slate-500">
              <Repeat className="w-4 h-4" />
            </button>
            <button onClick={() => setCollapsed((c) => !c)} aria-label="Colapsar" className="p-2 rounded-full hover:bg-neutral-800 text-slate-500">
              {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {notesOpen && (
          <textarea
            value={sessionExercise.notes}
            onChange={(e) => onUpdateNotes(e.target.value)}
            placeholder="Técnica, ajuste de máquina, molestias..."
            rows={2}
            className="w-full mt-2 bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        )}
      </div>

      {!collapsed && (
        <div className="px-3 pb-3 space-y-1.5">
          {sessionExercise.sets.map((set, i) => (
            <SetRow
              key={set.id}
              set={set}
              index={i}
              onOpenPad={openPad(set.id)}
              onUpdate={(patch) => onUpdateSet(set.id, patch)}
              onRemove={() => onRemoveSet(set.id)}
              onComplete={() => onSetComplete(set)}
            />
          ))}
          <button
            onClick={addQuickSet}
            className="w-full py-2.5 rounded-xl border border-dashed border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/5 flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar serie
          </button>
        </div>
      )}

      {pad && (
        <NumberPad
          label={pad.label}
          value={pad.value}
          onChange={(v) => setPad((p) => ({ ...p, value: v }))}
          onClose={commitPad}
          quickSteps={pad.quickSteps}
          allowDecimal={pad.allowDecimal}
        />
      )}

      {pickerOpen && (
        <ExercisePickerModal
          title="Sustituir ejercicio"
          exercises={exercises}
          defaultMuscleGroup={exercise.muscleGroup}
          onSelect={(newExerciseId) => {
            onSubstitute(newExerciseId);
            setPickerOpen(false);
          }}
          onCreateCustom={(data) => {
            const newId = onCreateCustomExercise(data);
            onSubstitute(newId);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

export default function InWorkoutSession({
  session,
  exercisesById,
  exercises,
  sessionsMap,
  onAddSet,
  onUpdateSet,
  onRemoveSet,
  onUpdateNotes,
  onSubstitute,
  onCreateCustomExercise,
  onFinish,
  onDiscard,
}) {
  const [restKey, setRestKey] = useState(null); // {token, duration}

  const elapsedMin = Math.max(0, Math.round((Date.now() - session.startedAt) / 60000));

  const totalCompletedSets = useMemo(
    () => session.exercises.reduce((sum, ex) => sum + ex.sets.filter((s) => s.completed).length, 0),
    [session]
  );

  const handleSetComplete = (sessionExerciseId, set) => {
    const willComplete = !set.completed;
    onUpdateSet(sessionExerciseId, set.id, { completed: willComplete });
    if (willComplete) {
      setRestKey({ token: Date.now(), duration: 90 });
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl surface-accent p-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-emerald-400 font-bold">{session.dayName}</p>
          <p className="text-sm text-slate-300 mt-0.5">{elapsedMin} min · {totalCompletedSets} series completadas</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onDiscard}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-neutral-800"
          >
            Descartar
          </button>
          <button
            onClick={onFinish}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 text-neutral-900 text-sm font-bold flex items-center gap-1.5 hover:bg-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            <Flag className="w-4 h-4" /> Finalizar
          </button>
        </div>
      </div>

      <div className="space-y-3 pb-16">
        {session.exercises.map((sex) => (
          <ExerciseCard
            key={sex.id}
            sessionExercise={sex}
            exercise={exercisesById[sex.exerciseId]}
            lastPerformance={getLastPerformance(sessionsMap, sex.exerciseId, session.id)}
            exercises={exercises}
            onCreateCustomExercise={onCreateCustomExercise}
            onAddSet={(set) => onAddSet(sex.id, set)}
            onUpdateSet={(setId, patch) => onUpdateSet(sex.id, setId, patch)}
            onRemoveSet={(setId) => onRemoveSet(sex.id, setId)}
            onUpdateNotes={(notes) => onUpdateNotes(sex.id, notes)}
            onSubstitute={(newExerciseId) => onSubstitute(sex.id, newExerciseId)}
            onSetComplete={(set) => handleSetComplete(sex.id, set)}
          />
        ))}
      </div>

      {restKey && (
        <RestTimer key={restKey.token} durationSec={restKey.duration} onDismiss={() => setRestKey(null)} />
      )}
    </div>
  );
}
