import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, SlidersHorizontal, BarChart3 } from 'lucide-react';
import { ScreenHeader, SectionTitle, Segmented, IconButton, EmptyState, toast } from '../ui';
import { useTodayKey } from '../lib/today';
import { haptic } from '../lib/haptics';
import { formatLongDate, keyToDate } from '../lib/dates';
import {
  loadSleepLogs,
  saveSleepLogs,
  loadSleepGoalHours,
  saveSleepGoalHours,
  upsertSleepLog,
  deleteSleepLog,
  getPendingSleep,
  startPendingSleep,
  clearPendingSleep,
  pendingNightKey,
  nightFromPending,
  minutesInBed,
  listNights,
  scoreNight,
  getFormDefaults,
  nightSeries,
  summarizeRange,
  computeSleepDebt,
  computeConsistency,
  suggestBedtime,
  computeFactorImpact,
  computeSocialJetlag,
  qualityOf,
  isHM,
} from './sleepStorage';
import SleepLogSheet from './SleepLogSheet';
import { ScoreSheet, GoalSheet, RateSheet } from './SleepSheets';
import { SleepingHero, LastNightHero, LogPromptHero } from './SleepHero';
import { NightsChart, RhythmCards, Patterns } from './SleepTrends';
import { nightTitle } from './sleepFormat';

/** Hora actual, refrescada cada 30 s y al volver a la app. */
function useNow(ms = 30000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, ms);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [ms]);
  return now;
}

const RANGES = [
  { value: 7, label: '7 noches' },
  { value: 30, label: '30 noches' },
];

const stagger = (i) => ({ animationDelay: `${i * 50}ms` });

