import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, LayoutDashboard, Sparkles, ChevronLeft, ChevronRight, MoonStar } from 'lucide-react';
import ModuleIntro from '../ModuleIntro';
import SleepLogForm from './SleepLogForm';
import SleepDashboard from './SleepDashboard';
import SleepInsights from './SleepInsights';
import {
  loadSleepLogs,
  saveSleepLogs,
  loadSleepGoalHours,
  upsertSleepLog,
  localDateKey,
  addDaysToKey,
} from './sleepStorage';

const TABS = [
  { id: 'registro', label: 'Registro', icon: CalendarClock },
  { id: 'semana', label: 'Semana', icon: LayoutDashboard },
  { id: 'insights', label: 'Insights', icon: Sparkles },
];

const sleepBadge = (Icon) => (
  <div className="flex items-center justify-center w-28 h-28 rounded-full bg-violet-500/10 border border-violet-500/30">
    <Icon className="w-12 h-12 text-violet-400" />
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
    key: 'registro',
    visual: sleepBadge(CalendarClock),
    title: 'Registrá tu noche',
    text: 'Anotá a qué hora te acostaste, cuándo te despertaste y cómo amaneciste. Toma segundos.',
  },
  {
    key: 'insights',
    visual: sleepBadge(Sparkles),
    title: 'Descubrí tus patrones',
    text: 'En "Semana" ves tus horas de sueño de un vistazo, y en "Insights", consejos según lo que vas registrando.',
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
      <button
        onClick={onPrev}
        aria-label="Día anterior"
        className="p-2 rounded-xl text-indigo-300 hover:bg-indigo-900/60 focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <span className="text-sm font-bold text-indigo-100">{label}</span>
      <button
        onClick={onNext}
        disabled={isToday}
        aria-label="Día siguiente"
        className={`p-2 rounded-xl focus-visible:ring-2 focus-visible:ring-violet-400 ${
          isToday ? 'text-indigo-700 cursor-not-allowed' : 'text-indigo-300 hover:bg-indigo-900/60'
        }`}
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
  const [subTab, setSubTab] = useState('registro');

  const todayKey = localDateKey();
  // Día que se está registrando/editando (por defecto hoy; se puede retroceder).
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const selectedLog = sleepLogs[selectedKey] || null;
  const isToday = selectedKey === todayKey;

  useEffect(() => {
    const logs = loadSleepLogs();
    setSleepLogs(logs);
    setGoalHours(loadSleepGoalHours());
    setSubTab(logs[localDateKey()] ? 'semana' : 'registro');
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

  const openDayInForm = (key) => {
    setSelectedKey(key);
    setSubTab('registro');
  };

  const goToTab = (id) => {
    if (id === 'registro') setSelectedKey(todayKey); // la pestaña "Registro" siempre abre hoy
    setSubTab(id);
  };

  if (!loaded) return null;

  return (
    <div className="space-y-4">
      <ModuleIntro
        storageKey="sleep_intro_seen"
        slides={SLEEP_INTRO_SLIDES}
        dotActiveClass="bg-emerald-400"
        buttonClass="bg-emerald-500 hover:bg-emerald-400 text-slate-900 focus-visible:ring-emerald-300"
        finalLabel="Entendido"
      />

      <div className="grid grid-cols-3 gap-2 surface rounded-2xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => goToTab(tab.id)}
            className={`py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              subTab === tab.id ? 'bg-violet-500 text-slate-900' : 'text-indigo-400'
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {subTab === 'registro' && (
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
        <SleepDashboard sleepLogs={sleepLogs} goalHours={goalHours} onSelectDay={openDayInForm} />
      )}

      {subTab === 'insights' && <SleepInsights sleepLogs={sleepLogs} />}
    </div>
  );
}
