import React, { useState } from 'react';
import { BedDouble, ChevronLeft, ChevronRight, Minus, Plus, Sunrise, Trash2 } from 'lucide-react';
import { Sheet, Button, IconButton, Chip, ProgressBar } from '../ui';
import { haptic } from '../lib/haptics';
import { addDaysToKey, hmToMinutes, minutesToHM } from '../lib/dates';
import {
  ENERGY_LEVELS,
  FALL_ASLEEP_PRESETS,
  WAKE_COUNT_PRESETS,
  MINUTES_AWAKE_PRESETS,
  SLEEP_FACTORS,
} from './sleepData';
import {
  computeTotalSleepMinutes,
  getFormDefaults,
  isHM,
  minutesInBed,
  qualityOf,
  wakeCountOf,
} from './sleepStorage';
import { Duration, fmtDuration, nightTitle } from './sleepFormat';

const STEP = 15;

/** Sube o baja al siguiente múltiplo de 15 min. */
const stepTime = (value, dir) => {
  const m = hmToMinutes(value);
  return minutesToHM(dir > 0 ? (Math.floor(m / STEP) + 1) * STEP : (Math.ceil(m / STEP) - 1) * STEP);
};

const initForm = (log, defaults) => {
  if (!log || typeof log !== 'object') {
    return { ...defaults, wakeCount: 0, minutesAwake: 0, quality: null, factors: [], note: '' };
  }
  const fall = Number(log.minutesToFallAsleep);
  return {
    bedtime: isHM(log.bedtime) ? log.bedtime : defaults.bedtime,
    wakeTime: isHM(log.wakeTime) ? log.wakeTime : defaults.wakeTime,
    minutesToFallAsleep: Number.isFinite(fall) && fall >= 0 ? fall : defaults.minutesToFallAsleep,
    wakeCount: wakeCountOf(log),
    minutesAwake: Number(log.interruptions?.minutesAwake) || 0,
    quality: qualityOf(log),
    factors: Array.isArray(log.factors) ? log.factors : [],
    note: typeof log.note === 'string' ? log.note : '',
  };
};

