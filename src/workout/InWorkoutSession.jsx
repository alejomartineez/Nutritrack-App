import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Plus,
  Trash2,
  Repeat,
  StickyNote,
  ChevronDown,
  ChevronUp,
  Flag,
  Trophy,
  Timer,
  Dumbbell,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';
import { SET_TYPES } from './workoutData';
import { entreno, amber, ink } from '../lib/theme';
import NumberPad from './NumberPad';
import RestTimer from './RestTimer';
import ExercisePickerModal from './ExercisePickerModal';
import {
  getLastPerformanceSets,
  summarizeSession,
  finishSession,
  computeSessionPRs,
} from './workoutStorage';

const RIR_CYCLE = ['', 0, 1, 2, 3, '4+'];

const formatVolume = (kg) => (kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${kg}kg`);
const isEmpty = (v) => v === '' || v == null;

/** Cronómetro que corre solo: se aísla acá para no re-renderizar la sesión entera cada segundo. */
function LiveDuration({ startedAt, className }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const sec = Math.max(0, Math.floor((now - startedAt) / 1000));
  const mm = Math.floor(sec / 60);
  const ss = sec % 60;
  return (
    <span className={className}>
      {mm}:{String(ss).padStart(2, '0')}
    </span>
  );
}

function SetRow({ set, index, reference, onOpenPad, onUpdate, onRemove, onComplete }) {
  const typeInfo = SET_TYPES.find((t) => t.id === set.type) || SET_TYPES[1];
  const isDefaultType = !set.type || set.type === 'effective';
  const hasRir = set.rir !== '' && set.rir != null;
  const hasWeight = !isEmpty(set.weight);
  const hasReps = !isEmpty(set.reps);
  const refWeight = reference && !isEmpty(reference.weight) ? reference.weight : null;
  const refReps = reference && !isEmpty(reference.reps) ? reference.reps : null;

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

  // Toca el campo: el pad arranca en el valor cargado o, si está vacío, en la
  // referencia del anterior (un "Listo" y quedó). Así la fila vacía no obliga a
  // teclear desde cero lo que ya hiciste la vez pasada.
  const openWeight = () =>
    onOpenPad('weight', String(hasWeight ? set.weight : refWeight ?? ''), 'Peso (kg)', [-5, -2.5, -1, 1, 2.5, 5]);
  const openReps = () =>
    onOpenPad('reps', String(hasReps ? set.reps : refReps ?? ''), 'Repeticiones', [-1, 1], false);

  return (
    <div
      className={`rounded-xl border p-2 flex items-center gap-1.5 transition-colors ${
        set.completed ? 'bg-entreno-500/12 border-entreno-500/40' : 'bg-ink-900/60 border-ink-700'
      }`}
    >
      <span className="w-4 text-center text-xs font-mono text-ink-500 shrink-0">{index + 1}</span>

      {/* Tipo de serie: punto discreto para "efectiva" (el caso común), chip de color solo para tipos especiales */}
      <button
        onClick={cycleType}
        aria-label={`Tipo de serie: ${typeInfo.label}. Tocar para cambiar`}
        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
      >
        {isDefaultType ? (
          <span className="w-1.5 h-1.5 rounded-full bg-ink-600" />
        ) : (
          <span className={`w-full h-full rounded-lg text-[10px] font-bold flex items-center justify-center ${typeInfo.color}`}>
            {typeInfo.short}
          </span>
        )}
      </button>

      <button
        onClick={openWeight}
        className={`flex-1 min-w-0 bg-ink-950 border rounded-lg py-2.5 text-center font-mono text-base font-semibold ${
          hasWeight ? 'text-ink-50 border-ink-700' : 'text-ink-600 border-ink-800'
        }`}
      >
        {hasWeight ? `${set.weight}kg` : refWeight != null ? `${refWeight}` : '—'}
      </button>

      <button
        onClick={openReps}
        className={`flex-1 min-w-0 bg-ink-950 border rounded-lg py-2.5 text-center font-mono text-base font-semibold ${
          hasReps ? 'text-ink-50 border-ink-700' : 'text-ink-600 border-ink-800'
        }`}
      >
        {hasReps ? `${set.reps}` : refReps != null ? `${refReps}` : '—'}
      </button>

      {/* RIR: un solo chip que rota en cada toque, en vez de 5 botones siempre visibles */}
      <button
        onClick={cycleRir}
        aria-label="RIR (repeticiones en reserva). Tocar para cambiar"
        className={`shrink-0 w-11 h-9 rounded-lg text-[11px] font-bold flex items-center justify-center ${
          hasRir ? 'bg-entreno-500/20 text-entreno-300 border border-entreno-500/30' : 'text-ink-600 border border-ink-700'
        }`}
      >
        {hasRir ? `RIR${set.rir}` : 'RIR'}
      </button>

      <button
        onClick={onComplete}
        aria-label={set.completed ? 'Desmarcar serie' : 'Marcar serie completa'}
        className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
          set.completed ? 'bg-entreno-500 text-ink-900' : 'bg-ink-700 text-ink-400 hover:bg-ink-600'
        }`}
      >
        <Check className="w-4 h-4" strokeWidth={set.completed ? 3 : 2} />
      </button>

      {/* Una serie ya completada queda protegida: hay que descompletarla (tocar el check) para poder borrarla */}
      {!set.completed && (
        <button onClick={onRemove} aria-label="Eliminar serie" className="shrink-0 p-1 rounded-full hover:bg-ink-700">
          <Trash2 className="w-3.5 h-3.5 text-ink-600" />
        </button>
      )}
    </div>
  );
}

