import React, { useMemo } from 'react';
import { Sparkles, UtensilsCrossed, Dumbbell, Info } from 'lucide-react';
import { correlateLateDinnerWithQuality, correlateSleepWithWorkoutVolume } from './sleepStorage';

function InsightCard({ icon: Icon, title, children }) {
  return (
    <div className="rounded-3xl surface-accent p-5">
      <div className="flex items-center gap-2 mb-2.5">
        <Icon className="w-4 h-4 text-violet-300" />
        <h2 className="label-section">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ sampleSize }) {
  return (
    <p className="text-sm text-indigo-400 leading-relaxed">
      Todavía no hay suficientes datos cruzados para este insight ({sampleSize} de al menos 6 noches necesarias). Seguí
      registrando tu sueño y tus comidas o entrenamientos para desbloquearlo.
    </p>
  );
}

export default function SleepInsights({ sleepLogs }) {
  const dinnerCorrelation = useMemo(() => correlateLateDinnerWithQuality(sleepLogs), [sleepLogs]);
  const workoutCorrelation = useMemo(() => correlateSleepWithWorkoutVolume(sleepLogs), [sleepLogs]);

  const hasAnyInsight = dinnerCorrelation.available || workoutCorrelation.available;

  return (
    <div className="space-y-4">
      <div className="text-center mb-1">
        <Sparkles className="w-6 h-6 text-violet-300 mx-auto mb-1.5" />
        <h2 className="text-base font-bold text-slate-100">Insights automáticos</h2>
        <p className="text-xs text-indigo-400 mt-0.5">Cruzamos tu sueño con tu nutrición y tus entrenamientos</p>
      </div>

      <InsightCard icon={UtensilsCrossed} title="Nutrición y descanso">
        {dinnerCorrelation.available ? (
          <p className="text-sm text-indigo-100 leading-relaxed">
            Las noches que cenás después de las 22:00h, tu calidad de descanso{' '}
            <span className={`font-bold ${dinnerCorrelation.pctDiff > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
              {dinnerCorrelation.pctDiff > 0 ? `baja un ${dinnerCorrelation.pctDiff}%` : `no cambia significativamente`}
            </span>{' '}
            ({dinnerCorrelation.lateAvg}/5 vs {dinnerCorrelation.normalAvg}/5, en base a {dinnerCorrelation.lateNights} cenas
            tardías y {dinnerCorrelation.normalNights} noches normales).
          </p>
        ) : (
          <EmptyState sampleSize={dinnerCorrelation.sampleSize} />
        )}
      </InsightCard>

      <InsightCard icon={Dumbbell} title="Sueño y rendimiento">
        {workoutCorrelation.available ? (
          <p className="text-sm text-indigo-100 leading-relaxed">
            Rendiste{' '}
            <span className={`font-bold ${workoutCorrelation.pctDiff > 0 ? 'text-emerald-300' : 'text-amber-300'}`}>
              {workoutCorrelation.pctDiff > 0 ? `un ${workoutCorrelation.pctDiff}% más` : `un ${Math.abs(workoutCorrelation.pctDiff)}% menos`}
            </span>{' '}
            de volumen en el gimnasio los días con más de {workoutCorrelation.thresholdHours}h de descanso ({workoutCorrelation.highAvg}kg
            vs {workoutCorrelation.lowAvg}kg en promedio, {workoutCorrelation.highNights} vs {workoutCorrelation.lowNights} sesiones).
          </p>
        ) : (
          <EmptyState sampleSize={workoutCorrelation.sampleSize} />
        )}
      </InsightCard>

      {!hasAnyInsight && (
        <div className="rounded-2xl bg-indigo-900/30 border border-indigo-500/20 p-4 flex items-start gap-3">
          <Info className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
          <p className="text-xs text-indigo-300 leading-relaxed">
            Los insights se calculan automáticamente cruzando tus registros de sueño con tu historial de comidas y
            entrenamientos. Cuantos más días registres en las tres secciones, más precisos van a ser.
          </p>
        </div>
      )}
    </div>
  );
}
