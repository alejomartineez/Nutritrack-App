import React, { useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Minus, Droplet, Flame, BookOpen, Settings, MoreHorizontal, RotateCcw, Scale, Lightbulb } from 'lucide-react';
import { ScreenHeader, IconButton, Ring, ProgressBar, toast, Sheet, ListGroup, ListRow, Button } from '../ui';
import { haptic } from '../lib/haptics';
import { useSettings } from '../lib/settings';
import { dateKeyOf, keyToDate, addDays, addDaysToKey, startOfWeek, formatDisplayDate, formatLongDate, WEEKDAY_INITIALS } from '../lib/dates';
import { kcalOf } from '../lib/nutritionCalcs';
import { useLog, useGoals, removeEntry, removeEntries, setWater, copyEntries, getLog, saveCatalogItem, useWeights } from './store';
import { MEALS, entriesOf, totalsOf, TOLERANCE, qtyLabel, baseOfEntry, splitName } from './model';
import { dayStats } from './insights';
import { MACROS, MacroLine, FreeBadge, SwipeRow, fmt, fmt1 } from './parts';

export default function TodayScreen({ dateKey, todayKey, onChangeDate, onAdd, onOpenEntry, onOpenSettings, onOpenPlan, onOpenWeight, onOpenEquivalences, streak, tiles }) {
  const goals = useGoals();
  const log = useLog(dateKey);
  const entries = useMemo(() => entriesOf(log), [log]);
  const totals = useMemo(() => totalsOf(entries), [entries]);
  const isToday = dateKey === todayKey;
  const date = keyToDate(dateKey);

  return (
    <div className="space-y-4">
      <ScreenHeader
        eyebrow={formatLongDate(date)}
        title={formatDisplayDate(date)}
        right={
          <>
            {streak > 0 && (
              <span className="h-10 px-3 rounded-full bg-amber-500/12 text-amber-300 flex items-center gap-1 text-sm font-semibold num" title="Días seguidos registrando">
                <Flame className="w-4 h-4" /> {streak}
              </span>
            )}
            <IconButton icon={BookOpen} label="Mi plan: notas, PDFs y equivalencias" onClick={onOpenPlan} />
            <IconButton icon={Settings} label="Ajustes" onClick={onOpenSettings} />
          </>
        }
      >
        <WeekStrip dateKey={dateKey} todayKey={todayKey} goals={goals} onChange={onChangeDate} />
      </ScreenHeader>

      <SummaryCard totals={totals} goals={goals} />
      <WaterCard dateKey={dateKey} water={log.water} goal={goals.water} />
      <Insight entries={entries} totals={totals} goals={goals} water={log.water} isToday={isToday} onOpenEquivalences={onOpenEquivalences} />

      <div className="space-y-3">
        {MEALS.map((m) => (
          <MealCard
            key={m.id}
            meal={m}
            dateKey={dateKey}
            todayKey={todayKey}
            entries={entries.filter((e) => e.meal === m.id)}
            onAdd={() => onAdd(m.id)}
            onOpenEntry={onOpenEntry}
          />
        ))}
      </div>

      <div className="flex gap-3">
        <WeightTile dateKey={dateKey} onOpen={onOpenWeight} />
        {tiles}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function WeekStrip({ dateKey, todayKey, goals, onChange }) {
  const monday = startOfWeek(keyToDate(dateKey));
  const days = Array.from({ length: 7 }, (_, i) => dateKeyOf(addDays(monday, i)));
  const touch = useRef(null);

  const shiftWeek = (dir) => {
    haptic(5);
    const next = addDaysToKey(dateKey, dir * 7);
    onChange(next > todayKey ? todayKey : next);
  };

  return (
    <div
      className="mt-3 flex items-center gap-1"
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current == null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        touch.current = null;
        if (Math.abs(dx) > 50) shiftWeek(dx > 0 ? -1 : 1);
      }}
    >
      <button onClick={() => shiftWeek(-1)} aria-label="Semana anterior" className="btn-icon w-7 h-10 text-ink-500 -ml-1.5">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div className="flex-1 grid grid-cols-7 gap-1">
        {days.map((k, i) => (
          <DayPill key={k} dayKey={k} initial={WEEKDAY_INITIALS[i]} selected={k === dateKey} isToday={k === todayKey} future={k > todayKey} goals={goals} onClick={() => onChange(k)} />
        ))}
      </div>
      <button
        onClick={() => shiftWeek(1)}
        disabled={days[6] >= todayKey}
        aria-label="Semana siguiente"
        className="btn-icon w-7 h-10 text-ink-500 -mr-1.5 disabled:opacity-25"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function DayPill({ dayKey, initial, selected, isToday, future, goals, onClick }) {
  const log = useLog(dayKey);
  const s = dayStats(log, goals);
  const dot = !s.hasFood ? null : s.over ? 'bg-amber-400' : s.inRange ? 'bg-brand-400' : 'bg-ink-500';
  return (
    <button
      onClick={() => {
        haptic(5);
        onClick();
      }}
      disabled={future}
      aria-label={dayKey}
      aria-current={selected ? 'date' : undefined}
      className={`h-[3.25rem] rounded-2xl flex flex-col items-center justify-center gap-0.5 disabled:opacity-30 ${
        selected ? 'bg-ink-100 text-ink-900' : isToday ? 'bg-ink-800 text-ink-100 ring-1 ring-brand-500/50' : 'text-ink-300'
      }`}
    >
      <span className={`text-[10px] font-semibold ${selected ? 'text-ink-700' : 'text-ink-500'}`}>{initial}</span>
      <span className="num text-[15px] font-semibold leading-none">{Number(dayKey.slice(8))}</span>
      <span className={`w-1 h-1 rounded-full ${dot || 'bg-transparent'}`} />
    </button>
  );
}

// ---------------------------------------------------------------------------

function SummaryCard({ totals, goals }) {
  const [showEaten, setShowEaten] = useState(false);
  const remaining = goals.calories - totals.kcal;
  const over = totals.kcal > goals.calories + TOLERANCE.calories;
  const inRange = totals.kcal > 0 && Math.abs(remaining) <= TOLERANCE.calories;
  const ringColor = over ? 'rgb(var(--amber-400))' : 'rgb(var(--brand-400))';

  const big = showEaten ? fmt(totals.kcal) : over ? `+${fmt(-remaining)}` : fmt(Math.max(0, remaining));
  const caption = showEaten ? 'consumidas' : over ? 'de más' : 'restantes';

  return (
    <section className="surface rounded-3xl p-5">
      <div className="flex items-center gap-5">
        <button onClick={() => setShowEaten((v) => !v)} aria-label="Alternar restantes y consumidas" style={{ transform: 'none' }}>
          <Ring value={totals.kcal} max={goals.calories} size={136} stroke={13} color={ringColor}>
            <span className={`num-display text-[2rem] leading-none ${over ? 'text-amber-300' : 'text-ink-50'}`}>{big}</span>
            <span className="text-xs text-ink-500 mt-1">{caption}</span>
          </Ring>
        </button>
        <div className="flex-1 min-w-0 space-y-2.5">
          <Row label="Meta" value={fmt(goals.calories)} />
          <Row label="Consumido" value={fmt(totals.kcal)} />
          <div className="h-px bg-[var(--hairline)]" />
          <p className={`text-sm font-semibold ${over ? 'text-amber-300' : inRange ? 'text-brand-300' : 'text-ink-300'}`}>
            {totals.kcal === 0 ? 'Día sin registros' : over ? 'Por encima de la meta' : inRange ? 'En rango 🎯' : 'Vas bien'}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-5">
        {MACROS.map((m) => {
          const value = totals[m.key];
          const goal = goals[m.goal];
          const left = goal - value;
          const isOver = value > goal + TOLERANCE[m.goal];
          return (
            <div key={m.key} className="min-w-0">
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-xs font-medium text-ink-400">{m.label}</span>
              </div>
              <p className="num text-[15px] font-semibold text-ink-100 mt-0.5">
                {fmt(value)}
                <span className="text-ink-500 font-normal text-xs">/{fmt(goal)}g</span>
              </p>
              <ProgressBar value={value} max={goal} color={m.color} over={isOver} className="mt-1.5" />
              <p className={`text-[11px] mt-1 ${isOver ? 'text-amber-400' : 'text-ink-500'}`}>
                {isOver ? `+${fmt(-left)} g` : left <= 0.5 ? 'Listo ✓' : `faltan ${fmt(left)} g`}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-sm text-ink-500">{label}</span>
      <span className="num text-[15px] font-semibold text-ink-100">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------

function WaterCard({ dateKey, water, goal }) {
  const { glassMl } = useSettings();
  const glasses = Math.max(1, Math.round(goal / glassMl));
  const filled = Math.round(water / glassMl);
  const slots = Math.max(glasses, filled);
  const set = (ml) => {
    haptic(8);
    setWater(dateKey, ml);
  };

  return (
    <section className="surface rounded-3xl px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-[15px] font-semibold text-ink-100">Agua</span>
          <span className="num text-sm text-ink-500 truncate">
            {fmt1(water / 1000)} / {fmt1(goal / 1000)} L
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => set(water - glassMl)} disabled={water <= 0} aria-label="Quitar un vaso" className="btn-icon w-8 h-8 bg-ink-700/70 text-ink-300 disabled:opacity-30">
            <Minus className="w-4 h-4" strokeWidth={2.5} />
          </button>
          <button onClick={() => set(water + glassMl)} aria-label="Agregar un vaso" className="btn-icon w-8 h-8 bg-water/15 text-water">
            <Plus className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1">
        {Array.from({ length: slots }, (_, i) => {
          const on = i < filled;
          return (
            <button
              key={i}
              onClick={() => set((on && i === filled - 1 ? i : i + 1) * glassMl)}
              aria-label={`${i + 1} vasos`}
              className="w-8 h-9 flex items-center justify-center"
            >
              <Droplet className={`w-6 h-6 transition-colors ${on ? 'text-water fill-current' : 'text-ink-600'}`} strokeWidth={on ? 0 : 1.8} />
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

function Insight({ entries, totals, goals, water, isToday, onOpenEquivalences }) {
  if (!isToday) return null;
  const hour = new Date().getHours();
  const protLeft = Math.round(goals.protein - totals.p);
  let text = null;
  let action = null;

  if (!entries.length) {
    if (hour >= 11) text = 'Todavía no registraste nada hoy. Empezá con lo último que comiste.';
  } else if (totals.kcal > goals.calories + TOLERANCE.calories) {
    text = 'Hoy te pasaste un poco. Un día no define nada: mañana volvés al plan.';
  } else if (protLeft > 25 && hour >= 16) {
    text = `Te faltan ${protLeft} g de proteína.`;
    action = { label: 'Ver opciones', onClick: () => onOpenEquivalences({ macro: 'p', amount: protLeft }) };
  } else if (water < goals.water * 0.5 && hour >= 15) {
    text = 'Vas corto de agua hoy. Un vaso ahora suma.';
  } else if (Math.abs(totals.kcal - goals.calories) <= TOLERANCE.calories && Math.abs(totals.p - goals.protein) <= TOLERANCE.protein) {
    text = '¡Día redondo! Calorías y proteína en rango.';
  }
  if (!text) return null;

  return (
    <div className="rounded-2xl bg-ink-800/60 px-4 py-3 flex items-center gap-3">
      <Lightbulb className="w-4 h-4 text-amber-300 shrink-0" />
      <p className="text-sm text-ink-300 flex-1 leading-snug">{text}</p>
      {action && (
        <button onClick={action.onClick} className="text-sm font-semibold text-brand-400 shrink-0">
          {action.label}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function MealCard({ meal, dateKey, todayKey, entries, onAdd, onOpenEntry }) {
  const [menu, setMenu] = useState(false);
  const Icon = meal.icon;
  const kcal = entries.reduce((s, e) => s + kcalOf(e), 0);
  const isToday = dateKey === todayKey;

  // Lo que hubo en este momento ayer (o el día anterior al que estás mirando).
  const prevKey = addDaysToKey(dateKey, -1);
  const prevEntries = useMemo(
    () => (entries.length ? [] : entriesOf(getLog(prevKey)).filter((e) => e.meal === meal.id)),
    [entries.length, prevKey, meal.id]
  );
  const prevKcal = prevEntries.reduce((s, e) => s + kcalOf(e), 0);

  if (!entries.length && meal.id === 'snack' && !prevEntries.length) {
    return (
      <button onClick={onAdd} className="w-full surface rounded-3xl px-4 h-14 flex items-center gap-3 text-left">
        <MealIcon icon={Icon} muted />
        <span className="flex-1 text-[15px] font-semibold text-ink-300">{meal.label}</span>
        <AddCircle />
      </button>
    );
  }

  const remove = (e) => {
    const undo = removeEntry(dateKey, e.id);
    toast(`Borraste ${splitName(e.name).title}`, { action: { label: 'Deshacer', onClick: undo } });
  };

  return (
    <section className="surface rounded-3xl overflow-hidden">
      <div className="flex items-center gap-3 pl-4 pr-2 h-14">
        <MealIcon icon={Icon} muted={!entries.length} />
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-ink-100">{meal.label}</h3>
        </div>
        {entries.length > 0 && <span className="num text-sm text-ink-400 mr-1">{fmt(kcal)} kcal</span>}
        {entries.length > 0 && (
          <button onClick={() => setMenu(true)} aria-label={`Opciones de ${meal.label}`} className="btn-icon w-9 h-9 text-ink-500">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        )}
        <button onClick={onAdd} aria-label={`Agregar a ${meal.label}`} style={{ transform: 'none' }}>
          <AddCircle />
        </button>
      </div>

      {entries.length > 0 && (
        <ul className="border-t hairline">
          {entries.map((e) => {
            const { base, qty } = baseOfEntry(e);
            const { title } = splitName(e.name);
            const detail = e.base ? qtyLabel(base, qty) : splitName(e.name).portion;
            return (
              <li key={e.id} className="anim-item-in border-b hairline last:border-b-0">
                <SwipeRow onTap={() => onOpenEntry({ entry: e, dateKey })} onDelete={() => remove(e)}>
                  <div className="flex items-center gap-3 pl-4 pr-4 py-2.5 min-h-[3.25rem]">
                    <div className="flex-1 min-w-0">
                      <p className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[15px] text-ink-100 truncate">{title}</span>
                        {e.free && <FreeBadge className="shrink-0" />}
                      </p>
                      <p className="text-xs text-ink-500 truncate mt-0.5 flex items-center gap-2">
                        {detail && <span className="truncate">{detail}</span>}
                        <MacroLine p={e.p} c={e.c} f={e.f} />
                      </p>
                    </div>
                    <span className="num text-[15px] text-ink-200 shrink-0">{fmt(kcalOf(e))}</span>
                  </div>
                </SwipeRow>
              </li>
            );
          })}
        </ul>
      )}

      {!entries.length && prevEntries.length > 0 && (
        <div className="px-4 pb-3 -mt-1">
          <button
            onClick={() => {
              copyEntries(dateKey, prevEntries, meal.id);
              haptic();
              toast(`Repetiste ${meal.label.toLowerCase()} de ${isToday ? 'ayer' : 'el día anterior'}`);
            }}
            className="w-full rounded-2xl bg-ink-700/50 px-3.5 py-2.5 flex items-center gap-2.5 text-left"
          >
            <RotateCcw className="w-4 h-4 text-brand-400 shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-ink-200">Repetir {isToday ? 'lo de ayer' : 'del día anterior'}</span>
              <span className="block text-xs text-ink-500 truncate">
                {prevEntries.map((e) => splitName(e.name).title).join(', ')} · {fmt(prevKcal)} kcal
              </span>
            </span>
          </button>
        </div>
      )}

      {menu && <MealMenu meal={meal} dateKey={dateKey} todayKey={todayKey} entries={entries} onClose={() => setMenu(false)} />}
    </section>
  );
}

function MealIcon({ icon: Icon, muted }) {
  return (
    <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${muted ? 'bg-ink-700/60 text-ink-500' : 'bg-brand-500/15 text-brand-400'}`}>
      <Icon className="w-[18px] h-[18px]" />
    </span>
  );
}

function AddCircle() {
  return (
    <span className="btn-icon w-9 h-9 bg-brand-500 text-onaccent">
      <Plus className="w-5 h-5" strokeWidth={2.75} />
    </span>
  );
}

function MealMenu({ meal, dateKey, todayKey, entries, onClose }) {
  const totals = totalsOf(entries);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState(`Mi ${meal.label.toLowerCase()}`);
  const saveAsMeal = () => {
    if (!name.trim()) return;
    saveCatalogItem(
      { name: name.trim(), kcal: Math.round(totals.kcal), p: Math.round(totals.p * 10) / 10, c: Math.round(totals.c * 10) / 10, f: Math.round(totals.f * 10) / 10 },
      entries.every((e) => e.free)
    );
    toast('Guardada en Mis comidas');
    onClose();
  };
  const copyToToday = () => {
    copyEntries(todayKey, entries, meal.id);
    toast(`Copiado a hoy (${meal.label})`);
    onClose();
  };
  const clearAll = () => {
    const undo = removeEntries(dateKey, entries.map((e) => e.id));
    toast(`Vaciaste ${meal.label.toLowerCase()}`, { action: { label: 'Deshacer', onClick: undo } });
    onClose();
  };

  return (
    <Sheet title={meal.label} subtitle={`${entries.length} ${entries.length === 1 ? 'alimento' : 'alimentos'} · ${fmt(totals.kcal)} kcal`} onClose={onClose}>
      <ListGroup>
        <ListRow icon={Plus} title="Guardar como comida" subtitle="Queda en Mis comidas para agregarla de un toque" onClick={() => setNaming(true)} />
        {naming && (
          <div className="px-4 py-3 flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus onFocus={(e) => e.target.select()} className="field flex-1" aria-label="Nombre de la comida" />
            <Button onClick={saveAsMeal} disabled={!name.trim()}>
              Guardar
            </Button>
          </div>
        )}
        {dateKey !== todayKey && <ListRow icon={RotateCcw} title="Copiar a hoy" onClick={copyToToday} />}
        <ListRow icon={Minus} iconTone="red" title="Vaciar este momento" danger onClick={clearAll} />
      </ListGroup>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------

function WeightTile({ dateKey, onOpen }) {
  const weights = useWeights();
  const keys = Object.keys(weights).filter((k) => k <= dateKey).sort();
  const last = keys[keys.length - 1];
  const prev = keys[keys.length - 2];
  const today = weights[dateKey];
  const delta = last && prev ? weights[last] - weights[prev] : 0;
  return (
    <button onClick={onOpen} className="surface rounded-3xl p-4 text-left min-h-[6.5rem] flex flex-col flex-1 min-w-0">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-400">
        <Scale className="w-4 h-4 text-brand-400" /> Peso
      </span>
      {last ? (
        <>
          <span className="num-display text-2xl text-ink-50 mt-auto">
            {fmt1(weights[last])}
            <span className="text-sm text-ink-500 font-semibold ml-1">kg</span>
          </span>
          <span className="text-xs text-ink-500 mt-0.5">
            {today ? 'Hoy' : `Último: ${last.slice(8)}/${last.slice(5, 7)}`}
            {delta ? ` · ${delta > 0 ? '+' : ''}${fmt1(delta)}` : ''}
          </span>
        </>
      ) : (
        <span className="text-sm font-semibold text-ink-200 mt-auto">Registrá tu peso</span>
      )}
    </button>
  );
}
