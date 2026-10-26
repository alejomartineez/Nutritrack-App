import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Plus, Dumbbell, History, StickyNote, Repeat, ArrowUp, ArrowDown, Trash2, Trophy, Check } from 'lucide-react';
import { Overlay, Sheet, Button, ListGroup, ListRow, Segmented, EmptyState, ProgressBar, NumberField, Stat, toast } from '../ui';
import { haptic } from '../lib/haptics';
import { dateKeyOf, formatDisplayDate, keyToDate } from '../lib/dates';
import { SET_TYPES, RIR_OPTIONS, setTypeInfo, isBodyweight, isTimed } from './workoutData';
import {
  isBlank,
  num,
  isWorkSet,
  setScore,
  beatsBest,
  formatScore,
  buildHistoryIndex,
  referenceForSet,
  overloadHint,
  summarizeSession,
  computeSessionPRs,
} from './workoutStats';
import {
  updateSet,
  removeSet,
  addSetToExercise,
  addExercisesToSession,
  substituteExercise,
  removeExerciseFromSession,
  moveSessionExercise,
  updateExerciseNotes,
  finishSession,
} from './workoutStorage';
import { applyKey, parseBuffer, toBuffer } from './padLogic';
import { useRestTimer, primeAudio } from './useRestTimer';
import { useWakeLock } from './useWakeLock';
import { formatClock, formatVolume, formatMinutes, fmtNum, plural } from './format';
import ExerciseBlock from './ExerciseBlock';
import NumberPad from './NumberPad';
import RestTimer from './RestTimer';
import ExercisePicker from './ExercisePicker';
import ExerciseHistorySheet from './ExerciseHistorySheet';
import PlateCalculator from './PlateCalculator';

function LiveDuration({ startedAt }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="num">{formatClock((now - startedAt) / 1000)}</span>;
}

function SetMenu({ set, index, onChange, onDelete, onClose }) {
  const info = setTypeInfo(set.type);
  const legacy = !SET_TYPES.some((t) => t.id === set.type);
  return (
    <Sheet onClose={onClose} title={`Serie ${index + 1}`} subtitle={legacy ? `Tipo actual: ${info.label}` : undefined}>
      <p className="text-xs font-medium text-ink-500 mb-1.5 px-1">Tipo</p>
      <Segmented value={set.type} onChange={(type) => onChange({ type })} tone="entreno" options={SET_TYPES.map((t) => ({ value: t.id, label: t.id === 'effective' ? 'Efectiva' : t.label }))} />
      <p className="text-xs font-medium text-ink-500 mt-5 mb-1.5 px-1">Repeticiones en reserva (RIR)</p>
      <div className="grid grid-cols-6 gap-1.5">
        {RIR_OPTIONS.map((r) => {
          const active = String(set.rir ?? '') === String(r);
          return (
            <button
              key={String(r)}
              onClick={() => onChange({ rir: r })}
              className={`h-10 rounded-xl num text-[15px] font-semibold ${active ? 'bg-entreno-500 text-onaccent' : 'bg-ink-700/60 text-ink-300'}`}
            >
              {r === '' ? '—' : r}
            </button>
          );
        })}
      </div>
      <Button variant="soft" tone="red" block icon={Trash2} className="mt-6" onClick={onDelete}>
        Eliminar serie
      </Button>
    </Sheet>
  );
}

function NotesSheet({ value, onChange, onClose }) {
  return (
    <Sheet onClose={onClose} title="Notas" footer={<Button block size="lg" tone="entreno" onClick={onClose}>Listo</Button>}>
      <textarea
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder="Ajuste de la máquina, técnica, molestias…"
        className="field resize-none leading-relaxed"
      />
    </Sheet>
  );
}

