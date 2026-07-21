import React, { useMemo, useState } from 'react';
import { X, Search, Plus } from 'lucide-react';
import { MUSCLE_GROUPS, EQUIPMENT_TYPES } from './workoutData';

export default function ExercisePickerModal({ title, exercises, onSelect, onCreateCustom, onClose, defaultMuscleGroup }) {
  const [query, setQuery] = useState('');
  const [muscleFilter, setMuscleFilter] = useState(defaultMuscleGroup || 'Todos');
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMuscle, setNewMuscle] = useState(defaultMuscleGroup || MUSCLE_GROUPS[0]);
  const [newEquipment, setNewEquipment] = useState(EQUIPMENT_TYPES[0]);

  const filtered = useMemo(() => {
    return exercises.filter((ex) => {
      const matchesQuery = ex.name.toLowerCase().includes(query.toLowerCase());
      const matchesMuscle = muscleFilter === 'Todos' || ex.muscleGroup === muscleFilter;
      return matchesQuery && matchesMuscle;
    });
  }, [exercises, query, muscleFilter]);

  const submitNew = () => {
    if (!newName.trim()) return;
    onCreateCustom({ name: newName, muscleGroup: newMuscle, equipment: newEquipment });
    setNewName('');
    setShowNewForm(false);
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center scrim px-0 sm:px-4">
      <div className="w-full max-w-md sheet rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-100">{title || 'Elegí un ejercicio'}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="btn-icon hover:bg-neutral-800">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="relative mb-3">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar ejercicio..."
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-entreno-400"
          />
        </div>

        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {['Todos', ...MUSCLE_GROUPS].map((m) => (
            <button
              key={m}
              onClick={() => setMuscleFilter(m)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                muscleFilter === m
                  ? 'bg-entreno-500 text-neutral-900 border-entreno-400'
                  : 'bg-neutral-800 text-slate-400 border-neutral-700'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {filtered.map((ex) => (
            <button
              key={ex.id}
              onClick={() => onSelect(ex.id)}
              className="w-full text-left rounded-2xl bg-neutral-800/60 border border-neutral-700 p-3.5 flex items-center justify-between gap-3 hover:border-entreno-500/50"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-200">{ex.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {ex.muscleGroup} · {ex.equipment}
                  {ex.isCustom && <span className="ml-1.5 text-entreno-400">· personalizado</span>}
                </p>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-slate-500 py-6">No encontramos ejercicios con ese filtro.</p>
          )}
        </div>

        {!showNewForm ? (
          <button
            onClick={() => setShowNewForm(true)}
            className="w-full mt-3 rounded-2xl border border-dashed border-entreno-500/40 text-entreno-300 py-3 text-sm font-semibold hover:bg-entreno-500/5 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Crear ejercicio personalizado
          </button>
        ) : (
          <div className="mt-3 rounded-2xl surface p-4 space-y-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre del ejercicio"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-entreno-400"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newMuscle}
                onChange={(e) => setNewMuscle(e.target.value)}
                className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-entreno-400"
              >
                {MUSCLE_GROUPS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select
                value={newEquipment}
                onChange={(e) => setNewEquipment(e.target.value)}
                className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-entreno-400"
              >
                {EQUIPMENT_TYPES.map((eq) => (
                  <option key={eq} value={eq}>{eq}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowNewForm(false)}
                className="flex-1 rounded-xl border border-neutral-700 text-slate-300 py-2 text-sm font-semibold hover:bg-neutral-700"
              >
                Cancelar
              </button>
              <button
                onClick={submitNew}
                className="flex-1 rounded-xl bg-entreno-500 text-neutral-900 py-2 text-sm font-bold hover:bg-entreno-400"
              >
                Crear y usar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
