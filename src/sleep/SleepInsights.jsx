import React, { useMemo } from 'react';
import {
  Sparkles,
  UtensilsCrossed,
  Dumbbell,
  Lock,
  TrendingUp,
  TrendingDown,
  Clock,
  Flame,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { ENERGY_LEVELS } from './sleepData';
import {
  computeSleepSummary,
  computeGoalStreak,
  computeFactorImpact,
  computeBedtimeComparison,
  computeBestWorstNights,
  correlateLateDinnerWithQuality,
  correlateSleepWithWorkoutVolume,
} from './sleepStorage';

// ---------------------------------------------------------------------------
// Sueño · Insights
//
// Antes eran dos correlaciones que cruzaban módulos y necesitaban 3+3 noches
// con datos de nutrición o entreno para desbloquearse: en la práctica, una
// pestaña vacía. Ahora lo primero que se ve sale de tus propios registros de
// sueño —incluidos los "factores", que se guardaban desde el día uno y no se
// usaban en ningún lado— y las correlaciones cruzadas quedan al final, con el
// progreso de desbloqueo a la vista en vez de un mensaje de error.
// ---------------------------------------------------------------------------

function Card({ icon: Icon, title, hint, children, accent = false }) {
  return (
    <div className={`rounded-3xl p-5 ${accent ? 'surface-accent surface-accent-sueno' : 'surface'}`}>
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="w-4 h-4 text-sueno-400" />}
        <h2 className="label-section">{title}</h2>
      </div>
      {hint && <p className="text-[11px] text-ink-500 mb-3">{hint}</p>}
      <div className={hint ? '' : 'mt-3'}>{children}</div>
    </div>
  );
}

/** Estado bloqueado con progreso: "te faltan N noches", no "no hay datos". */
function Locked({ have, need, what }) {
  const pct = Math.min(100, Math.round((have / need) * 100));
  return (
    <div>
      <div className="flex items-start gap-2 text-ink-400 mb-2">
        <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed">{what}</p>
      </div>
      <div className="h-1.5 rounded-full bg-ink-900 overflow-hidden">
        <div className="h-full rounded-full bg-sueno-600 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-ink-500 mt-1.5 font-mono">
        {have} de {need}
      </p>
    </div>
  );
}

function Stat({ value, label, accent = 'text-ink-100' }) {
  return (
    <div className="text-center">
      <p className={`font-mono text-xl font-black leading-none ${accent}`}>{value}</p>
      <p className="text-[10px] text-ink-500 mt-1 leading-tight">{label}</p>
    </div>
  );
}