function FinishSheet({ session, sessionsMap, exercisesById, pendingSets, onSave, onDiscard, onClose }) {
  const finished = useMemo(() => finishSession(session), [session]);
  const summary = useMemo(() => summarizeSession(finished, exercisesById), [finished, exercisesById]);
  const prs = useMemo(() => computeSessionPRs(finished, sessionsMap, exercisesById), [finished, sessionsMap, exercisesById]);

  if (summary.effectiveSets === 0) {
    return (
      <Sheet onClose={onClose} title="Todavía no hay series">
        <p className="text-[15px] text-ink-400 leading-snug">Tildá al menos una serie para guardar el entreno, o descartalo si no llegaste a arrancar.</p>
        <div className="mt-5 space-y-2">
          <Button block size="lg" tone="entreno" onClick={onClose}>
            Seguir entrenando
          </Button>
          <Button block variant="ghost" tone="red" onClick={onDiscard}>
            Descartar entreno
          </Button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      onClose={onClose}
      footer={
        <Button block size="lg" tone="entreno" icon={Check} onClick={() => onSave(finished)}>
          Guardar entreno
        </Button>
      }
    >
      <div className="text-center pt-1">
        <span className="anim-pop inline-flex w-16 h-16 rounded-full bg-entreno-500 text-onaccent items-center justify-center">
          <Check className="w-8 h-8" strokeWidth={3} />
        </span>
        <h2 className="text-2xl font-bold text-ink-50 mt-3">¡Buen entreno!</h2>
        <p className="text-sm text-ink-500 mt-0.5">{session.dayName}</p>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-6 text-center">
        <Stat label="Duración" value={summary.durationMin ?? 0} unit="min" />
        <Stat label="Volumen" value={formatVolume(summary.volume)} />
        <Stat label="Series" value={summary.effectiveSets} />
      </div>
      {prs.length > 0 && (
        <ListGroup title={prs.length === 1 ? 'Récord nuevo' : `${prs.length} récords nuevos`} className="mt-6">
          {prs.map((pr) => (
            <ListRow key={pr.exerciseId} icon={Trophy} iconTone="entreno" title={pr.exerciseName} subtitle={`Antes: ${pr.prevLabel}`} value={pr.label} />
          ))}
        </ListGroup>
      )}
      {pendingSets > 0 && (
        <p className="text-xs text-ink-500 text-center mt-4">
          {plural(pendingSets, 'serie sin tildar no se guarda', 'series sin tildar no se guardan')}.
        </p>
      )}
    </Sheet>
  );
}

/**
 * Pantalla de entreno a pantalla completa. `mode`: 'live' (sesión en curso,
 * con descanso y pantalla siempre prendida) o 'edit' (sesión pasada).
 */
export default function ActiveWorkout({
  session,
  mode = 'live',
  onChange,
  exercises,
  exercisesById,
  sessionsMap,
  settings,
  onSettingsChange,
  onCreateExercise,
  onUpdateExercise,
  onArchiveExercise,
  onSave,
  onDiscard,
  onMinimize,
}) {
  const live = mode === 'live';
  const rest = useRestTimer({ sound: settings.sound });
  useWakeLock(live);

  const [editing, setEditing] = useState(null); // { sexId, setId, field, buffer, fresh, dirty }
  const [sheet, setSheet] = useState(() => (session.exercises.length === 0 ? { type: 'add' } : null));
  const scrollRef = useRef(null);

  const history = useMemo(
    () => buildHistoryIndex(sessionsMap, { excludeId: session.id, untilDate: live ? null : session.date }),
    [sessionsMap, session.id, session.date, live]
  );
  const prevEntry = (exerciseId) => history.entries.get(exerciseId)?.[0] || null;

  const update = (fn) => onChange(fn);

  const lookup = (ed) => {
    const sex = session.exercises.find((x) => x.id === ed?.sexId);
    const index = sex ? sex.sets.findIndex((s) => s.id === ed.setId) : -1;
    if (!sex || index === -1) return {};
    return { sex, set: sex.sets[index], index, ref: referenceForSet(prevEntry(sex.exerciseId)?.sets, sex.sets, index) };
  };

  const refValue = (ref, field) => (ref && !isBlank(ref[field]) && num(ref[field]) > 0 ? ref[field] : '');

  /** Aplica lo tipeado. `adopt`: si no se tocó y está vacío, toma lo de la vez pasada. Devuelve la serie resultante. */
  const commit = (ed, { adopt = false } = {}) => {
    const { sex, set, ref } = lookup(ed);
    if (!set) return null;
    let value;
    if (ed.dirty) value = parseBuffer(ed.buffer, ed.field === 'weight');
    else if (adopt && isBlank(set[ed.field]) && refValue(ref, ed.field) !== '') value = ref[ed.field];
    else return set;
    update((s) => updateSet(s, sex.id, set.id, { [ed.field]: value }));
    return { ...set, [ed.field]: value };
  };

  const openCell = (sex, set, field) => {
    if (editing) commit(editing);
    haptic(5);
    setEditing({ sexId: sex.id, setId: set.id, field, buffer: toBuffer(set[field]), fresh: true, dirty: false });
  };

  const completeSet = (sex, set, ref) => {
    if (set.completed) {
      update((s) => updateSet(s, sex.id, set.id, { completed: false }));
      return;
    }
    const exercise = exercisesById[sex.exerciseId];
    const weight = !isBlank(set.weight) ? set.weight : refValue(ref, 'weight');
    const reps = !isBlank(set.reps) ? set.reps : refValue(ref, 'reps');
    if (num(reps) <= 0) {
      haptic(30);
      const field = isBlank(weight) && !isBodyweight(exercise) ? 'weight' : 'reps';
      toast(field === 'weight' ? 'Cargá el peso y las reps' : 'Cargá las repeticiones', { tone: 'warn' });
      setEditing({ sexId: sex.id, setId: set.id, field, buffer: toBuffer(set[field]), fresh: true, dirty: false });
      return;
    }
    if (live) primeAudio();
    const done = { ...set, weight, reps, completed: true };
    update((s) => updateSet(s, sex.id, set.id, { weight, reps, completed: true }));
    haptic();
    if (live) rest.start(settings.restSec);

    const best = history.best.get(sex.exerciseId);
    if (isWorkSet(done) && beatsBest(done, best)) {
      const score = setScore(done);
      const topOfSession = sex.sets
        .filter((x) => x.id !== set.id && isWorkSet(x))
        .every((o) => {
          const sc = setScore(o);
          return !sc || sc.kind !== score.kind || score.value > sc.value;
        });
      if (topOfSession) {
        setTimeout(() => haptic([15, 60, 15]), 120);
        toast(`¡Récord en ${exercise?.name || 'este ejercicio'}! ${formatScore(score)}`);
      }
    }
  };

  const handleCheck = (sex, set, ref) => {
    let current = set;
    if (editing) {
      const merged = commit(editing);
      if (editing.setId === set.id && merged) current = merged;
      setEditing(null);
    }
    completeSet(sex, current, ref);
  };

  const padNext = () => {
    const { sex, ref } = lookup(editing);
    if (!sex) return setEditing(null);
    const merged = commit(editing, { adopt: true });
    if (editing.field === 'weight') {
      setEditing({ ...editing, field: 'reps', buffer: toBuffer(merged.reps), fresh: true, dirty: false });
      return;
    }
    setEditing(null);
    if (!merged.completed) completeSet(sex, merged, ref);
  };

  const padStep = (d) =>
    setEditing((ed) => {
      const { set, ref } = lookup(ed);
      if (!set) return ed;
      const base = ed.dirty ? num(parseBuffer(ed.buffer, ed.field === 'weight')) : !isBlank(set[ed.field]) ? num(set[ed.field]) : num(refValue(ref, ed.field));
      const next = Math.max(0, Math.round((base + d) * 100) / 100);
      return { ...ed, buffer: toBuffer(next), fresh: true, dirty: true };
    });

  // La fila que se edita siempre a la vista, arriba del teclado.
  useEffect(() => {
    if (!editing) return undefined;
    const id = requestAnimationFrame(() => {
      scrollRef.current?.querySelector(`[data-set="${editing.setId}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(id);
  }, [editing?.setId, editing?.field]); // eslint-disable-line react-hooks/exhaustive-deps

  const lastSetCount = (exerciseId) => (prevEntry(exerciseId)?.sets || []).filter((s) => s.type !== 'warmup').length;

  const { done, total, pending } = useMemo(() => {
    let d = 0;
    let t = 0;
    let p = 0;
    session.exercises.forEach((ex) =>
      ex.sets.forEach((s) => {
        t++;
        if (s.completed) d++;
        else if (!isBlank(s.weight) || !isBlank(s.reps)) p++;
      })
    );
    return { done: d, total: t, pending: p };
  }, [session]);

  const handleFinish = () => {
    let snapshot = session;
    if (editing) {
      const merged = commit(editing);
      if (merged) snapshot = updateSet(session, editing.sexId, editing.setId, { [editing.field]: merged[editing.field] });
      setEditing(null);
    }
    if (live) {
      setSheet({ type: 'finish' });
      return;
    }
    const finished = finishSession(snapshot);
    if (summarizeSession(finished).effectiveSets === 0) {
      toast('Tildá al menos una serie, o borrá el entreno desde el historial', { tone: 'warn' });
      return;
    }
    onSave(finished);
  };

  const closeSheet = () => setSheet(null);
  const sheetSex = sheet?.sexId ? session.exercises.find((x) => x.id === sheet.sexId) : null;
  const sheetSetIndex = sheetSex && sheet.setId ? sheetSex.sets.findIndex((s) => s.id === sheet.setId) : -1;
  const editingInfo = editing ? lookup(editing) : {};
  const editingExercise = editingInfo.sex ? exercisesById[editingInfo.sex.exerciseId] : null;

  return (
    <Overlay align="full" onClose={live ? onMinimize : onDiscard} label={live ? 'Entreno en curso' : 'Editar entreno'}>
      <div className="w-full bg-ink-900 flex justify-center">
        <div className="w-full max-w-md flex flex-col">
          <header className="shrink-0 px-3 pb-2.5 border-b hairline" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}>
            <div className="flex items-center gap-2">
              {live ? (
                <button onClick={onMinimize} aria-label="Minimizar entreno" className="btn-icon text-ink-300 bg-ink-700/60">
                  <ChevronDown className="w-5 h-5" />
                </button>
              ) : (
                <button onClick={onDiscard} className="h-10 px-2 text-[15px] text-ink-300 font-medium">
                  Cancelar
                </button>
              )}
              <div className="flex-1 min-w-0 text-center">
                <p className="text-[15px] font-semibold text-ink-100 truncate">{live ? session.dayName : 'Editar entreno'}</p>
                <p className="text-xs text-ink-500 num">
                  {live ? <LiveDuration startedAt={session.startedAt} /> : formatDisplayDate(keyToDate(session.date))}
                  {' · '}
                  {done}/{total} series
                </p>
              </div>
              <Button size="sm" tone="entreno" onClick={handleFinish} className="px-4">
                {live ? 'Terminar' : 'Guardar'}
              </Button>
            </div>
            {live && total > 0 && <ProgressBar value={done} max={total} color="rgb(var(--entreno-500))" height={3} className="mt-2.5" />}
          </header>

          <div
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pt-4 pb-8 space-y-3"
            onClick={(e) => {
              if (editing && !e.target.closest('[data-cell]') && !e.target.closest('[aria-pressed]')) setEditing(null);
            }}
          >
            {!live && <SessionMeta session={session} onChange={update} />}

            {session.exercises.map((sex, i) => {
              const exercise = exercisesById[sex.exerciseId];
              const entry = prevEntry(sex.exerciseId);
              return (
                <ExerciseBlock
                  key={sex.id}
                  sex={sex}
                  exercise={exercise}
                  prevEntry={entry}
                  best={history.best.get(sex.exerciseId)}
                  hint={sex.sets.some((s) => s.completed) ? null : overloadHint(entry, sex.targetRepsMax, { timed: isTimed(exercise) })}
                  editing={editing?.sexId === sex.id ? editing : null}
                  onOpenCell={(set, field) => openCell(sex, set, field)}
                  onCheck={(set, ref) => handleCheck(sex, set, ref)}
                  onAdopt={(set, ref) => update((s) => updateSet(s, sex.id, set.id, { weight: refValue(ref, 'weight'), reps: ref.reps }))}
                  onSetMenu={(set) => setSheet({ type: 'set', sexId: sex.id, setId: set.id })}
                  onAddSet={() => {
                    haptic(5);
                    const ref = referenceForSet(entry?.sets, [...sex.sets, { type: 'effective' }], sex.sets.length);
                    update((s) => addSetToExercise(s, sex.id, ref));
                  }}
                  onMenu={() => setSheet({ type: 'exercise', sexId: sex.id, index: i })}
                  onHistory={() => setSheet({ type: 'history', exerciseId: sex.exerciseId })}
                />
              );
            })}

            {session.exercises.length === 0 && (
              <EmptyState icon={Dumbbell} title="Entreno vacío" text="Agregá los ejercicios que vas a hacer. Podés sumar más en cualquier momento." />
            )}

            <Button variant="soft" tone="entreno" block size="lg" icon={Plus} onClick={() => setSheet({ type: 'add' })}>
              Agregar ejercicios
            </Button>
            {live && (
              <Button variant="ghost" tone="red" block onClick={() => setSheet({ type: 'discard' })}>
                Descartar entreno
              </Button>
            )}
          </div>

          <div className="shrink-0">
            {live && rest.timer && <RestTimer timer={rest.timer} remaining={rest.remaining} onAdd={rest.add} onStop={rest.stop} />}
            {editing && editingInfo.set && (
              <NumberPad
                label={`${editing.field === 'weight' ? 'Peso' : isTimed(editingExercise) ? 'Segundos' : 'Reps'} · Serie ${editingInfo.index + 1}`}
                decimal={editing.field === 'weight'}
                step={editing.field === 'weight' ? 2.5 : 1}
                reference={
                  editingInfo.ref
                    ? editing.field === 'weight'
                      ? refValue(editingInfo.ref, 'weight') !== '' && `${fmtNum(editingInfo.ref.weight)} kg`
                      : `${fmtNum(editingInfo.ref.reps)}`
                    : null
                }
                nextLabel={editing.field === 'weight' ? 'Siguiente' : editingInfo.set.completed ? 'Listo' : 'Completar'}
                nextIcon={editing.field === 'weight' ? 'next' : 'check'}
                onKey={(k) => setEditing((ed) => ({ ...ed, ...applyKey(ed, k, { decimal: ed.field === 'weight' }), dirty: true }))}
                onStep={padStep}
                onNext={padNext}
                onCancel={() => setEditing(null)}
                onPlates={editing.field === 'weight' ? () => setSheet({ type: 'plates' }) : undefined}
              />
            )}
          </div>
        </div>
      </div>

      {sheet?.type === 'set' && sheetSex && sheetSetIndex !== -1 && (
        <SetMenu
          set={sheetSex.sets[sheetSetIndex]}
          index={sheetSetIndex}
          onChange={(patch) => update((s) => updateSet(s, sheetSex.id, sheet.setId, patch))}
          onDelete={() => {
            if (editing?.setId === sheet.setId) setEditing(null);
            update((s) => removeSet(s, sheetSex.id, sheet.setId));
            closeSheet();
          }}
          onClose={closeSheet}
        />
      )}

      {sheet?.type === 'exercise' && sheetSex && (
        <Sheet onClose={closeSheet} title={exercisesById[sheetSex.exerciseId]?.name || 'Ejercicio'}>
          <ListGroup>
            <ListRow icon={History} iconTone="entreno" title="Historial y progreso" chevron onClick={() => setSheet({ type: 'history', exerciseId: sheetSex.exerciseId })} />
            <ListRow icon={StickyNote} iconTone="entreno" title={sheetSex.notes ? 'Editar nota' : 'Agregar nota'} chevron onClick={() => setSheet({ type: 'notes', sexId: sheetSex.id })} />
            <ListRow icon={Repeat} iconTone="entreno" title="Sustituir por otro" chevron onClick={() => setSheet({ type: 'substitute', sexId: sheetSex.id })} />
          </ListGroup>
          <ListGroup className="mt-4">
            {sheet.index > 0 && (
              <ListRow icon={ArrowUp} iconTone="ink" title="Mover arriba" onClick={() => { update((s) => moveSessionExercise(s, sheetSex.id, -1)); closeSheet(); }} />
            )}
            {sheet.index < session.exercises.length - 1 && (
              <ListRow icon={ArrowDown} iconTone="ink" title="Mover abajo" onClick={() => { update((s) => moveSessionExercise(s, sheetSex.id, 1)); closeSheet(); }} />
            )}
            <ListRow
              icon={Trash2}
              iconTone="red"
              danger
              title="Quitar del entreno"
              onClick={() => {
                if (editing?.sexId === sheetSex.id) setEditing(null);
                const before = session;
                update((s) => removeExerciseFromSession(s, sheetSex.id));
                closeSheet();
                toast('Ejercicio quitado', { action: { label: 'Deshacer', onClick: () => update(() => before) } });
              }}
            />
          </ListGroup>
        </Sheet>
      )}

      {sheet?.type === 'notes' && sheetSex && (
        <NotesSheet value={sheetSex.notes || ''} onChange={(v) => update((s) => updateExerciseNotes(s, sheetSex.id, v))} onClose={closeSheet} />
      )}

      {(sheet?.type === 'add' || (sheet?.type === 'substitute' && sheetSex)) && (
        <ExercisePicker
          title={sheet.type === 'add' ? 'Agregar ejercicios' : 'Sustituir por'}
          multi={sheet.type === 'add'}
          exercises={exercises}
          defaultMuscle={sheet.type === 'substitute' ? exercisesById[sheetSex.exerciseId]?.muscleGroup : undefined}
          excludeIds={sheet.type === 'substitute' ? [sheetSex.exerciseId] : []}
          onCreate={onCreateExercise}
          onUpdate={onUpdateExercise}
          onArchive={onArchiveExercise}
          onClose={closeSheet}
          onPick={(ids) => {
            if (sheet.type === 'add') update((s) => addExercisesToSession(s, ids, lastSetCount));
            else update((s) => substituteExercise(s, sheetSex.id, ids[0]));
            closeSheet();
          }}
        />
      )}

      {sheet?.type === 'history' && (
        <ExerciseHistorySheet exerciseId={sheet.exerciseId} exercise={exercisesById[sheet.exerciseId]} sessionsMap={sessionsMap} onClose={closeSheet} />
      )}

      {sheet?.type === 'plates' && editing && (
        <PlateCalculator
          initial={editing.dirty ? parseBuffer(editing.buffer, true) : num(editingInfo.set?.weight) || num(refValue(editingInfo.ref, 'weight')) || ''}
          barKg={settings.barKg}
          onBarChange={(barKg) => onSettingsChange({ barKg })}
          onUse={(w) => {
            setEditing((ed) => (ed ? { ...ed, buffer: toBuffer(w), fresh: true, dirty: true } : ed));
            closeSheet();
          }}
          onClose={closeSheet}
        />
      )}

      {sheet?.type === 'finish' && (
        <FinishSheet
          session={session}
          sessionsMap={sessionsMap}
          exercisesById={exercisesById}
          pendingSets={pending}
          onClose={closeSheet}
          onDiscard={() => {
            rest.stop();
            onDiscard();
          }}
          onSave={(finished) => {
            rest.stop();
            onSave(finished);
          }}
        />
      )}

      {sheet?.type === 'discard' && (
        <Sheet onClose={closeSheet} title="¿Descartar el entreno?">
          <p className="text-[15px] text-ink-400 leading-snug">Se pierden las series que registraste en esta sesión.</p>
          <div className="mt-5 space-y-2">
            <Button
              block
              size="lg"
              tone="red"
              onClick={() => {
                rest.stop();
                onDiscard();
              }}
            >
              Descartar
            </Button>
            <Button block variant="ghost" tone="ink" onClick={closeSheet}>
              Seguir entrenando
            </Button>
          </div>
        </Sheet>
      )}
    </Overlay>
  );
}

/** Fecha y duración, al editar o cargar un entreno pasado. */
function SessionMeta({ session, onChange }) {
  const minutes = session.endedAt && session.startedAt ? Math.max(1, Math.round((session.endedAt - session.startedAt) / 60000)) : 60;
  const [dur, setDur] = useState(String(minutes));
  const today = dateKeyOf();
  return (
    <div className="surface rounded-3xl p-4 grid grid-cols-2 gap-3">
      <label className="block">
        <span className="block text-xs font-medium text-ink-500 mb-1.5 px-1">Fecha</span>
        <input
          type="date"
          value={session.date}
          max={today}
          onChange={(e) => {
            const date = e.target.value;
            if (!date || date > today) return;
            onChange((s) => {
              const startedAt = new Date(`${date}T18:00:00`).getTime();
              const len = (s.endedAt || s.startedAt) - s.startedAt || 3600000;
              return { ...s, date, startedAt, endedAt: startedAt + len };
            });
          }}
          className="field num"
        />
      </label>
      <NumberField
        label="Duración"
        unit="min"
        value={dur}
        onChange={(v) => {
          setDur(v);
          const n = Math.round(num(v));
          if (n > 0) onChange((s) => ({ ...s, endedAt: s.startedAt + n * 60000 }));
        }}
      />
      <p className="col-span-2 text-xs text-ink-500 px-1">{formatMinutes(minutes)} · las series sin tildar no se guardan.</p>
    </div>
  );
}
