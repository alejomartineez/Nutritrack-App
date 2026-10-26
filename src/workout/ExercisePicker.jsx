import React, { useMemo, useState } from 'react';
import { Search, Plus, Check, Pencil, X } from 'lucide-react';
import { Sheet, Button, Chip, TextField } from '../ui';
import { MUSCLE_GROUPS, EQUIPMENT_TYPES, normalizeText } from './workoutData';

const selectClass = 'field appearance-none';

/** Alta / edición de un ejercicio propio. */
export function ExerciseForm({ initial, defaultName = '', defaultMuscle, onSave, onArchive, onClose }) {
  const [name, setName] = useState(initial?.name ?? defaultName);
  const [muscleGroup, setMuscle] = useState(initial?.muscleGroup ?? defaultMuscle ?? MUSCLE_GROUPS[0]);
  const [equipment, setEquipment] = useState(initial?.equipment ?? EQUIPMENT_TYPES[0]);
  const [confirm, setConfirm] = useState(false);
  const valid = name.trim().length > 0;

  return (
    <Sheet
      onClose={onClose}
      title={initial ? 'Editar ejercicio' : 'Nuevo ejercicio'}
      footer={
        <Button block size="lg" tone="entreno" disabled={!valid} onClick={() => onSave({ name: name.trim(), muscleGroup, equipment })}>
          {initial ? 'Guardar' : 'Crear ejercicio'}
        </Button>
      }
    >
      <div className="space-y-4">
        <TextField label="Nombre" value={name} onChange={setName} placeholder="Ej.: Press Arnold" autoFocus={!initial} />
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-ink-500 mb-1.5 px-1">Músculo</span>
            <select value={muscleGroup} onChange={(e) => setMuscle(e.target.value)} className={selectClass}>
              {MUSCLE_GROUPS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-ink-500 mb-1.5 px-1">Equipo</span>
            <select value={equipment} onChange={(e) => setEquipment(e.target.value)} className={selectClass}>
              {EQUIPMENT_TYPES.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
        </div>
        {initial && onArchive && (
          <div className="pt-2">
            {confirm ? (
              <div className="rounded-2xl bg-red-500/10 p-3.5">
                <p className="text-sm text-ink-200">Deja de aparecer en la lista. Tu historial con este ejercicio se conserva.</p>
                <div className="flex gap-2 mt-3">
                  <Button variant="soft" tone="ink" className="flex-1" onClick={() => setConfirm(false)}>
                    Cancelar
                  </Button>
                  <Button tone="red" className="flex-1" onClick={onArchive}>
                    Eliminar
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="ghost" tone="red" block onClick={() => setConfirm(true)}>
                Eliminar ejercicio
              </Button>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}

/**
 * Buscador de ejercicios. `multi`: se tildan varios y se confirman juntos;
 * si no, tocar uno lo elige.
 */
export default function ExercisePicker({ title, exercises, multi = false, defaultMuscle, excludeIds = [], onPick, onClose, onCreate, onUpdate, onArchive }) {
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState(defaultMuscle || 'Todos');
  const [selected, setSelected] = useState([]);
  const [form, setForm] = useState(null); // { initial? }

  const list = useMemo(() => {
    const q = normalizeText(query);
    const words = q.split(/\s+/).filter(Boolean);
    const exclude = new Set(excludeIds);
    return exercises
      .filter((e) => !e.archived && !exclude.has(e.id))
      .filter((e) => muscle === 'Todos' || e.muscleGroup === muscle)
      .filter((e) => {
        if (!words.length) return true;
        const hay = normalizeText(`${e.name} ${e.muscleGroup} ${e.equipment}`);
        return words.every((w) => hay.includes(w));
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [exercises, query, muscle, excludeIds]);

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const choose = (id) => {
    if (multi) toggle(id);
    else onPick([id]);
  };

  const saveForm = (data) => {
    if (form?.initial) {
      onUpdate(form.initial.id, data);
      setForm(null);
      return;
    }
    const created = onCreate(data);
    setForm(null);
    setQuery('');
    if (multi) setSelected((s) => [...s, created.id]);
    else onPick([created.id]);
  };

  return (
    <Sheet
      onClose={onClose}
      title={title}
      size="large"
      bodyClassName=""
      footer={
        multi ? (
          <Button block size="lg" tone="entreno" disabled={!selected.length} onClick={() => onPick(selected)}>
            {selected.length ? `Agregar ${selected.length} ejercicio${selected.length === 1 ? '' : 's'}` : 'Elegí ejercicios'}
          </Button>
        ) : null
      }
    >
      <div className="h-full flex flex-col">
        <div className="px-5 pb-2 shrink-0">
          <label className="field flex items-center gap-2 py-2.5">
            <Search className="w-4 h-4 text-ink-500 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar"
              className="flex-1 min-w-0 bg-transparent outline-none text-ink-100 placeholder-ink-500"
              enterKeyHint="search"
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Borrar búsqueda" className="btn-icon w-6 h-6 bg-ink-600 text-ink-900">
                <X className="w-3.5 h-3.5" strokeWidth={3} />
              </button>
            )}
          </label>
          <div className="flex gap-2 overflow-x-auto -mx-5 px-5 mt-2.5 pb-1">
            {['Todos', ...MUSCLE_GROUPS].map((m) => (
              <Chip key={m} tone="entreno" active={muscle === m} onClick={() => setMuscle(m)} className="h-8 px-3 text-[13px]">
                {m}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-4">
          <ul className="px-3">
            {list.map((e) => {
              const on = selected.includes(e.id);
              return (
                <li key={e.id} className="flex items-center">
                  <button onClick={() => choose(e.id)} className="flex-1 min-w-0 flex items-center gap-3 px-2 py-2.5 rounded-xl text-left active:bg-ink-700/40" style={{ transform: 'none' }}>
                    {multi && (
                      <span
                        className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center transition-colors ${
                          on ? 'bg-entreno-500 text-onaccent' : 'border-2 border-ink-600'
                        }`}
                      >
                        {on && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className={`block text-[15px] truncate ${on ? 'text-entreno-300 font-semibold' : 'text-ink-100'}`}>{e.name}</span>
                      <span className="block text-xs text-ink-500 mt-0.5">
                        {e.muscleGroup} · {e.equipment}
                        {e.isCustom && ' · propio'}
                      </span>
                    </span>
                  </button>
                  {e.isCustom && onUpdate && (
                    <button onClick={() => setForm({ initial: e })} aria-label={`Editar ${e.name}`} className="btn-icon w-9 h-9 text-ink-500 shrink-0">
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          {list.length === 0 && <p className="text-center text-sm text-ink-500 py-6 px-6">No hay ejercicios con «{query || muscle}».</p>}

          {onCreate && (
            <div className="px-5 pt-2">
              <Button variant="soft" tone="entreno" block icon={Plus} onClick={() => setForm({})}>
                {query.trim() ? `Crear «${query.trim()}»` : 'Crear ejercicio'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {form && (
        <ExerciseForm
          initial={form.initial}
          defaultName={query.trim()}
          defaultMuscle={muscle !== 'Todos' ? muscle : undefined}
          onSave={saveForm}
          onArchive={
            form.initial && onArchive
              ? () => {
                  onArchive(form.initial.id);
                  setSelected((s) => s.filter((x) => x !== form.initial.id));
                  setForm(null);
                }
              : undefined
          }
          onClose={() => setForm(null)}
        />
      )}
    </Sheet>
  );
}
