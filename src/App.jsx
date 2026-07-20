import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Home, PlusCircle, TrendingUp, Settings, Droplet, Droplets, Trash2, X, Check,
  ChevronRight, ChevronLeft, Sparkles, Lightbulb, Award, Plus, Minus,
  Save, RotateCcw, Info, Utensils, Coffee, Pencil, Flame, Dumbbell, MoonStar,
  Download, Share, SquarePlus, Upload, ShieldCheck, Search, Bell, Clock, LayoutGrid, Calculator,
} from 'lucide-react';
import WorkoutModule from './workout/WorkoutModule';
import SleepModule from './sleep/SleepModule';
import TodayDashboard from './TodayDashboard';
import DailyRings, { hasAnyActivity } from './DailyRings';
import Onboarding from './Onboarding';
import ProfileSetup from './ProfileSetup';
import WeeklyRecap from './WeeklyRecap';
import WeightTracker from './WeightTracker';
import { searchFoods } from './foodDatabase';
import { getFrequentFoods } from './foodHistory';
import { requestPersistentStorage, downloadFullBackup, restoreFullBackup, readBackupFile } from './backupStorage';
import {
  loadReminderSettings,
  saveReminderSettings,
  requestNotificationPermission,
  buildReminderMessage,
  notifyInBackground,
} from './reminders';
import {
  dateKeyOf,
  startOfDay,
  addDays,
  formatDisplayDate,
  round1,
  computeTotals,
  computeStreak,
  computeMacroSegments,
} from './lib/nutritionCalcs';
import { useCountUp, prefersReducedMotion } from './lib/motion';

// ---------------------------------------------------------------------------
// DATOS BASE DEL PLAN
// ---------------------------------------------------------------------------

const TODAY_KEY = dateKeyOf(new Date());

const DEFAULT_GOALS = { calories: 1610, protein: 116.5, carbs: 159, fat: 56.5, water: 2000 };
const TOLERANCE = { calories: 100, protein: 10, carbs: 10, fat: 10 };
const GLASS_ML = 250;

// El catálogo "Mis alimentos" arranca vacío: cada usuario arma su propia lista
// de accesos rápidos con el buscador (base de ~200 alimentos) o cargando ítems
// a mano. Antes venía precargado con los platos armados de un plan puntual, que
// no le sirven al usuario general.
const DEFAULT_CATALOG = [];

const FREE_PRESETS = [
  { id: 'f1', name: '1 Factura', kcal: 300, p: 5, c: 35, f: 15 },
  { id: 'f2', name: '2 Porciones de pizza', kcal: 560, p: 22, c: 60, f: 24 },
  { id: 'f3', name: '3 Empanadas', kcal: 450, p: 18, c: 45, f: 21 },
  { id: 'f4', name: '1 Bocha de helado', kcal: 150, p: 2, c: 20, f: 7 },
  { id: 'f5', name: 'Lomito mediano', kcal: 650, p: 35, c: 55, f: 30 },
  { id: 'f6', name: '1 Vaso de cerveza / vino', kcal: 150, p: 1, c: 12, f: 0 },
];

const TIPS = [
  'Acompañá cada comida principal con 2 vasos de agua.',
  'Priorizá masticar despacio y evitar distracciones (celular, TV) al comer.',
  'Si comés algo fuera de plan, no te saltees la próxima comida: volvé a tu pauta con normalidad.',
  'Guardá porciones extra de comida en el freezer para no improvisar en días con poco tiempo.',
  'Las proteínas en cada comida ayudan a sostener la saciedad durante más horas.',
  'Un puñado de frutos secos puede reemplazar una colación si no tenés fruta a mano.',
  'Dormir bien también es parte del plan: el descanso influye en tus resultados.',
  'Planificá el menú semanal un día antes para reducir decisiones de último momento.',
  'Serví tu plato de a poco y esperá unos minutos antes de repetir.',
  'Llevá siempre una botella de agua a mano para llegar más fácil a tu meta diaria.',
];

// Frases de feedback: varias por situación, se elige una al azar por sesión para
// que la app no se sienta repetitiva. (Ver `motivation` en el componente.)
const MOTIVATION = {
  positive: [
    '¡Excelente adherencia! Vas por muy buen camino para tus metas de composición corporal.',
    '¡Día redondo! Tus macros quedaron justo donde tienen que estar.',
    'Impecable. Esta constancia es la que mueve la aguja de verdad.',
    '¡Lo estás clavando! Cerrar el día así de prolijo no es casualidad. 💪',
    '¡Buenísimo! Tu yo de dentro de unas semanas te lo va a agradecer.',
    'Comiste alineado a tu objetivo. Así se construye el progreso.',
  ],
  free: [
    '¡Disfrutalo! El balance y el control de la porción son la clave de la sostenibilidad a largo plazo.',
    'Date el gusto sin culpa: un antojo bien puesto también es parte del plan.',
    'Comer algo rico de vez en cuando no borra tu progreso. Disfrutá y seguí.',
    'La sostenibilidad se construye con flexibilidad, no con perfección. ¡A disfrutar!',
    'Un gusto no arruina la semana; lo que suma es lo que hacés la mayoría de las veces.',
  ],
  protein: [
    'Estás un poco abajo en tus proteínas, ¿sumamos un huevo o yogur en la próxima comida?',
    'Te faltan algunas proteínas para llegar a la meta. Pollo o un puñado de frutos secos ayudan.',
    'Ojo con la proteína de hoy: viene baja. Un yogur o unas claras te acercan.',
    'Para cuidar tus músculos, sumá un poco más de proteína en lo que queda del día.',
  ],
  water: [
    'Todavía faltan varios vasos de agua para llegar a la meta diaria.',
    'La hidratación viene floja hoy. Un vaso de agua ahora mismo suma. 💧',
    '¿Cuándo fue tu último vaso de agua? Vas por debajo de la meta.',
    'Tu cuerpo te va a agradecer unos vasos más de agua antes de que termine el día.',
  ],
  empty: [
    'Registrá comidas en este día para ver el progreso y recibir feedback personalizado.',
    'Todo empieza con el primer registro. Anotá tu primera comida del día.',
    'Cuando cargues lo que comés, vas a ver tus macros y tu progreso acá.',
    'Arrancá el día registrando tu primera comida y seguí tu progreso al instante.',
  ],
};

const sample = (arr) => arr[Math.floor(Math.random() * arr.length)];

const emptyLog = () => ({ water: 0, planMeals: [], freeMeals: [] });

const nowHM = () =>
  new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

// ---------------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// ---------------------------------------------------------------------------

