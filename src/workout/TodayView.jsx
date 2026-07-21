import React from 'react';
import { Dumbbell, Play, Moon, Check, Settings2, ChevronRight, Flame, CalendarDays } from 'lucide-react';

// ---------------------------------------------------------------------------
// Entreno · Hoy
//
// La acción principal del módulo es "empezar el entreno de hoy", y antes vivía
// escondida en el botón de play de una de siete tarjetas idénticas. Acá es lo
// primero y lo más grande de la pantalla; la semana y las analíticas pasan a
// ser consulta.
// ---------------------------------------------------------------------------

const formatVolume = (kg) => (kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${kg}kg`);

const formatDate = (dateKey) => {
  const d = new Date(`${dateKey}T00:00:00`);
  const text = d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** Tira de 7 puntos con lo que tocaba y lo que se hizo esta semana. */
function WeekStrip({ weekPlan, onSelectDay }) {
  const plannedDays = weekPlan.filter((d) => !d.isRest && d.dayName);
  const doneDays = weekPlan.filter((d) => d.trained);

  return (
    <div className="rounded-2xl surface p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="label-section">Tu semana</h2>
        <p className="text-xs text-ink-400">
          <span className="font-mono font-bold text-ink-100">{doneDays.length}</span>
          {plannedDays.length > 0 && <span> de {plannedDays.length} entrenos</span>}
        </p>
      </div>

      <div className="flex justify-between gap-1">
        {weekPlan.map((d) => {
          // Cuatro estados y un color cada uno: hecho, hoy pendiente, salteado,
          // por venir. El descanso es un guion, no un punto vacío: un punto
          // vacío se lee como "fallaste" y descansar no es fallar.
          const state = d.trained ? 'done' : d.isRest || !d.dayName ? 'rest' : d.isToday ? 'today' : d.isPast ? 'missed' : 'upcoming';

          const dot = {
            done: 'bg-entreno-500 border-entreno-500',
            today: 'border-entreno-400 border-dashed animate-none',
            missed: 'border-ink-700 bg-ink-900',
            upcoming: 'border-ink-700',
            rest: 'border-transparent',
          }[state];

          return (
            <button
              key={d.key}
              onClick={onSelectDay ? () => onSelectDay(d) : undefined}
              disabled={!onSelectDay}
              aria-label={`${d.weekday}: ${d.trained ? 'entrenado' : d.isRest ? 'descanso' : d.dayName || 'sin rutina'}`}
              className="flex-1 flex flex-col items-center gap-1.5 py-1 rounded-lg disabled:cursor-default"
            >
              <span className={`text-[10px] font-semibold uppercase ${d.isToday ? 'text-entreno-300' : 'text-ink-500'}`}>
                {d.short}
              </span>
              <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${dot}`}>
                {state === 'done' && <Check className="w-3.5 h-3.5 text-ink-900" strokeWidth={3} />}
                {state === 'rest' && <span className="w-2.5 h-0.5 rounded-full bg-ink-600" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Resumen compacto de una sesión ya terminada. */
function SessionSummaryRow({ session, summary }) {
  return (
    <div className="flex items-center gap-3 text-xs text-ink-400">
      <span className="font-mono font-bold text-ink-200">{summary.effectiveSets}</span> series
      <span className="w-px h-3 bg-ink-700" />
      <span className="font-mono font-bold text-ink-200">{formatVolume(summary.volume)}</span> volumen
      {summary.durationMin != null && (
        <>
          <span className="w-px h-3 bg-ink-700" />
          <span className="font-mono font-bold text-ink-200">{summary.durationMin}</span> min
        </>
      )}
    </div>
  );
}

export default function TodayView({
  activeRoutine,
  todayDay,
  todaySessions,
  lastSession,
  lastSessionSummary,
  weekPlan,
  summarize,
  onStartSession,
  onEditDay,
  onCreateRoutine,
  onGoToWeek,
}) {
  const todayLabel = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

  // ---- Sin rutina: una sola cosa que hacer -------------------------------
  if (!activeRoutine) {
    return (
      <div className="rounded-3xl surface-accent surface-accent-entreno p-6 text-center">
        <Dumbbell className="w-10 h-10 text-entreno-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-ink-100 mb-1">Empezá por tu rutina</h2>
        <p className="text-sm text-ink-400 mb-4">
          Elegí una distribución semanal —Push/Pull/Legs, Torso/Pierna, Full Body o Calistenia— y armá tus días. Después
          entrenás con un toque desde acá.
        </p>
        {/* Abre el diálogo de alta directamente. Mandarlo a "Semana" lo dejaba
            frente a otra card vacía con el mismo botón. */}
        <button
          onClick={onCreateRoutine}
          className="rounded-xl bg-entreno-500 text-ink-900 px-5 py-3 text-sm font-bold hover:bg-entreno-400"
        >
          Crear rutina
        </button>
      </div>
    );
  }

  const trainedToday = todaySessions.length > 0;
  const isRest = todayDay?.isRest ?? true;
  const exerciseCount = todayDay?.exercises?.length || 0;

  return (
    <div className="space-y-4">
      {/* ---- Hero: qué pasa hoy ------------------------------------------ */}
      <div className="rounded-3xl surface-accent surface-accent-entreno p-5">
        <p className="label-section text-entreno-400">{todayLabel}</p>

        {trainedToday ? (
          <>
            <div className="flex items-center gap-2.5 mt-2">
              <span className="w-9 h-9 rounded-full bg-entreno-500 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5 text-ink-900" strokeWidth={3} />
              </span>
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-ink-100 truncate">Entrenaste hoy</h2>
                <p className="text-xs text-ink-400 truncate">{todaySessions.map((s) => s.dayName).join(' · ')}</p>
              </div>
            </div>
            <div className="mt-3.5 pt-3.5 border-t border-entreno-900">
              <SessionSummaryRow session={todaySessions[0]} summary={summarize(todaySessions[0])} />
            </div>
            {!isRest && exerciseCount > 0 && (
              <button
                onClick={() => onStartSession(todayDay)}
                className="mt-4 w-full rounded-xl border border-entreno-500/40 text-entreno-300 py-2.5 text-xs font-semibold hover:bg-entreno-500/10"
              >
                Registrar otro entreno
              </button>
            )}
          </>
        ) : isRest ? (
          <>
            <div className="flex items-center gap-2.5 mt-2">
              <span className="w-9 h-9 rounded-full bg-ink-700 flex items-center justify-center shrink-0">
                <Moon className="w-5 h-5 text-ink-300" />
              </span>
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-ink-100">Hoy descansás</h2>
                <p className="text-xs text-ink-400 truncate">Tu rutina «{activeRoutine.name}» no programa entreno</p>
              </div>
            </div>
            <p className="text-sm text-ink-400 mt-3.5 leading-relaxed">
              El descanso es parte del plan: el músculo crece entre sesiones, no durante.
            </p>
            <button
              onClick={onGoToWeek}
              className="mt-4 w-full rounded-xl border border-entreno-500/40 text-entreno-300 py-2.5 text-xs font-semibold hover:bg-entreno-500/10 flex items-center justify-center gap-1.5"
            >
              <CalendarDays className="w-3.5 h-3.5" /> Entrenar otro día igual
            </button>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-ink-100 mt-1.5">{todayDay.name}</h2>
            <p className="text-sm text-ink-400 mt-0.5">
              {exerciseCount === 0
                ? 'Este día todavía no tiene ejercicios'
                : `${exerciseCount} ejercicio${exerciseCount === 1 ? '' : 's'} programado${exerciseCount === 1 ? '' : 's'}`}
            </p>

            {exerciseCount === 0 ? (
              <button
                onClick={() => onEditDay(todayDay)}
                className="mt-4 w-full rounded-2xl bg-entreno-500 text-ink-900 py-3.5 text-sm font-bold hover:bg-entreno-400 flex items-center justify-center gap-2"
              >
                <Settings2 className="w-4 h-4" /> Armar este día
              </button>
            ) : (
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => onStartSession(todayDay)}
                  className="flex-1 rounded-2xl bg-entreno-500 text-ink-900 py-3.5 text-sm font-bold hover:bg-entreno-400 flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" fill="currentColor" /> Empezar entreno
                </button>
                <button
                  onClick={() => onEditDay(todayDay)}
                  aria-label="Editar los ejercicios de hoy"
                  className="btn-icon border border-entreno-500/30 text-entreno-300 hover:bg-entreno-500/10 shrink-0"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ---- Semana en curso --------------------------------------------- */}
      <WeekStrip weekPlan={weekPlan} onSelectDay={onGoToWeek ? () => onGoToWeek() : undefined} />

      {/* ---- Último entreno (solo si no fue hoy, para no repetir el hero) - */}
      {!trainedToday && lastSession && (
        <div className="rounded-2xl surface p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h2 className="label-section">Último entreno</h2>
            <span className="text-xs text-ink-500">{formatDate(lastSession.date)}</span>
          </div>
          <p className="text-sm font-bold text-ink-100">{lastSession.dayName}</p>
          <div className="mt-2">
            <SessionSummaryRow session={lastSession} summary={lastSessionSummary} />
          </div>
          {lastSessionSummary.muscleGroups.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {lastSessionSummary.muscleGroups.map((g) => (
                <span key={g} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-entreno-500/15 text-entreno-300">
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- Atajo a la rutina ------------------------------------------- */}
      <button
        onClick={onGoToWeek}
        className="w-full rounded-2xl surface p-3.5 flex items-center justify-between gap-3 hover:border-entreno-500/40 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-entreno-500/15 flex items-center justify-center shrink-0">
            <Flame className="w-4 h-4 text-entreno-400" />
          </span>
          <div className="min-w-0 text-left">
            <p className="label-section">Rutina activa</p>
            <p className="text-sm font-bold text-ink-100 truncate">{activeRoutine.name}</p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-ink-500 shrink-0" />
      </button>
    </div>
  );
}