function ExerciseCard({
  sessionExercise,
  exercise,
  lastPerformanceSets,
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

  // La referencia de una fila es la serie del mismo número la vez pasada; si esa
  // vez hiciste menos series, se cae a la última conocida como pista.
  const referenceFor = (i) => lastPerformanceSets[i] || lastPerformanceSets[lastPerformanceSets.length - 1] || null;

  const addQuickSet = () => {
    const last = sessionExercise.sets[sessionExercise.sets.length - 1];
    const ref = referenceFor(sessionExercise.sets.length);
    onAddSet({
      type: last?.type === 'warmup' ? 'effective' : last?.type || 'effective',
      weight: last?.weight ?? ref?.weight ?? '',
      reps: last?.reps ?? ref?.reps ?? '',
      rir: last?.rir ?? '',
    });
  };

  // Tildar una fila vacía adopta la referencia del anterior: un toque y la serie
  // queda registrada con lo que hiciste la vez pasada.
  const completeSet = (set, ref) => {
    if (!set.completed) {
      const patch = {};
      if (isEmpty(set.weight) && ref && !isEmpty(ref.weight)) patch.weight = ref.weight;
      if (isEmpty(set.reps) && ref && !isEmpty(ref.reps)) patch.reps = ref.reps;
      if (Object.keys(patch).length) onUpdateSet(set.id, patch);
    }
    onSetComplete(set);
  };

  if (!exercise) return null;

  const completedCount = sessionExercise.sets.filter((s) => s.completed).length;
  const target = sessionExercise.targetSets || sessionExercise.sets.length || 1;
  const allDone = completedCount > 0 && completedCount >= target;
  const hasTargetReps = sessionExercise.targetRepsMin != null && sessionExercise.targetRepsMax != null;

  return (
    <div className={`rounded-2xl surface overflow-hidden ${allDone ? 'border-entreno-500/40' : ''}`}>
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <button className="min-w-0 text-left flex-1" onClick={() => setCollapsed((c) => !c)}>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-entreno-500/15 text-entreno-300">
                {exercise.muscleGroup}
              </span>
              {sessionExercise.substitutedFrom && <span className="text-[10px] text-ink-500">sustitución</span>}
              {sessionExercise.addedAdHoc && <span className="text-[10px] text-ink-500">agregado</span>}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {allDone && (
                <span className="w-5 h-5 rounded-full bg-entreno-500 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-ink-900" strokeWidth={3} />
                </span>
              )}
              <p className="text-sm font-bold text-ink-100 truncate">{exercise.name}</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-xs">
              {hasTargetReps && (
                <span className="text-ink-500 whitespace-nowrap">
                  Objetivo{' '}
                  <span className="font-mono text-ink-300">
                    {target}×{sessionExercise.targetRepsMin}–{sessionExercise.targetRepsMax}
                  </span>
                </span>
              )}
              <span className={`font-mono whitespace-nowrap ${allDone ? 'text-entreno-300' : 'text-ink-500'}`}>
                {completedCount}/{target} series
              </span>
            </div>
          </button>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setNotesOpen((v) => !v)}
              aria-label="Notas rápidas"
              className={`btn-icon hover:bg-ink-800 ${sessionExercise.notes ? 'text-entreno-400' : 'text-ink-500'}`}
            >
              <StickyNote className="w-4 h-4" />
            </button>
            <button onClick={() => setPickerOpen(true)} aria-label="Sustituir ejercicio" className="btn-icon hover:bg-ink-800 text-ink-500">
              <Repeat className="w-4 h-4" />
            </button>
            <button onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? 'Expandir' : 'Colapsar'} className="btn-icon hover:bg-ink-800 text-ink-500">
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
            className="w-full mt-2 bg-ink-800 border border-ink-700 rounded-xl px-3 py-2 text-xs text-ink-200 placeholder-ink-500"
          />
        )}
      </div>

      {!collapsed && (
        <div className="px-3 pb-3 space-y-1.5">
          {sessionExercise.sets.map((set, i) => {
            const ref = referenceFor(i);
            return (
              <SetRow
                key={set.id}
                set={set}
                index={i}
                reference={ref}
                onOpenPad={openPad(set.id)}
                onUpdate={(patch) => onUpdateSet(set.id, patch)}
                onRemove={() => onRemoveSet(set.id)}
                onComplete={() => completeSet(set, ref)}
              />
            );
          })}
          <button
            onClick={addQuickSet}
            className="w-full py-2.5 rounded-xl border border-dashed border-entreno-500/30 text-entreno-300 text-xs font-semibold hover:bg-entreno-500/5 flex items-center justify-center gap-1.5"
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

// ---------------------------------------------------------------------------
// Resumen post-entreno.
//
// El momento de recompensa que a cualquier app de gimnasio le sobra y a esta le
// faltaba entero: terminabas y volvías a la lista sin más. Acá se cierra con las
// tres cifras del día, los grupos trabajados y —si los hubo— los récords, con
// una lluvia corta de confeti. Es lo que sostiene la vuelta al día siguiente.
// ---------------------------------------------------------------------------

const CELEBRATE_COLORS = [entreno[300], entreno[500], amber[300], ink[300]];

function MiniConfetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const dist = 60 + Math.random() * 120;
        return {
          id: i,
          left: 42 + Math.random() * 16,
          color: CELEBRATE_COLORS[i % CELEBRATE_COLORS.length],
          dx: `${Math.cos(angle) * dist}px`,
          dy: `${Math.sin(angle) * dist + 70}px`,
          rot: `${Math.random() * 720 - 360}deg`,
          delay: `${Math.random() * 0.15}s`,
        };
      }),
    []
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece absolute rounded-sm"
          style={{
            left: `${p.left}%`,
            top: '28%',
            width: 8,
            height: 8,
            backgroundColor: p.color,
            animationDelay: p.delay,
            '--dx': p.dx,
            '--dy': p.dy,
            '--rot': p.rot,
          }}
        />
      ))}
    </div>
  );
}

