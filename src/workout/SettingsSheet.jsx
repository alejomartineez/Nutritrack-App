import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Sheet, ListGroup, ListRow, Stepper, Switch, Button } from '../ui';
import { ExerciseForm } from './ExercisePicker';
import { formatClock } from './format';

export default function SettingsSheet({ settings, onChange, exercises, onCreateExercise, onUpdateExercise, onArchiveExercise, onClose }) {
  const [form, setForm] = useState(null); // { initial? }
  const custom = exercises.filter((e) => e.isCustom && !e.archived).sort((a, b) => a.name.localeCompare(b.name, 'es'));

  return (
    <Sheet onClose={onClose} title="Ajustes de entreno" size="large">
      <div className="space-y-6">
        <ListGroup footer="Arranca solo cada vez que completás una serie. Durante el descanso podés sumar o restar 15 s.">
          <ListRow
            title="Descanso"
            right={<Stepper tone="entreno" value={settings.restSec} step={15} min={15} max={600} format={formatClock} onChange={(restSec) => onChange({ restSec })} />}
          />
          <ListRow title="Sonido al terminar" right={<Switch tone="entreno" label="Sonido al terminar el descanso" checked={settings.sound !== false} onChange={(sound) => onChange({ sound })} />} />
        </ListGroup>

        {custom.length > 0 ? (
          <ListGroup title="Mis ejercicios" footer="Tocá uno para editarlo o eliminarlo.">
            {custom.map((e) => (
              <ListRow key={e.id} title={e.name} subtitle={`${e.muscleGroup} · ${e.equipment}`} chevron onClick={() => setForm({ initial: e })} />
            ))}
          </ListGroup>
        ) : (
          <div className="px-1">
            <h3 className="text-[13px] font-medium uppercase tracking-wide text-ink-500">Mis ejercicios</h3>
            <p className="text-sm text-ink-500 mt-1">Si un ejercicio no está en la lista, crealo y queda disponible para tus rutinas.</p>
          </div>
        )}
        <Button variant="soft" tone="entreno" block icon={Plus} onClick={() => setForm({})}>
          Nuevo ejercicio
        </Button>
      </div>

      {form && (
        <ExerciseForm
          initial={form.initial}
          onClose={() => setForm(null)}
          onSave={(data) => {
            if (form.initial) onUpdateExercise(form.initial.id, data);
            else onCreateExercise(data);
            setForm(null);
          }}
          onArchive={
            form.initial
              ? () => {
                  onArchiveExercise(form.initial.id);
                  setForm(null);
                }
              : undefined
          }
        />
      )}
    </Sheet>
  );
}