/** Fila de 5 caritas. Tocar la elegida la deselecciona. */
export function EnergyPicker({ value, onChange, size = 'md' }) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {ENERGY_LEVELS.map((e) => {
        const on = value === e.value;
        return (
          <button
            key={e.value}
            type="button"
            aria-pressed={on}
            aria-label={e.label}
            onClick={() => {
              haptic(5);
              onChange(on ? null : e.value);
            }}
            className={`flex flex-col items-center gap-1 rounded-2xl ${size === 'lg' ? 'py-3.5' : 'py-2.5'} ${
              on ? 'bg-sueno-500/20 ring-1 ring-inset ring-sueno-400' : 'bg-ink-700/50'
            }`}
          >
            <span className={size === 'lg' ? 'text-3xl' : 'text-2xl'}>{e.emoji}</span>
            <span className={`text-[10px] font-medium leading-none ${on ? 'text-sueno-300' : 'text-ink-500'}`}>{e.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function TimeTile({ icon: Icon, label, value, onChange }) {
  const step = (dir) => {
    haptic(5);
    onChange(stepTime(value, dir));
  };
  return (
    <div className="rounded-2xl bg-ink-700/50 p-3">
      <p className="flex items-center gap-1.5 text-[13px] font-medium text-ink-400">
        <Icon className="w-4 h-4 text-sueno-400" /> {label}
      </p>
      <label className="relative block mt-1 text-center">
        <span className="num-display text-[2.5rem] leading-[3rem] text-ink-50">{value}</span>
        <input
          type="time"
          aria-label={`${label}: elegir hora`}
          value={value}
          onChange={(e) => isHM(e.target.value) && onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </label>
      <div className="mt-1 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => step(-1)} aria-label={`${label}: 15 minutos antes`} className="h-9 rounded-full bg-ink-700/70 text-ink-200 flex items-center justify-center">
          <Minus className="w-4 h-4" strokeWidth={2.5} />
        </button>
        <button type="button" onClick={() => step(1)} aria-label={`${label}: 15 minutos después`} className="h-9 rounded-full bg-sueno-500/15 text-sueno-300 flex items-center justify-center">
          <Plus className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <section>
      <div className="flex items-baseline justify-between px-1 mb-2">
        <h3 className="text-[13px] font-semibold text-ink-300">{label}</h3>
        {hint && <span className="text-xs text-ink-500">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

const ChipRow = ({ children }) => (
  <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-0.5" style={{ scrollbarWidth: 'none' }}>
    {children}
  </div>
);

export default function SleepLogSheet({ initialKey, todayKey, logs, goalHours, onSave, onDelete, onClose }) {
  const [dateKey, setDateKey] = useState(initialKey);
  const [form, setForm] = useState(() => initForm(logs[initialKey], getFormDefaults(logs, initialKey)));
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const existing = Boolean(logs[dateKey]);

  const moveDate = (dir) => {
    const next = addDaysToKey(dateKey, dir);
    if (next > todayKey) return;
    setDateKey(next);
    setForm(initForm(logs[next], getFormDefaults(logs, next)));
  };

  const interruptions = { count: form.wakeCount, minutesAwake: form.wakeCount ? form.minutesAwake : 0 };
  const total = computeTotalSleepMinutes({ ...form, interruptions });
  const inBed = minutesInBed(form.bedtime, form.wakeTime);

  const save = () => {
    onSave(dateKey, {
      bedtime: form.bedtime,
      wakeTime: form.wakeTime,
      minutesToFallAsleep: form.minutesToFallAsleep,
      interruptions,
      quality: form.quality,
      factors: form.factors,
      note: form.note.trim() || undefined,
    });
  };

  const toggleFactor = (id) =>
    set({ factors: form.factors.includes(id) ? form.factors.filter((f) => f !== id) : [...form.factors, id] });

  return (
    <Sheet
      onClose={onClose}
      title={existing ? 'Editar noche' : 'Registrar noche'}
      size="large"
      footer={
        <div className="flex gap-2">
          {existing && (
            <button type="button" onClick={() => onDelete(dateKey)} aria-label="Borrar noche" className="btn-icon w-[3.25rem] h-[3.25rem] rounded-2xl bg-red-500/15 text-red-400">
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          <Button tone="sueno" size="lg" block onClick={save} disabled={total <= 0}>
            Guardar
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between rounded-full bg-ink-700/50 p-1">
          <IconButton icon={ChevronLeft} label="Noche anterior" size="sm" variant="ghost" onClick={() => moveDate(-1)} />
          <span className="text-sm font-semibold text-ink-100">{nightTitle(dateKey, todayKey)}</span>
          <IconButton icon={ChevronRight} label="Noche siguiente" size="sm" variant="ghost" onClick={() => moveDate(1)} disabled={dateKey >= todayKey} className="disabled:opacity-30" />
        </div>

        <div>
          <div className="grid grid-cols-2 gap-2.5">
            <TimeTile icon={BedDouble} label="Me acosté" value={form.bedtime} onChange={(bedtime) => set({ bedtime })} />
            <TimeTile icon={Sunrise} label="Me levanté" value={form.wakeTime} onChange={(wakeTime) => set({ wakeTime })} />
          </div>
          <div className="mt-3 px-1">
            <div className="flex items-baseline justify-between">
              <Duration minutes={total} className="text-2xl text-ink-50" />
              <span className="text-xs text-ink-500">{fmtDuration(inBed)} en cama</span>
            </div>
            <ProgressBar value={total} max={goalHours * 60} color="rgb(var(--sueno-400))" className="mt-2" />
          </div>
        </div>

        <Field label="¿Cómo te levantaste?" hint="Opcional">
          <EnergyPicker value={form.quality} onChange={(quality) => set({ quality })} />
        </Field>

        <Field label="Tardé en dormirme">
          <ChipRow>
            {FALL_ASLEEP_PRESETS.map((p) => (
              <Chip key={p.value} tone="sueno" active={form.minutesToFallAsleep === p.value} onClick={() => set({ minutesToFallAsleep: p.value })}>
                {p.label}
              </Chip>
            ))}
          </ChipRow>
        </Field>

        <Field label="Despertares">
          <ChipRow>
            {WAKE_COUNT_PRESETS.map((p) => (
              <Chip
                key={p.value}
                tone="sueno"
                active={form.wakeCount === p.value}
                onClick={() => set(p.value === 0 ? { wakeCount: 0, minutesAwake: 0 } : { wakeCount: p.value })}
              >
                {p.label}
              </Chip>
            ))}
          </ChipRow>
          {form.wakeCount > 0 && (
            <div className="mt-3 anim-item-in">
              <p className="px-1 mb-2 text-xs text-ink-500">Tiempo despierto en total</p>
              <ChipRow>
                {MINUTES_AWAKE_PRESETS.map((m) => (
                  <Chip key={m} tone="sueno" active={form.minutesAwake === m} onClick={() => set({ minutesAwake: form.minutesAwake === m ? 0 : m })}>
                    {m === 60 ? '1 h+' : `${m} min`}
                  </Chip>
                ))}
              </ChipRow>
            </div>
          )}
        </Field>

        <Field label="Qué pasó ayer" hint="Opcional">
          <div className="flex flex-wrap gap-2">
            {SLEEP_FACTORS.map((f) => (
              <Chip key={f.id} tone="sueno" active={form.factors.includes(f.id)} onClick={() => toggleFactor(f.id)}>
                <span className="mr-1">{f.emoji}</span>
                {f.label}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Nota" hint="Opcional">
          <textarea
            value={form.note}
            onChange={(e) => set({ note: e.target.value })}
            rows={2}
            maxLength={280}
            placeholder="Algo para acordarte de esta noche"
            className="field bg-ink-700/50 resize-none leading-snug"
          />
        </Field>
      </div>
    </Sheet>
  );
}
