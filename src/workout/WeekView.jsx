import React, { useMemo, useState } from 'react';
import { Dumbbell, Plus, Play, Trash2, ChevronDown, Moon, Settings2, X } from 'lucide-react';
import { ROUTINE_TEMPLATES } from './workoutData';
import ExercisePickerModal from './ExercisePickerModal';

function NewRoutineModal({ onCreate, onClose }) {
  const [templateId, setTemplateId] = useState(ROUTINE_TEMPLATES[0].id);
  const [name, setName] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4">
      <div className="w-full max-w-md bg-neutral-900 border border-orange-500/30 rounded-t-3xl sm:rounded-3xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-100">Nueva rutina semanal</h2>
          <button onClick={onClose} aria-label="Cerrar" className="p-2 rounded-full hover:bg-neutral-800">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <p className="text-xs font-semibold text-orange-300 mb-2 uppercase tracking-wide">Distribución semanal</p>
        <div className="space-y-2 mb-4">
          {ROUTINE_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTemplateId(t.id)}
              className={`w-full text-left rounded-2xl border p-3.5 ${
                templateId === t.id ? 'bg-orange-500/15 border-orange-500/50' : 'bg-neutral-800/60 border-neutral-700'
              }`}
            >
              <p className="text-sm font-semibold text-slate-100">{t.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{t.days.join(' · ')}</p>
            </button>
          ))}
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la rutina (opcional)"
          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-400 mb-4"
        />
        <button
          onClick={() => onCreate(templateId, name)}
          className="w-full rounded-xl bg-orange-500 text-neutral-900 py-3 text-sm font-bold hover:bg-orange-400 focus-visible:ring-2 focus-visible:ring-orange-300"
        >
          Crear rutina
        </button>
      </div>
    </div>
  );
}

