import React, { useMemo, useState } from 'react';
import { BedDouble, Sunrise, Check, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import {
  ENERGY_LEVELS,
  FALL_ASLEEP_MINUTES_PRESETS,
  INTERRUPTION_COUNT_PRESETS,
  SLEEP_FACTOR_GROUPS,
} from './sleepData';
import { computeTotalSleepMinutes } from './sleepStorage';

const formatMinutes = (mins) => {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${m}m`;
};

function SummaryCard({ log, onEdit, isToday }) {
  return (
    <div className="rounded-3xl surface-accent surface-accent-sueno p-5 text-center">
      <Check className="w-8 h-8 text-sueno-300 mx-auto mb-2" />
      <p className="text-sm text-ink-200 mb-1">
        {isToday ? 'Ya registraste tu descanso de hoy' : 'Descanso registrado'}
      </p>
      <p className="text-3xl font-black text-ink-100 font-mono">{formatMinutes(log.totalSleepMinutes)}</p>
      <p className="text-xs text-ink-300 mt-1">
        {log.bedtime} → {log.wakeTime} · {ENERGY_LEVELS.find((e) => e.value === log.quality)?.emoji}{' '}
        {ENERGY_LEVELS.find((e) => e.value === log.quality)?.label}
      </p>
      <button
        onClick={onEdit}
        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ink-900 border border-ink-700 text-ink-200 text-xs font-semibold hover:bg-ink-800"
      >
        <Pencil className="w-3.5 h-3.5" /> Editar registro
      </button>
    </div>
  );
}

export default function SleepLogForm({ existingLog, onSave, defaultBedtime, defaultWakeTime, isToday = true }) {
  const [editing, setEditing] = useState(!existingLog);
  const [bedtime, setBedtime] = useState(existingLog?.bedtime || defaultBedtime || '23:00');
  const [wakeTime, setWakeTime] = useState(existingLog?.wakeTime || defaultWakeTime || '07:00');
  const [minutesToFallAsleep, setMinutesToFallAsleep] = useState(existingLog?.minutesToFallAsleep ?? 10);
  const [interruptionCount, setInterruptionCount] = useState(existingLog?.interruptions?.count ?? 0);
  const [minutesAwake, setMinutesAwake] = useState(existingLog?.interruptions?.minutesAwake ?? 0);
  const [quality, setQuality] = useState(existingLog?.quality || null);
  const [factors, setFactors] = useState(existingLog?.factors || []);
  const [showMore, setShowMore] = useState(false);

  const totalMinutes = useMemo(
    () =>
      computeTotalSleepMinutes({
        bedtime,
        wakeTime,
        minutesToFallAsleep,
        interruptions: { minutesAwake },
      }),
    [bedtime, wakeTime, minutesToFallAsleep, minutesAwake]
  );

  const toggleFactor = (factorId) => {
    setFactors((prev) => (prev.includes(factorId) ? prev.filter((f) => f !== factorId) : [...prev, factorId]));
  };

  const handleSave = () => {
    if (!quality) return;
    onSave({
      bedtime,
      wakeTime,
      minutesToFallAsleep,
      interruptions: { count: interruptionCount, minutesAwake },
      quality,
      factors,
    });
    setEditing(false);
  };

  if (existingLog && !editing) {
    return <SummaryCard log={existingLog} onEdit={() => setEditing(true)} isToday={isToday} />;
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-bold text-ink-100">{isToday ? '¿Cómo dormiste anoche?' : '¿Cómo dormiste?'}</h2>
        <p className="text-xs text-ink-300 mt-0.5">Registro rápido — ajustá lo justo y necesario</p>
      </div>

      <div className="rounded-3xl surface p-5">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-ink-300 mb-1.5 flex items-center gap-1.5">
              <BedDouble className="w-3.5 h-3.5" /> Me acosté
            </label>
            <input
              type="time"
              value={bedtime}
              onChange={(e) => setBedtime(e.target.value)}
              style={{ colorScheme: 'dark' }}
              className="block w-[calc(100%-6px)] mx-auto bg-ink-900 border border-ink-700 rounded-xl px-3 py-2.5 text-ink-100 font-mono text-lg focus:outline-none focus:ring-2 focus:ring-sueno-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-300 mb-1.5 flex items-center gap-1.5">
              <Sunrise className="w-3.5 h-3.5" /> Me desperté
            </label>
            <input
              type="time"
              value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)}
              style={{ colorScheme: 'dark' }}
              className="block w-[calc(100%-6px)] mx-auto bg-ink-900 border border-ink-700 rounded-xl px-3 py-2.5 text-ink-100 font-mono text-lg focus:outline-none focus:ring-2 focus:ring-sueno-400"
            />
          </div>
        </div>

        <p className="text-xs text-ink-300 mt-3 mb-1.5">¿Cuánto tardaste en dormirte?</p>
        <div className="flex gap-1.5 flex-wrap">
          {FALL_ASLEEP_MINUTES_PRESETS.map((mins) => (
            <button
              key={mins}
              onClick={() => setMinutesToFallAsleep(mins)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                minutesToFallAsleep === mins
                  ? 'bg-sueno-500 border-sueno-400 text-ink-900'
                  : 'bg-ink-900 border-ink-700 text-ink-300'
              }`}
            >
              {mins === 0 ? 'Enseguida' : `${mins}min`}
            </button>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-ink-700 text-center">
          <p className="label-section">Total dormido</p>
          <p className="text-3xl font-black text-ink-100 font-mono">{formatMinutes(totalMinutes)}</p>
        </div>
      </div>

      <div className="rounded-3xl surface p-5">
        <p className="text-sm font-semibold text-ink-200 mb-3">¿Cómo te sentís al despertar?</p>
        <div className="flex justify-between gap-1.5">
          {ENERGY_LEVELS.map((level) => (
            <button
              key={level.value}
              onClick={() => setQuality(level.value)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl border transition-colors ${
                quality === level.value
                  ? 'bg-sueno-500/25 border-sueno-400'
                  : 'bg-ink-900 border-ink-700 hover:border-ink-600'
              }`}
            >
              <span className="text-2xl">{level.emoji}</span>
              <span className={`text-[10px] font-medium ${quality === level.value ? 'text-sueno-200' : 'text-ink-400'}`}>
                {level.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => setShowMore((v) => !v)}
        className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-ink-300 py-1"
      >
        {showMore ? 'Ocultar detalles' : 'Agregar interrupciones y factores (opcional)'}
        {showMore ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {showMore && (
        <div className="space-y-4">
          <div className="rounded-3xl surface p-5">
            <p className="text-sm font-semibold text-ink-200 mb-2">Despertares nocturnos</p>
            <div className="flex gap-1.5 flex-wrap mb-3">
              {INTERRUPTION_COUNT_PRESETS.map((n) => (
                <button
                  key={n}
                  onClick={() => setInterruptionCount(n)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border ${
                    String(interruptionCount) === String(n)
                      ? 'bg-sueno-500 border-sueno-400 text-ink-900'
                      : 'bg-ink-900 border-ink-700 text-ink-300'
                  }`}
                >
                  {n === 0 ? 'Ninguno' : `${n} veces`}
                </button>
              ))}
            </div>
            {interruptionCount !== 0 && (
              <>
                <p className="text-xs text-ink-300 mb-1.5">¿Cuánto tiempo despierto en total?</p>
                <div className="flex gap-1.5 flex-wrap">
                  {[5, 15, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => setMinutesAwake(mins)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                        minutesAwake === mins
                          ? 'bg-sueno-500 border-sueno-400 text-ink-900'
                          : 'bg-ink-900 border-ink-700 text-ink-300'
                      }`}
                    >
                      {mins}min
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="rounded-3xl surface p-5">
            <p className="text-sm font-semibold text-ink-200 mb-3">¿Qué influyó en tu descanso?</p>
            <div className="space-y-3">
              {SLEEP_FACTOR_GROUPS.map((group) => (
                <div key={group.id}>
                  <p className="label-section mb-1.5">{group.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.factors.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => toggleFactor(f.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                          factors.includes(f.id)
                            ? 'bg-sueno-500/25 border-sueno-400 text-sueno-200'
                            : 'bg-ink-900 border-ink-700 text-ink-300'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={!quality}
        className={`w-full py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 ${
          quality ? 'bg-sueno-500 text-ink-900 hover:bg-sueno-400' : 'bg-ink-900 text-ink-500'
        }`}
      >
        <Check className="w-5 h-5" /> Guardar registro
      </button>
    </div>
  );
}