export default function NutriTrackApp() {
  const [activeTab, setActiveTab] = useState('dia');
  const [showSettings, setShowSettings] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  // Intro de primera vez: se muestra una sola vez y deja un flag al cerrarse.
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try {
      return !localStorage.getItem('nutri_onboarded');
    } catch {
      return false;
    }
  });
  // Paso de perfil (cálculo del plan). En onboarding aparece tras los slides
  // (solo usuarios nuevos); desde Ajustes se abre para recalcular con los datos
  // guardados. `profileContext` distingue ambos casos; `profileInitial` precarga
  // el formulario al recalcular.
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [profileContext, setProfileContext] = useState('onboarding'); // 'onboarding' | 'settings'
  const [profileInitial, setProfileInitial] = useState(null);
  const [isStandalone] = useState(
    () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
  );
  const [remindersEnabled, setRemindersEnabled] = useState(() => loadReminderSettings().enabled);
  const [loaded, setLoaded] = useState(false);

  // Módulos opcionales (nutrición siempre activa). Por defecto todo encendido,
  // así los usuarios existentes no notan cambios.
  const [modules, setModules] = useState(() => {
    try {
      const raw = localStorage.getItem('nutri_modules');
      return raw ? { entreno: true, sueno: true, ...JSON.parse(raw) } : { entreno: true, sueno: true };
    } catch (e) {
      return { entreno: true, sueno: true };
    }
  });
  const toggleModule = (key) => setModules((m) => ({ ...m, [key]: !m[key] }));

  const [goals, setGoals] = useState(DEFAULT_GOALS);
  const [log, setLog] = useState(emptyLog());
  const [tipIndex, setTipIndex] = useState(0);
  // Una frase al azar por tipo, fijada al abrir la app (no parpadea al registrar).
  const [motivation] = useState(() => ({
    positive: sample(MOTIVATION.positive),
    free: sample(MOTIVATION.free),
    protein: sample(MOTIVATION.protein),
    water: sample(MOTIVATION.water),
    empty: sample(MOTIVATION.empty),
  }));

  const [planCatalog, setPlanCatalog] = useState(() => {
    try {
      const stored = localStorage.getItem('nutri_catalog');
      if (!stored) return JSON.parse(JSON.stringify(DEFAULT_CATALOG));
      const parsed = JSON.parse(stored);
      // Migración desde el formato anterior agrupado por momento del día
      if (Array.isArray(parsed)) return parsed;
      return Object.values(parsed).flat();
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULT_CATALOG));
    }
  });

  // Catálogo de comidas fuera de plan. Antes era la constante FREE_PRESETS y las
  // comidas libres que cargaba el usuario se perdían del listado (solo quedaban
  // en el log del día). Ahora se persiste igual que el del plan, sembrado con
  // los presets para quien ya venía usando la app.
  const [freeCatalog, setFreeCatalog] = useState(() => {
    try {
      const stored = localStorage.getItem('nutri_free_catalog');
      if (!stored) return JSON.parse(JSON.stringify(FREE_PRESETS));
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : JSON.parse(JSON.stringify(FREE_PRESETS));
    } catch (e) {
      return JSON.parse(JSON.stringify(FREE_PRESETS));
    }
  });

  // { id, kind } — id null = nueva opción; kind 'plan' | 'libre'
  const [editingCatalogItem, setEditingCatalogItem] = useState(null);
  const [catalogName, setCatalogName] = useState('');
  const [catalogKcal, setCatalogKcal] = useState('');
  const [catalogP, setCatalogP] = useState('');
  const [catalogC, setCatalogC] = useState('');
  const [catalogF, setCatalogF] = useState('');

  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const dateKey = dateKeyOf(selectedDate);
  const isToday = dateKey === TODAY_KEY;
  const loadedDateKeyRef = useRef(null);

  const [registerMode, setRegisterMode] = useState('plan'); // 'plan' | 'libre'
  const [customName, setCustomName] = useState('');
  const [customKcal, setCustomKcal] = useState('');
  const [customP, setCustomP] = useState('');
  const [customC, setCustomC] = useState('');
  const [customF, setCustomF] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);

  const [tempGoals, setTempGoals] = useState(DEFAULT_GOALS);
  const [confirmMsg, setConfirmMsg] = useState('');

  const [editingEntry, setEditingEntry] = useState(null); // { id, isPlan, time }
  const [editName, setEditName] = useState('');
  const [editKcal, setEditKcal] = useState('');
  const [editP, setEditP] = useState('');
  const [editC, setEditC] = useState('');
  const [editF, setEditF] = useState('');

  const [pendingDelete, setPendingDelete] = useState(null); // { entry, isPlan }
  const undoTimeoutRef = useRef(null);
  const [celebrate, setCelebrate] = useState(false); // confeti al entrar en rango de calorías
  const celebrateTimeoutRef = useRef(null);

  // Cargar metas guardadas al iniciar
  useEffect(() => {
    try {
      const storedGoals = localStorage.getItem('nutri_goals');
      if (storedGoals) {
        const parsed = JSON.parse(storedGoals);
        setGoals(parsed);
        setTempGoals(parsed);
      }
    } catch (e) {
      // Si falla la lectura, se conservan los valores predeterminados
    }
    setLoaded(true);
    requestPersistentStorage();
  }, []);

  const toggleReminders = async () => {
    const next = !remindersEnabled;
    if (next) await requestNotificationPermission();
    setRemindersEnabled(next);
    saveReminderSettings({ enabled: next });
  };

  // Chequeo periódico de recordatorios mientras la app esté abierta: si quedó
  // en segundo plano (Android/desktop) sale como notificación del sistema.
  useEffect(() => {
    if (!remindersEnabled || !isToday) return;
    const check = () => {
      const msg = buildReminderMessage(log);
      if (msg) notifyInBackground(msg);
    };
    const id = setInterval(check, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [remindersEnabled, isToday, log]);

  // Cargar el registro correspondiente al día seleccionado cada vez que cambia
  useEffect(() => {
    try {
      const storedLog = localStorage.getItem(`nutri_log_${dateKey}`);
      setLog(storedLog ? JSON.parse(storedLog) : emptyLog());
    } catch (e) {
      setLog(emptyLog());
    }
    loadedDateKeyRef.current = dateKey;
  }, [dateKey]);

  // Persistir el registro del día que está actualmente seleccionado
  useEffect(() => {
    if (!loaded) return;
    if (loadedDateKeyRef.current !== dateKey) return; // evita pisar datos mientras se carga otro día
    try {
      localStorage.setItem(`nutri_log_${dateKey}`, JSON.stringify(log));
    } catch (e) {
      // almacenamiento no disponible, se continúa sin persistir
    }
  }, [log, dateKey, loaded]);

  // Persistir metas
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem('nutri_goals', JSON.stringify(goals));
    } catch (e) {
      // almacenamiento no disponible, se continúa sin persistir
    }
  }, [goals, loaded]);

  // Persistir catálogo global de alimentos del plan
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem('nutri_catalog', JSON.stringify(planCatalog));
    } catch (e) {
      // almacenamiento no disponible, se continúa sin persistir
    }
  }, [planCatalog, loaded]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem('nutri_free_catalog', JSON.stringify(freeCatalog));
    } catch (e) {
      // almacenamiento no disponible, se continúa sin persistir
    }
  }, [freeCatalog, loaded]);

  // Persistir módulos activos
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem('nutri_modules', JSON.stringify(modules));
    } catch (e) {
      // almacenamiento no disponible, se continúa sin persistir
    }
  }, [modules, loaded]);

  // Si se desactiva el módulo de la pestaña actual, volver a Mi Día
  useEffect(() => {
    if (activeTab === 'entreno' && !modules.entreno) setActiveTab('dia');
    if (activeTab === 'sueno' && !modules.sueno) setActiveTab('dia');
  }, [modules, activeTab]);

  // Totales del día
  const totals = useMemo(
    () => computeTotals([...log.planMeals, ...log.freeMeals]),
    [log]
  );

  const waterGlasses = Math.round(log.water / GLASS_ML);
  const waterGoalGlasses = Math.max(1, Math.round(goals.water / GLASS_ML));

  // Usuario recién llegado: hoy sin nada registrado y sin historial en ningún
  // pilar. En ese caso "Mi Día" se muestra en modo calmo (solo héroe + CTA) para
  // no abrumar; en cuanto registra su primera comida vuelve el detalle completo.
  const isFreshStart = useMemo(
    () =>
      isToday &&
      log.planMeals.length === 0 &&
      log.freeMeals.length === 0 &&
      log.water === 0 &&
      !hasAnyActivity(),
    [isToday, log.planMeals.length, log.freeMeals.length, log.water]
  );

  // ------------------------- Navegación entre días -------------------------
  const goPrevDay = () => setSelectedDate((prev) => addDays(prev, -1));
  const goNextDay = () => setSelectedDate((prev) => (isToday ? prev : addDays(prev, 1)));
  const goToday = () => setSelectedDate(startOfDay(new Date()));

  // ------------------------- Acciones sobre el registro -------------------
  const addPlanMeal = (item) => {
    const entry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: item.name,
      kcal: item.kcal,
      p: item.p,
      c: item.c,
      f: item.f,
      time: nowHM(),
    };
    setLog((prev) => ({ ...prev, planMeals: [...prev.planMeals, entry] }));
    const entered = celebrateIfEnteringRange(totals.kcal + item.kcal);
    flashConfirm(entered ? '¡Entraste en tu rango de hoy! 🎯' : 'Comida agregada a tu registro ✓');
  };

  const addFreeMeal = (item) => {
    const entry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: item.name,
      kcal: item.kcal,
      p: item.p,
      c: item.c,
      f: item.f,
      time: nowHM(),
    };
    setLog((prev) => ({ ...prev, freeMeals: [...prev.freeMeals, entry] }));
    const entered = celebrateIfEnteringRange(totals.kcal + item.kcal);
    flashConfirm(entered ? '¡Entraste en tu rango de hoy! 🎯' : 'Registrado fuera de plan, ¡disfrutalo con calma!');
  };

  const removeEntry = (id, isPlan) => {
    const source = isPlan ? log.planMeals : log.freeMeals;
    const entry = source.find((m) => m.id === id);
    if (!entry) return;
    setLog((prev) => ({
      ...prev,
      planMeals: isPlan ? prev.planMeals.filter((m) => m.id !== id) : prev.planMeals,
      freeMeals: !isPlan ? prev.freeMeals.filter((m) => m.id !== id) : prev.freeMeals,
    }));
    clearTimeout(undoTimeoutRef.current);
    setPendingDelete({ entry, isPlan });
    undoTimeoutRef.current = setTimeout(() => setPendingDelete(null), 5000);
  };

  const undoDelete = () => {
    if (!pendingDelete) return;
    const { entry, isPlan } = pendingDelete;
    setLog((prev) => ({
      ...prev,
      planMeals: isPlan ? [...prev.planMeals, entry] : prev.planMeals,
      freeMeals: !isPlan ? [...prev.freeMeals, entry] : prev.freeMeals,
    }));
    clearTimeout(undoTimeoutRef.current);
    setPendingDelete(null);
  };

  const openEditEntry = (entry, isPlan) => {
    setEditingEntry({ id: entry.id, isPlan, time: entry.time });
    setEditName(entry.name);
    setEditKcal(String(entry.kcal));
    setEditP(String(entry.p));
    setEditC(String(entry.c));
    setEditF(String(entry.f));
  };

  const closeEditEntry = () => setEditingEntry(null);

  const saveEditEntry = () => {
    if (!editingEntry) return;
    const kcalNum = parseFloat(editKcal);
    if (!editName.trim() || isNaN(kcalNum) || kcalNum <= 0) return;
    const updated = {
      id: editingEntry.id,
      time: editingEntry.time,
      name: editName.trim(),
      kcal: kcalNum,
      p: parseFloat(editP) || 0,
      c: parseFloat(editC) || 0,
      f: parseFloat(editF) || 0,
    };
    setLog((prev) => ({
      ...prev,
      planMeals: editingEntry.isPlan
        ? prev.planMeals.map((m) => (m.id === editingEntry.id ? updated : m))
        : prev.planMeals,
      freeMeals: !editingEntry.isPlan
        ? prev.freeMeals.map((m) => (m.id === editingEntry.id ? updated : m))
        : prev.freeMeals,
    }));
    setEditingEntry(null);
    flashConfirm('Comida actualizada ✓');
  };

  const addWater = (deltaGlasses) => {
    setLog((prev) => ({
      ...prev,
      water: Math.max(0, prev.water + deltaGlasses * GLASS_ML),
    }));
  };

  const flashConfirm = (text) => {
    setConfirmMsg(text);
    setTimeout(() => setConfirmMsg(''), 2200);
  };

  // Celebra (confeti) si esta comida cruza las calorías de fuera a dentro del
  // rango objetivo. Devuelve true si fue un ingreso al rango.
  const celebrateIfEnteringRange = (nextKcal) => {
    const goal = goals.calories;
    const tol = TOLERANCE.calories;
    const wasIn = totals.kcal > 0 && Math.abs(totals.kcal - goal) <= tol;
    const nowIn = Math.abs(nextKcal - goal) <= tol;
    if (wasIn || !nowIn) return false;
    if (!prefersReducedMotion()) {
      setCelebrate(true);
      clearTimeout(celebrateTimeoutRef.current);
      celebrateTimeoutRef.current = setTimeout(() => setCelebrate(false), 1300);
    }
    return true;
  };

  const submitCustomFree = () => {
    const kcalNum = parseFloat(customKcal);
    if (!customName.trim() || isNaN(kcalNum) || kcalNum <= 0) return;
    const values = {
      name: customName.trim(),
      kcal: kcalNum,
      p: parseFloat(customP) || 0,
      c: parseFloat(customC) || 0,
      f: parseFloat(customF) || 0,
    };
    addFreeMeal(values);
    // Además de registrarla en el día, queda en el listado de fuera de plan para
    // reusarla de un toque. Si ya existe una con el mismo nombre, se actualiza.
    setFreeCatalog((prev) => {
      const i = prev.findIndex((it) => it.name.toLowerCase() === values.name.toLowerCase());
      if (i !== -1) return prev.map((it, idx) => (idx === i ? { ...it, ...values } : it));
      return [...prev, { id: `free_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, ...values }];
    });
    setCustomName('');
    setCustomKcal('');
    setCustomP('');
    setCustomC('');
    setCustomF('');
    setShowCustomForm(false);
  };

  // ---------------- Catálogos editables (plan y fuera de plan) --------------
  const openAddCatalogItem = (kind = 'plan') => {
    setEditingCatalogItem({ id: null, kind });
    setCatalogName('');
    setCatalogKcal('');
    setCatalogP('');
    setCatalogC('');
    setCatalogF('');
  };

  const openEditCatalogItem = (item, kind = 'plan') => {
    setEditingCatalogItem({ id: item.id, kind });
    setCatalogName(item.name);
    setCatalogKcal(String(item.kcal));
    setCatalogP(String(item.p));
    setCatalogC(String(item.c));
    setCatalogF(String(item.f));
  };

  const closeCatalogModal = () => setEditingCatalogItem(null);

  const saveCatalogItem = () => {
    if (!editingCatalogItem) return;
    const kcalNum = parseFloat(catalogKcal);
    if (!catalogName.trim() || isNaN(kcalNum) || kcalNum <= 0) return;
    const { id, kind } = editingCatalogItem;
    const isFree = kind === 'libre';
    const setCatalog = isFree ? setFreeCatalog : setPlanCatalog;
    const values = {
      name: catalogName.trim(),
      kcal: kcalNum,
      p: parseFloat(catalogP) || 0,
      c: parseFloat(catalogC) || 0,
      f: parseFloat(catalogF) || 0,
    };
    setCatalog((prev) => {
      if (id) {
        return prev.map((it) => (it.id === id ? { ...it, ...values } : it));
      }
      const prefix = isFree ? 'free' : 'custom';
      const newItem = { id: `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, ...values };
      return [...prev, newItem];
    });
    setEditingCatalogItem(null);
    if (isFree) {
      flashConfirm(id ? 'Opción actualizada ✓' : 'Opción agregada a fuera de plan ✓');
    } else {
      flashConfirm(id ? 'Opción del plan actualizada ✓' : 'Opción agregada a tu plan ✓');
    }
  };

  const deleteCatalogItem = () => {
    if (!editingCatalogItem || !editingCatalogItem.id) return;
    const { id, kind } = editingCatalogItem;
    const isFree = kind === 'libre';
    (isFree ? setFreeCatalog : setPlanCatalog)((prev) => prev.filter((it) => it.id !== id));
    setEditingCatalogItem(null);
    flashConfirm(isFree ? 'Opción eliminada de fuera de plan' : 'Opción eliminada de tu plan');
  };

  const openSettings = () => {
    setTempGoals(goals);
    setShowSettings(true);
  };

  const dismissOnboarding = () => {
    try {
      localStorage.setItem('nutri_onboarded', '1');
    } catch {
      // storage no disponible: se cierra igual, puede reaparecer, es aceptable
    }
    setShowOnboarding(false);
    // Encadenar el cálculo del plan salvo que el usuario ya tenga un perfil.
    try {
      if (!localStorage.getItem('nutri_profile')) {
        setProfileContext('onboarding');
        setProfileInitial(null);
        setShowProfileSetup(true);
      }
    } catch {
      // sin storage no encadenamos el paso; se sigue con las metas por defecto
    }
  };

  // Abrir el cálculo desde Ajustes, precargando el perfil guardado si lo hay.
  const openRecalculate = () => {
    let initial = null;
    try {
      const raw = localStorage.getItem('nutri_profile');
      if (raw && raw !== 'skipped') initial = JSON.parse(raw);
    } catch {
      // perfil corrupto o ausente: se abre el formulario vacío
    }
    setProfileInitial(initial);
    setProfileContext('settings');
    setShowSettings(false);
    setShowProfileSetup(true);
  };

  // El usuario aceptó su plan calculado: se vuelve la meta activa y se guarda el
  // perfil para poder recalcularlo más adelante. Sirve para ambos contextos.
  const completeProfileSetup = (plan, profile) => {
    setGoals(plan);
    setTempGoals(plan);
    try {
      localStorage.setItem('nutri_profile', JSON.stringify(profile));
    } catch {
      // sin storage se aplica igual en esta sesión
    }
    setShowProfileSetup(false);
    flashConfirm(
      profileContext === 'settings' ? 'Plan recalculado ✓' : '¡Tu plan personalizado está listo! 🎯'
    );
  };

  // Cerrar sin aplicar. En onboarding marca el paso como omitido para no volver
  // a mostrarlo; desde Ajustes es un simple "Cancelar" que no toca nada.
  const dismissProfileSetup = () => {
    if (profileContext === 'onboarding') {
      try {
        localStorage.setItem('nutri_profile', 'skipped');
      } catch {
        // sin storage el paso puede reaparecer; es aceptable
      }
    }
    setShowProfileSetup(false);
  };

  const saveSettings = () => {
    const cleaned = {
      calories: parseFloat(tempGoals.calories) || DEFAULT_GOALS.calories,
      protein: parseFloat(tempGoals.protein) || DEFAULT_GOALS.protein,
      carbs: parseFloat(tempGoals.carbs) || DEFAULT_GOALS.carbs,
      fat: parseFloat(tempGoals.fat) || DEFAULT_GOALS.fat,
      water: parseFloat(tempGoals.water) || DEFAULT_GOALS.water,
    };
    setGoals(cleaned);
    setShowSettings(false);
    flashConfirm('Metas actualizadas ✓');
  };

  const resetSettings = () => {
    setTempGoals(DEFAULT_GOALS);
  };

  // ------------------------- Feedback dinámico ----------------------------
  const feedback = useMemo(() => {
    const msgs = [];
    const hasAny = log.planMeals.length > 0 || log.freeMeals.length > 0;
    const withinKcal = Math.abs(totals.kcal - goals.calories) <= TOLERANCE.calories;
    const withinP = Math.abs(totals.p - goals.protein) <= TOLERANCE.protein;
    const withinC = Math.abs(totals.c - goals.carbs) <= TOLERANCE.carbs;
    const withinF = Math.abs(totals.f - goals.fat) <= TOLERANCE.fat;

    if (hasAny && withinKcal && withinP && withinC && withinF) {
      msgs.push({ type: 'positive', text: motivation.positive });
    }

    if (log.freeMeals.length > 0) {
      msgs.push({ type: 'free', text: motivation.free });
    }

    if (totals.p < goals.protein - TOLERANCE.protein) {
      msgs.push({ type: 'reminder', text: motivation.protein });
    }

    if (log.water < goals.water - GLASS_ML * 2) {
      msgs.push({ type: 'water', text: motivation.water });
    }

    if (!hasAny) {
      msgs.push({ type: 'neutral', text: motivation.empty });
    }

    // Recordatorio activo: nudge visible al abrir la app (funciona también en iPhone,
    // donde las notificaciones en segundo plano no están disponibles sin push server)
    if (remindersEnabled && isToday && hasAny) {
      const reminderText = buildReminderMessage(log, new Date(), { includeWater: false });
      if (reminderText) msgs.unshift({ type: 'reminder', text: reminderText });
    }
    return msgs;
  }, [totals, goals, log, remindersEnabled, isToday, motivation]);

  // ------------------------- Anillo de composición ------------------------
  const ring = useMemo(() => {
    const size = 220;
    const center = size / 2;
    const rOuter = 96;
    const rInner = 66;
    const swOuter = 12;
    const swInner = 24;
    const cOuter = 2 * Math.PI * rOuter;
    const cInner = 2 * Math.PI * rInner;

    const pctCalories = Math.min(totals.kcal / (goals.calories || 1), 1);
    const overshoot = totals.kcal > goals.calories + TOLERANCE.calories;

    const segments = computeMacroSegments(totals);

    let cumulative = 0;
    const arcs = segments.map((seg) => {
      const len = cInner * seg.pct;
      const dasharray = `${len} ${cInner - len}`;
      const dashoffset = -cumulative * cInner;
      cumulative += seg.pct;
      return { ...seg, dasharray, dashoffset };
    });

    return { size, center, rOuter, rInner, swOuter, swInner, cOuter, pctCalories, overshoot, arcs };
  }, [totals, goals]);

  // ------------------------- Últimos 7 días (progreso) --------------------
  const weekStats = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dateKeyOf(d);
      let kcal = 0;
      let freeCount = 0;
      let hasData = false;
      try {
        const raw = localStorage.getItem(`nutri_log_${key}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          const plan = parsed.planMeals || [];
          const free = parsed.freeMeals || [];
          const all = [...plan, ...free];
          kcal = all.reduce((s, m) => s + m.kcal, 0);
          freeCount = free.length;
          hasData = all.length > 0 || (parsed.water || 0) > 0;
        }
      } catch (e) {
        kcal = 0;
      }
      const label = d.toLocaleDateString('es-AR', { weekday: 'short' }).slice(0, 3);
      days.push({ key, label, kcal, freeCount, hasData });
    }
    return days;
  }, [log, loaded]);

  // Racha de días consecutivos (terminando hoy) dentro del rango de calorías
  const streak = useMemo(
    () => computeStreak(weekStats, goals.calories, TOLERANCE.calories),
    [weekStats, goals]
  );

  const weeklyFreeCount = useMemo(
    () => weekStats.reduce((sum, d) => sum + d.freeCount, 0),
    [weekStats]
  );

  // ---------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------

  return (
    <div className="min-h-screen w-full bg-slate-900 text-slate-100 flex justify-center">
      <div className="w-full max-w-md flex flex-col min-h-screen relative">
        <Confetti active={celebrate} />
        {/* HEADER */}
        <header
          className="px-5 pb-4 flex items-center justify-between"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {!isStandalone && (
              <button
                onClick={() => setShowInstallGuide(true)}
                aria-label="Instalar la app en tu iPhone"
                className="p-2.5 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-emerald-400 transition-colors shrink-0"
              >
                <Download className="w-5 h-5 text-slate-300" />
              </button>
            )}
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold truncate">
                {activeTab === 'entreno' ? 'Seguimiento semanal' : activeTab === 'sueno' ? 'Sueño y recuperación' : formatDisplayDate(selectedDate)}
              </p>
              <h1
                className={`text-2xl font-black tracking-tight bg-clip-text text-transparent truncate ${
                  activeTab === 'entreno'
                    ? 'bg-gradient-to-r from-orange-400 to-amber-300'
                    : activeTab === 'sueno'
                    ? 'bg-gradient-to-r from-indigo-400 to-violet-300'
                    : 'bg-gradient-to-r from-emerald-400 to-teal-300'
                }`}
              >
                {activeTab === 'entreno' ? 'Mis Entrenamientos' : activeTab === 'sueno' ? 'Mi Descanso' : 'Mi Plan Nutricional'}
              </h1>
            </div>
          </div>
          {activeTab !== 'entreno' && activeTab !== 'sueno' && (
            <button
              onClick={openSettings}
              aria-label="Ajustes del plan"
              className="p-2.5 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-emerald-400 transition-colors"
            >
              <Settings className="w-5 h-5 text-slate-300" />
            </button>
          )}
        </header>

        {/* CONFIRMACIÓN FLOTANTE */}
        {confirmMsg && (
          <div className="mx-5 mb-2 -mt-1 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2 animate-pulse">
            <Check className="w-4 h-4 shrink-0" />
            <span>{confirmMsg}</span>
          </div>
        )}

        {/* DESHACER ELIMINACIÓN */}
        {pendingDelete && (
          <div className="mx-5 mb-2 -mt-1 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm flex items-center justify-between gap-3">
            <span>Comida eliminada</span>
            <button
              onClick={undoDelete}
              className="text-emerald-400 font-semibold shrink-0 focus-visible:ring-2 focus-visible:ring-emerald-400 rounded px-1"
            >
              Deshacer
            </button>
          </div>
        )}

        {/* CONTENIDO */}
        <main className="flex-1 overflow-y-auto px-5 pb-28 space-y-5">
          {(activeTab === 'dia' || activeTab === 'registrar') && (
            <DateNav
              isToday={isToday}
              label={formatDisplayDate(selectedDate)}
              onPrev={goPrevDay}
              onNext={goNextDay}
              onToday={goToday}
            />
          )}

          {activeTab === 'dia' && (
            <TabMiDia
              ring={ring}
              totals={totals}
              goals={goals}
              feedback={feedback}
              waterGlasses={waterGlasses}
              waterGoalGlasses={waterGoalGlasses}
              addWater={addWater}
              log={log}
              removeEntry={removeEntry}
              onEdit={openEditEntry}
              onRegister={() => setActiveTab('registrar')}
              quietStart={isFreshStart}
              habitStrip={isToday ? <DailyRings log={log} modules={modules} /> : null}
              moduleCards={isToday ? <TodayDashboard onGoToTab={setActiveTab} modules={modules} /> : null}
            />
          )}

          {activeTab === 'registrar' && (
            <TabRegistrar
              registerMode={registerMode}
              setRegisterMode={setRegisterMode}
              catalog={planCatalog}
              freeCatalog={freeCatalog}
              onAddCatalogItem={() => openAddCatalogItem('plan')}
              onEditCatalogItem={(item) => openEditCatalogItem(item, 'plan')}
              onEditFreeCatalogItem={(item) => openEditCatalogItem(item, 'libre')}
              addPlanMeal={addPlanMeal}
              addFreeMeal={addFreeMeal}
              showCustomForm={showCustomForm}
              setShowCustomForm={setShowCustomForm}
              customName={customName}
              setCustomName={setCustomName}
              customKcal={customKcal}
              setCustomKcal={setCustomKcal}
              customP={customP}
              setCustomP={setCustomP}
              customC={customC}
              setCustomC={setCustomC}
              customF={customF}
              setCustomF={setCustomF}
              submitCustomFree={submitCustomFree}
            />
          )}

          {activeTab === 'progreso' && (
            <TabProgreso
              weekStats={weekStats}
              goals={goals}
              tipIndex={tipIndex}
              setTipIndex={setTipIndex}
              streak={streak}
              weeklyFreeCount={weeklyFreeCount}
              modules={modules}
            />
          )}

          {activeTab === 'entreno' && modules.entreno && <WorkoutModule />}

          {activeTab === 'sueno' && modules.sueno && <SleepModule />}
        </main>

        {/* NAV INFERIOR */}
        <nav className="fixed bottom-0 inset-x-0 flex justify-center pointer-events-none">
          <div
            className="w-full max-w-md bg-slate-800/95 backdrop-blur border-t border-slate-700 px-2 pt-2 flex justify-around pointer-events-auto"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
          >
            <NavButton icon={Home} label="Mi Día" active={activeTab === 'dia'} onClick={() => setActiveTab('dia')} />
            <NavButton icon={PlusCircle} label="Registrar" active={activeTab === 'registrar'} onClick={() => setActiveTab('registrar')} />
            {modules.sueno && (
              <NavButton
                icon={MoonStar}
                label="Sueño"
                active={activeTab === 'sueno'}
                onClick={() => setActiveTab('sueno')}
                activeColorClass="text-violet-400"
                activeBgClass="bg-violet-500/15"
              />
            )}
            {modules.entreno && (
              <NavButton
                icon={Dumbbell}
                label="Entreno"
                active={activeTab === 'entreno'}
                onClick={() => setActiveTab('entreno')}
                activeColorClass="text-orange-400"
                activeBgClass="bg-orange-500/15"
              />
            )}
            <NavButton icon={TrendingUp} label="Progreso" active={activeTab === 'progreso'} onClick={() => setActiveTab('progreso')} />
          </div>
        </nav>

        {/* INTRO DE PRIMERA VEZ */}
        {showOnboarding && <Onboarding onDone={dismissOnboarding} />}

        {/* CÁLCULO DEL PLAN (tras los slides o al recalcular desde Ajustes) */}
        {showProfileSetup && (
          <ProfileSetup
            onComplete={completeProfileSetup}
            onSkip={dismissProfileSetup}
            initialProfile={profileInitial}
            submitLabel={profileContext === 'settings' ? 'Guardar plan' : 'Usar este plan'}
            dismissLabel={profileContext === 'settings' ? 'Cancelar' : 'Omitir'}
          />
        )}

        {/* MODAL DE INSTALACIÓN EN INICIO (iPhone/Safari) */}
        {showInstallGuide && <InstallGuideModal onClose={() => setShowInstallGuide(false)} />}

        {/* MODAL DE AJUSTES */}
        {showSettings && (
          <SettingsModal
            tempGoals={tempGoals}
            setTempGoals={setTempGoals}
            onSave={saveSettings}
            onCancel={() => setShowSettings(false)}
            onReset={resetSettings}
            onRecalculate={openRecalculate}
            remindersEnabled={remindersEnabled}
            onToggleReminders={toggleReminders}
            modules={modules}
            onToggleModule={toggleModule}
          />
        )}

        {/* MODAL DE EDICIÓN DE COMIDA */}
        {editingEntry && (
          <EditEntryModal
            isPlan={editingEntry.isPlan}
            name={editName}
            setName={setEditName}
            kcal={editKcal}
            setKcal={setEditKcal}
            p={editP}
            setP={setEditP}
            c={editC}
            setC={setEditC}
            f={editF}
            setF={setEditF}
            onSave={saveEditEntry}
            onCancel={closeEditEntry}
          />
        )}

        {/* MODAL DE EDICIÓN DE OPCIÓN DEL CATÁLOGO */}
        {editingCatalogItem && (
          <CatalogItemModal
            isNew={!editingCatalogItem.id}
            isFree={editingCatalogItem.kind === 'libre'}
            name={catalogName}
            setName={setCatalogName}
            kcal={catalogKcal}
            setKcal={setCatalogKcal}
            p={catalogP}
            setP={setCatalogP}
            c={catalogC}
            setC={setCatalogC}
            f={catalogF}
            setF={setCatalogF}
            onSave={saveCatalogItem}
            onCancel={closeCatalogModal}
            onDelete={deleteCatalogItem}
          />
        )}

      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SUBCOMPONENTES DE UI
// ---------------------------------------------------------------------------

function DateNav({ isToday, label, onPrev, onNext, onToday }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-800/60 border border-slate-700 px-3 py-2.5">
      <button
        onClick={onPrev}
        aria-label="Ver día anterior"
        className="p-2 rounded-full hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-emerald-400"
      >
        <ChevronLeft className="w-4 h-4 text-slate-300" />
      </button>
      <div className="text-center min-w-[120px]">
        <p className="text-sm font-semibold text-slate-200">{label}</p>
        {!isToday && (
          <button
            onClick={onToday}
            className="text-[11px] text-emerald-400 font-semibold mt-0.5 focus-visible:ring-2 focus-visible:ring-emerald-400 rounded"
          >
            Volver a hoy
          </button>
        )}
      </div>
      <button
        onClick={onNext}
        disabled={isToday}
        aria-label="Ver día siguiente"
        className={`p-2 rounded-full focus-visible:ring-2 focus-visible:ring-emerald-400 ${
          isToday ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-700'
        }`}
      >
        <ChevronRight className="w-4 h-4 text-slate-300" />
      </button>
    </div>
  );
}

function NavButton({
  icon: Icon,
  label,
  active,
  onClick,
  activeColorClass = 'text-emerald-400',
  activeBgClass = 'bg-emerald-500/15',
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex flex-col items-center gap-0.5 px-1 pt-1 pb-0.5 rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-400 transition-colors ${
        active ? activeColorClass : 'text-slate-500 hover:text-slate-400'
      }`}
    >
      {/* Pastilla tenue detrás del ícono: marca sutil de "estás acá". Mantiene el
          mismo padding activa/inactiva para no mover el layout, solo cambia el fondo. */}
      <span className={`flex items-center justify-center rounded-full px-4 py-1 transition-colors ${active ? activeBgClass : 'bg-transparent'}`}>
        <Icon className="w-5 h-5" />
      </span>
      <span className={`text-[11px] transition-all ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
    </button>
  );
}

function FeedbackBanner({ feedback }) {
  const styleFor = (type) => {
    switch (type) {
      case 'positive':
        return { wrap: 'bg-emerald-500/10 border-emerald-500/30', icon: Award, iconClass: 'text-emerald-400' };
      case 'free':
        return { wrap: 'bg-amber-500/10 border-amber-500/30', icon: Sparkles, iconClass: 'text-amber-400' };
      case 'reminder':
        return { wrap: 'bg-teal-500/10 border-teal-500/30', icon: Info, iconClass: 'text-teal-300' };
      case 'water':
        return { wrap: 'bg-cyan-500/10 border-cyan-500/30', icon: Droplet, iconClass: 'text-cyan-300' };
      default:
        return { wrap: 'bg-slate-800 border-slate-700', icon: Info, iconClass: 'text-slate-400' };
    }
  };

  return (
    <div className="space-y-2">
      {feedback.map((f, i) => {
        const s = styleFor(f.type);
        const Icon = s.icon;
        return (
          <div key={i} className={`rounded-2xl border px-4 py-3 flex items-start gap-3 ${s.wrap}`}>
            <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${s.iconClass}`} />
            <p className="text-sm text-slate-200 leading-snug">{f.text}</p>
          </div>
        );
      })}
    </div>
  );
}