function DayEditor({ day, exercises, exercisesById, onAddExercise, onRemoveExercise, onUpdateTarget, onClose }) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4">
      <div className="w-full max-w-md bg-neutral-900 border border-orange-500/30 rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">{day.weekday}</p>
            <h2 className="text-lg font-bold text-slate-100">{day.name}</h2>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="p-2 rounded-full hover:bg-neutral-800">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto mt-3 space-y-2">
          {day.exercises.length === 0 && (
            <div className="rounded-2xl border border-dashed border-neutral-700 p-6 text-center text-slate-500 text-sm">
              Todavía no agregaste ejercicios a este día.
            </div>
          )}
          {day.exercises.map((rex) => {
            const exercise = exercisesById[rex.exerciseId];
            if (!exercise) return null;
            return (
              <div key={rex.id} className="rounded-2xl bg-neutral-800/60 border border-neutral-700 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{exercise.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{exercise.muscleGroup} · {exercise.equipment}</p>
                  </div>
                  <button
                    onClick={() => onRemoveExercise(rex.id)}
                    aria-label="Quitar ejercicio"
                    className="p-2 rounded-full hover:bg-neutral-700 shrink-0"
                  >
                    <Trash2 className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2.5 text-xs">
                  <label className="text-slate-500">Series objetivo</label>
                  <input
                    type="number"
                    min="1"
                    value={rex.targetSets}
                    onChange={(e) => onUpdateTarget(rex.id, { targetSets: parseInt(e.target.value) || 1 })}
                    className="w-14 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <label className="text-slate-500 ml-1">Reps</label>
                  <input
                    type="number"
                    min="1"
                    value={rex.targetRepsMin}
                    onChange={(e) => onUpdateTarget(rex.id, { targetRepsMin: parseInt(e.target.value) || 1 })}
                    className="w-12 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <span className="text-slate-600">-</span>
                  <input
                    type="number"
                    min="1"
                    value={rex.targetRepsMax}
                    onChange={(e) => onUpdateTarget(rex.id, { targetRepsMax: parseInt(e.target.value) || 1 })}
                    className="w-12 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => setPickerOpen(true)}
          className="w-full mt-3 rounded-2xl border border-dashed border-orange-500/40 text-orange-300 py-3 text-sm font-semibold hover:bg-orange-500/5 focus-visible:ring-2 focus-visible:ring-orange-400 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Agregar ejercicio
        </button>

        {pickerOpen && (
          <ExercisePickerModal
            title="Agregar a este día"
            exercises={exercises}
            onSelect={(exerciseId) => {
              onAddExercise(exerciseId);
              setPickerOpen(false);
            }}
            onCreateCustom={(data) => {
              const newId = onAddExercise(null, data);
              setPickerOpen(false);
              return newId;
            }}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

export default function WeekView({
  routines,
  activeRoutine,
  activeRoutineId,
  setActiveRoutineId,
  exercises,
  onCreateRoutine,
  onAddExercise,
  onRemoveExercise,
  onUpdateTarget,
  onCreateCustomExercise,
  onStartSession,
  hasSessionToday,
}) {
  const [showNewRoutine, setShowNewRoutine] = useState(false);
  const [editingDayId, setEditingDayId] = useState(null);
  const [showRoutineSwitcher, setShowRoutineSwitcher] = useState(false);

  const exercisesById = useMemo(() => Object.fromEntries(exercises.map((e) => [e.id, e])), [exercises]);

  if (!activeRoutine) {
    return (
      <div className="space-y-5">
        <div className="rounded-3xl bg-gradient-to-br from-orange-500/15 to-neutral-900 border border-orange-500/30 p-6 text-center">
          <Dumbbell className="w-10 h-10 text-orange-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-100 mb-1">Creá tu primera rutina</h2>
          <p className="text-sm text-slate-400 mb-4">
            Elegí una distribución semanal (Push/Pull/Legs, Torso/Pierna, Full Body o Calistenia) y armá tus días de
            entrenamiento.
          </p>
          <button
            onClick={() => setShowNewRoutine(true)}
            className="rounded-xl bg-orange-500 text-neutral-900 px-5 py-3 text-sm font-bold hover:bg-orange-400 focus-visible:ring-2 focus-visible:ring-orange-300"
          >
            + Crear rutina
          </button>
        </div>
        {showNewRoutine && (
          <NewRoutineModal
            onCreate={(templateId, name) => {
              onCreateRoutine(templateId, name);
              setShowNewRoutine(false);
            }}
            onClose={() => setShowNewRoutine(false)}
          />
        )}
      </div>
    );
  }

  const editingDay = editingDayId ? activeRoutine.days.find((d) => d.id === editingDayId) : null;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-neutral-900/60 border border-orange-500/20 p-3 flex items-center justify-between">
        <button
          onClick={() => setShowRoutineSwitcher((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-200"
        >
          {activeRoutine.name} <ChevronDown className="w-4 h-4 text-slate-500" />
        </button>
        <button
          onClick={() => setShowNewRoutine(true)}
          className="text-xs font-semibold text-orange-400 hover:text-orange-300"
        >
          + Nueva rutina
        </button>
      </div>

      {showRoutineSwitcher && routines.length > 1 && (
        <div className="rounded-2xl bg-neutral-800/60 border border-neutral-700 p-2 space-y-1">
          {routines.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                setActiveRoutineId(r.id);
                setShowRoutineSwitcher(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm ${
                r.id === activeRoutineId ? 'bg-orange-500/20 text-orange-300 font-semibold' : 'text-slate-300 hover:bg-neutral-700'
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2.5">
        {activeRoutine.days.map((day) => {
          const exCount = day.exercises.length;
          return (
            <div
              key={day.id}
              className={`rounded-2xl border p-4 ${
                day.isRest ? 'bg-neutral-900/40 border-neutral-800' : 'bg-neutral-800/60 border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">{day.weekday}</p>
                  <p className="text-sm font-bold text-slate-100 truncate">{day.name}</p>
                  {!day.isRest && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {exCount === 0 ? 'Sin ejercicios todavía' : `${exCount} ejercicio${exCount === 1 ? '' : 's'}`}
                    </p>
                  )}
                </div>
                {day.isRest ? (
                  <Moon className="w-5 h-5 text-slate-600 shrink-0" />
                ) : (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setEditingDayId(day.id)}
                      aria-label="Editar día"
                      className="p-2.5 rounded-full hover:bg-neutral-700 focus-visible:ring-2 focus-visible:ring-orange-400"
                    >
                      <Settings2 className="w-4 h-4 text-slate-400" />
                    </button>
                    <button
                      onClick={() => onStartSession(day)}
                      disabled={exCount === 0}
                      aria-label="Empezar entrenamiento"
                      className={`p-2.5 rounded-full focus-visible:ring-2 focus-visible:ring-orange-400 ${
                        exCount === 0 ? 'bg-neutral-700 opacity-40' : 'bg-orange-500 hover:bg-orange-400'
                      }`}
                    >
                      <Play className={`w-4 h-4 ${exCount === 0 ? 'text-slate-400' : 'text-neutral-900'}`} fill="currentColor" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editingDay && (
        <DayEditor
          day={editingDay}
          exercises={exercises}
          exercisesById={exercisesById}
          onAddExercise={(exerciseId, customData) => {
            if (customData) {
              const newId = onCreateCustomExercise(customData);
              onAddExercise(editingDay.id, newId);
              return newId;
            }
            onAddExercise(editingDay.id, exerciseId);
          }}
          onRemoveExercise={(rexId) => onRemoveExercise(editingDay.id, rexId)}
          onUpdateTarget={(rexId, patch) => onUpdateTarget(editingDay.id, rexId, patch)}
          onClose={() => setEditingDayId(null)}
        />
      )}

      {showNewRoutine && (
        <NewRoutineModal
          onCreate={(templateId, name) => {
            onCreateRoutine(templateId, name);
            setShowNewRoutine(false);
          }}
          onClose={() => setShowNewRoutine(false)}
        />
      )}
    </div>
  );
}