export default function SleepModule() {
  const todayKey = useTodayKey();
  const now = useNow();
  const [logs, setLogs] = useState(loadSleepLogs);
  const [goalHours, setGoalHours] = useState(loadSleepGoalHours);
  const [pending, setPending] = useState(() => getPendingSleep());
  const [range, setRange] = useState(7);
  const [sheet, setSheet] = useState(null);

  useEffect(() => setPending(getPendingSleep(now.getTime())), [now]);

  const update = useCallback((fn) => {
    setLogs((prev) => {
      const next = fn(prev);
      saveSleepLogs(next);
      return next;
    });
  }, []);

  const evening = now.getHours() >= 18 || now.getHours() < 4;
  const nights = useMemo(() => listNights(logs), [logs]);
  const lastNight = nights.find((n) => n.date === todayKey) || null;
  const lastScore = useMemo(() => (lastNight ? scoreNight(logs, todayKey, goalHours) : null), [logs, lastNight, todayKey, goalHours]);
  const defaults = useMemo(() => getFormDefaults(logs, todayKey), [logs, todayKey]);

  const series = useMemo(() => nightSeries(logs, goalHours, todayKey, range), [logs, goalHours, todayKey, range]);
  const summary = useMemo(() => summarizeRange(logs, goalHours, series[0].key, todayKey), [logs, goalHours, series, todayKey]);
  const debt = useMemo(() => computeSleepDebt(logs, goalHours, todayKey), [logs, goalHours, todayKey]);
  const consistency = useMemo(() => computeConsistency(logs, todayKey), [logs, todayKey]);
  const suggestion = useMemo(() => suggestBedtime(logs, goalHours, todayKey), [logs, goalHours, todayKey]);
  const factors = useMemo(() => computeFactorImpact(logs, todayKey), [logs, todayKey]);
  const jetlag = useMemo(() => computeSocialJetlag(logs, todayKey), [logs, todayKey]);

  const close = () => setSheet(null);

  const saveNight = (dateKey, patch) => {
    update((m) => upsertSleepLog(m, dateKey, patch));
    if (pending && pendingNightKey(pending) === dateKey) {
      clearPendingSleep();
      setPending(null);
    }
    close();
    toast('Noche guardada');
  };

  const removeNight = (dateKey) => {
    const removed = logs[dateKey];
    update((m) => deleteSleepLog(m, dateKey));
    close();
    toast('Noche borrada', { action: { label: 'Deshacer', onClick: () => update((m) => ({ ...m, [dateKey]: removed })) } });
  };

  const rate = (dateKey, quality) => {
    update((m) => upsertSleepLog(m, dateKey, { quality }));
    close();
    toast('¡Que tengas un buen día!');
  };

  const goToBed = () => {
    haptic();
    setPending(startPendingSleep(new Date()));
    toast('Que descanses');
  };

  const cancelBed = () => {
    clearPendingSleep();
    setPending(null);
  };

  const wakeUp = () => {
    if (!pending) return;
    const { dateKey, patch } = nightFromPending(pending, new Date(), defaults.minutesToFallAsleep);
    clearPendingSleep();
    setPending(null);
    if (minutesInBed(patch.bedtime, patch.wakeTime) < 30) {
      toast('Fueron menos de 30 minutos: no lo guardé', { tone: 'info' });
      return;
    }
    if (dateKey !== pendingNightKey(pending) && logs[dateKey]) {
      toast('No lo guardé para no pisar la noche que ya registraste hoy', { tone: 'info' });
      return;
    }
    const fresh = { interruptions: { count: 0, minutesAwake: 0 }, quality: null, factors: [] };
    update((m) => upsertSleepLog(m, dateKey, m[dateKey] ? patch : { ...patch, ...fresh }));
    setSheet({ type: 'rate', dateKey, ...patch });
  };

  const changeGoal = (hours) => {
    setGoalHours(hours);
    saveSleepGoalHours(hours);
  };

  const openLog = (dateKey = todayKey) => setSheet({ type: 'log', dateKey });

  let hero;
  if (pending) {
    hero = <SleepingHero pending={pending} now={now} onWake={wakeUp} onCancel={cancelBed} />;
  } else if (lastNight && lastScore) {
    hero = (
      <LastNightHero
        night={{
          minutes: lastNight.minutes,
          quality: qualityOf(lastNight),
          bedtime: isHM(lastNight.bedtime) ? lastNight.bedtime : null,
          wakeTime: isHM(lastNight.wakeTime) ? lastNight.wakeTime : null,
        }}
        score={lastScore}
        evening={evening}
        onScore={() => setSheet({ type: 'score', dateKey: todayKey })}
        onEdit={() => openLog(todayKey)}
        onRate={(q) => rate(todayKey, q)}
        onBed={goToBed}
      />
    );
  } else {
    hero = <LogPromptHero evening={evening} firstTime={nights.length === 0} defaults={defaults} onLog={() => openLog(todayKey)} onBed={goToBed} />;
  }

  const scoreResult = sheet?.type === 'score' ? scoreNight(logs, sheet.dateKey, goalHours) : null;

  return (
    <div className="pb-4">
      <ScreenHeader
        title="Sueño"
        eyebrow={formatLongDate(keyToDate(todayKey))}
        eyebrowTone="sueno"
        right={
          <>
            <IconButton icon={Plus} label="Registrar una noche" tone="sueno" onClick={() => openLog(todayKey)} />
            <IconButton icon={SlidersHorizontal} label="Meta de sueño" onClick={() => setSheet({ type: 'goal' })} />
          </>
        }
      />

      <div className="space-y-7 pt-1">
        <div className="anim-item-in" style={stagger(0)}>
          {hero}
        </div>

        {nights.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="Tus tendencias van a aparecer acá"
            text="Con 3 noches registradas vas a ver tu deuda de sueño, tu constancia y la hora ideal para acostarte."
            className="anim-item-in"
          />
        ) : (
          <>
            <section className="anim-item-in" style={stagger(1)}>
              <SectionTitle action={<Segmented size="sm" tone="ink" value={range} onChange={setRange} options={RANGES} className="w-[10rem]" />}>
                Noches
              </SectionTitle>
              <NightsChart series={series} summary={summary} goalHours={goalHours} todayKey={todayKey} onSelect={openLog} />
            </section>

            <section className="anim-item-in" style={stagger(2)}>
              <SectionTitle>Tu ritmo</SectionTitle>
              <RhythmCards debt={debt} consistency={consistency} suggestion={suggestion} goalHours={goalHours} />
            </section>

            <section className="anim-item-in" style={stagger(3)}>
              <SectionTitle>Patrones</SectionTitle>
              <Patterns factors={factors} jetlag={jetlag} />
            </section>
          </>
        )}
      </div>

      {sheet?.type === 'log' && (
        <SleepLogSheet
          initialKey={sheet.dateKey}
          todayKey={todayKey}
          logs={logs}
          goalHours={goalHours}
          onSave={saveNight}
          onDelete={removeNight}
          onClose={close}
        />
      )}
      {scoreResult && <ScoreSheet title={nightTitle(sheet.dateKey, todayKey)} result={scoreResult} onClose={close} />}
      {sheet?.type === 'goal' && <GoalSheet goalHours={goalHours} onChange={changeGoal} onClose={close} />}
      {sheet?.type === 'rate' && (
        <RateSheet
          minutes={logs[sheet.dateKey]?.totalSleepMinutes || 0}
          bedtime={sheet.bedtime}
          wakeTime={sheet.wakeTime}
          onRate={(q) => rate(sheet.dateKey, q)}
          onDetails={() => openLog(sheet.dateKey)}
          onClose={close}
        />
      )}
    </div>
  );
}
