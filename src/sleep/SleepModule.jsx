import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, LayoutDashboard, Sparkles, ChevronLeft, ChevronRight, MoonStar } from 'lucide-react';
import ModuleIntro from '../ModuleIntro';
import SubTabs from '../lib/SubTabs';
import SleepLogForm from './SleepLogForm';
import SleepDashboard from './SleepDashboard';
import SleepInsights from './SleepInsights';
import {
  loadSleepLogs,
  saveSleepLogs,
  loadSleepGoalHours,
  saveSleepGoalHours,
  upsertSleepLog,
  localDateKey,
  addDaysToKey,
} from './sleepStorage';

// Mismo esqueleto que Entreno (Hoy · Semana · Progreso): las tres pestañas van
// de "lo que hago ahora" a "cómo vengo" a "qué significa".
const TABS = [
  { id: 'hoy', label: 'Hoy', icon: CalendarClock },
  { id: 'semana', label: 'Semana', icon: LayoutDashboard },
  { id: 'insights', label: 'Insights', icon: Sparkles },
];

const sleepBadge = (Icon) => (
  <div className="flex items-center justify-center w-28 h-28 rounded-full bg-sueno-500/10 border border-sueno-500/30">
    <Icon className="w-12 h-12 text-sueno-400" />
  </div>
);

const SLEEP_INTRO_SLIDES = [
  {
    key: 'intro',
    visual: sleepBadge(MoonStar),
    title: 'Tu descanso, en un lugar',
    text: 'Registrá cuánto y cómo dormís para entender tu energía día a día.',
  },
  {
    key: 'hoy',
    visual: sleepBadge(CalendarClock),
    title: 'Registrá tu noche',
    text: 'A qué hora te acostaste, cuándo te despertaste y cómo amaneciste. Toma segundos.',
  },
  {
    key: 'insights',
    visual: sleepBadge(Sparkles),
    title: 'Descubrí tus patrones',
    text: 'En «Semana» ves tus horas de un vistazo. En «Insights», qué factores te ayudan y a qué hora te conviene acostarte.',
  },
];

const dayLabelFor = (key, todayKey) => {
  if (key === todayKey) return 'Hoy';
  if (key === addDaysToKey(todayKey, -1)) return 'Ayer';
  const d = new Date(`${key}T00:00:00`);
  const text = d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
  return text.charAt(0).toUpperCase() + text.slice(1);
};

function SleepDayNav({ label, isToday, onPrev, onNext }) {
  return (
    <div className="flex items-center justify-between surface rounded-2xl px-2 py-1.5">
      <button onClick={onPrev} aria-label="Día anterior" className="btn-icon text-ink-300 hover:bg-ink-700">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <span className="text-sm font-bold text-ink-100">{label}</span>
      <button
        onClick={onNext}
        disabled={isToday}
        aria-label="Día siguiente"
        className={`btn-icon ${isToday ? 'text-ink-700 cursor-not-allowed' : 'text-ink-300 hover:bg-ink-700'}`}
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

export default function SleepModule() {
  const [loaded, setLoaded] = useState(false);
  const [sleepLogs, setSleepLogs] = useState({});
  const [goalHours, setGoalHours] = useState(8);
  const [subTab, setSubTab] = useState('hoy');

  const todayKey = localDateKey();
  // Día que se está registrando/editando (por defecto hoy; se puede retroceder).
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const selectedLog = sleepLogs[selectedKey] || null;
  const isToday = selectedKey === todayKey;

  useEffect(() => {
    const logs = loadSleepLogs();
    setSleepLogs(logs);
    setGoalHours(loadSleepGoalHours());
    // Si ya registraste lo de hoy, abrir el formulario otra vez no aporta:
    // se entra directo a la semana.
    setSubTab(logs[localDateKey()] ? 'semana' : 'hoy');
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveSleepLogs(sleepLogs);
  }, [sleepLogs, loaded]);

  // Valores por defecto para pre-cargar el form: la noche anterior al día elegido.
  const prevDayLog = useMemo(
    () => sleepLogs[addDaysToKey(selectedKey, -1)] || null,
    [sleepLogs, selectedKey]
  );

  const handleSave = (patch) => {
    setSleepLogs((prev) => upsertSleepLog(prev, selectedKey, patch));
    setSubTab('semana');
  };

  const handleChangeGoal = (hours) => {
    setGoalHours(hours);
    saveSleepGoalHours(hours);
  };

  const openDayInForm = (key) => {
    setSelectedKey(key);
    setSubTab('hoy');
  };

  const goToTab = (id) => {
    if (id === 'hoy') setSelectedKey(todayKey); // la pestaña "Hoy" siempre abre hoy
    setSubTab(id);
  };

  if (!loaded) return null;

  return (
    <div className="space-y-4">
      <ModuleIntro
        storageKey="sleep_intro_seen"
        slides={SLEEP_INTRO_SLIDES}
        dotActiveClass="bg-sueno-400"
        buttonClass="bg-sueno-500 hover:bg-sueno-400 text-ink-900"
        finalLabel="Entendido"
      />

      <SubTabs tabs={TABS} value={subTab} onChange={goToTab} accent="sueno" />

      {subTab === 'hoy' && (
        <>
          <SleepDayNav
            label={dayLabelFor(selectedKey, todayKey)}
            isToday={isToday}
            onPrev={() => setSelectedKey((k) => addDaysToKey(k, -1))}
            onNext={() => setSelectedKey((k) => (k === todayKey ? k : addDaysToKey(k, 1)))}
          />
          <SleepLogForm
            key={selectedKey}
            existingLog={selectedLog}
            isToday={isToday}
            onSave={handleSave}
            defaultBedtime={prevDayLog?.bedtime || '23:00'}
            defaultWakeTime={prevDayLog?.wakeTime || '07:00'}
          />
        </>
      )}

      {subTab === 'semana' && (
        <SleepDashboard
          sleepLogs={sleepLogs}
          goalHours={goalHours}
          onSelectDay={openDayInForm}
          onChangeGoal={handleChangeGoal}
        />
      )}

      {subTab === 'insights' && <SleepInsights sleepLogs={sleepLogs} goalHours={goalHours} />}
    </div>
  );
}