function SummaryStat({ value, unit, label }) {
  return (
    <div className="rounded-2xl surface p-3 text-center">
      <p className="font-mono text-2xl font-black text-ink-100 leading-none">
        {value}
        {unit && <span className="text-sm font-bold text-ink-400 ml-0.5">{unit}</span>}
      </p>
      <p className="text-[10px] text-ink-500 mt-1.5 uppercase tracking-wide">{label}</p>
    </div>
  );
}

function WorkoutSummary({ finished, summary, prs, onDone, onBack, onDiscard }) {
  const nothingLogged = summary.effectiveSets === 0;

  return (
    <div className="space-y-4 pb-8 anim-fade-in-up">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-xs font-semibold text-ink-400 hover:text-ink-200 py-1"
      >
        <ChevronLeft className="w-4 h-4" /> Volver al entreno
      </button>

      {nothingLogged ? (
        <div className="rounded-3xl surface-accent surface-accent-entreno p-6 text-center">
          <Dumbbell className="w-10 h-10 text-entreno-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-ink-100 mb-1">No registraste ninguna serie</h2>
          <p className="text-sm text-ink-400 mb-4 leading-relaxed">
            Tildá al menos una serie para guardar el entreno, o descartalo si no llegaste a arrancar.
          </p>
          <div className="flex flex-col gap-2">
            <button onClick={onBack} className="rounded-xl bg-entreno-500 text-ink-900 px-5 py-3 text-sm font-bold hover:bg-entreno-400">
              Seguir entrenando
            </button>
            <button onClick={onDiscard} className="rounded-xl border border-ink-700 text-ink-400 px-5 py-2.5 text-sm font-semibold hover:text-ink-200">
              Descartar entreno
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Hero de celebración */}
          <div className="relative rounded-3xl surface-accent surface-accent-entreno p-6 text-center overflow-hidden">
            <MiniConfetti />
            <div className="relative">
              <span className="inline-flex w-14 h-14 rounded-full bg-entreno-500 items-center justify-center mb-3">
                <Check className="w-8 h-8 text-ink-900" strokeWidth={3} />
              </span>
              <h2 className="text-2xl font-black text-ink-100">¡Entreno completado!</h2>
              <p className="text-sm text-ink-400 mt-1">{finished.dayName}</p>
            </div>
          </div>

          {/* Las tres cifras del día */}
          <div className="grid grid-cols-3 gap-2">
            <SummaryStat value={summary.durationMin ?? 0} unit="min" label="Duración" />
            <SummaryStat value={formatVolume(summary.volume)} label="Volumen" />
            <SummaryStat value={summary.effectiveSets} label="Series" />
          </div>

          {summary.muscleGroups.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {summary.muscleGroups.map((g) => (
                <span key={g} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-entreno-500/15 text-entreno-300">
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Récords del día */}
          {prs.length > 0 && (
            <div className="rounded-3xl surface p-5">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-entreno-400" />
                <h2 className="label-section">{prs.length === 1 ? 'Récord del día' : `${prs.length} récords`}</h2>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <ul className="space-y-2">
                {prs.map((pr) => (
                  <li key={pr.exerciseId} className="flex items-center justify-between gap-3 rounded-xl bg-ink-900 border border-ink-700 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm text-ink-100 font-medium truncate">{pr.exerciseName}</p>
                      <p className="text-xs text-ink-500 mt-0.5">
                        {pr.weight}kg × {pr.reps}
                        {pr.isFirst ? ' · estreno' : ` · antes ${pr.prev}kg`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-lg font-black text-entreno-300">{pr.estOneRM}kg</p>
                      <p className="text-[10px] text-ink-500">1RM est.</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={onDone}
            className="w-full rounded-2xl bg-entreno-500 text-ink-900 py-3.5 text-sm font-bold hover:bg-entreno-400 flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" strokeWidth={2.5} /> Guardar y salir
          </button>
        </>
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
  onAddSessionExercise,
  onUpdateSet,
  onRemoveSet,
  onUpdateNotes,
  onSubstitute,
  onCreateCustomExercise,
  onFinish,
  onDiscard,
}) {
  const [restKey, setRestKey] = useState(null); // {token, duration}
  const [discardConfirm, setDiscardConfirm] = useState(false);
  const [addPickerOpen, setAddPickerOpen] = useState(false);
  // Sesión finalizada y congelada para el resumen. Null = todavía entrenando.
  const [finished, setFinished] = useState(null);

  const { totalSets, completedSets } = useMemo(() => {
    let total = 0;
    let done = 0;
    session.exercises.forEach((ex) => {
      total += ex.sets.length;
      done += ex.sets.filter((s) => s.completed).length;
    });
    return { totalSets: total, completedSets: done };
  }, [session]);

  const progressPct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  const handleSetComplete = (sessionExerciseId, set) => {
    const willComplete = !set.completed;
    onUpdateSet(sessionExerciseId, set.id, { completed: willComplete });
    if (willComplete) {
      setRestKey({ token: Date.now(), duration: 90 });
    }
  };

  // Al finalizar se congela la sesión (endedAt + poda de series sin tildar) y se
  // muestra el resumen; recién al confirmar se persiste. Volver desde el resumen
  // no pierde nada porque la sesión activa sigue viva en el módulo.
  const summaryData = useMemo(() => {
    if (!finished) return null;
    return {
      summary: summarizeSession(finished, exercisesById),
      prs: computeSessionPRs(finished, sessionsMap, exercisesById),
    };
  }, [finished, exercisesById, sessionsMap]);

  if (finished && summaryData) {
    return (
      <WorkoutSummary
        finished={finished}
        summary={summaryData.summary}
        prs={summaryData.prs}
        onBack={() => setFinished(null)}
        onDone={() => onFinish(finished)}
        onDiscard={() => {
          setFinished(null);
          onDiscard();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* ---- Cabecera: progreso, cronómetro y control de la sesión ---------- */}
      <div className="rounded-2xl surface-accent surface-accent-entreno p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="label-section text-entreno-400 truncate">{session.dayName}</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="flex items-center gap-1 text-ink-200">
                <Timer className="w-4 h-4 text-entreno-400" />
                <LiveDuration startedAt={session.startedAt} className="font-mono text-xl font-black text-ink-100" />
              </span>
              <span className="text-xs text-ink-500 whitespace-nowrap">
                {completedSets}/{totalSets} series
              </span>
            </div>
          </div>
          {discardConfirm ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setDiscardConfirm(false)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-ink-300 hover:bg-ink-800"
              >
                Cancelar
              </button>
              <button
                onClick={onDiscard}
                className="px-3 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-400"
              >
                Descartar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setDiscardConfirm(true)}
                aria-label="Descartar entreno"
                className="px-3 py-2 rounded-xl text-xs font-semibold text-ink-400 hover:bg-ink-800"
              >
                Descartar
              </button>
              <button
                onClick={() => setFinished(finishSession(session))}
                className="px-4 py-2.5 rounded-xl bg-entreno-500 text-ink-900 text-sm font-bold flex items-center gap-1.5 hover:bg-entreno-400"
              >
                <Flag className="w-4 h-4" /> Finalizar
              </button>
            </div>
          )}
        </div>

        {/* Barra de progreso de la sesión */}
        <div className="mt-3 h-1.5 w-full rounded-full bg-ink-900 overflow-hidden">
          <div
            className="h-full rounded-full bg-entreno-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="space-y-3 pb-4">
        {session.exercises.map((sex) => (
          <ExerciseCard
            key={sex.id}
            sessionExercise={sex}
            exercise={exercisesById[sex.exerciseId]}
            lastPerformanceSets={getLastPerformanceSets(sessionsMap, sex.exerciseId, session.id)}
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

        {/* Agregar un ejercicio fuera del plan, sin cortar la sesión */}
        <button
          onClick={() => setAddPickerOpen(true)}
          className="w-full py-3 rounded-2xl border border-dashed border-entreno-500/40 text-entreno-300 text-sm font-semibold hover:bg-entreno-500/5 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Agregar ejercicio
        </button>
      </div>

      {restKey && <RestTimer key={restKey.token} durationSec={restKey.duration} onDismiss={() => setRestKey(null)} />}

      {addPickerOpen && (
        <ExercisePickerModal
          title="Agregar al entreno"
          exercises={exercises}
          onSelect={(exerciseId) => {
            onAddSessionExercise(exerciseId);
            setAddPickerOpen(false);
          }}
          onCreateCustom={(data) => {
            const newId = onCreateCustomExercise(data);
            onAddSessionExercise(newId);
            setAddPickerOpen(false);
          }}
          onClose={() => setAddPickerOpen(false)}
        />
      )}
    </div>
  );
}
