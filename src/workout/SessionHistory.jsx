import React, { useState } from 'react';
import { ChevronDown, ChevronUp, History } from 'lucide-react';
import { summarizeSession } from './workoutStorage';

// ---------------------------------------------------------------------------
// Historial de sesiones.
//
// Faltaba entero: se terminaba un entreno y desaparecía dentro de los gráficos.
// No había forma de responder "¿cuánto levanté el lunes?" sin exportar el CSV.
// ---------------------------------------------------------------------------

const formatVolume = (kg) => (kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${kg}kg`);

const formatDate = (dateKey) => {
  const d = new Date(`${dateKey}T00:00:00`);
  const text = d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
  return text.charAt(0).toUpperCase() + text.slice(1);
};

function SessionDetail({ session, exercisesById }) {
  return (
    <div className="mt-3 pt-3 border-t border-ink-700 space-y-2.5">
      {session.exercises.map((ex) => {
        const done = ex.sets.filter((s) => s.completed);
        if (done.length === 0) return null;
        const exercise = exercisesById[ex.exerciseId];
        return (
          <div key={ex.id}>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs font-semibold text-ink-200 truncate">{exercise?.name || 'Ejercicio eliminado'}</p>
              <span className="text-[10px] text-ink-500 shrink-0">{exercise?.muscleGroup}</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {done.map((s) => (
                <span
                  key={s.id}
                  className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
                    s.type === 'warmup' ? 'bg-ink-900 text-ink-500' : 'bg-ink-900 text-ink-300'
                  }`}
                >
                  {s.weight || 0}×{s.reps || 0}
                  {s.rir !== '' && s.rir != null && <span className="text-ink-500"> ·{s.rir}</span>}
                </span>
              ))}
            </div>
            {ex.notes && <p className="text-[11px] text-ink-500 italic mt-1">{ex.notes}</p>}
          </div>
        );
      })}
    </div>
  );
}

export default function SessionHistory({ sessions, exercisesById, initialCount = 5 }) {
  const [expandedId, setExpandedId] = useState(null);
  const [showAll, setShowAll] = useState(false);

  if (sessions.length === 0) return null;

  const visible = showAll ? sessions : sessions.slice(0, initialCount);

  return (
    <div className="rounded-3xl surface p-5">
      <div className="flex items-center gap-2 mb-3.5">
        <History className="w-4 h-4 text-entreno-400" />
        <h2 className="label-section">Historial de sesiones</h2>
        <span className="ml-auto text-xs text-ink-500 font-mono">{sessions.length}</span>
      </div>

      <ul className="space-y-2">
        {visible.map((session) => {
          const summary = summarizeSession(session, exercisesById);
          const open = expandedId === session.id;
          return (
            <li key={session.id} className="rounded-2xl bg-ink-900 border border-ink-700 px-3.5 py-3">
              <button
                onClick={() => setExpandedId(open ? null : session.id)}
                aria-expanded={open}
                className="w-full flex items-center justify-between gap-3 text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink-100 truncate">{session.dayName}</p>
                  <p className="text-xs text-ink-500 mt-0.5">
                    {formatDate(session.date)}
                    {summary.durationMin != null && ` · ${summary.durationMin} min`}
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="text-right">
                    <p className="font-mono text-sm font-bold text-entreno-300">{formatVolume(summary.volume)}</p>
                    <p className="text-[10px] text-ink-500">{summary.effectiveSets} series</p>
                  </div>
                  {open ? (
                    <ChevronUp className="w-4 h-4 text-ink-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-ink-500" />
                  )}
                </div>
              </button>
              {open && <SessionDetail session={session} exercisesById={exercisesById} />}
            </li>
          );
        })}
      </ul>

      {sessions.length > initialCount && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="w-full mt-3 py-2 text-xs font-semibold text-entreno-300 hover:bg-entreno-500/5 rounded-xl"
        >
          {showAll ? 'Mostrar menos' : `Ver las ${sessions.length} sesiones`}
        </button>
      )}
    </div>
  );
}
