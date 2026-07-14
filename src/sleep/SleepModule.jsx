import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, LayoutDashboard, Sparkles } from 'lucide-react';
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

export default function SleepModule() {
  const [loaded, setLoaded] = useState(false);
  const [sleepLogs, setSleepLogs] = useState({});
  const [goalHours, setGoalHours] = useState(8);
  const [subTab, setSubTab] = useState('registro');

  const todayKey = localDateKey();
  const todayLog = sleepLogs[todayKey] || null;

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

  const yesterdayLog = useMemo(() => sleepLogs[addDaysToKey(todayKey, -1)] || null, [sleepLogs, todayKey]);

  const handleSave = (patch) => {
    setSleepLogs((prev) => upsertSleepLog(prev, todayKey, patch));
    setSubTab('semana');
  };

  if (!loaded) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 bg-indigo-950 border border-violet-500/20 rounded-2xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              subTab === tab.id ? 'bg-violet-500 text-white' : 'text-indigo-400'
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {subTab === 'registro' && (
        <SleepLogForm
          existingLog={todayLog}
          onSave={handleSave}
          defaultBedtime={yesterdayLog?.bedtime || '23:00'}
          defaultWakeTime={yesterdayLog?.wakeTime || '07:00'}
        />
      )}

      {subTab === 'semana' && <SleepDashboard sleepLogs={sleepLogs} goalHours={goalHours} />}

      {subTab === 'insights' && <SleepInsights sleepLogs={sleepLogs} />}
    </div>
  );
}