// Confeti breve al entrar en el rango de calorías. Estalla en abanico desde la
// zona del anillo y se desvanece; puramente decorativo (aria-hidden).
const CONFETTI_COLORS = ['#10b981', '#fbbf24', '#22d3ee', '#a78bfa'];

function Confetti({ active }) {
  const pieces = useMemo(() => {
    if (!active) return [];
    return Array.from({ length: 16 }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 70 + Math.random() * 110;
      return {
        id: i,
        left: 46 + Math.random() * 8,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        dx: `${Math.cos(angle) * dist}px`,
        dy: `${Math.sin(angle) * dist + 60}px`, // sesgo hacia abajo (gravedad)
        rot: `${Math.random() * 720 - 360}deg`,
        delay: `${Math.random() * 0.12}s`,
      };
    });
  }, [active]);

  if (!active) return null;

  return (
    <div className="absolute inset-0 z-40 overflow-hidden pointer-events-none" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece absolute rounded-sm"
          style={{
            left: `${p.left}%`,
            top: '32%',
            width: 9,
            height: 9,
            backgroundColor: p.color,
            animationDelay: p.delay,
            '--dx': p.dx,
            '--dy': p.dy,
            '--rot': p.rot,
          }}
        />
      ))}
    </div>
  );
}

function TabMiDia({
  ring,
  totals,
  goals,
  feedback,
  waterGlasses,
  waterGoalGlasses,
  addWater,
  log,
  removeEntry,
  onEdit,
  onRegister,
  quietStart,
  habitStrip,
  moduleCards,
}) {
  const kcalColor = ring.overshoot ? '#f59e0b' : '#10b981';
  const statusText = ring.overshoot
    ? 'Por encima de la meta'
    : Math.abs(totals.kcal - goals.calories) <= TOLERANCE_CAL
    ? 'Dentro de tu rango objetivo'
    : 'Por debajo de la meta';

  // El anillo "cuenta" desde 0 al abrir Mi Día y se rellena; el número y el arco
  // comparten el mismo valor animado para ir en sincronía.
  const animatedKcal = useCountUp(Math.round(totals.kcal), 650, 0);
  const animatedPct = Math.min(animatedKcal / (goals.calories || 1), 1);

  // Salida animada de comidas: marca la que se borra, espera el fade y recién
  // ahí avisa al padre (que dispara el undo).
  const [removingId, setRemovingId] = useState(null);
  const handleRemove = (id, isPlan) => {
    if (prefersReducedMotion()) {
      removeEntry(id, isPlan);
      return;
    }
    setRemovingId(id);
    setTimeout(() => {
      removeEntry(id, isPlan);
      setRemovingId(null);
    }, 220);
  };

  // Composición de macros por aporte calórico, para la tira fina bajo el anillo.
  const macroSegments = computeMacroSegments(totals);

  // Listado general único: todas las comidas del día juntas, sin clasificación por momento
  const allEntries = [
    ...log.planMeals.map((m) => ({ ...m, kind: 'plan' })),
    ...log.freeMeals.map((m) => ({ ...m, kind: 'free' })),
  ].sort((a, b) => (a.time > b.time ? 1 : -1));

  return (
    <div className="space-y-4">
      {/* HÉROE: anillo de calorías + acción principal */}
      <div className="rounded-3xl bg-slate-800/60 border border-slate-700 p-5 flex flex-col items-center">
        <svg width={ring.size} height={ring.size} viewBox={`0 0 ${ring.size} ${ring.size}`}>
          {/* track exterior */}
          <circle
            cx={ring.center}
            cy={ring.center}
            r={ring.rOuter}
            fill="none"
            stroke="#334155"
            strokeWidth={ring.swOuter}
          />
          {/* progreso calorías */}
          <circle
            cx={ring.center}
            cy={ring.center}
            r={ring.rOuter}
            fill="none"
            stroke={kcalColor}
            strokeWidth={ring.swOuter}
            strokeDasharray={`${ring.cOuter * animatedPct} ${ring.cOuter}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${ring.center} ${ring.center})`}
          />
          <text x={ring.center} y={ring.center - 4} textAnchor="middle" className="fill-slate-100" style={{ fontSize: 34, fontWeight: 800, fontFamily: 'ui-monospace, monospace' }}>
            {Math.round(animatedKcal)}
          </text>
          <text x={ring.center} y={ring.center + 20} textAnchor="middle" className="fill-slate-400" style={{ fontSize: 12, fontWeight: 600 }}>
            de {Math.round(goals.calories)} kcal
          </text>
        </svg>
        <p className={`mt-1 text-xs font-semibold ${ring.overshoot ? 'text-amber-400' : 'text-emerald-400'}`}>{statusText}</p>

        {/* Tira fina de composición de macros (se omite en arranque calmo, donde
            aún no hay datos y sería solo una barra gris) */}
        {!quietStart && (
          <div className="w-full mt-4">
            <div className="flex h-2 rounded-full overflow-hidden bg-slate-700">
              {macroSegments.map((seg, i) => (
                <div key={i} style={{ width: `${seg.pct * 100}%`, backgroundColor: seg.color }} />
              ))}
            </div>
            <div className="flex justify-center gap-4 mt-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }} />Proteína
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#fbbf24' }} />Carbos
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#94a3b8' }} />Grasa
              </span>
            </div>
          </div>
        )}

        {/* Acción principal: el corazón de la dinámica diaria */}
        <button
          onClick={onRegister}
          className="w-full mt-4 flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold py-3 focus-visible:ring-2 focus-visible:ring-emerald-300 transition-colors"
        >
          <PlusCircle className="w-5 h-5" />
          Registrar comida
        </button>
      </div>

      {/* Secundarios: se ocultan en arranque calmo (usuario nuevo, día vacío) y
          reaparecen apenas hay actividad, para que el héroe no compita con nada. */}
      {!quietStart && (
        <>
          {/* TIRA DE HÁBITOS (comida / movimiento / sueño + racha) */}
          {habitStrip}

          {/* AGUA (compacta) */}
          <div className="rounded-2xl bg-slate-800/60 border border-slate-700 px-4 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Droplets className="w-5 h-5 text-cyan-300 shrink-0" />
              <span className="text-sm font-semibold text-slate-200">Agua</span>
              <span className="font-mono text-xs text-cyan-200/80 truncate">
                {waterGlasses}/{waterGoalGlasses} vasos
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => addWater(-1)}
                aria-label="Quitar un vaso de agua"
                className="p-2 rounded-full bg-slate-700 hover:bg-slate-600 focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                <Minus className="w-4 h-4 text-slate-200" />
              </button>
              <span className="font-mono text-sm text-cyan-200 w-16 text-center">{log.water} ml</span>
              <button
                onClick={() => addWater(1)}
                aria-label="Agregar un vaso de agua"
                className="p-2 rounded-full bg-cyan-500/20 border border-cyan-400/40 hover:bg-cyan-500/30 focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                <Plus className="w-4 h-4 text-cyan-300" />
              </button>
            </div>
          </div>

          {/* ACCESOS A ENTRENO Y SUEÑO */}
          {moduleCards}

          {/* FEEDBACK */}
          <FeedbackBanner feedback={feedback} />
        </>
      )}

      {/* HISTORIAL DEL DÍA — listado general único, sin momentos del día */}
      <div>
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-2">Registro del día</h2>
        {allEntries.length === 0 ? (
          <button
            onClick={onRegister}
            className="w-full rounded-2xl border border-dashed border-slate-700 p-6 text-center hover:border-emerald-500/50 hover:bg-emerald-500/5 focus-visible:ring-2 focus-visible:ring-emerald-400 transition-colors"
          >
            <Utensils className="w-6 h-6 text-slate-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">Empezá tu día</p>
            <p className="text-xs text-slate-500 mt-1">Registrá tu primera comida para ver el anillo llenarse.</p>
          </button>
        ) : (
          <ul className="space-y-2">
            {allEntries.map((entry) => (
              <li
                key={entry.id}
                className={`rounded-2xl border p-3 flex items-center justify-between gap-3 ${
                  entry.kind === 'plan' ? 'bg-emerald-500/5 border-emerald-500/25' : 'bg-amber-500/5 border-amber-500/25'
                } ${removingId === entry.id ? 'anim-meal-out' : 'anim-meal-in'}`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        entry.kind === 'plan' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {entry.kind === 'plan' ? 'Plan oficial' : 'Fuera de plan'}
                    </span>
                    <span className="text-[11px] text-slate-500">{entry.time}</span>
                  </div>
                  <p className="text-sm text-slate-200 truncate mt-0.5">{entry.name}</p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {Math.round(entry.kcal)} kcal · P {round1(entry.p)}g · C {round1(entry.c)}g · G {round1(entry.f)}g
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onEdit(entry, entry.kind === 'plan')}
                    aria-label="Editar comida"
                    className="p-2 rounded-full hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-slate-400"
                  >
                    <Pencil className="w-4 h-4 text-slate-500" />
                  </button>
                  <button
                    onClick={() => handleRemove(entry.id, entry.kind === 'plan')}
                    aria-label="Eliminar registro"
                    className="p-2 rounded-full hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-slate-400"
                  >
                    <Trash2 className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const TOLERANCE_CAL = TOLERANCE.calories;

function TabRegistrar({
  registerMode,
  setRegisterMode,
  catalog,
  freeCatalog,
  onAddCatalogItem,
  onEditCatalogItem,
  onEditFreeCatalogItem,
  addPlanMeal,
  addFreeMeal,
  showCustomForm,
  setShowCustomForm,
  customName,
  setCustomName,
  customKcal,
  setCustomKcal,
  customP,
  setCustomP,
  customC,
  setCustomC,
  customF,
  setCustomF,
  submitCustomFree,
}) {
  const [foodQuery, setFoodQuery] = useState('');
  const foodResults = useMemo(() => searchFoods(foodQuery), [foodQuery]);
  // Se calcula al entrar a la pestaña (el tab se desmonta al navegar): tus
  // alimentos más registrados, para sumarlos de un toque sin buscar.
  const frequents = useMemo(() => getFrequentFoods(), []);

  const addFoodFromDb = (food) => {
    const item = { name: food.name, kcal: food.kcal, p: food.p, c: food.c, f: food.f };
    if (registerMode === 'plan') addPlanMeal(item);
    else addFreeMeal(item);
    setFoodQuery('');
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 bg-slate-800 border border-slate-700 rounded-2xl p-1">
        <button
          onClick={() => setRegisterMode('plan')}
          className={`py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
            registerMode === 'plan' ? 'bg-emerald-500 text-slate-900' : 'text-slate-400'
          }`}
        >
          <Utensils className="w-4 h-4" /> Plan Oficial
        </button>
        <button
          onClick={() => setRegisterMode('libre')}
          className={`py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
            registerMode === 'libre' ? 'bg-amber-500 text-slate-900' : 'text-slate-400'
          }`}
        >
          <Coffee className="w-4 h-4" /> Fuera de Plan
        </button>
      </div>

      {/* FRECUENTES: tus alimentos más registrados, a un toque. Se ocultan mientras buscás. */}
      {frequents.length > 0 && foodQuery.trim().length < 2 && (
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Frecuentes
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {frequents.map((food) => (
              <button
                key={food.name}
                onClick={() => addFoodFromDb(food)}
                aria-label={`Agregar ${food.name}`}
                className={`shrink-0 max-w-[75%] rounded-full border pl-3.5 pr-2.5 py-2 text-sm text-slate-200 flex items-center gap-1.5 transition-colors ${
                  registerMode === 'plan'
                    ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60'
                    : 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60'
                }`}
              >
                <span className="truncate">{food.name}</span>
                <Plus className={`w-3.5 h-3.5 shrink-0 ${registerMode === 'plan' ? 'text-emerald-400' : 'text-amber-400'}`} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* BÚSQUEDA EN LA BASE DE ALIMENTOS: registro rápido sin tipear macros */}
      <div>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={foodQuery}
            onChange={(e) => setFoodQuery(e.target.value)}
            placeholder="Buscar alimento (banana, milanesa, arroz...)"
            className="w-full bg-slate-800/60 border border-slate-700 rounded-2xl pl-9 pr-3 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        {foodQuery.trim().length >= 2 && (
          <div className="mt-2 space-y-1.5">
            {foodResults.map((food) => (
              <button
                key={food.id}
                onClick={() => addFoodFromDb(food)}
                className={`w-full text-left rounded-xl bg-slate-800/60 border border-slate-700 px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                  registerMode === 'plan' ? 'hover:border-emerald-500/50' : 'hover:border-amber-500/50'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm text-slate-200 truncate">{food.name}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {food.kcal} kcal · P {food.p}g · C {food.c}g · G {food.f}g
                  </p>
                </div>
                <PlusCircle
                  className={`w-5 h-5 shrink-0 ${registerMode === 'plan' ? 'text-emerald-400' : 'text-amber-400'}`}
                />
              </button>
            ))}
            {foodResults.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-2">
                Sin resultados. Podés cargarlo manualmente más abajo.
              </p>
            )}
          </div>
        )}
      </div>

      {registerMode === 'plan' && (
        <div className="space-y-4">
          <div className="space-y-2">
            {catalog.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center gap-1 pr-1 hover:border-emerald-500/50 transition-colors"
              >
                <button
                  onClick={() => addPlanMeal(item)}
                  className="flex-1 min-w-0 text-left p-4 flex items-center justify-between gap-3 focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-2xl"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200">{item.name}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {item.kcal} kcal · P {item.p}g · C {item.c}g · G {item.f}g
                    </p>
                  </div>
                  <PlusCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                </button>
                <button
                  onClick={() => onEditCatalogItem(item)}
                  aria-label="Editar esta opción del plan"
                  className="p-2 rounded-full hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-slate-400 shrink-0"
                >
                  <Pencil className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            ))}

            {catalog.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-center text-slate-500 text-sm">
                Buscá un alimento arriba para registrarlo. Guardá acá tus comidas frecuentes para tenerlas a un toque.
              </div>
            )}

            <button
              onClick={onAddCatalogItem}
              className="w-full rounded-2xl border border-dashed border-emerald-500/40 text-emerald-300 py-3 text-sm font-semibold hover:bg-emerald-500/5 focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              + Agregar comida frecuente
            </button>
          </div>
        </div>
      )}

      {registerMode === 'libre' && (
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Gustos frecuentes</p>
          <div className="space-y-2">
            {freeCatalog.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center gap-1 pr-1 hover:border-amber-500/50 transition-colors"
              >
                <button
                  onClick={() => addFreeMeal(item)}
                  className="flex-1 min-w-0 text-left p-4 flex items-center justify-between gap-3 focus-visible:ring-2 focus-visible:ring-amber-400 rounded-2xl"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200">{item.name}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {item.kcal} kcal · P {item.p}g · C {item.c}g · G {item.f}g
                    </p>
                  </div>
                  <PlusCircle className="w-5 h-5 text-amber-400 shrink-0" />
                </button>
                <button
                  onClick={() => onEditFreeCatalogItem(item)}
                  aria-label="Editar esta opción fuera de plan"
                  className="p-2 rounded-full hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-slate-400 shrink-0"
                >
                  <Pencil className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            ))}

            {freeCatalog.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-center text-slate-500 text-sm">
                Buscá un alimento arriba o cargá uno abajo: queda guardado acá para reusarlo de un toque.
              </div>
            )}
          </div>

          {!showCustomForm ? (
            <button
              onClick={() => setShowCustomForm(true)}
              className="w-full rounded-2xl border border-dashed border-amber-500/40 text-amber-300 py-3 text-sm font-semibold hover:bg-amber-500/5 focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              + Cargar otra comida fuera de plan
            </button>
          ) : (
            <div className="rounded-2xl bg-slate-800/60 border border-amber-500/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-amber-300">Nueva comida libre</p>
                <button onClick={() => setShowCustomForm(false)} aria-label="Cerrar formulario">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="¿Qué comiste?"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={customKcal}
                  onChange={(e) => setCustomKcal(e.target.value)}
                  placeholder="Kcal"
                  inputMode="decimal"
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <input
                  value={customP}
                  onChange={(e) => setCustomP(e.target.value)}
                  placeholder="Proteínas (g)"
                  inputMode="decimal"
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <input
                  value={customC}
                  onChange={(e) => setCustomC(e.target.value)}
                  placeholder="Carbohidratos (g)"
                  inputMode="decimal"
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <input
                  value={customF}
                  onChange={(e) => setCustomF(e.target.value)}
                  placeholder="Grasas (g)"
                  inputMode="decimal"
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <button
                onClick={submitCustomFree}
                className="w-full rounded-xl bg-amber-500 text-slate-900 font-semibold py-2.5 text-sm hover:bg-amber-400 focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                Agregar a mi registro
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TabProgreso({ weekStats, goals, tipIndex, setTipIndex, streak, weeklyFreeCount, modules }) {
  const maxKcal = Math.max(goals.calories, ...weekStats.map((d) => d.kcal), 1);

  const nextTip = () => setTipIndex((i) => (i + 1) % TIPS.length);
  const prevTip = () => setTipIndex((i) => (i - 1 + TIPS.length) % TIPS.length);

  return (
    <div className="space-y-5">
      <WeeklyRecap weekStats={weekStats} goals={goals} modules={modules} />
      <WeightTracker />
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-slate-800/60 border border-slate-700 p-4 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Flame className="w-5 h-5" />
            <span className="font-mono text-2xl font-black text-slate-100">{streak}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-tight">
            {streak === 1 ? 'día seguido dentro de rango' : 'días seguidos dentro de rango'}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-800/60 border border-slate-700 p-4 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1.5 text-amber-400">
            <Sparkles className="w-5 h-5" />
            <span className="font-mono text-2xl font-black text-slate-100">{weeklyFreeCount}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-tight">
            {weeklyFreeCount === 1 ? 'gusto esta semana' : 'gustos esta semana'}
          </p>
        </div>
      </div>

      <div className="rounded-3xl bg-slate-800/60 border border-slate-700 p-5">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-4">Últimos 7 días</h2>
        <div className="flex items-end justify-between gap-2 h-36">
          {weekStats.map((d) => {
            const h = Math.max(4, (d.kcal / maxKcal) * 100);
            const withinTol = d.kcal > 0 && Math.abs(d.kcal - goals.calories) <= TOLERANCE.calories;
            return (
              <div key={d.key} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full h-28 flex items-end">
                  <div
                    className={`w-full rounded-t-md ${
                      d.kcal === 0 ? 'bg-slate-700' : withinTol ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ height: `${h}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 uppercase font-medium">{d.label}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2 mt-3 text-[11px] text-slate-500">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Dentro de rango
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block ml-3" /> Fuera de rango
        </div>
      </div>

      <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/25 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-5 h-5 text-emerald-300" />
          <h2 className="text-sm font-bold text-emerald-200 uppercase tracking-wide">Tip del día</h2>
        </div>
        <p className="text-sm text-slate-200 leading-relaxed min-h-[3rem]">{TIPS[tipIndex]}</p>
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={prevTip}
            aria-label="Tip anterior"
            className="p-2 rounded-full bg-slate-800/60 hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <ChevronLeft className="w-4 h-4 text-slate-300" />
          </button>
          <span className="text-xs text-slate-500 font-mono">
            {tipIndex + 1} / {TIPS.length}
          </span>
          <button
            onClick={nextTip}
            aria-label="Tip siguiente"
            className="p-2 rounded-full bg-slate-800/60 hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>
        </div>
      </div>

      <div className="rounded-3xl bg-slate-800/60 border border-slate-700 p-5">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-3">Tus metas actuales</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <GoalChip label="Calorías" value={`${Math.round(goals.calories)} kcal`} />
          <GoalChip label="Proteínas" value={`${round1(goals.protein)} g`} />
          <GoalChip label="Carbohidratos" value={`${round1(goals.carbs)} g`} />
          <GoalChip label="Grasas" value={`${round1(goals.fat)} g`} />
          <GoalChip label="Agua" value={`${goals.water} ml`} />
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Podés editar estos valores desde el ícono de ajustes en la parte superior de la app.
        </p>
      </div>
    </div>
  );
}

function GoalChip({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-900/60 border border-slate-700 px-3 py-2">
      <p className="text-[10px] uppercase text-slate-500 font-semibold">{label}</p>
      <p className="font-mono text-slate-200 font-semibold">{value}</p>
    </div>
  );
}

function EditEntryModal({ isPlan, name, setName, kcal, setKcal, p, setP, c, setC, f, setF, onSave, onCancel }) {
  const accent = isPlan ? 'emerald' : 'amber';
  const accentText = isPlan ? 'text-emerald-300' : 'text-amber-300';
  const accentBorder = isPlan ? 'border-emerald-500/30' : 'border-amber-500/30';
  const accentBg = isPlan ? 'bg-emerald-500' : 'bg-amber-500';
  const accentRing = isPlan ? 'focus-visible:ring-emerald-400' : 'focus-visible:ring-amber-400';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4">
      <div className={`w-full max-w-md bg-slate-800 border ${accentBorder} rounded-t-3xl sm:rounded-3xl p-6 max-h-[85vh] overflow-y-auto`}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-slate-100">Editar comida</h2>
          <button onClick={onCancel} aria-label="Cerrar edición" className="p-2 rounded-full hover:bg-slate-700">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <p className={`text-xs font-semibold mb-5 ${accentText}`}>
          {isPlan ? 'Comida del plan oficial' : 'Comida fuera de plan'}
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1 block">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-2 ${accentRing}`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Calorías (kcal)</label>
              <input
                type="number"
                inputMode="decimal"
                value={kcal}
                onChange={(e) => setKcal(e.target.value)}
                className={`w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-mono focus:outline-none focus:ring-2 ${accentRing}`}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Proteínas (g)</label>
              <input
                type="number"
                inputMode="decimal"
                value={p}
                onChange={(e) => setP(e.target.value)}
                className={`w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-mono focus:outline-none focus:ring-2 ${accentRing}`}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Carbohidratos (g)</label>
              <input
                type="number"
                inputMode="decimal"
                value={c}
                onChange={(e) => setC(e.target.value)}
                className={`w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-mono focus:outline-none focus:ring-2 ${accentRing}`}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Grasas (g)</label>
              <input
                type="number"
                inputMode="decimal"
                value={f}
                onChange={(e) => setF(e.target.value)}
                className={`w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-mono focus:outline-none focus:ring-2 ${accentRing}`}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-600 text-slate-300 py-2.5 text-sm font-semibold hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            className={`flex-1 rounded-xl ${accentBg} text-slate-900 py-2.5 text-sm font-bold flex items-center justify-center gap-2 focus-visible:ring-2 ${accentRing}`}
          >
            <Save className="w-4 h-4" /> Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function CatalogItemModal({ isNew, isFree, name, setName, kcal, setKcal, p, setP, c, setC, f, setF, onSave, onCancel, onDelete }) {
  const noun = isFree ? 'fuera de plan' : 'del plan';
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4">
      <div
        className={`w-full max-w-md bg-slate-800 border rounded-t-3xl sm:rounded-3xl p-6 max-h-[85vh] overflow-y-auto ${
          isFree ? 'border-amber-500/30' : 'border-emerald-500/30'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-slate-100">
            {isNew ? `Nueva opción ${noun}` : `Editar opción ${noun}`}
          </h2>
          <button onClick={onCancel} aria-label="Cerrar" className="p-2 rounded-full hover:bg-slate-700">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <p className={`text-xs font-semibold mb-5 ${isFree ? 'text-amber-300' : 'text-emerald-300'}`}>
          Estos valores son los que va a usar la app cada vez que agregues esta opción
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1 block">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Tostadas con palta"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Calorías (kcal)</label>
              <input
                type="number"
                inputMode="decimal"
                value={kcal}
                onChange={(e) => setKcal(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Proteínas (g)</label>
              <input
                type="number"
                inputMode="decimal"
                value={p}
                onChange={(e) => setP(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Carbohidratos (g)</label>
              <input
                type="number"
                inputMode="decimal"
                value={c}
                onChange={(e) => setC(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Grasas (g)</label>
              <input
                type="number"
                inputMode="decimal"
                value={f}
                onChange={(e) => setF(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>
        </div>

        {!isNew && (
          <button
            onClick={onDelete}
            className="w-full mt-4 text-center text-xs text-rose-400 hover:text-rose-300 py-1 flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" /> Eliminar esta opción {noun}
          </button>
        )}

        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-600 text-slate-300 py-2.5 text-sm font-semibold hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            className="flex-1 rounded-xl bg-emerald-500 text-slate-900 py-2.5 text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            <Save className="w-4 h-4" /> Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function InstallGuideModal({ onClose }) {
  const steps = [
    {
      icon: Share,
      title: 'Tocá el ícono Compartir',
      text: 'Es el cuadrado con una flecha hacia arriba, en la barra inferior (o superior) de Safari.',
    },
    {
      icon: SquarePlus,
      title: 'Elegí "Agregar a inicio"',
      text: 'Deslizá hacia abajo en la lista de opciones que aparece hasta encontrarla.',
    },
    {
      icon: Check,
      title: 'Confirmá con "Agregar"',
      text: 'Va a aparecer un ícono nuevo en tu pantalla de inicio para abrir la app como si fuera nativa.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-t-3xl sm:rounded-3xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-slate-100">Instalar en tu iPhone</h2>
          <button onClick={onClose} aria-label="Cerrar" className="p-2 rounded-full hover:bg-slate-700">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <p className="text-sm text-slate-400 mb-1">
          Agregá esta app a tu pantalla de inicio para abrirla como una app nativa, con ícono propio y sin la barra de
          direcciones.
        </p>
        <p className="text-xs font-semibold text-emerald-400 mb-5">Funciona desde Safari (no desde Chrome u otros navegadores).</p>

        <div className="space-y-4">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="shrink-0 w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <step.icon className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-200">
                  {i + 1}. {step.title}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 leading-snug">{step.text}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 rounded-xl bg-emerald-500 text-slate-900 py-2.5 text-sm font-bold hover:bg-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-300"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}

function SettingsModal({ tempGoals, setTempGoals, onSave, onCancel, onReset, onRecalculate, remindersEnabled, onToggleReminders, modules, onToggleModule }) {
  const fields = [
    { key: 'calories', label: 'Calorías (kcal)', step: '10' },
    { key: 'protein', label: 'Proteínas (g)', step: '0.5' },
    { key: 'carbs', label: 'Carbohidratos (g)', step: '0.5' },
    { key: 'fat', label: 'Grasas (g)', step: '0.5' },
    { key: 'water', label: 'Agua (ml)', step: '50' },
  ];

  const fileInputRef = useRef(null);
  const [backupMsg, setBackupMsg] = useState(null); // { type: 'ok' | 'error', text }

  const handleExport = () => {
    try {
      downloadFullBackup();
      setBackupMsg({ type: 'ok', text: 'Copia de seguridad descargada ✓' });
    } catch (e) {
      setBackupMsg({ type: 'error', text: 'No se pudo generar el archivo.' });
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo después
    if (!file) return;

    const confirmed = window.confirm(
      'Esto va a reemplazar tus datos actuales (nutrición, entreno y sueño) por los del archivo de backup. ¿Continuar?'
    );
    if (!confirmed) return;

    try {
      const data = await readBackupFile(file);
      restoreFullBackup(data);
      setBackupMsg({ type: 'ok', text: 'Datos restaurados. Recargando...' });
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      setBackupMsg({ type: 'error', text: err.message || 'No se pudo restaurar el archivo.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-t-3xl sm:rounded-3xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-100">Ajustes de mi plan</h2>
          <button onClick={onCancel} aria-label="Cerrar ajustes" className="p-2 rounded-full hover:bg-slate-700">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="space-y-4">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">{f.label}</label>
              <input
                type="number"
                step={f.step}
                value={tempGoals[f.key]}
                onChange={(e) => setTempGoals((prev) => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onReset}
            className="flex-1 rounded-xl border border-slate-600 text-slate-300 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <RotateCcw className="w-4 h-4" /> Restaurar
          </button>
          <button
            onClick={onSave}
            className="flex-1 rounded-xl bg-emerald-500 text-slate-900 py-2.5 text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            <Save className="w-4 h-4" /> Guardar
          </button>
        </div>

        {/* Recalcular el plan a partir del perfil (fórmula Mifflin-St Jeor) */}
        <div className="mt-6 pt-5 border-t border-slate-700">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">Recalcular mi plan</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Estimá tus calorías y macros según tu peso, altura y objetivo actuales.
              </p>
            </div>
            <button
              onClick={onRecalculate}
              className="shrink-0 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-3.5 py-2 text-sm font-semibold hover:bg-emerald-500/25 focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              Recalcular
            </button>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-700">
          <div className="flex items-center gap-2 mb-1">
            <LayoutGrid className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100">Módulos</h3>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Activá solo lo que quieras trackear. La nutrición siempre está activa.
          </p>
          <div className="space-y-3">
            {[
              { key: 'entreno', icon: Dumbbell, label: 'Entreno', desc: 'Rutinas y seguimiento de fuerza' },
              { key: 'sueno', icon: MoonStar, label: 'Sueño', desc: 'Registro y análisis del descanso' },
            ].map((mod) => {
              const on = modules?.[mod.key] ?? true;
              const Icon = mod.icon;
              return (
                <div key={mod.key} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="w-4 h-4 text-slate-300 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-200">{mod.label}</p>
                      <p className="text-xs text-slate-500 leading-tight">{mod.desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onToggleModule(mod.key)}
                    role="switch"
                    aria-checked={on}
                    aria-label={`Activar ${mod.label}`}
                    className={`shrink-0 w-12 h-7 rounded-full p-0.5 transition-colors ${on ? 'bg-emerald-500' : 'bg-slate-600'}`}
                  >
                    <span
                      className={`block w-6 h-6 rounded-full bg-white transition-transform ${on ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-700">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">Recordatorios</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Te avisamos si pasan varias horas sin registrar comidas o agua.
              </p>
            </div>
            <button
              onClick={onToggleReminders}
              role="switch"
              aria-checked={remindersEnabled}
              aria-label="Activar recordatorios"
              className={`shrink-0 w-12 h-7 rounded-full p-0.5 transition-colors ${
                remindersEnabled ? 'bg-emerald-500' : 'bg-slate-600'
              }`}
            >
              <span
                className={`block w-6 h-6 rounded-full bg-white transition-transform ${
                  remindersEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-700">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100">Copia de seguridad</h3>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Guarda o restaura todos tus datos (nutrición, entreno y sueño) en un solo archivo. Útil antes de cambiar de
            teléfono o desinstalar la app.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="flex-1 rounded-xl border border-slate-600 text-slate-300 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              <Download className="w-4 h-4" /> Exportar todo
            </button>
            <button
              onClick={handleImportClick}
              className="flex-1 rounded-xl border border-slate-600 text-slate-300 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              <Upload className="w-4 h-4" /> Restaurar copia
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="application/json" onChange={handleFileSelected} className="hidden" />
          {backupMsg && (
            <p className={`text-xs mt-2.5 ${backupMsg.type === 'ok' ? 'text-emerald-400' : 'text-rose-400'}`}>{backupMsg.text}</p>
          )}
        </div>
      </div>
    </div>
  );
}
