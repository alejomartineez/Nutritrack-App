import React, { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { Home, TrendingUp, Dumbbell, MoonStar, Plus, Loader2 } from 'lucide-react';
import { useTodayKey } from './lib/today';
import { useSettings } from './lib/settings';
import { useKeyboardOpen } from './lib/viewport';
import { haptic } from './lib/haptics';
import { nowHM } from './lib/dates';
import { readRaw, writeRaw } from './lib/storage';
import { toast } from './ui';
import { useLog, getLog, getGoals, updateEntry, removeEntry, addEntry, getProfile, saveProfile, setGoals } from './nutrition/store';
import { mealForTime, baseOfEntry, entriesOf, totalsOf, scaleBase, toBase, splitName } from './nutrition/model';
import { loggingStreak } from './nutrition/insights';
import TodayScreen from './nutrition/TodayScreen';
import ProgressScreen from './nutrition/ProgressScreen';
import AddFoodSheet from './nutrition/AddFoodSheet';
import FoodSheet from './nutrition/FoodSheet';
import WeightSheet from './nutrition/WeightSheet';
import SettingsSheet from './nutrition/SettingsSheet';
import PlanHub from './nutrition/PlanHub';
import { ModuleTiles, ModuleRecap } from './nutrition/ModuleTiles';
import ProfileSetup from './ProfileSetup';

const WorkoutModule = lazy(() => import('./workout/WorkoutModule'));
const SleepModule = lazy(() => import('./sleep/SleepModule'));
const EquivalencesSheet = lazy(() => import('./EquivalencesSheet'));
const NotesPad = lazy(() => import('./NotesPad'));
const PdfLibrary = lazy(() => import('./PdfLibrary'));

const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

/** Lo que falta del día (para "Lo que falta" en equivalencias). */
const remainingFor = (dateKey) => {
  const goals = getGoals();
  const t = totalsOf(entriesOf(getLog(dateKey)));
  return {
    p: Math.max(0, Math.round(goals.protein - t.p)),
    c: Math.max(0, Math.round(goals.carbs - t.c)),
    f: Math.max(0, Math.round(goals.fat - t.f)),
    kcal: Math.max(0, Math.round(goals.calories - t.kcal)),
  };
};

export default function App() {
  const { modules } = useSettings();
  const todayKey = useTodayKey();
  const [tab, setTab] = useState('hoy');
  const [dateKey, setDateKey] = useState(todayKey);
  const [sheet, setSheet] = useState(null); // { type, ...props }
  const [overlay, setOverlay] = useState(null); // equivalencias abiertas encima de "Agregar"
  const keyboardOpen = useKeyboardOpen();

  // Si estabas mirando hoy y cruzó la medianoche, la vista pasa al día nuevo.
  const [prevToday, setPrevToday] = useState(todayKey);
  if (prevToday !== todayKey) {
    setPrevToday(todayKey);
    if (dateKey === prevToday) setDateKey(todayKey);
  }

  const openAdd = (meal, startWith) => {
    const day = tab === 'hoy' ? dateKey : todayKey;
    setSheet({ type: 'add', dateKey: day, meal: meal || mealForTime(nowHM()), startWith });
  };

  useEffect(() => {
    if (!readRaw('nutri_onboarded')) setSheet({ type: 'profile', context: 'onboarding' });

    // Accesos directos del ícono (manifest) y deep links.
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab');
    const action = params.get('action');
    if (action === 'scan') setSheet({ type: 'add', dateKey: todayKey, meal: mealForTime(nowHM()), startWith: 'scan' });
    else if (t === 'registrar') setSheet({ type: 'add', dateKey: todayKey, meal: mealForTime(nowHM()) });
    else if (['progreso', 'entreno', 'sueno'].includes(t)) setTab(t);
    if (t || action) window.history.replaceState(null, '', window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si apagás el módulo en el que estás, volvés a Hoy.
  useEffect(() => {
    if ((tab === 'entreno' && !modules.entreno) || (tab === 'sueno' && !modules.sueno)) setTab('hoy');
  }, [modules, tab]);

  const todayLog = useLog(todayKey);
  const streak = useMemo(
    () => loggingStreak((k) => entriesOf(getLog(k)).length > 0, todayKey).streak,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todayKey, todayLog]
  );

  const goTo = (next) => {
    if (next === tab) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    haptic(5);
    setTab(next);
    window.scrollTo({ top: 0 });
  };

  const openEquivalences = ({ macro, amount, meal } = {}) => {
    const s = { type: 'equiv', macro, amount, meal: meal || mealForTime(nowHM()), dateKey: tab === 'hoy' ? dateKey : todayKey };
    if (sheet?.type === 'add') setOverlay(s);
    else setSheet(s);
  };

  const close = () => setSheet(null);

  const finishProfile = (plan, profile) => {
    setGoals(plan);
    saveProfile(profile);
    writeRaw('nutri_onboarded', '1');
    toast(sheet?.context === 'settings' ? 'Plan recalculado' : '¡Tu plan está listo! 🎯');
    close();
  };

  const tabs = [
    { id: 'hoy', label: 'Hoy', icon: Home },
    modules.entreno && { id: 'entreno', label: 'Entreno', icon: Dumbbell, tone: 'entreno' },
    modules.sueno && { id: 'sueno', label: 'Sueño', icon: MoonStar, tone: 'sueno' },
    { id: 'progreso', label: 'Progreso', icon: TrendingUp },
  ].filter(Boolean);

  const ambient = tab === 'entreno' ? 'entreno' : tab === 'sueno' ? 'sueno' : 'nutricion';
  const equivSheets = [sheet, overlay].filter((s) => s?.type === 'equiv');

  return (
    <div className="min-h-[100dvh] w-full relative isolate">
      <div className="app-ambient" aria-hidden="true">
        {['nutricion', 'entreno', 'sueno'].map((t) => (
          <span key={t} className={`ambient-tone ambient-${t} ${ambient === t ? 'ambient-tone-on' : ''}`} />
        ))}
      </div>

      {/* Franja bajo la barra de estado: el contenido que scrollea no choca con la hora. */}
      <div className="fixed top-0 inset-x-0 z-20 glass !shadow-none pointer-events-none" style={{ height: 'env(safe-area-inset-top, 0px)' }} aria-hidden="true" />

      <main className={`mx-auto w-full max-w-md px-5 pb-36 ${tab === 'entreno' ? 'module-entreno' : tab === 'sueno' ? 'module-sueno' : ''}`}>
        <div key={tab} className="anim-tab-in">
          {tab === 'hoy' && (
            <TodayScreen
              dateKey={dateKey}
              todayKey={todayKey}
              streak={streak}
              onChangeDate={setDateKey}
              onAdd={openAdd}
              onOpenEntry={(p) => setSheet({ type: 'entry', ...p })}
              onOpenSettings={() => setSheet({ type: 'settings' })}
              onOpenPlan={() => setSheet({ type: 'plan' })}
              onOpenWeight={() => setSheet({ type: 'weight', dateKey })}
              onOpenEquivalences={openEquivalences}
              tiles={dateKey === todayKey ? <ModuleTiles modules={modules} onGoTo={goTo} /> : null}
            />
          )}
          {tab === 'progreso' && (
            <ProgressScreen
              todayKey={todayKey}
              streak={streak}
              onOpenWeight={() => setSheet({ type: 'weight' })}
              extra={<ModuleRecap modules={modules} todayKey={todayKey} />}
            />
          )}
          {tab === 'entreno' && modules.entreno && (
            <Suspense fallback={<Loading tone="text-entreno-400" />}>
              <WorkoutModule />
            </Suspense>
          )}
          {tab === 'sueno' && modules.sueno && (
            <Suspense fallback={<Loading tone="text-sueno-400" />}>
              <SleepModule />
            </Suspense>
          )}
        </div>
      </main>

      <TabBar tabs={tabs} active={tab} onChange={goTo} onAdd={() => openAdd()} hidden={keyboardOpen || sheet?.type === 'add'} />

      {sheet?.type === 'add' && (
        <AddFoodSheet dateKey={sheet.dateKey} initialMeal={sheet.meal} startWith={sheet.startWith} onClose={close} onOpenEquivalences={openEquivalences} />
      )}
      {sheet?.type === 'entry' && <EntrySheet entry={sheet.entry} dateKey={sheet.dateKey} onClose={close} />}
      {sheet?.type === 'weight' && <WeightSheet initialDate={sheet.dateKey} onClose={close} />}
      {sheet?.type === 'settings' && (
        <SettingsSheet onClose={close} isStandalone={isStandalone()} onRecalculate={() => setSheet({ type: 'profile', context: 'settings' })} />
      )}
      {sheet?.type === 'plan' && (
        <PlanHub onClose={close} onOpen={(t) => setSheet(t === 'equiv' ? { type: 'equiv', meal: mealForTime(nowHM()), dateKey } : { type: t })} />
      )}
      {sheet?.type === 'profile' && (
        <ProfileSetup
          onComplete={finishProfile}
          onSkip={() => {
            writeRaw('nutri_onboarded', '1');
            close();
          }}
          initialProfile={sheet.context === 'settings' ? getProfile() : null}
          submitLabel={sheet.context === 'settings' ? 'Guardar plan' : 'Usar este plan'}
          dismissLabel={sheet.context === 'settings' ? 'Cancelar' : 'Omitir'}
          welcome={sheet.context === 'onboarding'}
        />
      )}
      <Suspense fallback={null}>
        {sheet?.type === 'notes' && <NotesPad onClose={close} />}
        {sheet?.type === 'pdfs' && <PdfLibrary onClose={close} />}
        {equivSheets.map((s) => (
          <EquivalencesSheet
            key={s === overlay ? 'overlay' : 'sheet'}
            initialMacro={s.macro || 'p'}
            initialTarget={s.amount}
            remaining={remainingFor(s.dateKey)}
            onLog={(item) => {
              addEntry(s.dateKey, { base: toBase(item), qty: 1, meal: s.meal });
              toast(`${splitName(item.name).title} agregado`);
            }}
            onClose={() => (s === overlay ? setOverlay(null) : close())}
          />
        ))}
      </Suspense>
    </div>
  );
}

function EntrySheet({ entry, dateKey, onClose }) {
  const { base, qty } = baseOfEntry(entry);
  return (
    <FoodSheet
      mode="edit"
      base={base}
      qty={qty}
      meal={entry.meal}
      free={entry.free}
      onClose={onClose}
      onDelete={() => {
        const undo = removeEntry(dateKey, entry.id);
        toast(`Borraste ${splitName(entry.name).title}`, { action: { label: 'Deshacer', onClick: undo } });
        onClose();
      }}
      onSubmit={({ qty: q, meal, free, base: b }) => {
        updateEntry(dateKey, entry.id, { name: b.name, ...scaleBase(b, q), qty: q, base: b, meal, free });
        toast('Comida actualizada');
        onClose();
      }}
    />
  );
}

function Loading({ tone }) {
  return (
    <div className="flex items-center justify-center py-32" role="status">
      <Loader2 className={`w-6 h-6 animate-spin ${tone}`} />
    </div>
  );
}

const ACTIVE_TEXT = { entreno: 'text-entreno-300', sueno: 'text-sueno-300' };
const ACTIVE_PILL = { entreno: 'bg-entreno-500/20', sueno: 'bg-sueno-500/20' };

/** Barra de pestañas flotante de vidrio + botón "+" para registrar comida. */
function TabBar({ tabs, active, onChange, onAdd, hidden }) {
  const idx = Math.max(0, tabs.findIndex((t) => t.id === active));
  const current = tabs[idx];
  return (
    <nav
      className={`fixed bottom-0 inset-x-0 z-30 flex justify-center px-4 pointer-events-none transition-opacity duration-200 ${hidden ? 'opacity-0' : ''}`}
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.6rem)' }}
      aria-hidden={hidden || undefined}
    >
      <div className={`w-full max-w-md flex items-center gap-3 ${hidden ? '' : 'pointer-events-auto'}`}>
        <div className="glass relative flex-1 rounded-full p-1.5 flex">
          <span
            aria-hidden="true"
            className="absolute top-1.5 bottom-1.5 left-1.5 transition-transform duration-500"
            style={{
              width: `calc((100% - 0.75rem) / ${tabs.length})`,
              transform: `translateX(${idx * 100}%)`,
              transitionTimingFunction: 'cubic-bezier(0.34,1.3,0.5,1)',
            }}
          >
            <span key={idx} className={`anim-nav-liquid block h-full w-full rounded-full ${ACTIVE_PILL[current?.tone] || 'bg-brand-500/20'}`} />
          </span>
          {tabs.map((t) => {
            const on = t.id === active;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => onChange(t.id)}
                aria-current={on ? 'page' : undefined}
                className={`relative flex-1 h-12 flex flex-col items-center justify-center gap-0.5 rounded-full ${on ? ACTIVE_TEXT[t.tone] || 'text-brand-300' : 'text-ink-400'}`}
              >
                <Icon className="w-[22px] h-[22px]" strokeWidth={on ? 2.3 : 2} />
                <span className={`nav-label text-[10px] leading-none ${on ? 'font-bold' : 'font-medium'}`}>{t.label}</span>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => {
            haptic();
            onAdd();
          }}
          aria-label="Registrar comida"
          className="w-[3.75rem] h-[3.75rem] rounded-full bg-brand-500 text-onaccent flex items-center justify-center shadow-accent shrink-0"
        >
          <Plus className="w-7 h-7" strokeWidth={2.6} />
        </button>
      </div>
    </nav>
  );
}
