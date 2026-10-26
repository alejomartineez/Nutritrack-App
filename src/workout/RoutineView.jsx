import React, { useState } from 'react';
import { MoreHorizontal, Plus, Check, Pencil, Trash2 } from 'lucide-react';
import { Sheet, Button, Card, ListGroup, ListRow, TextField, toast } from '../ui';
import { mondayIndex, WEEKDAY_INITIALS } from '../lib/dates';
import { ROUTINE_TEMPLATES } from './workoutData';
import { updateDay, addExercisesToDay, removeExerciseFromDay, moveDayExercise, updateRoutineExerciseTarget } from './workoutStorage';
import { plural } from './format';
import DayEditor from './DayEditor';

function TemplateList({ onPick }) {
  return (
    <div className="space-y-3">
      {ROUTINE_TEMPLATES.map((t) => {
        const training = t.days.filter(Boolean);
        const count = training.reduce((n, d) => n + d[1].length, 0);
        return (
          <Card as="button" key={t.id} onClick={() => onPick(t.id)} className="w-full text-left active:opacity-80" style={{ transform: 'none' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[17px] font-semibold text-ink-50">{t.name}</p>
                <p className="text-sm text-ink-400 mt-0.5 leading-snug">{t.description}</p>
              </div>
              <span className="text-xs text-ink-500 num shrink-0 pt-1">{count ? plural(count, 'ejercicio', 'ejercicios') : 'vacía'}</span>
            </div>
            <div className="flex gap-1.5 mt-3" aria-label={`${training.length} días de entreno`}>
              {t.days.map((d, i) => (
                <span
                  key={i}
                  className={`w-7 h-7 rounded-full text-[11px] font-bold flex items-center justify-center ${d ? 'bg-entreno-500/15 text-entreno-300' : 'text-ink-600'}`}
                >
                  {WEEKDAY_INITIALS[i]}
                </span>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function RoutinesSheet({ routines, activeId, onSelect, onRename, onDelete, onNew, onClose }) {
  const [renaming, setRenaming] = useState(null);
  const [name, setName] = useState('');
  const [confirmId, setConfirmId] = useState(null);

  if (renaming) {
    return (
      <Sheet
        onClose={() => setRenaming(null)}
        title="Renombrar rutina"
        footer={
          <Button
            block
            size="lg"
            tone="entreno"
            disabled={!name.trim()}
            onClick={() => {
              onRename(renaming, name.trim());
              setRenaming(null);
            }}
          >
            Guardar
          </Button>
        }
      >
        <TextField value={name} onChange={setName} autoFocus aria-label="Nombre de la rutina" />
      </Sheet>
    );
  }

  return (
    <Sheet onClose={onClose} title="Mis rutinas">
      <ListGroup footer="La rutina activa es la que aparece en Hoy.">
        {routines.map((r) => (
          <ListRow
            key={r.id}
            title={r.name}
            subtitle={`${plural(r.days.filter((d) => !d.isRest).length, 'día', 'días')} de entreno`}
            onClick={() => onSelect(r.id)}
            right={
              <span className="flex items-center gap-1 shrink-0">
                {r.id === activeId && <Check className="w-5 h-5 text-entreno-400 mr-1" strokeWidth={2.5} />}
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Renombrar ${r.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setName(r.name);
                    setRenaming(r.id);
                  }}
                  className="btn-icon w-9 h-9 text-ink-500"
                >
                  <Pencil className="w-4 h-4" />
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Eliminar ${r.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmId(r.id);
                  }}
                  className="btn-icon w-9 h-9 text-ink-500"
                >
                  <Trash2 className="w-4 h-4" />
                </span>
              </span>
            }
          />
        ))}
      </ListGroup>
      {confirmId && (
        <div className="rounded-2xl bg-red-500/10 p-4 mt-4">
          <p className="text-sm text-ink-200">¿Eliminar «{routines.find((r) => r.id === confirmId)?.name}»? Tus entrenos guardados no se borran.</p>
          <div className="flex gap-2 mt-3">
            <Button variant="soft" tone="ink" className="flex-1" onClick={() => setConfirmId(null)}>
              Cancelar
            </Button>
            <Button
              tone="red"
              className="flex-1"
              onClick={() => {
                onDelete(confirmId);
                setConfirmId(null);
              }}
            >
              Eliminar
            </Button>
          </div>
        </div>
      )}
      <Button variant="soft" tone="entreno" block icon={Plus} className="mt-4" onClick={onNew}>
        Nueva rutina
      </Button>
    </Sheet>
  );
}

export default function RoutineView({
  routines,
  routine,
  setActiveRoutineId,
  onCreate,
  onRename,
  onDelete,
  updateRoutine,
  exercises,
  exercisesById,
  exerciseActions,
  editDayId,
  setEditDayId,
  onStart,
}) {
  const [manage, setManage] = useState(false);
  const [templates, setTemplates] = useState(false);
  const todayIdx = mondayIndex(new Date());

  const create = (templateId) => {
    onCreate(templateId);
    setTemplates(false);
    setManage(false);
    toast('Rutina lista. Tocá un día para ajustarlo.');
  };

  if (!routine) {
    return (
      <div className="pt-1">
        <p className="text-[15px] text-ink-400 px-1 mb-4 leading-snug">Elegí una plantilla: viene con ejercicios, series y reps, y después la ajustás a tu gusto.</p>
        <TemplateList onPick={create} />
      </div>
    );
  }

  const editingDay = editDayId ? routine.days.find((d) => d.id === editDayId) : null;
  const edit = (fn) => updateRoutine(routine.id, fn);

  return (
    <div className="space-y-4 pt-1">
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="text-xs text-ink-500">Rutina activa</p>
          <h2 className="text-xl font-bold text-ink-50 truncate">{routine.name}</h2>
        </div>
        <Button variant="soft" tone="ink" size="sm" icon={MoreHorizontal} onClick={() => setManage(true)}>
          Rutinas
        </Button>
      </div>

      <ListGroup footer="Tocá un día para cambiarle el nombre, los ejercicios o marcarlo como descanso.">
        {routine.days.map((d, i) => {
          const names = (d.exercises || []).map((rex) => exercisesById[rex.exerciseId]?.name).filter(Boolean);
          return (
            <ListRow
              key={d.id}
              onClick={() => setEditDayId(d.id)}
              chevron
              title={
                <span className={d.isRest ? 'text-ink-500' : ''}>
                  {d.isRest ? 'Descanso' : d.name}
                  {i === todayIdx && <span className="ml-2 text-xs font-semibold text-entreno-400">Hoy</span>}
                </span>
              }
              subtitle={d.isRest ? d.weekday : `${d.weekday} · ${names.length ? names.slice(0, 3).join(', ') + (names.length > 3 ? '…' : '') : 'sin ejercicios'}`}
              right={
                <span
                  className={`order-first -ml-1 w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-bold shrink-0 ${
                    d.isRest ? 'bg-ink-700/50 text-ink-500' : 'bg-entreno-500/15 text-entreno-300'
                  }`}
                >
                  {WEEKDAY_INITIALS[i]}
                </span>
              }
            />
          );
        })}
      </ListGroup>

      {editingDay && (
        <DayEditor
          day={editingDay}
          exercises={exercises}
          exercisesById={exercisesById}
          exerciseActions={exerciseActions}
          onClose={() => setEditDayId(null)}
          onChangeDay={(patch) => edit((r) => updateDay(r, editingDay.id, patch))}
          onAddExercises={(ids) => edit((r) => addExercisesToDay(r, editingDay.id, ids))}
          onRemoveExercise={(rexId) => edit((r) => removeExerciseFromDay(r, editingDay.id, rexId))}
          onMoveExercise={(rexId, dir) => edit((r) => moveDayExercise(r, editingDay.id, rexId, dir))}
          onUpdateTarget={(rexId, patch) => edit((r) => updateRoutineExerciseTarget(r, editingDay.id, rexId, patch))}
          onStart={(day) => {
            setEditDayId(null);
            onStart(day);
          }}
        />
      )}

      {manage && !templates && (
        <RoutinesSheet
          routines={routines}
          activeId={routine.id}
          onSelect={(id) => {
            setActiveRoutineId(id);
            setManage(false);
          }}
          onRename={onRename}
          onDelete={onDelete}
          onNew={() => setTemplates(true)}
          onClose={() => setManage(false)}
        />
      )}

      {templates && (
        <Sheet onClose={() => setTemplates(false)} title="Nueva rutina" size="large">
          <TemplateList onPick={create} />
        </Sheet>
      )}
    </div>
  );
}
