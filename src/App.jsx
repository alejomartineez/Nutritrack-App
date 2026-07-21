import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import {
  Home, PlusCircle, TrendingUp, Settings, Droplet, Droplets, Trash2, X, Check,
  ChevronRight, ChevronLeft, ChevronDown, Sparkles, Lightbulb, Award, Plus, Minus,
  Save, RotateCcw, Info, Utensils, Coffee, Pencil, Flame, Dumbbell, MoonStar,
  Download, Share, SquarePlus, Upload, ShieldCheck, Search, Bell, Clock, LayoutGrid, Calculator,
  Loader2, Barcode, ScanLine, AlertCircle,
} from 'lucide-react';
// Entreno y Sueño se cargan a demanda (React.lazy): son módulos opcionales
// —se apagan desde Ajustes— y pesan bastante (rutinas, sesión en vivo, gráficos,
// formularios de sueño). Quien solo usa nutrición no los descarga nunca; quien
// los usa, se bajan al abrir la pestaña por primera vez y quedan en caché.
// Los helpers de storage que necesitan Mi Día (DailyRings, TodayDashboard) se
// importan aparte y son chicos, así que siguen en el bundle inicial.
const WorkoutModule = lazy(() => import('./workout/WorkoutModule'));
const SleepModule = lazy(() => import('./sleep/SleepModule'));
import TodayDashboard from './TodayDashboard';
import DailyRings, { hasAnyActivity } from './DailyRings';
import Onboarding from './Onboarding';
import ProfileSetup from './ProfileSetup';
import WeeklyRecap from './WeeklyRecap';
import WeightTracker from './WeightTracker';
import { searchFoods } from './foodDatabase';
import { searchProducts, getProductByBarcode } from './openFoodFacts';
import BarcodeScanner from './BarcodeScanner';
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
  scaleFood,
  kcalOf,
  kcalFromMacros,
  hasMacros,
} from './lib/nutritionCalcs';
import QuantitySheet from './QuantitySheet';
import { useCountUp, prefersReducedMotion } from './lib/motion';
import { useKeyboardOpen } from './lib/viewport';
import { useTodayKey } from './lib/today';
import Sheet from './lib/Sheet';
import { theme, macroColors, celebrationColors } from './lib/theme';

// ---------------------------------------------------------------------------
// DATOS BASE DEL PLAN
// ---------------------------------------------------------------------------

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

/** Orden de las pestañas en la barra inferior. Solo define hacia qué lado desliza
 *  la transición; incluye las opcionales (sueño/entreno) aunque estén apagadas. */
const TAB_ORDER = ['dia', 'registrar', 'sueno', 'entreno', 'progreso'];

// ---------------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// ---------------------------------------------------------------------------

