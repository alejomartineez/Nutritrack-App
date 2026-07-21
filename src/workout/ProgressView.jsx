import React, { useMemo, useState } from 'react';
import { Download, FileJson, Trophy, TrendingUp, TrendingDown, Minus, BarChart3, Target, Gauge } from 'lucide-react';
import { MUSCLE_GROUP_COLORS } from './workoutData';
import { theme } from '../lib/theme';
import SessionHistory from './SessionHistory';
import {
  computeWeeklyEffectiveSets,
  computeWeeklyVolumeHistory,
  computePersonalRecords,
  computeAverageRIRTrend,
  computeWeeklyAdherence,
  computeVolumeTrend,
  getRecentSessions,
  exportWorkoutDataAsJSON,
  exportWorkoutDataAsCSV,
} from './workoutStorage';

const EFFECTIVE_SETS_TARGET = 12; // referencia orientativa por grupo muscular/semana

const formatVolume = (kg) => (kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${kg}kg`);

const formatDate = (dateKey) => {
  const d = new Date(`${dateKey}T00:00:00`);
  const text = d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** Tarjeta de una cifra con su variación. La flecha es lo que se mira primero. */
function StatTile({ icon: Icon, value, label, delta }) {
  const dir = delta == null ? null : delta > 2 ? 'up' : delta < -2 ? 'down' : 'flat';
  const DeltaIcon = dir === 'up' ? TrendingUp : dir === 'down' ? TrendingDown : Minus;
  const deltaColor = dir === 'up' ? 'text-brand-400' : dir === 'down' ? 'text-amber-400' : 'text-ink-500';

  return (
    <div className="rounded-2xl surface p-3 flex flex-col">
      <Icon className="w-4 h-4 text-entreno-400 mb-2" />
      <p className="font-mono text-xl font-black text-ink-100 leading-none">{value}</p>
      <p className="text-[10px] text-ink-500 mt-1 leading-tight flex-1">{label}</p>
      {dir && (
        <p className={`text-[11px] font-semibold mt-1.5 flex items-center gap-0.5 ${deltaColor}`}>
          <DeltaIcon className="w-3 h-3 shrink-0" />
          {dir === 'flat' ? 'igual' : `${delta > 0 ? '+' : ''}${delta}%`}
        </p>
      )}
    </div>
  );
}

function Card({ icon: Icon, title, hint, children }) {
  return (
    <div className="rounded-3xl surface p-5">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="w-4 h-4 text-entreno-400" />}
        <h2 className="label-section">{title}</h2>
      </div>
      {hint && <p className="text-[11px] text-ink-500 mb-3.5">{hint}</p>}
      <div className={hint ? '' : 'mt-3.5'}>{children}</div>
    </div>
  );
}

export default function ProgressView({ sessionsMap, exercisesById, activeRoutine, onGoToToday }) {
  const [showAllPRs, setShowAllPRs] = useState(false);

  const sessions = useMemo(() => getRecentSessions(sessionsMap), [sessionsMap]);
  const weeklySets = useMemo(() => computeWeeklyEffectiveSets(sessionsMap, exercisesById), [sessionsMap, exercisesById]);
  const volumeHistory = useMemo(() => computeWeeklyVolumeHistory(sessionsMap, 8), [sessionsMap]);
  const rirTrend = useMemo(() => computeAverageRIRTrend(sessionsMap, 8), [sessionsMap]);
  const prs = useMemo(() => computePersonalRecords(sessionsMap, exercisesById), [sessionsMap, exercisesById]);
  const adherence = useMemo(() => computeWeeklyAdherence(activeRoutine, sessionsMap, 4), [activeRoutine, sessionsMap]);
  const volumeTrend = useMemo(() => computeVolumeTrend(sessionsMap), [sessionsMap]);

  // Un módulo recién estrenado no tiene por qué mostrar cuatro gráficos vacíos:
  // no comunican nada y hacen parecer que algo se rompió.
  if (sessions.length === 0) {
    return (
      <div className="rounded-3xl surface-accent surface-accent-entreno p-6 text-center">
        <BarChart3 className="w-10 h-10 text-entreno-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-ink-100 mb-1">Todavía no hay nada que medir</h2>
        <p className="text-sm text-ink-400 mb-4 leading-relaxed">
          Cuando termines tu primer entreno vas a ver acá tu volumen semana a semana, las series por grupo muscular, tus
          récords y el historial completo de sesiones.
        </p>
        {onGoToToday && (
          <button
            onClick={onGoToToday}
            className="rounded-xl bg-entreno-500 text-ink-900 px-5 py-3 text-sm font-bold hover:bg-entreno-400"
          >
            Ir al entreno de hoy
          </button>
        )}
      </div>
    );
  }

  const maxVolume = Math.max(1, ...volumeHistory.map((w) => w.volume));
  const muscleEntries = Object.entries(weeklySets).sort((a, b) => b[1] - a[1]);
  const setsThisWeek = muscleEntries.reduce((sum, [, n]) => sum + n, 0);
  const adherenceNow = adherence[adherence.length - 1];
  const visiblePRs = showAllPRs ? prs : prs.slice(0, 5);

  return (
    <div className="space-y-4">
      {/* ---- Resumen: las tres cifras que importan --------------------------- */}
      <div>
        <div className="grid grid-cols-3 gap-2">
          <StatTile
            icon={TrendingUp}
            value={formatVolume(volumeTrend.current)}
            label="volumen"
            delta={volumeTrend.pctChange}
          />
          <StatTile icon={Target} value={setsThisWeek} label="series efectivas" />
          <StatTile
            icon={BarChart3}
            value={adherenceNow.planned > 0 ? `${adherenceNow.done}/${adherenceNow.planned}` : adherenceNow.done}
            label={adherenceNow.planned > 0 ? 'entrenos del plan' : 'entrenos'}
          />
        </div>
        <p className="text-[11px] text-ink-600 mt-2 px-1">
          Semana en curso. La variación compara contra los mismos {volumeTrend.daysElapsed}{' '}
          {volumeTrend.daysElapsed === 1 ? 'día' : 'días'} de la semana pasada.
        </p>
      </div>

      {/* ---- Volumen ------------------------------------------------------- */}
      <Card
        icon={TrendingUp}
        title="Volumen semanal"
        hint="Peso × repeticiones de las series efectivas. El calentamiento no suma."
      >
        <div className="flex items-end justify-between gap-1.5 h-32">
          {volumeHistory.map((w, i) => {
            const h = Math.max(3, (w.volume / maxVolume) * 100);
            const isCurrent = i === volumeHistory.length - 1;
            return (
              <div key={w.weekStart} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <div className="w-full h-28 flex items-end">
                  <div
                    className={`w-full rounded-t-md transition-all duration-500 ${
                      w.volume === 0 ? 'bg-ink-800' : isCurrent ? 'bg-entreno-400' : 'bg-entreno-600'
                    }`}
                    style={{ height: `${h}%` }}
                    title={`${w.volume} kg`}
                  />
                </div>
                <span className={`text-[9px] ${isCurrent ? 'text-entreno-300 font-semibold' : 'text-ink-600'}`}>
                  {w.weekStart.slice(5).replace('-', '/')}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ---- Series por grupo muscular -------------------------------------- */}
      <Card
        icon={Target}
        title="Series efectivas por músculo"
        hint={`Semana en curso. La línea marca las ${EFFECTIVE_SETS_TARGET} series semanales que se suelen tomar como referencia de crecimiento.`}
      >
        {muscleEntries.length === 0 ? (
          <p className="text-sm text-ink-500">Todavía no registraste series efectivas esta semana.</p>
        ) : (
          <div className="space-y-3">
            {muscleEntries.map(([muscle, count]) => {
              const pct = Math.min(100, (count / EFFECTIVE_SETS_TARGET) * 100);
              return (
                <div key={muscle}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-ink-300 font-medium">{muscle}</span>
                    <span className={`font-mono ${count >= EFFECTIVE_SETS_TARGET ? 'text-brand-400' : 'text-ink-400'}`}>
                      {count}
                    </span>
                  </div>
                  {/* La marca del objetivo va sobre la pista, no como texto: se
                      compara la barra con la línea de un vistazo. */}
                  <div className="relative h-2 w-full rounded-full bg-ink-900 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: MUSCLE_GROUP_COLORS[muscle] || theme.accent }}
                    />
                    <span className="absolute inset-y-0 right-0 w-px bg-ink-500" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ---- Intensidad ------------------------------------------------------
          Antes la barra era el RIR crudo, así que entrenar MÁS suave dibujaba
          una barra MÁS alta. Ahora la altura es el esfuerzo (5 − RIR) y el
          número debajo sigue siendo el RIR real. */}
      <Card icon={Gauge} title="Intensidad por semana" hint="Barra más alta = entrenaste más cerca del fallo. Debajo, tu RIR promedio.">
        <div className="flex items-end justify-between gap-1.5">
          {rirTrend.map((w, i) => {
            const effort = w.avgRir == null ? null : Math.max(0, Math.min(100, ((5 - w.avgRir) / 5) * 100));
            const isCurrent = i === rirTrend.length - 1;
            return (
              <div key={w.weekStart} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <div className="w-full h-14 flex items-end">
                  <div
                    className={`w-full rounded-t-md transition-all duration-500 ${
                      effort == null ? 'bg-ink-800' : isCurrent ? 'bg-entreno-400' : 'bg-entreno-600'
                    }`}
                    style={{ height: effort == null ? '4%' : `${Math.max(6, effort)}%` }}
                  />
                </div>
                <span className={`text-[10px] font-mono ${isCurrent ? 'text-entreno-300' : 'text-ink-500'}`}>
                  {w.avgRir ?? '–'}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ---- Récords -------------------------------------------------------- */}
      <div className="rounded-3xl surface-accent surface-accent-entreno p-5">
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="w-4 h-4 text-entreno-400" />
          <h2 className="label-section">Récords personales</h2>
        </div>
        <p className="text-[11px] text-ink-500 mb-3.5">1RM estimado con la fórmula de Epley sobre tu mejor serie.</p>
        {prs.length === 0 ? (
          <p className="text-sm text-ink-500">Completá series efectivas para ver tus estimaciones de 1RM.</p>
        ) : (
          <>
            <ul className="space-y-2">
              {visiblePRs.map((pr) => (
                <li key={pr.exerciseId} className="flex items-center justify-between gap-3 rounded-xl surface px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm text-ink-200 font-medium truncate">{pr.exerciseName}</p>
                    <p className="text-xs text-ink-500 mt-0.5">
                      {pr.weight}kg × {pr.reps} · {formatDate(pr.date)}
                    </p>
                  </div>
                  <span className="font-mono text-lg font-black text-entreno-300 shrink-0">{pr.estOneRM}kg</span>
                </li>
              ))}
            </ul>
            {prs.length > 5 && (
              <button
                onClick={() => setShowAllPRs((v) => !v)}
                className="w-full mt-3 py-2 text-xs font-semibold text-entreno-300 hover:bg-entreno-500/5 rounded-xl"
              >
                {showAllPRs ? 'Mostrar menos' : `Ver los ${prs.length} ejercicios`}
              </button>
            )}
          </>
        )}
      </div>

      {/* ---- Historial ------------------------------------------------------ */}
      <SessionHistory sessions={sessions} exercisesById={exercisesById} />

      {/* ---- Exportar: es una utilidad, no una analítica. Va al pie y callado. */}
      <div className="flex gap-2">
        <button
          onClick={exportWorkoutDataAsJSON}
          className="flex-1 rounded-xl border border-ink-700 text-ink-400 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 hover:text-ink-200 hover:border-ink-600"
        >
          <FileJson className="w-3.5 h-3.5" /> Exportar JSON
        </button>
        <button
          onClick={exportWorkoutDataAsCSV}
          className="flex-1 rounded-xl border border-ink-700 text-ink-400 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 hover:text-ink-200 hover:border-ink-600"
        >
          <Download className="w-3.5 h-3.5" /> Exportar CSV
        </button>
      </div>
    </div>
  );
}
