import React, { useMemo, useState } from 'react';
import { Flame, Sparkles, CalendarCheck, Scale, Plus, Gauge, Info } from 'lucide-react';
import { ScreenHeader, Segmented, Card, Button, ProgressBar } from '../ui';
import { lastNKeys, addDaysToKey, WEEKDAY_INITIALS, mondayIndex, keyToDate, formatShortDate } from '../lib/dates';
import { useGoals, useWeights, logsInRange, getProfile, setGoals } from './store';
import { dayStats, weightTrend, estimateTDEE, foodHistory, avg } from './insights';
import { BarChart, TrendChart } from './charts';
import { MACROS, fmt, fmt1 } from './parts';
import { splitName } from './model';
import { toast } from '../ui';

const RANGES = [
  { value: 7, label: '7 días' },
  { value: 30, label: '30 días' },
  { value: 90, label: '3 meses' },
];

export default function ProgressScreen({ todayKey, streak, onOpenWeight, extra }) {
  const [range, setRange] = useState(7);
  const goals = useGoals();
  const weights = useWeights();

  const days = useMemo(() => {
    const keys = lastNKeys(range, todayKey);
    return logsInRange(keys[0], todayKey).map(({ key, log }) => ({ key, ...dayStats(log, goals) }));
  }, [range, todayKey, goals]);

  const logged = days.filter((d) => d.hasFood);
  const avgKcal = avg(logged.map((d) => d.kcal));
  const inRange = logged.filter((d) => d.inRange).length;
  const gustos = days.reduce((s, d) => s + d.freeCount, 0);

  const bars = useMemo(() => {
    if (range <= 30) {
      return days.map((d) => ({
        key: d.key,
        label: range === 7 ? WEEKDAY_INITIALS[mondayIndex(keyToDate(d.key))] : String(Number(d.key.slice(8))),
        value: d.hasFood ? d.kcal : 0,
        tone: d.over ? 'amber' : d.inRange ? 'brand' : 'ink',
      }));
    }
    // 90 días: promedio semanal de los días registrados.
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      const chunk = days.slice(i, i + 7);
      const l = chunk.filter((d) => d.hasFood);
      const v = avg(l.map((d) => d.kcal));
      weeks.push({ key: chunk[0].key, label: formatShortDate(chunk[0].key).split(' ')[0], value: v, tone: Math.abs(v - goals.calories) <= 100 ? 'brand' : v > goals.calories ? 'amber' : 'ink' });
    }
    return weeks;
  }, [days, range, goals.calories]);

  const trend = useMemo(() => weightTrend(weights, todayKey), [weights, todayKey]);
  const fromKey = addDaysToKey(todayKey, -(range - 1));
  const trendInRange = trend.filter((p) => p.key >= fromKey);
  const latestTrend = trend.length ? trend[trend.length - 1].trend : null;
  const startTrend = trendInRange.length ? trendInRange[0].trend : null;

  const tdee = useMemo(() => {
    const window = logsInRange(addDaysToKey(todayKey, -27), todayKey);
    const kcalByDay = Object.fromEntries(window.map(({ key, log }) => [key, dayStats(log, goals)]).filter(([, s]) => s.hasFood).map(([k, s]) => [k, s.kcal]));
    return estimateTDEE({ kcalByDay, weights, endKey: todayKey });
  }, [weights, todayKey, goals]);

  const topFoods = useMemo(
    () => foodHistory(logsInRange(fromKey, todayKey)).sort((a, b) => b.count - a.count).slice(0, 5),
    [fromKey, todayKey]
  );

  return (
    <div className="space-y-4">
      <ScreenHeader title="Progreso">
        <Segmented value={range} onChange={setRange} options={RANGES} className="mt-3" />
      </ScreenHeader>

      {/* Calorías */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-ink-500">Promedio diario</p>
            <p className="num-display text-3xl text-ink-50 mt-0.5">
              {logged.length ? fmt(avgKcal) : '—'}
              <span className="text-sm text-ink-500 font-semibold ml-1">kcal</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-ink-500">En rango</p>
            <p className="num text-lg font-semibold text-brand-300 mt-1">
              {inRange}/{logged.length || 0}
              <span className="text-xs text-ink-500 font-normal"> días</span>
            </p>
          </div>
        </div>
        <div className="mt-5">
          <BarChart data={bars} goal={goals.calories} />
        </div>
        <div className="mt-5 space-y-3">
          {MACROS.map((m) => {
            const a = avg(logged.map((d) => d[m.key]));
            const g = goals[m.goal];
            return (
              <div key={m.key}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-ink-300">{m.label}</span>
                  <span className="num text-ink-100">
                    {logged.length ? fmt(a) : '—'}
                    <span className="text-ink-500"> / {fmt(g)} g</span>
                  </span>
                </div>
                <ProgressBar value={a} max={g} color={m.color} className="mt-1.5" />
              </div>
            );
          })}
        </div>
      </Card>

      {/* Constancia */}
      <div className="grid grid-cols-3 gap-3">
        <MiniStat icon={Flame} tone="text-amber-400" value={streak} label={streak === 1 ? 'día seguido' : 'días seguidos'} />
        <MiniStat icon={CalendarCheck} tone="text-brand-400" value={`${logged.length}/${range}`} label="días registrados" />
        <MiniStat icon={Sparkles} tone="text-amber-300" value={gustos} label={gustos === 1 ? 'gusto' : 'gustos'} />
      </div>

      {/* Peso */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-ink-500 flex items-center gap-1">
              <Scale className="w-3.5 h-3.5" /> Peso (tendencia)
            </p>
            <p className="num-display text-3xl text-ink-50 mt-0.5">
              {latestTrend != null ? fmt1(latestTrend) : '—'}
              <span className="text-sm text-ink-500 font-semibold ml-1">kg</span>
            </p>
            {latestTrend != null && startTrend != null && trendInRange.length > 1 && (
              <p className="text-xs text-ink-400 mt-0.5 num">
                {latestTrend - startTrend > 0 ? '+' : ''}
                {fmt1(latestTrend - startTrend)} kg en {RANGES.find((r) => r.value === range).label}
              </p>
            )}
          </div>
          <Button size="sm" variant="soft" icon={Plus} onClick={onOpenWeight}>
            Registrar
          </Button>
        </div>
        {trendInRange.length > 1 ? (
          <div className="mt-4">
            <TrendChart points={trendInRange} />
            <p className="text-[11px] text-ink-500 mt-1 leading-snug">
              Los puntos son tus pesajes; la línea es la tendencia, que filtra las subidas y bajadas de agua del día a día.
            </p>
          </div>
        ) : (
          <p className="text-sm text-ink-500 mt-3">Registrá tu peso un par de veces por semana para ver la tendencia.</p>
        )}
      </Card>

      <TdeeCard tdee={tdee} goals={goals} />

      {extra}

      {topFoods.length > 0 && (
        <Card className="p-5">
          <p className="text-xs text-ink-500 mb-3">Lo que más comiste</p>
          <ol className="space-y-2.5">
            {topFoods.map((f, i) => (
              <li key={f.name} className="flex items-center gap-3">
                <span className="num w-5 text-sm text-ink-500">{i + 1}</span>
                <span className="flex-1 text-[15px] text-ink-100 truncate">{splitName(f.name).title}</span>
                <span className="num text-sm text-ink-400">×{f.count}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}

function MiniStat({ icon: Icon, tone, value, label }) {
  return (
    <div className="surface rounded-3xl p-3.5">
      <Icon className={`w-4 h-4 ${tone}`} />
      <p className="num-display text-2xl text-ink-50 mt-2 leading-none">{value}</p>
      <p className="text-[11px] text-ink-500 mt-1 leading-tight">{label}</p>
    </div>
  );
}

function TdeeCard({ tdee, goals }) {
  const [info, setInfo] = useState(false);
  const profile = getProfile();
  const objective = profile?.objective || 'mantener';
  const factor = { perder: 0.8, mantener: 1, ganar: 1.1 }[objective] ?? 1;
  const suggested = tdee.ready ? Math.round((tdee.tdee * factor) / 10) * 10 : null;

  const apply = () => {
    const ratio = suggested / goals.calories;
    // Mantiene la proteína y reparte la diferencia en carbos y grasa.
    const next = {
      ...goals,
      calories: suggested,
      carbs: Math.max(0, Math.round(goals.carbs * ratio * 10) / 10),
      fat: Math.max(0, Math.round(goals.fat * ratio * 10) / 10),
    };
    setGoals(next);
    toast(`Meta actualizada a ${fmt(suggested)} kcal`);
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-ink-500 flex items-center gap-1">
          <Gauge className="w-3.5 h-3.5" /> Gasto real estimado
        </p>
        <button onClick={() => setInfo((v) => !v)} aria-label="Cómo se calcula" className="text-ink-500 -mt-1">
          <Info className="w-4 h-4" />
        </button>
      </div>
      {tdee.ready ? (
        <>
          <p className="num-display text-3xl text-ink-50 mt-0.5">
            {fmt(tdee.tdee)}
            <span className="text-sm text-ink-500 font-semibold ml-1">kcal/día</span>
          </p>
          <p className="text-xs text-ink-400 mt-1">
            Comiste {fmt(tdee.intake)} kcal en promedio y tu tendencia fue de {tdee.weeklyChangeKg > 0 ? '+' : ''}
            {fmt1(tdee.weeklyChangeKg)} kg/semana.
          </p>
          {Math.abs(suggested - goals.calories) >= 50 && (
            <div className="mt-3 rounded-2xl bg-ink-900 p-3 flex items-center gap-3">
              <p className="flex-1 text-sm text-ink-300 leading-snug">
                Para <b className="text-ink-100">{objective}</b> te convendría ~<b className="num text-ink-100">{fmt(suggested)}</b> kcal (hoy: {fmt(goals.calories)}).
              </p>
              <Button size="sm" onClick={apply}>
                Usar
              </Button>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-ink-400 mt-1.5 leading-snug">
          Se calcula solo con tus registros y tu peso de las últimas 4 semanas. Falta: {tdee.need.join(' y ')}.
        </p>
      )}
      {info && (
        <p className="text-xs text-ink-500 mt-3 leading-relaxed">
          Si comiste X en promedio y tu peso de tendencia bajó o subió, la diferencia (≈7.700 kcal por kg) dice cuánto gastás de verdad. Es más preciso
          que cualquier fórmula porque usa tus datos reales. Funciona mejor si registrás casi todos los días.
        </p>
      )}
    </Card>
  );
}