const formatDate = (dateKey) => {
  const d = new Date(`${dateKey}T00:00:00`);
  const text = d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const formatHours = (h) => `${Math.floor(h)}h ${Math.round((h % 1) * 60)}m`;

const energyOf = (quality) => ENERGY_LEVELS.find((e) => e.value === quality);

export default function SleepInsights({ sleepLogs, goalHours }) {
  const summary = useMemo(() => computeSleepSummary(sleepLogs, goalHours, 30), [sleepLogs, goalHours]);
  const streak = useMemo(() => computeGoalStreak(sleepLogs, goalHours), [sleepLogs, goalHours]);
  const factors = useMemo(() => computeFactorImpact(sleepLogs), [sleepLogs]);
  const bedtime = useMemo(() => computeBedtimeComparison(sleepLogs), [sleepLogs]);
  const extremes = useMemo(() => computeBestWorstNights(sleepLogs), [sleepLogs]);
  const dinner = useMemo(() => correlateLateDinnerWithQuality(sleepLogs), [sleepLogs]);
  const workout = useMemo(() => correlateSleepWithWorkoutVolume(sleepLogs), [sleepLogs]);

  if (summary.nights === 0) {
    return (
      <div className="rounded-3xl surface-accent surface-accent-sueno p-6 text-center">
        <Sparkles className="w-10 h-10 text-sueno-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-ink-100 mb-1">Acá van a aparecer tus patrones</h2>
        <p className="text-sm text-ink-400 leading-relaxed">
          Con unas pocas noches registradas vas a ver qué te ayuda a dormir, a qué hora te conviene acostarte y cómo se
          relaciona tu descanso con lo que comés y entrenás.
        </p>
      </div>
    );
  }

  const helping = factors.filter((f) => f.qualityDiff > 0.2);
  const hurting = factors.filter((f) => f.qualityDiff < -0.2);

  return (
    <div className="space-y-4">
      {/* ---- Resumen del mes ---------------------------------------------- */}
      <div className="rounded-3xl surface-accent surface-accent-sueno p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-sueno-400" />
          <h2 className="label-section">Tus últimos 30 días</h2>
          <span className="ml-auto text-[11px] text-ink-500 font-mono">{summary.nights} noches</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Stat value={`${summary.avgHours}h`} label="promedio por noche" />
          <Stat
            value={summary.avgQuality != null ? `${summary.avgQuality}/5` : '–'}
            label="energía al despertar"
          />
          <Stat
            value={`${summary.goalHitRate}%`}
            label={`noches con ${goalHours}h+`}
            accent={summary.goalHitRate >= 70 ? 'text-brand-400' : 'text-ink-100'}
          />
        </div>
        {streak > 0 && (
          <div className="mt-4 pt-3.5 border-t border-sueno-900 flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-sm text-ink-200">
              <span className="font-mono font-bold text-amber-300">{streak}</span>{' '}
              {streak === 1 ? 'noche seguida' : 'noches seguidas'} cumpliendo tu meta
            </p>
          </div>
        )}
      </div>

      {/* ---- Factores: lo que se venía guardando y nunca se usaba ---------- */}
      <Card
        icon={TrendingUp}
        title="Qué influye en tu descanso"
        hint="Comparo tu energía al despertar en las noches que marcaste cada factor contra las que no."
      >
        {factors.length === 0 ? (
          <Locked
            have={summary.nights}
            need={6}
            what="Marcá los factores (cafeína, pantallas, estrés…) en el detalle del registro. Necesito al menos 3 noches con el factor y 3 sin él para poder comparar."
          />
        ) : (
          <div className="space-y-2.5">
            {helping.length === 0 && hurting.length === 0 && (
              <p className="text-sm text-ink-400 leading-relaxed">
                Por ahora ninguno de los factores que marcaste mueve tu descanso de forma apreciable. Eso también es un
                dato: tu energía depende más de las horas que dormís.
              </p>
            )}
            {[...hurting, ...helping].map((f) => {
              const bad = f.qualityDiff < 0;
              return (
                <div key={f.id} className="flex items-center gap-3 rounded-2xl bg-ink-900 border border-ink-700 px-3.5 py-3">
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      bad ? 'bg-amber-500/15 text-amber-400' : 'bg-brand-500/15 text-brand-400'
                    }`}
                  >
                    {bad ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-100 truncate">{f.label}</p>
                    <p className="text-[11px] text-ink-500 mt-0.5">
                      {f.nights} {f.nights === 1 ? 'noche' : 'noches'} · {f.hoursDiff > 0 ? '+' : ''}
                      {f.hoursDiff}h de sueño
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-mono text-sm font-bold ${bad ? 'text-amber-300' : 'text-brand-300'}`}>
                      {f.qualityDiff > 0 ? '+' : ''}
                      {f.qualityDiff}
                    </p>
                    <p className="text-[10px] text-ink-600">energía</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ---- Horario ------------------------------------------------------ */}
      <Card
        icon={Clock}
        title="Tu horario ideal"
        hint="Parto tus noches por tu propia hora mediana de acostarte y comparo las dos mitades."
      >
        {!bedtime.available ? (
          <Locked
            have={bedtime.nights}
            need={bedtime.needed}
            what="Necesito unas cuantas noches con hora de acostarte y energía registradas para partirlas en dos grupos."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { key: 'temprano', label: 'Más temprano', time: bedtime.earlyBedtime, q: bedtime.earlyQuality, h: bedtime.earlyHours },
                { key: 'tarde', label: 'Más tarde', time: bedtime.lateBedtime, q: bedtime.lateQuality, h: bedtime.lateHours },
              ].map((g) => {
                const wins = bedtime.better === g.key;
                return (
                  <div
                    key={g.key}
                    className={`rounded-2xl px-3.5 py-3 border ${
                      wins ? 'bg-sueno-500/10 border-sueno-500/40' : 'bg-ink-900 border-ink-700'
                    }`}
                  >
                    <p className="label-section">{g.label}</p>
                    <p className="font-mono text-lg font-black text-ink-100 mt-0.5">~{g.time}</p>
                    <p className="text-[11px] text-ink-400 mt-1">
                      {g.q}/5 energía · {g.h}h
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="text-sm text-ink-300 mt-3.5 leading-relaxed">
              {bedtime.better === 'igual' ? (
                <>Acostarte más temprano o más tarde no cambia cómo amanecés. Priorizá la regularidad antes que la hora.</>
              ) : bedtime.better === 'temprano' ? (
                <>
                  Amanecés mejor cuando te acostás cerca de las{' '}
                  <span className="font-bold text-sueno-300">{bedtime.earlyBedtime}</span>. Ahí está tu ventana.
                </>
              ) : (
                <>
                  Curiosamente amanecés mejor con la hora más tardía (
                  <span className="font-bold text-sueno-300">{bedtime.lateBedtime}</span>). Puede ser que acostarte antes
                  te deje dando vueltas en la cama.
                </>
              )}
            </p>
          </>
        )}
      </Card>

      {/* ---- Mejor y peor noche ------------------------------------------- */}
      {extremes.available && (
        <Card icon={TrendingDown} title="Tu mejor y tu peor noche" hint="De los últimos 30 días.">
          <div className="space-y-2">
            {[
              { log: extremes.best, label: 'Mejor', tone: 'text-brand-300' },
              { log: extremes.worst, label: 'Peor', tone: 'text-amber-300' },
            ].map(({ log, label, tone }) => (
              <div key={label} className="flex items-center gap-3 rounded-2xl bg-ink-900 border border-ink-700 px-3.5 py-3">
                <span className="text-2xl shrink-0">{energyOf(log.quality)?.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className={`text-[11px] font-semibold uppercase tracking-wide ${tone}`}>{label}</p>
                  <p className="text-sm text-ink-100 font-medium">{formatDate(log.date)}</p>
                  <p className="text-[11px] text-ink-500 mt-0.5">
                    {log.bedtime} → {log.wakeTime}
                    {(log.factors || []).length > 0 &&
                      ` · ${log.factors.length} ${log.factors.length === 1 ? 'factor' : 'factores'}`}
                  </p>
                </div>
                <p className="font-mono text-sm font-bold text-ink-200 shrink-0">
                  {formatHours(log.totalSleepMinutes / 60)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ---- Cruces con otros módulos ------------------------------------- */}
      <div>
        <p className="label-section px-1 mb-2">Cruces con tus otros registros</p>
        <div className="space-y-4">
          <Card icon={UtensilsCrossed} title="Cenar tarde">
            {dinner.available ? (
              <p className="text-sm text-ink-200 leading-relaxed">
                Las noches que cenás después de las 22:00, tu energía al despertar{' '}
                <span className={`font-bold ${dinner.pctDiff > 0 ? 'text-amber-300' : 'text-brand-300'}`}>
                  {dinner.pctDiff > 0 ? `baja un ${dinner.pctDiff}%` : 'no cambia de forma apreciable'}
                </span>{' '}
                <span className="text-ink-500">
                  ({dinner.lateAvg}/5 vs {dinner.normalAvg}/5 · {dinner.lateNights} cenas tardías, {dinner.normalNights}{' '}
                  noches normales)
                </span>
                .
              </p>
            ) : (
              <Locked
                have={dinner.sampleSize}
                need={6}
                what="Necesito noches de sueño con las comidas del día anterior ya registradas: al menos 3 con cena tardía y 3 sin ella."
              />
            )}
          </Card>

          <Card icon={Dumbbell} title="Descanso y rendimiento">
            {workout.available ? (
              <p className="text-sm text-ink-200 leading-relaxed">
                Levantás{' '}
                <span className={`font-bold ${workout.pctDiff > 0 ? 'text-brand-300' : 'text-amber-300'}`}>
                  {workout.pctDiff > 0 ? `un ${workout.pctDiff}% más` : `un ${Math.abs(workout.pctDiff)}% menos`}
                </span>{' '}
                de volumen los días que dormiste más de {workout.thresholdHours}h{' '}
                <span className="text-ink-500">
                  ({workout.highAvg}kg vs {workout.lowAvg}kg · {workout.highNights} y {workout.lowNights} sesiones)
                </span>
                .
              </p>
            ) : (
              <Locked
                have={workout.sampleSize}
                need={6}
                what="Necesito entrenos registrados el mismo día que el sueño: al menos 3 tras una noche larga y 3 tras una corta."
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
