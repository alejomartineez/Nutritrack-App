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

const dayLabelFor = (key, todayKey) => {
  if (key === todayKey) return 'Hoy';
  if (key === addDaysToKey(todayKey, -1)) return 'Ayer';
  const d = new Date(`${key}T00:00:00`);
  const text = d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
  return text.charAt(0).toUpperCase() + text.slice(1);
};

function SleepDayNav({ label, isToday, onPrev, onNext }) {
  return (
    <div className="flex items-center justify-between bg-indigo-950/60 border border-indigo-500/20 rounded-2xl px-2 py-1.5">
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
        accent={{
          card: 'border-violet-500/30 bg-indigo-950/50',
          iconWrap: 'bg-violet-500/15 text-violet-300',
          title: 'text-violet-200',
          bullet: 'text-violet-400',
          button: 'bg-violet-500 hover:bg-violet-400 text-white focus-visible:ring-violet-300',
        }}
        icon={<MoonStar className="w-5 h-5" />}
        title="Tu descanso, en un lugar"
        description="Registrá cuánto y cómo dormís para entender tu energía día a día."
        points={[
          { icon: CalendarClock, label: 'Registro', text: 'anotá a qué hora te acostaste, cuándo te despertaste y cómo amaneciste.' },
          { icon: LayoutDashboard, label: 'Semana', text: 'mirá tus horas de sueño de los últimos días de un vistazo.' },
          { icon: Sparkles, label: 'Insights', text: 'patrones y consejos según lo que vas registrando.' },
        ]}
      />

      <div className="grid grid-cols-3 gap-2 bg-indigo-950 border border-violet-500/20 rounded-2xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => goToTab(tab.id)}
            className={`py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              subTab === tab.id ? 'bg-violet-500 text-white' : 'text-indigo-400'
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