export default function NutriTrackApp() {
  const [activeTab, setActiveTab] = useState('dia');
  // Dirección del deslizamiento entre pestañas: la nueva entra desde el lado al
  // que te movés en la barra, así el gesto tiene sentido espacial. Se calcula al
  // cambiar de tab (no en un efecto) para que el primer frame ya salga bien.
  const [tabDir, setTabDir] = useState('forward');

  const goToTab = (next) => {
    if (next === activeTab) return;
    setTabDir(TAB_ORDER.indexOf(next) >= TAB_ORDER.indexOf(activeTab) ? 'forward' : 'back');
    setActiveTab(next);
    // Arrancar la sección nueva desde arriba. Sin esto, al pasar de una pestaña
    // larga a una corta el navegador recortaba el scroll por su cuenta: un salto
    // de cientos de píxeles justo mientras corría el deslizamiento, que era lo
    // que hacía sentir brusco el cambio. Va sin `smooth` a propósito, para no
    // pelearse con la animación de entrada.
    window.scrollTo({ top: 0, behavior: 'auto' });
  };
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
  // A qué día pertenece el `log` que está en memoria. Va como estado y no como
  // ref a propósito: tiene que cambiar en el mismo commit que el log para que el
  // efecto de persistencia no pueda verlos desincronizados (ver el comentario
  // largo en ese efecto).
  const [logDateKey, setLogDateKey] = useState(null);
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

  // Alimento esperando que elijas cantidad: { food, mode }. mode 'plan' | 'libre'.
  const [pendingFood, setPendingFood] = useState(null);
  const [scanning, setScanning] = useState(false);

  // { id, kind } — id null = nueva opción; kind 'plan' | 'libre'
  const [editingCatalogItem, setEditingCatalogItem] = useState(null);
  const [catalogName, setCatalogName] = useState('');
  const [catalogKcal, setCatalogKcal] = useState('');
  const [catalogP, setCatalogP] = useState('');
  const [catalogC, setCatalogC] = useState('');
  const [catalogF, setCatalogF] = useState('');

  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const dateKey = dateKeyOf(selectedDate);
  // Se recalcula solo al cruzar la medianoche (ver src/lib/today.js): la PWA no
  // se cierra nunca, así que "hoy" no puede ser una constante de módulo.
  const todayKey = useTodayKey();
  const isToday = dateKey === todayKey;

  // Cruzó la medianoche con la app abierta. Si estabas parado en el día de hoy,
  // la vista pasa sola al día nuevo —que es lo que esperás al mirar la app a la
  // mañana—; si estabas revisando un día pasado, se queda donde estaba, porque
  // ahí el día que mirás lo elegiste vos.
  const prevTodayKeyRef = useRef(todayKey);
  useEffect(() => {
    const prevTodayKey = prevTodayKeyRef.current;
    prevTodayKeyRef.current = todayKey;
    if (prevTodayKey === todayKey) return;
    setSelectedDate((current) =>
      dateKeyOf(current) === prevTodayKey ? startOfDay(new Date()) : current
    );
  }, [todayKey]);

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

  // Accesos directos del sistema (mantener apretado el ícono) y deep-links. Los
  // shortcuts del manifest abren la app con `?tab=` o `?action=` y acá se
  // traducen a una pantalla. Corre una sola vez, al montar.
  //
  // Nota de plataforma: iOS todavía no muestra estos accesos directos —son de
  // Android y de Chrome/Edge de escritorio—, pero el deep-link igual funciona
  // en iOS si se llega por URL, así que no está de más.
  useEffect(() => {
    let params;
    try {
      params = new URLSearchParams(window.location.search);
    } catch {
      return;
    }
    const tab = params.get('tab');
    const action = params.get('action');
    if (!tab && !action) return;

    if (action === 'scan') {
      // Escanear vive dentro de Registrar: se abre esa pestaña y encima la cámara.
      setActiveTab('registrar');
      setScanning(true);
    } else if (tab === 'entreno' && modules.entreno) {
      setActiveTab('entreno');
    } else if (tab === 'sueno' && modules.sueno) {
      setActiveTab('sueno');
    } else if (tab === 'dia' || tab === 'registrar' || tab === 'progreso') {
      setActiveTab(tab);
    }

    // Se limpia el query para que un refresh —o compartir el link— no repita la
    // acción, y para que la barra de direcciones quede prolija.
    try {
      window.history.replaceState(null, '', window.location.pathname);
    } catch {
      // sin History API se sigue igual; el único costo es que un refresh repita.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleReminders = async () => {
    const next = !remindersEnabled;
    if (next) await requestNotificationPermission();
    setRemindersEnabled(next);
    saveReminderSettings({ enabled: next });
  };

  // Chequeo periódico de recordatorios mientras la app esté abierta: si quedó
  // en segundo plano (Android/desktop) sale como notificación del sistema.
  //
  // El log entra por ref y NO por el array de dependencias. Estando en las
  // dependencias, cada vaso de agua y cada comida desmontaba el efecto y
  // arrancaba un `setInterval` nuevo desde cero: con un intervalo de 30 minutos
  // y un uso normal de la app, el contador prácticamente nunca llegaba al final.
  // La ref deja que el intervalo viva de verdad 30 minutos y que igual lea el
  // log actualizado en cada chequeo.
  const logRef = useRef(log);
  useEffect(() => {
    logRef.current = log;
  }, [log]);

  useEffect(() => {
    if (!remindersEnabled || !isToday) return;
    const check = () => {
      const msg = buildReminderMessage(logRef.current);
      if (msg) notifyInBackground(msg);
    };
    const id = setInterval(check, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [remindersEnabled, isToday]);

  // Cargar el registro correspondiente al día seleccionado cada vez que cambia.
  // `logDateKey` viaja con el log en el MISMO commit: es lo que le permite al
  // efecto de abajo saber a qué día pertenece de verdad lo que tiene en la mano.
  useEffect(() => {
    try {
      const storedLog = localStorage.getItem(`nutri_log_${dateKey}`);
      setLog(storedLog ? JSON.parse(storedLog) : emptyLog());
    } catch (e) {
      setLog(emptyLog());
    }
    setLogDateKey(dateKey);
  }, [dateKey]);

  // Persistir el registro del día que está actualmente seleccionado.
  //
  // La condición compara el día del LOG contra el día seleccionado. Antes se
  // comparaba contra una ref que el efecto de carga actualizaba justo arriba, y
  // eso no protegía nada: los dos efectos corren en el mismo commit y en orden
  // de declaración, así que al cambiar de día pasaba esto:
  //
  //   1. Cambia `dateKey` (navegás a otro día, o cruza la medianoche).
  //   2. Corre el efecto de carga: pide el log nuevo y pone la ref en el día
  //      nuevo. El `setLog` todavía no se aplicó — sigue pendiente.
  //   3. Corre este efecto: la ref YA dice el día nuevo, así que pasa el
  //      chequeo... y escribe el `log` de su clausura, que es el del día VIEJO,
  //      bajo la clave del día nuevo.
  //
  // Un tick después el re-render lo pisaba con el valor correcto, así que en
  // condiciones normales no se veía. Pero durante esa ventana el dato estaba mal
  // en disco: cualquier lectura ajena (la racha de DailyRings, que lee
  // localStorage directo) se llevaba el valor corrupto y se quedaba con él, y si
  // la app moría ahí —en iPhone, deslizarla apenas cambiado el día— la comida
  // duplicada quedaba escrita para siempre.
  //
  // Con `logDateKey` no hay carrera posible: se setea junto al log, en el mismo
  // commit, así que el par (log, día) siempre es coherente.
  useEffect(() => {
    if (!loaded) return;
    if (logDateKey !== dateKey) return; // el log en memoria es todavía de otro día
    try {
      localStorage.setItem(`nutri_log_${dateKey}`, JSON.stringify(log));
    } catch (e) {
      // almacenamiento no disponible, se continúa sin persistir
    }
  }, [log, logDateKey, dateKey, loaded]);

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

  // Si se desactiva el módulo de la pestaña actual, volver a Mi Día. Va por
  // goToTab para que el deslizamiento salga hacia atrás, que es el sentido real
  // del movimiento (Mi Día está a la izquierda de ambos módulos en la barra).
  useEffect(() => {
    if (activeTab === 'entreno' && !modules.entreno) goToTab('dia');
    if (activeTab === 'sueno' && !modules.sueno) goToTab('dia');
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
  // `kcal` se guarda con el valor del ítem de origen (ver kcalOf): lo que queda
  // en localStorage es lo mismo que muestra el contador, y lo que el usuario
  // cargó llega intacto hasta el registro.
  const buildEntry = (item) => ({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: item.name,
    kcal: Math.round(kcalOf(item)),
    p: item.p,
    c: item.c,
    f: item.f,
    ...(item.alc ? { alc: item.alc } : {}),
    time: nowHM(),
  });

  const addPlanMeal = (item) => {
    const entry = buildEntry(item);
    setLog((prev) => ({ ...prev, planMeals: [...prev.planMeals, entry] }));
    const entered = celebrateIfEnteringRange(totals.kcal + kcalOf(item));
    flashConfirm(entered ? '¡Entraste en tu rango de hoy! 🎯' : 'Comida agregada a tu registro ✓');
  };

  const addFreeMeal = (item) => {
    const entry = buildEntry(item);
    setLog((prev) => ({ ...prev, freeMeals: [...prev.freeMeals, entry] }));
    const entered = celebrateIfEnteringRange(totals.kcal + kcalOf(item));
    flashConfirm(entered ? '¡Entraste en tu rango de hoy! 🎯' : 'Registrado fuera de plan, ¡disfrutalo con calma!');
  };

  // Pide la cantidad antes de registrar (buscador y catálogos). Los frecuentes no
  // pasan por acá: agregan ×1 directo para no perder el camino de un toque.
  const askQuantity = (food, mode) => setPendingFood({ food, mode });

  // Escaneo: cierra la cámara y, si el producto existe en Open Food Facts, pasa
  // directo a elegir cantidad. Si no está cargado, lo dice y deja seguir a mano.
  const handleBarcode = async (code) => {
    setScanning(false);
    try {
      const food = await getProductByBarcode(code);
      if (food) setPendingFood({ food, mode: registerMode });
      else flashConfirm('Ese producto no está en Open Food Facts. Cargalo a mano.');
    } catch (e) {
      flashConfirm('No pudimos consultar el producto (sin conexión).');
    }
  };

  const confirmQuantity = (qty) => {
    if (!pendingFood) return;
    const scaled = scaleFood(pendingFood.food, qty);
    if (pendingFood.mode === 'plan') addPlanMeal(scaled);
    else addFreeMeal(scaled);
    setPendingFood(null);
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
    const macros = {
      p: parseFloat(editP) || 0,
      c: parseFloat(editC) || 0,
      f: parseFloat(editF) || 0,
    };
    // Alcanza con el nombre y CON QUE HAYA ALGO: macros o calorías. Antes se
    // exigía `kcal > 0`, y eso dejaba encerrada a una comida que hubiera
    // quedado en 0: al abrirla, el campo venía en 0 y guardar no hacía nada,
    // así que no había forma de completarle los macros desde la UI.
    const tieneAlgo = kcalNum > 0 || hasMacros(macros);
    if (!editName.trim() || !tieneAlgo) return;
    const updated = {
      id: editingEntry.id,
      time: editingEntry.time,
      name: editName.trim(),
      // Manda lo que se tipeó en el campo de calorías. Antes se descartaba
      // cuando había macros y se guardaba el derivado: cargabas 400 y la fila
      // aparecía con 358, sin ninguna señal de que la app hubiera cambiado el
      // número. Si el campo quedó vacío o en 0 se deriva de los macros, que ahí
      // sí son el único dato.
      kcal: kcalNum > 0 ? kcalNum : Math.round(kcalFromMacros(macros)),
      ...macros,
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

  // El timeout se guarda y se cancela: sin eso, registrar dos comidas seguidas
  // dejaba viva la cuenta regresiva de la primera, que borraba el mensaje de la
  // segunda a mitad de camino. Cuanto más rápido cargabas, menos duraba el
  // aviso —justo al revés de lo que hace falta—.
  const confirmTimeoutRef = useRef(null);
  const flashConfirm = (text) => {
    setConfirmMsg(text);
    clearTimeout(confirmTimeoutRef.current);
    confirmTimeoutRef.current = setTimeout(() => setConfirmMsg(''), 2200);
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

    // Recordatorio activo: nudge visible al abrir la app (funciona también en
    // iPhone, donde las notificaciones en segundo plano no están disponibles sin
    // push server).
    //
    // Acá había un `&& hasAny` que volvía inalcanzable el aviso más importante.
    // `buildReminderMessage` produce "todavía no registraste ninguna comida hoy"
    // SOLO cuando no hay comidas, y la condición pedía que las hubiera: las dos
    // ramas eran mutuamente excluyentes. Resultado: el día que te olvidabas de
    // registrar por completo —justo cuando el recordatorio sirve— no aparecía
    // nada. Con comidas cargadas el gate no cambiaba el resultado, por eso pasó
    // desapercibido.
    const reminderText =
      remindersEnabled && isToday
        ? buildReminderMessage(log, new Date(), { includeWater: false })
        : null;

    // El mensaje de día vacío se omite si el recordatorio ya está diciendo lo
    // mismo: sin esto, un día sin registrar mostraba dos avisos encimados.
    if (!hasAny && !reminderText) {
      msgs.push({ type: 'neutral', text: motivation.empty });
    }

    if (reminderText) msgs.unshift({ type: 'reminder', text: reminderText });
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
          // Derivado de macros igual que el contador de Mi Día, para que el
          // gráfico semanal y la racha midan exactamente lo mismo que la
          // pantalla de hoy. Los días viejos se recalculan solos al leerlos.
          kcal = all.reduce((s, m) => s + kcalOf(m), 0);
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
    // `todayKey` está en las dependencias porque la ventana de 7 días se cuenta
    // hacia atrás desde hoy: al cruzar la medianoche el gráfico y la racha se
    // corren un día, aunque el log no haya cambiado.
  }, [log, loaded, todayKey]);

  // Racha de días consecutivos (terminando hoy) dentro del rango de calorías
  const streak = useMemo(
    () => computeStreak(weekStats, goals.calories, TOLERANCE.calories),
    [weekStats, goals]
  );

  const weeklyFreeCount = useMemo(
    () => weekStats.reduce((sum, d) => sum + d.freeCount, 0),
    [weekStats]
  );

  // Pestañas visibles de la barra inferior. Se arma como lista (y no como JSX
  // suelto) porque el indicador deslizante necesita saber cuántos slots hay y en
  // cuál está parado; sueño y entreno pueden estar apagados desde Ajustes.
  const navTabs = useMemo(
    () =>
      [
        { id: 'dia', icon: Home, label: 'Mi Día' },
        { id: 'registrar', icon: PlusCircle, label: 'Registrar' },
        modules.sueno && {
          id: 'sueno',
          icon: MoonStar,
          label: 'Sueño',
          activeColorClass: 'text-sueno-200',
          indicatorClass: 'bg-sueno-500/25',
        },
        modules.entreno && {
          id: 'entreno',
          icon: Dumbbell,
          label: 'Entreno',
          activeColorClass: 'text-entreno-200',
          indicatorClass: 'bg-entreno-500/25',
        },
        { id: 'progreso', icon: TrendingUp, label: 'Progreso' },
      ].filter(Boolean),
    [modules]
  );

  const activeNavIndex = Math.max(0, navTabs.findIndex((t) => t.id === activeTab));

  // Con el teclado abierto la barra se esconde: en iOS no hay forma confiable de
  // mantenerla en su lugar durante el scroll (ver src/lib/viewport.js), y encima
  // mientras escribís no sirve para nada y te come pantalla.
  const keyboardOpen = useKeyboardOpen();

  // ---------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------

  return (
    <div className="min-h-screen w-full bg-slate-900 text-slate-100 flex justify-center">
      <div className="w-full max-w-md flex flex-col min-h-screen relative">
        <Confetti active={celebrate} />
        {/* HEADER */}
        {/* El header queda pegado arriba con el mismo material que la barra de
            abajo: las dos piezas de chrome son de vidrio y el contenido pasa por
            detrás de ambas. Antes se iba con el scroll y en las pantallas largas
            —Progreso, la semana de Entreno— perdías de vista en qué sección
            estabas. El desenfoque se difumina hacia abajo (ver .app-header en
            index.css) para que no aparezca una línea dura a media pantalla. */}
        {/* Con el teclado abierto deja de estar pegado, por la misma razón por la
            que la barra de abajo se esconde: iOS despega los elementos anclados
            —fixed y sticky— mientras acomoda el foco, y los reubica por su
            cuenta a media pantalla (ver el historial en src/lib/viewport.js).
            Soltar el anclaje evita eso y de paso libera pantalla para los
            resultados del buscador.

            Es `position: static` y no `display: none`: el header sigue ocupando
            su lugar en el flujo, así que soltarlo NO cambia el alto del
            documento. Esa distinción importa —cualquier cambio de altura acá
            dispara el mismo clampeo de scroll que rompía el buscador, ver el
            comentario del `main` más abajo—. */}
        <header
          className={`app-header px-5 pb-4 flex items-center justify-between ${
            keyboardOpen ? 'app-header-unpinned' : ''
          }`}
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {!isStandalone && (
              <button
                onClick={() => setShowInstallGuide(true)}
                aria-label="Instalar la app en tu iPhone"
                className="btn-icon bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors shrink-0"
              >
                <Download className="w-5 h-5 text-slate-300" />
              </button>
            )}
            <div className="min-w-0">
              {/* El eyebrow lleva el acento del módulo: es la señal de color más
                  barata para ubicarte, sin teñir la pantalla entera. */}
              <p
                className={`text-xs uppercase tracking-widest font-semibold truncate ${
                  activeTab === 'entreno'
                    ? 'text-entreno-400'
                    : activeTab === 'sueno'
                    ? 'text-sueno-400'
                    : 'text-slate-500'
                }`}
              >
                {activeTab === 'entreno' ? 'Seguimiento semanal' : activeTab === 'sueno' ? 'Sueño y recuperación' : formatDisplayDate(selectedDate)}
              </p>
              {/* Título en blanco sólido, no en degradado de color. El degradado
                  hacía que el nombre de la pantalla compitiera con el dato
                  principal; el acento se reserva para los números. */}
              <h1 className="text-2xl font-semibold tracking-tight text-slate-100 truncate">
                {activeTab === 'entreno' ? 'Mis Entrenamientos' : activeTab === 'sueno' ? 'Mi Descanso' : 'Mi Plan Nutricional'}
              </h1>
            </div>
          </div>
          {activeTab !== 'entreno' && activeTab !== 'sueno' && (
            <button
              onClick={openSettings}
              aria-label="Ajustes del plan"
              className="btn-icon bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors"
            >
              <Settings className="w-5 h-5 text-slate-300" />
            </button>
          )}
        </header>

        {/* CONFIRMACIÓN FLOTANTE
            Entrada de una sola vez en vez de `animate-pulse`: el pulso de
            Tailwind late para siempre —un "guardado" resuelto no debería seguir
            pidiendo atención— y además ignora prefers-reduced-motion, que el
            resto de las animaciones de la app sí respeta. */}
        {confirmMsg && (
          <div className="mx-5 mb-2 -mt-1 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2 anim-fade-in-up">
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
              className="text-emerald-400 font-semibold shrink-0 rounded px-1"
            >
              Deshacer
            </button>
          </div>
        )}

        {/* CONTENIDO */}
        {/* EL COLCHÓN DE ABAJO ES CONSTANTE, Y NO PUEDE DEJAR DE SERLO.
            Antes valía `pb-6` con el teclado abierto y `pb-32` con el teclado
            cerrado, para recuperar altura para los resultados. Eso rompía el
            buscador en iPhone:

              1. Tocás el buscador, que está bien abajo de la pestaña Registrar.
              2. iOS scrollea para dejar el campo por encima del teclado.
              3. React re-renderiza con `pb-6` y el documento se acorta ~104px.
              4. El navegador tiene que clampear el scroll al nuevo máximo, el
                 contenido baja esos 104px y el campo termina JUSTO DEBAJO del
                 teclado, fuera de la vista.

            El paso 3 pelea contra el paso 2, y siempre gana el 3 porque llega
            después. La altura que se "recuperaba" además nunca se veía: queda
            abajo del teclado. Cambiar el alto del documento mientras iOS está
            acomodando el foco es la trampa; el colchón se queda fijo.

            SIN `overflow-y-auto`, y esto es la otra mitad del arreglo. Con él,
            quién scrollea dependía de cuánto contenido hubiera: `flex-1` dentro
            de un contenedor `min-h-screen` le da a `main` una altura definida,
            así que con poco contenido `main` era su propio contenedor de scroll
            (medido: 727px, recortando), y con muchos resultados crecía y pasaba
            a scrollear la ventana. Dos modelos de scroll distintos según los
            resultados de la búsqueda.

            En iPhone eso es peor de lo que suena: cuando el que scrollea es
            `main`, su altura sale de `100vh`, que NO se achica con el teclado
            abierto. Su área visible sigue metiéndose por debajo del teclado, y
            scrollear dentro de `main` nunca logra subir el campo lo suficiente.
            Encima el `window.scrollTo` de `goToTab` no tocaba ese scroll.

            Nada del código scrollea `main` —el único scroll manejado a mano es
            `window.scrollTo`—, así que sacarlo no rompe nada y deja un solo
            modelo: scrollea siempre la ventana. */}
        <main className="flex-1 px-5 pb-32">
          {/* La `key` fuerza el remontaje al cambiar de pestaña, que es lo que
              dispara la animación de entrada. No cambia el comportamiento: cada
              pestaña ya se desmontaba al salir (render condicional). */}
          {/* `module-entreno` / `module-sueno` solo rebindean --focus-ring (ver
              index.css): el foco toma el acento del módulo en el que estás sin
              que ningún botón tenga que declararlo. Va acá y no en la raíz de
              cada módulo porque la variable se hereda por el árbol, así que un
              solo punto cubre también las vistas a pantalla completa. */}
          <div
            key={activeTab}
            className={`space-y-5 ${tabDir === 'forward' ? 'anim-tab-forward' : 'anim-tab-back'} ${
              activeTab === 'entreno' ? 'module-entreno' : activeTab === 'sueno' ? 'module-sueno' : ''
            }`}
          >
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
              onRegister={() => goToTab('registrar')}
              quietStart={isFreshStart}
              habitStrip={isToday ? <DailyRings log={log} modules={modules} /> : null}
              moduleCards={isToday ? <TodayDashboard onGoToTab={goToTab} modules={modules} /> : null}
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
              askQuantity={askQuantity}
              onScan={() => setScanning(true)}
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

          {/* El fallback lleva el acento del módulo (el árbol ya está dentro de
              `module-entreno`/`module-sueno` por la key de arriba). Es un flash
              breve solo la primera vez que se abre la pestaña; después el chunk
              queda en caché y la carga es instantánea. */}
          {activeTab === 'entreno' && modules.entreno && (
            <Suspense fallback={<ModuleLoading accentClass="text-entreno-400" />}>
              <WorkoutModule />
            </Suspense>
          )}

          {activeTab === 'sueno' && modules.sueno && (
            <Suspense fallback={<ModuleLoading accentClass="text-sueno-400" />}>
              <SleepModule />
            </Suspense>
          )}
          </div>
        </main>

        {/* NAV INFERIOR — flotante: despegada del borde y con todas las esquinas
            redondeadas, así se lee como un control encima del contenido y no como
            un pie pegado a la pantalla. El safe-area va en el contenedor externo
            para que el separado del borde sea el mismo en iPhone con y sin notch. */}
        <nav
          className={`fixed bottom-0 inset-x-0 z-30 flex justify-center px-4 pointer-events-none transition-opacity duration-200 motion-reduce:transition-none ${
            keyboardOpen ? 'opacity-0' : 'opacity-100'
          }`}
          // Se oculta con opacidad y no desmontando: aunque iOS reubique el
          // elemento fijo durante el scroll, invisible es invisible. El
          // pointer-events-none de la pastilla interna evita toques fantasma.
          aria-hidden={keyboardOpen || undefined}
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
        >
          {/* Cápsula, no rectángulo redondeado: es la forma del tab bar flotante
              de iOS y a esta transparencia importa, porque el canto curvo
              continuo es donde más se nota la refracción del borde. */}
          <div
            className={`relative w-full max-w-md rounded-full nav-floating px-2 py-2 flex ${
              keyboardOpen ? 'pointer-events-none' : 'pointer-events-auto'
            }`}
          >
            {/* Indicador deslizante. Es UN solo elemento que se desplaza al tab
                activo, en vez de una pastilla por botón que aparece y desaparece:
                así el cambio de sección se ve como un movimiento continuo. Los
                slots son todos del mismo ancho (flex-1), por eso alcanza con
                correrlo un múltiplo de su propio ancho.

                Va partido en dos elementos porque son dos movimientos que tienen
                que convivir sin pisarse: el carril de afuera TRASLADA (con
                `transition`, que necesita que el elemento persista entre
                cambios) y la pastilla de adentro se DEFORMA (con `animation`,
                que necesita remontarse para volver a dispararse). En un solo
                elemento, la `transition` y la `animation` compiten por la misma
                propiedad `transform` y gana la animación: la pastilla se
                deformaría en el lugar sin llegar a viajar. */}
            <span
              aria-hidden="true"
              className="nav-indicator-track absolute top-2 bottom-2 left-2 motion-reduce:transition-none"
              style={{
                width: `calc((100% - 1rem) / ${navTabs.length})`,
                transform: `translateX(${activeNavIndex * 100}%)`,
              }}
            >
              <span
                key={activeNavIndex}
                className={`nav-indicator anim-nav-liquid block h-full w-full rounded-full ${
                  navTabs[activeNavIndex]?.indicatorClass ?? 'bg-emerald-500/20'
                }`}
              />
            </span>
            {navTabs.map((t) => (
              <NavButton
                key={t.id}
                icon={t.icon}
                label={t.label}
                active={activeTab === t.id}
                onClick={() => goToTab(t.id)}
                activeColorClass={t.activeColorClass}
              />
            ))}
          </div>
        </nav>

        {/* ESCÁNER DE CÓDIGO DE BARRAS */}
        {scanning && <BarcodeScanner onDetected={handleBarcode} onCancel={() => setScanning(false)} />}

        {/* HOJA DE CANTIDAD (al agregar desde el buscador o los catálogos) */}
        {pendingFood && (
          <QuantitySheet
            food={pendingFood.food}
            mode={pendingFood.mode}
            onConfirm={confirmQuantity}
            onCancel={() => setPendingFood(null)}
          />
        )}

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
    <div className="flex items-center justify-between rounded-2xl surface px-3 py-2.5">
      <button
        onClick={onPrev}
        aria-label="Ver día anterior"
        className="btn-icon hover:bg-slate-700"
      >
        <ChevronLeft className="w-4 h-4 text-slate-300" />
      </button>
      <div className="text-center min-w-[120px]">
        <p className="text-sm font-semibold text-slate-200">{label}</p>
        {!isToday && (
          <button
            onClick={onToday}
            className="text-[11px] text-emerald-400 font-semibold mt-0.5 rounded"
          >
            Volver a hoy
          </button>
        )}
      </div>
      <button
        onClick={onNext}
        disabled={isToday}
        aria-label="Ver día siguiente"
        className={`btn-icon ${
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
  activeColorClass = 'text-emerald-300',
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      // Las pestañas inactivas subieron dos escalones (300, no el 500 original)
      // a medida que la barra se fue transparentando: el relleno bajó del 92% al
      // 22%, así que el fondo de la etiqueta ya no es un color fijo sino lo que
      // pase por debajo. El caso que manda es el CTA verde justo debajo de la
      // barra, que es la superficie más clara y más grande que puede aparecer
      // ahí: con ink-400 quedaba en 3.4:1 y con ink-300 llega a 4.6:1. En el
      // caso normal —fondo oscuro— da 8.2:1.
      //
      // Que la inactiva sea casi tan clara como la activa no rompe la jerarquía:
      // la activa se distingue por color de módulo, por la cápsula que lleva
      // debajo y porque su ícono está escalado (ver .nav-icon en index.css).
      className={`nav-btn relative flex-1 flex flex-col items-center gap-1 py-1.5 rounded-full transition-colors duration-200 ${
        active ? activeColorClass : 'text-slate-300 hover:text-slate-100'
      }`}
    >
      {/* El fondo activo ya no vive acá: lo dibuja el indicador deslizante del
          contenedor, que se mueve entre pestañas en vez de aparecer y desaparecer. */}
      <Icon className="nav-icon w-5 h-5" />
      <span className={`nav-label text-[11px] leading-none transition-all duration-200 ${active ? 'font-semibold' : 'font-medium'}`}>
        {label}
      </span>
    </button>
  );
}

// Fallback mientras se descarga el chunk de un módulo opcional (React.lazy).
// Ocupa alto para que la pantalla no salte cuando llega el contenido real.
function ModuleLoading({ accentClass = 'text-slate-400' }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3" role="status" aria-live="polite">
      <Loader2 className={`w-6 h-6 animate-spin ${accentClass}`} />
      <p className="text-xs text-slate-500">Cargando…</p>
    </div>
  );
}

function FeedbackBanner({ feedback }) {
  const [expanded, setExpanded] = useState(false);

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

  if (feedback.length === 0) return null;

  // Antes se apilaban los 3-4 consejos a la vez: ocupaban media pantalla, todos
  // con el mismo peso visual, y competían con el anillo. Ahora se muestra solo
  // el primero (el de mayor prioridad, que es como los arma el useMemo) y el
  // resto queda detrás de un toggle discreto. Mismo contenido, una sola cosa
  // que leer al abrir la app.
  const [primary, ...rest] = feedback;
  const Banner = ({ f, style }) => {
    const s = styleFor(f.type);
    const Icon = s.icon;
    return (
      <div className={`rounded-2xl border px-4 py-3 flex items-start gap-3 ${s.wrap}`} style={style}>
        <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${s.iconClass}`} />
        <p className="text-sm text-slate-200 leading-snug">{f.text}</p>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <Banner f={primary} />

      {rest.length > 0 && (
        <>
          {expanded &&
            rest.map((f, i) => (
              // Cascada al desplegar: cada uno entra 60ms después del anterior.
              // Que aparezcan de a uno es justamente lo que faltaba antes.
              <div key={i} className="anim-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                <Banner f={f} />
              </div>
            ))}

          <button
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="w-full min-h-11 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-300 rounded-xl transition-colors"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
            />
            {expanded ? 'Ocultar' : `${rest.length} consejo${rest.length === 1 ? '' : 's'} más`}
          </button>
        </>
      )}
    </div>
  );
}

// Confeti breve al entrar en el rango de calorías. Estalla en abanico desde la
// zona del anillo y se desvanece; puramente decorativo (aria-hidden).
const CONFETTI_COLORS = celebrationColors;

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
  const kcalColor = ring.overshoot ? theme.warn : theme.accentBright;
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

  // Progreso de cada macro contra su meta. La tira anterior solo mostraba la
  // proporción entre macros (normalizada), así que se llenaba igual comieras
  // 20g o 200g de proteína: no dejaba ver si ibas acorde a la dieta.
  const macros = [
    { key: 'p', label: 'Proteína', color: macroColors.protein, value: totals.p, goal: goals.protein, tol: TOLERANCE.protein },
    { key: 'c', label: 'Carbos', color: macroColors.carbs, value: totals.c, goal: goals.carbs, tol: TOLERANCE.carbs },
    { key: 'f', label: 'Grasa', color: macroColors.fat, value: totals.f, goal: goals.fat, tol: TOLERANCE.fat },
  ];

  // Listado general único: todas las comidas del día juntas, sin clasificación por momento
  const allEntries = [
    ...log.planMeals.map((m) => ({ ...m, kind: 'plan' })),
    ...log.freeMeals.map((m) => ({ ...m, kind: 'free' })),
  ].sort((a, b) => (a.time > b.time ? 1 : -1));

  return (
    <div className="space-y-4">
      {/* HÉROE: anillo de calorías + acción principal */}
      <div className="rounded-3xl surface p-5 flex flex-col items-center">
        <svg width={ring.size} height={ring.size} viewBox={`0 0 ${ring.size} ${ring.size}`}>
          {/* track exterior */}
          <circle
            cx={ring.center}
            cy={ring.center}
            r={ring.rOuter}
            fill="none"
            stroke={theme.track}
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
          {/* El número héroe iba en monoespaciada del sistema, que es lo que le
              daba aspecto de terminal. Inter con cifras tabulares mantiene el
              ancho fijo mientras cuenta, sin cambiar de tipografía. */}
          <text
            x={ring.center}
            y={ring.center - 2}
            textAnchor="middle"
            className="fill-slate-100"
            style={{ fontSize: 38, fontWeight: 680, letterSpacing: '-0.035em', fontVariantNumeric: 'tabular-nums' }}
          >
            {Math.round(animatedKcal)}
          </text>
          <text
            x={ring.center}
            y={ring.center + 22}
            textAnchor="middle"
            className="fill-slate-500"
            style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.01em' }}
          >
            de {Math.round(goals.calories)} kcal
          </text>
        </svg>
        <p className={`mt-1 text-xs font-semibold ${ring.overshoot ? 'text-amber-400' : 'text-emerald-400'}`}>{statusText}</p>

        {/* Progreso por macro contra su meta (se omite en arranque calmo, donde
            todo estaría en cero) */}
        {!quietStart && (
          <div className="w-full mt-4 grid grid-cols-3 gap-3">
            {macros.map(({ key, ...m }) => (
              <MacroProgress key={key} {...m} />
            ))}
          </div>
        )}

        {/* Acción principal: el corazón de la dinámica diaria */}
        <button
          onClick={onRegister}
          className="w-full mt-4 flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold py-3 transition-colors"
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

          {/* AGUA (compacta)
              Iba en clases `cyan-*`, pero `cyan` está aliaseado a grafito en
              tailwind.config.js: renderizaba gris, no celeste. El gris es la
              decisión correcta (un solo acento en la app), así que acá se
              nombra como lo que es —`ink`— en vez de mentir en el nombre.
              La excepción es el "+": es la acción de la fila y era lo único
              gris sobre gris, indistinguible de un control deshabilitado. */}
          <div className="rounded-2xl surface px-4 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Droplets className="w-5 h-5 text-ink-300 shrink-0" />
              <span className="text-sm font-semibold text-slate-200">Agua</span>
              <span className="font-mono text-xs text-ink-400 truncate">
                {waterGlasses}/{waterGoalGlasses} vasos
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => addWater(-1)}
                aria-label="Quitar un vaso de agua"
                className="btn-icon bg-slate-700 hover:bg-slate-600 transition-colors"
              >
                <Minus className="w-4 h-4 text-slate-200" />
              </button>
              <span className="font-mono text-sm text-slate-200 w-16 text-center">{log.water} ml</span>
              <button
                onClick={() => addWater(1)}
                aria-label="Agregar un vaso de agua"
                className="btn-icon bg-brand-500/20 border border-brand-400/40 hover:bg-brand-500/30 transition-colors"
              >
                <Plus className="w-4 h-4 text-brand-300" />
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
        <h2 className="label-section mb-2">Registro del día</h2>
        {allEntries.length === 0 ? (
          <button
            onClick={onRegister}
            className="w-full rounded-2xl border border-dashed border-slate-700 p-6 text-center hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-colors"
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
                className={`rounded-2xl meal-row py-3 pl-4 pr-3 flex items-center justify-between gap-3 ${
                  entry.kind === 'plan' ? 'meal-row-plan' : 'meal-row-free'
                } ${removingId === entry.id ? 'anim-meal-out' : 'anim-meal-in'}`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {/* La clasificación ya la lleva el filete lateral de .meal-row,
                        así que acá alcanza con la etiqueta en color: la píldora
                        rellena duplicaba la señal y sumaba una tercera forma con
                        fondo a una fila que ya tiene nombre, hora y macros. */}
                    <span className={`label-section ${entry.kind === 'plan' ? 'text-brand-400' : 'text-amber-400'}`}>
                      {entry.kind === 'plan' ? 'Plan oficial' : 'Fuera de plan'}
                    </span>
                    <span className="text-[11px] text-slate-500">{entry.time}</span>
                  </div>
                  <p className="text-sm text-slate-200 truncate mt-0.5">{entry.name}</p>
                  {/* El alcohol solo se muestra cuando existe (3 ítems del
                      catálogo). Sin él la fila de una cerveza dice "205 kcal ·
                      P 2 · C 17 · G 0", que a ojo no cierra: las 129 kcal que
                      faltan son etanol y no viven en ningún macro. */}
                  {/* Los `|| 0` no son decorativos: una comida vieja puede no
                      tener la clave del macro (no es 0, no existe), y round1()
                      de undefined imprimía "P NaNg". */}
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {Math.round(kcalOf(entry))} kcal · P {round1(entry.p || 0)}g · C{' '}
                    {round1(entry.c || 0)}g · G {round1(entry.f || 0)}g
                    {entry.alc ? ` · Alc ${round1(entry.alc)}g` : ''}
                  </p>
                  {/* Comida cargada sin macros: sus calorías cuentan igual (son
                      el valor que se tipeó, ver kcalOf) pero no aportan a las
                      barras de proteína/carbos/grasa, así que el día se lee
                      incompleto. Se avisa acá para poder completarla en vez de
                      dejarla en silencio. */}
                  {!hasMacros(entry) && (
                    <button
                      onClick={() => onEdit(entry, entry.kind === 'plan')}
                      className="mt-1 flex items-center gap-1 text-left text-[11px] text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      Faltan macros · completar
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onEdit(entry, entry.kind === 'plan')}
                    aria-label="Editar comida"
                    className="btn-icon hover:bg-slate-700"
                  >
                    <Pencil className="w-4 h-4 text-slate-500" />
                  </button>
                  <button
                    onClick={() => handleRemove(entry.id, entry.kind === 'plan')}
                    aria-label="Eliminar registro"
                    className="btn-icon hover:bg-slate-700"
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

// Un macro contra su meta: gramos consumidos, objetivo y qué tan cerca estás.
// La barra se llena respecto de la meta (no respecto de los otros macros), que
// es lo que deja ver si vas acorde a la dieta. Si te pasás del margen, el número
// se pone ámbar igual que el anillo de calorías; si estás dentro del rango, verde.
function MacroProgress({ label, color, value = 0, goal = 0, tol = 0 }) {
  const grams = Math.round(value);
  const target = Math.round(goal);
  const pct = goal > 0 ? Math.min(value / goal, 1) : 0;
  const over = goal > 0 && value > goal + tol;
  const inRange = goal > 0 && Math.abs(value - goal) <= tol;

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-[11px] text-slate-400 truncate">{label}</span>
      </div>
      <p className="mt-1 font-mono text-xs">
        <span className={over ? 'text-amber-400 font-semibold' : inRange ? 'text-emerald-400 font-semibold' : 'text-slate-200'}>
          {grams}
        </span>
        <span className="text-slate-500">/{target}g</span>
      </p>
      <div
        className="mt-1 h-1.5 rounded-full bg-slate-700 overflow-hidden"
        role="progressbar"
        aria-label={label}
        aria-valuenow={grams}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuetext={`${grams} de ${target} gramos`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct * 100}%`, backgroundColor: over ? theme.warn : color }}
        />
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
  askQuantity,
  onScan,
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

  // Resultados de Open Food Facts. Van aparte de los locales a propósito: los
  // locales son instantáneos y curados, así que se muestran primero y nunca
  // quedan esperando a la red. 'idle' | 'loading' | 'done' | 'offline'
  const [offResults, setOffResults] = useState([]);
  const [offState, setOffState] = useState('idle');

  useEffect(() => {
    const q = foodQuery.trim();
    if (q.length < 2) {
      setOffResults([]);
      setOffState('idle');
      return undefined;
    }

    const ctrl = new AbortController();
    // Debounce: no dispara una request por cada tecla.
    const timer = setTimeout(() => {
      setOffState('loading');
      searchProducts(q, { signal: ctrl.signal })
        .then((foods) => {
          setOffResults(foods);
          setOffState('done');
        })
        .catch((err) => {
          if (err.name === 'AbortError') return; // búsqueda reemplazada, no es un fallo
          setOffResults([]);
          setOffState('offline');
        });
    }, 350);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [foodQuery]);

  // Desde el buscador se elige cantidad; el query se limpia al confirmar (o al
  // cancelar queda la búsqueda, que es lo esperable si te equivocaste de ítem).
  const pickFood = (food) => {
    askQuantity({ name: food.name, kcal: food.kcal, p: food.p, c: food.c, f: food.f, basis: food.basis }, registerMode);
    setFoodQuery('');
  };

  // Los frecuentes agregan ×1 al instante: es el camino repetitivo y rápido.
  const addFrequent = (food) => {
    const item = { name: food.name, kcal: food.kcal, p: food.p, c: food.c, f: food.f };
    if (registerMode === 'plan') addPlanMeal(item);
    else addFreeMeal(item);
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
          <p className="label-section text-slate-500 mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Frecuentes
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {frequents.map((food) => (
              <button
                key={food.name}
                onClick={() => addFrequent(food)}
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
        <div className="flex gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={foodQuery}
              onChange={(e) => setFoodQuery(e.target.value)}
              placeholder="Buscar alimento (banana, milanesa, arroz...)"
              className="w-full surface rounded-2xl pl-9 pr-3 py-3 text-sm text-slate-100 placeholder-slate-500"
            />
          </div>
          {/* Escanear el paquete evita tipear los macros de un producto envasado */}
          <button
            onClick={onScan}
            aria-label="Escanear código de barras"
            className="shrink-0 px-3.5 rounded-2xl surface hover:border-emerald-500/50 transition-colors"
          >
            <ScanLine className="w-5 h-5 text-slate-300" />
          </button>
        </div>
        {foodQuery.trim().length >= 2 && (
          <div className="mt-2 space-y-1.5">
            {foodResults.map((food) => (
              <button
                key={food.id}
                onClick={() => pickFood(food)}
                className={`w-full text-left rounded-xl surface px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                  registerMode === 'plan' ? 'hover:border-emerald-500/50' : 'hover:border-amber-500/50'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm text-slate-200 truncate">{food.name}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {Math.round(kcalOf(food))} kcal · P {food.p}g · C {food.c}g · G {food.f}g
                  </p>
                </div>
                <PlusCircle
                  className={`w-5 h-5 shrink-0 ${registerMode === 'plan' ? 'text-emerald-400' : 'text-amber-400'}`}
                />
              </button>
            ))}
            {foodResults.length === 0 && offState !== 'loading' && offResults.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-2">
                Sin resultados. Podés cargarlo manualmente más abajo.
              </p>
            )}

            {/* PRODUCTOS ENVASADOS (Open Food Facts). Aparecen debajo de los
                locales: son más lentos y menos curados, pero cubren lo que la
                base local no tiene, que es justo lo que obligaba a buscar afuera. */}
            {offState === 'loading' && (
              <p className="text-xs text-slate-500 text-center py-2 flex items-center justify-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Buscando productos envasados…
              </p>
            )}

            {offState === 'offline' && (
              <p className="text-xs text-slate-500 text-center py-2">
                No se pudo buscar productos envasados (sin conexión).
              </p>
            )}

            {offResults.length > 0 && (
              <>
                <p className="label-section text-slate-500 pt-2 flex items-center gap-1.5">
                  <Barcode className="w-3.5 h-3.5" /> Productos envasados
                </p>
                {offResults.map((food) => (
                  <button
                    key={food.id}
                    onClick={() => pickFood(food)}
                    className={`w-full text-left rounded-xl surface px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                      registerMode === 'plan' ? 'hover:border-emerald-500/50' : 'hover:border-amber-500/50'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-slate-200 truncate">{food.name}</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {Math.round(kcalOf(food))} kcal · P {food.p}g · C {food.c}g · G {food.f}g
                        <span className="text-slate-600"> · por 100g</span>
                      </p>
                    </div>
                    <PlusCircle
                      className={`w-5 h-5 shrink-0 ${registerMode === 'plan' ? 'text-emerald-400' : 'text-amber-400'}`}
                    />
                  </button>
                ))}
              </>
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
                className="rounded-2xl surface flex items-center gap-1 pr-1 hover:border-emerald-500/50 transition-colors"
              >
                <button
                  onClick={() => askQuantity(item, 'plan')}
                  className="flex-1 min-w-0 text-left p-4 flex items-center justify-between gap-3 rounded-2xl"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200">{item.name}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {Math.round(kcalOf(item))} kcal · P {item.p}g · C {item.c}g · G {item.f}g
                    </p>
                  </div>
                  <PlusCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                </button>
                <button
                  onClick={() => onEditCatalogItem(item)}
                  aria-label="Editar esta opción del plan"
                  className="btn-icon hover:bg-slate-700 shrink-0"
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
              className="w-full rounded-2xl border border-dashed border-emerald-500/40 text-emerald-300 py-3 text-sm font-semibold hover:bg-emerald-500/5"
            >
              + Agregar comida frecuente
            </button>
          </div>
        </div>
      )}

      {registerMode === 'libre' && (
        <div className="space-y-4">
          <p className="label-section text-slate-500">Gustos frecuentes</p>
          <div className="space-y-2">
            {freeCatalog.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl surface flex items-center gap-1 pr-1 hover:border-amber-500/50 transition-colors"
              >
                <button
                  onClick={() => askQuantity(item, 'libre')}
                  className="flex-1 min-w-0 text-left p-4 flex items-center justify-between gap-3 rounded-2xl"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200">{item.name}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {Math.round(kcalOf(item))} kcal · P {item.p}g · C {item.c}g · G {item.f}g
                    </p>
                  </div>
                  <PlusCircle className="w-5 h-5 text-amber-400 shrink-0" />
                </button>
                <button
                  onClick={() => onEditFreeCatalogItem(item)}
                  aria-label="Editar esta opción fuera de plan"
                  className="btn-icon hover:bg-slate-700 shrink-0"
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
              className="w-full rounded-2xl border border-dashed border-amber-500/40 text-amber-300 py-3 text-sm font-semibold hover:bg-amber-500/5"
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
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={customKcal}
                  onChange={(e) => setCustomKcal(e.target.value)}
                  placeholder="Kcal"
                  inputMode="decimal"
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500"
                />
                <input
                  value={customP}
                  onChange={(e) => setCustomP(e.target.value)}
                  placeholder="Proteínas (g)"
                  inputMode="decimal"
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500"
                />
                <input
                  value={customC}
                  onChange={(e) => setCustomC(e.target.value)}
                  placeholder="Carbohidratos (g)"
                  inputMode="decimal"
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500"
                />
                <input
                  value={customF}
                  onChange={(e) => setCustomF(e.target.value)}
                  placeholder="Grasas (g)"
                  inputMode="decimal"
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500"
                />
              </div>
              <button
                onClick={submitCustomFree}
                className="w-full rounded-xl bg-amber-500 text-slate-900 font-semibold py-2.5 text-sm hover:bg-amber-400"
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
        <div className="rounded-2xl surface p-4 flex flex-col items-center justify-center text-center">
          {/* Ámbar, igual que la racha de la tira de hábitos: es un logro, no un
              estado del plan. Ver DailyRings. */}
          <div className="flex items-center gap-1.5 text-amber-400">
            <Flame className="w-5 h-5" />
            <span className="num-display text-2xl text-slate-100">{streak}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-tight">
            {streak === 1 ? 'día seguido dentro de rango' : 'días seguidos dentro de rango'}
          </p>
        </div>
        <div className="rounded-2xl surface p-4 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1.5 text-amber-400">
            <Sparkles className="w-5 h-5" />
            <span className="num-display text-2xl text-slate-100">{weeklyFreeCount}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-tight">
            {weeklyFreeCount === 1 ? 'gusto esta semana' : 'gustos esta semana'}
          </p>
        </div>
      </div>

      <div className="rounded-3xl surface p-5">
        <h2 className="label-section mb-4">Últimos 7 días</h2>
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

      <div className="rounded-3xl surface-accent p-5">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-5 h-5 text-emerald-300" />
          <h2 className="label-section">Tip del día</h2>
        </div>
        <p className="text-sm text-slate-200 leading-relaxed min-h-[3rem]">{TIPS[tipIndex]}</p>
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={prevTip}
            aria-label="Tip anterior"
            className="btn-icon bg-slate-800/60 hover:bg-slate-700"
          >
            <ChevronLeft className="w-4 h-4 text-slate-300" />
          </button>
          <span className="text-xs text-slate-500 font-mono">
            {tipIndex + 1} / {TIPS.length}
          </span>
          <button
            onClick={nextTip}
            aria-label="Tip siguiente"
            className="btn-icon bg-slate-800/60 hover:bg-slate-700"
          >
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>
        </div>
      </div>

      <div className="rounded-3xl surface p-5">
        <h2 className="label-section mb-3">Tus metas actuales</h2>
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
      <p className="label-section text-slate-500">{label}</p>
      <p className="font-mono text-slate-200 font-semibold">{value}</p>
    </div>
  );
}

function EditEntryModal({ isPlan, name, setName, kcal, setKcal, p, setP, c, setC, f, setF, onSave, onCancel }) {
  const accentText = isPlan ? 'text-emerald-300' : 'text-amber-300';
  const accentBorder = isPlan ? 'sheet-plan' : 'sheet-free';
  const accentBg = isPlan ? 'bg-emerald-500' : 'bg-amber-500';

  return (
    <Sheet onClose={onCancel} labelledBy="editar-comida-titulo">
      <div className={`w-full max-w-md sheet ${accentBorder} rounded-t-3xl sm:rounded-3xl p-6 max-h-[85vh] overflow-y-auto`}>
        <div className="flex items-center justify-between mb-1">
          <h2 id="editar-comida-titulo" className="text-lg font-bold text-slate-100">Editar comida</h2>
          <button onClick={onCancel} aria-label="Cerrar edición" className="btn-icon hover:bg-slate-700">
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
              className={`w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100`}
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
                className={`w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-mono`}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Proteínas (g)</label>
              <input
                type="number"
                inputMode="decimal"
                value={p}
                onChange={(e) => setP(e.target.value)}
                className={`w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-mono`}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Carbohidratos (g)</label>
              <input
                type="number"
                inputMode="decimal"
                value={c}
                onChange={(e) => setC(e.target.value)}
                className={`w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-mono`}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Grasas (g)</label>
              <input
                type="number"
                inputMode="decimal"
                value={f}
                onChange={(e) => setF(e.target.value)}
                className={`w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-mono`}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-600 text-slate-300 py-2.5 text-sm font-semibold hover:bg-slate-700"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            className={`flex-1 rounded-xl ${accentBg} text-slate-900 py-2.5 text-sm font-bold flex items-center justify-center gap-2`}
          >
            <Save className="w-4 h-4" /> Guardar
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function CatalogItemModal({ isNew, isFree, name, setName, kcal, setKcal, p, setP, c, setC, f, setF, onSave, onCancel, onDelete }) {
  const noun = isFree ? 'fuera de plan' : 'del plan';
  return (
    <Sheet onClose={onCancel} labelledBy="opcion-catalogo-titulo">
      <div
        className={`w-full max-w-md sheet rounded-t-3xl sm:rounded-3xl p-6 max-h-[85vh] overflow-y-auto ${
          isFree ? 'sheet-free' : 'sheet-plan'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 id="opcion-catalogo-titulo" className="text-lg font-bold text-slate-100">
            {isNew ? `Nueva opción ${noun}` : `Editar opción ${noun}`}
          </h2>
          <button onClick={onCancel} aria-label="Cerrar" className="btn-icon hover:bg-slate-700">
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
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 placeholder-slate-500"
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
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Proteínas (g)</label>
              <input
                type="number"
                inputMode="decimal"
                value={p}
                onChange={(e) => setP(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Carbohidratos (g)</label>
              <input
                type="number"
                inputMode="decimal"
                value={c}
                onChange={(e) => setC(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Grasas (g)</label>
              <input
                type="number"
                inputMode="decimal"
                value={f}
                onChange={(e) => setF(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-mono"
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
            className="flex-1 rounded-xl border border-slate-600 text-slate-300 py-2.5 text-sm font-semibold hover:bg-slate-700"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            className="flex-1 rounded-xl bg-emerald-500 text-slate-900 py-2.5 text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-400"
          >
            <Save className="w-4 h-4" /> Guardar
          </button>
        </div>
      </div>
    </Sheet>
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
    // Toca el velo y se cierra: es una guía de solo lectura, no hay nada que
    // perder por cerrarla sin querer. Las hojas con datos a medio cargar no
    // llevan esto.
    <Sheet onClose={onClose} closeOnBackdrop labelledBy="instalar-titulo">
      <div className="w-full max-w-md sheet rounded-t-3xl sm:rounded-3xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h2 id="instalar-titulo" className="text-lg font-bold text-slate-100">Instalar en tu iPhone</h2>
          <button onClick={onClose} aria-label="Cerrar" className="btn-icon hover:bg-slate-700">
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
          className="w-full mt-6 rounded-xl bg-emerald-500 text-slate-900 py-2.5 text-sm font-bold hover:bg-emerald-400"
        >
          Entendido
        </button>
      </div>
    </Sheet>
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
    <Sheet onClose={onCancel} labelledBy="ajustes-titulo">
      <div className="w-full max-w-md sheet rounded-t-3xl sm:rounded-3xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 id="ajustes-titulo" className="text-lg font-bold text-slate-100">Ajustes de mi plan</h2>
          <button onClick={onCancel} aria-label="Cerrar ajustes" className="btn-icon hover:bg-slate-700">
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
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-mono"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onReset}
            className="flex-1 rounded-xl border border-slate-600 text-slate-300 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-slate-700"
          >
            <RotateCcw className="w-4 h-4" /> Restaurar
          </button>
          <button
            onClick={onSave}
            className="flex-1 rounded-xl bg-emerald-500 text-slate-900 py-2.5 text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-400"
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
              className="shrink-0 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-3.5 py-2 text-sm font-semibold hover:bg-emerald-500/25"
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
              {/* La copy dice exactamente lo que el interruptor hace. La anterior
                  —"te avisamos si pasan varias horas..."— se leía como una
                  notificación del sistema, y NutriTrack no tiene forma de
                  mandarla: sin servidor de push no hay nada que despierte a la
                  app, y en iPhone el sistema le congela los temporizadores
                  apenas pasa a segundo plano. Prometer un aviso que no llega es
                  peor que no ofrecerlo. */}
              <p className="text-xs text-slate-500 mt-1">
                Al abrir la app te avisamos si pasaron varias horas sin registrar. En iPhone no
                llegan con la app cerrada: el sistema la suspende y no hay servidor que la despierte.
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
              className="flex-1 rounded-xl border border-slate-600 text-slate-300 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-slate-700"
            >
              <Download className="w-4 h-4" /> Exportar todo
            </button>
            <button
              onClick={handleImportClick}
              className="flex-1 rounded-xl border border-slate-600 text-slate-300 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-slate-700"
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
    </Sheet>
  );
}
