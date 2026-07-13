import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Home, PlusCircle, TrendingUp, Settings, Droplet, Droplets, Trash2, X, Check,
  ChevronRight, ChevronLeft, Sparkles, Lightbulb, Award, Plus, Minus,
  Save, RotateCcw, Info, Utensils, Coffee, Pencil, Flame, Camera, Loader2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// DATOS BASE DEL PLAN
// ---------------------------------------------------------------------------

const dateKeyOf = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;

const TODAY_KEY = dateKeyOf(new Date());

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const addDays = (d, amount) => {
  const x = new Date(d);
  x.setDate(x.getDate() + amount);
  return x;
};

const formatDisplayDate = (date) => {
  const today = startOfDay(new Date());
  const yesterday = addDays(today, -1);
  if (dateKeyOf(date) === dateKeyOf(today)) return 'Hoy';
  if (dateKeyOf(date) === dateKeyOf(yesterday)) return 'Ayer';
  const text = date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const DEFAULT_GOALS = { calories: 1610, protein: 116.5, carbs: 159, fat: 56.5, water: 2000 };
const TOLERANCE = { calories: 100, protein: 10, carbs: 10, fat: 10 };
const GLASS_ML = 250;

// Catálogo único de alimentos del plan (sin clasificación por momento del día)
const DEFAULT_CATALOG = [
  { id: 'd1', name: '2 Tostadas integrales + queso untable light', kcal: 180, p: 8, c: 24, f: 5 },
  { id: 'd2', name: '2 Huevos revueltos o claras', kcal: 150, p: 14, c: 1, f: 10 },
  { id: 'd3', name: 'Yogur descremado + granola', kcal: 160, p: 10, c: 20, f: 3 },
  { id: 'd4', name: 'Panqueques de avena (2) + fruta', kcal: 220, p: 8, c: 30, f: 6 },
  { id: 'd5', name: 'Tostadas integrales + huevo', kcal: 210, p: 12, c: 22, f: 8 },
  { id: 'm1', name: 'Pollo grillado + arroz integral + ensalada verde', kcal: 420, p: 35, c: 40, f: 10 },
  { id: 'm2', name: 'Carne magra + puré de batata + vegetales al vapor', kcal: 450, p: 32, c: 45, f: 12 },
  { id: 'm3', name: 'Pescado al horno + quinoa + vegetales grillados', kcal: 400, p: 30, c: 38, f: 11 },
  { id: 'm4', name: 'Tofu salteado + legumbres + vegetales salteados', kcal: 380, p: 22, c: 42, f: 9 },
  { id: 'm5', name: 'Milanesa al horno + puré de calabaza + ensalada', kcal: 440, p: 30, c: 35, f: 15 },
  { id: 'co1', name: 'Fruta grupo A (manzana, pera, naranja)', kcal: 70, p: 1, c: 18, f: 0 },
  { id: 'co2', name: 'Fruta grupo B (banana, uva, mango)', kcal: 100, p: 1, c: 25, f: 0 },
  { id: 'co3', name: 'Yogur descremado', kcal: 80, p: 8, c: 10, f: 1 },
  { id: 'co4', name: 'Barrita íntegra', kcal: 120, p: 4, c: 18, f: 4 },
];

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

const emptyLog = () => ({ water: 0, planMeals: [], freeMeals: [] });

const nowHM = () =>
  new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

const round1 = (n) => Math.round(n * 10) / 10;

// ---------------------------------------------------------------------------
// LECTURA DE TABLAS NUTRICIONALES (OCR)
// ---------------------------------------------------------------------------

const NUM_RE = '(\\d+(?:[.,]\\d+)?)';

// Busca el primer número que aparezca después de alguna de las etiquetas dadas
const extractFirstNumber = (text, regexes) => {
  for (const re of regexes) {
    const m = text.match(re);
    if (m && m[1] != null) {
      const n = parseFloat(m[1].replace(',', '.'));
      if (!isNaN(n)) return n;
    }
  }
  return null;
};

// Interpreta el texto crudo devuelto por el OCR de una etiqueta nutricional
// y extrae nombre, porción base y nutrientes. Cualquier valor no detectado
// queda en null y el usuario lo completa/corrige a mano antes de guardar.
function parseNutritionLabelText(rawText) {
  const text = (rawText || '').replace(/\r/g, ' ').replace(/[ \t]+/g, ' ');

  const gBase = extractFirstNumber(text, [
    new RegExp(`tama[ñn]o de (?:la )?porci[oó]n[^\\d]{0,20}${NUM_RE}\\s*(?:g|gr|ml)`, 'i'),
    new RegExp(`porci[oó]n[^\\d]{0,20}${NUM_RE}\\s*(?:g|gr|ml)`, 'i'),
    new RegExp(`serving\\s*size[^\\d]{0,20}${NUM_RE}\\s*(?:g|ml)`, 'i'),
    new RegExp(`contenido neto[^\\d]{0,20}${NUM_RE}\\s*(?:g|gr|ml)`, 'i'),
  ]);

  const kcal = extractFirstNumber(text, [
    new RegExp(`valor energ[eé]tico[^\\d]{0,20}${NUM_RE}\\s*kcal`, 'i'),
    new RegExp(`(?:calor[ií]as|energy|calories)[^\\d]{0,20}${NUM_RE}\\s*kcal`, 'i'),
    new RegExp(`(?:valor energ[eé]tico|calor[ií]as|energy|calories)[^\\d]{0,20}${NUM_RE}`, 'i'),
  ]);

  const p = extractFirstNumber(text, [
    new RegExp(`prote[ií]nas?[^\\d]{0,20}${NUM_RE}\\s*g`, 'i'),
    new RegExp(`protein[^\\d]{0,20}${NUM_RE}\\s*g`, 'i'),
  ]);

  const c = extractFirstNumber(text, [
    new RegExp(`(?:hidratos de carbono|carbohidratos)[^\\d]{0,20}${NUM_RE}\\s*g`, 'i'),
    new RegExp(`(?:total\\s*)?carbohydrate[^\\d]{0,20}${NUM_RE}\\s*g`, 'i'),
  ]);

  const f = extractFirstNumber(text, [
    new RegExp(`grasas?\\s*totales?[^\\d]{0,20}${NUM_RE}\\s*g`, 'i'),
    new RegExp(`total\\s*fat[^\\d]{0,20}${NUM_RE}\\s*g`, 'i'),
    new RegExp(`grasas?[^\\d]{0,20}${NUM_RE}\\s*g`, 'i'),
  ]);

  const name = (() => {
    const skip = /informaci[oó]n nutricional|nutrition facts|porci[oó]n|valor energ[eé]tico|prote[ií]nas|carbohidratos|hidratos de carbono|grasas|calor[ií]as|serving size|calories|protein|carbohydrate|fat|sodio|sodium|az[uú]cares|sugars|fibra|fiber/i;
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const candidate = lines.find((l) => l.length >= 3 && !skip.test(l) && !/^\d/.test(l));
    return candidate || '';
  })();

  return { name, gBase, kcal, p, c, f };
}

// ---------------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// ---------------------------------------------------------------------------

export default function NutriTrackApp() {
  const [activeTab, setActiveTab] = useState('dia');
  const [showSettings, setShowSettings] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [goals, setGoals] = useState(DEFAULT_GOALS);
  const [log, setLog] = useState(emptyLog());
  const [tipIndex, setTipIndex] = useState(0);

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

  const [editingCatalogItem, setEditingCatalogItem] = useState(null); // { id } — id null = nueva opción
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

  // ------------------------- Escáner de tabla nutricional -------------------
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanImage, setScanImage] = useState(null);
  const [scanName, setScanName] = useState('');
  const [scanGBase, setScanGBase] = useState('');
  const [scanGReal, setScanGReal] = useState('');
  const [scanKcalBase, setScanKcalBase] = useState('');
  const [scanPBase, setScanPBase] = useState('');
  const [scanCBase, setScanCBase] = useState('');
  const [scanFBase, setScanFBase] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanOcrError, setScanOcrError] = useState('');

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
  }, []);

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

  // Totales del día
  const totals = useMemo(() => {
    const all = [...log.planMeals, ...log.freeMeals];
    return all.reduce(
      (acc, m) => ({
        kcal: acc.kcal + m.kcal,
        p: acc.p + m.p,
        c: acc.c + m.c,
        f: acc.f + m.f,
      }),
      { kcal: 0, p: 0, c: 0, f: 0 }
    );
  }, [log]);

  const waterGlasses = Math.round(log.water / GLASS_ML);
  const waterGoalGlasses = Math.max(1, Math.round(goals.water / GLASS_ML));

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
    flashConfirm('Comida agregada a tu registro ✓');
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
    flashConfirm('Registrado fuera de plan, ¡disfrutalo con calma!');
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

  const submitCustomFree = () => {
    const kcalNum = parseFloat(customKcal);
    if (!customName.trim() || isNaN(kcalNum) || kcalNum <= 0) return;
    addFreeMeal({
      name: customName.trim(),
      kcal: kcalNum,
      p: parseFloat(customP) || 0,
      c: parseFloat(customC) || 0,
      f: parseFloat(customF) || 0,
    });
    setCustomName('');
    setCustomKcal('');
    setCustomP('');
    setCustomC('');
    setCustomF('');
    setShowCustomForm(false);
  };

  // ------------------------- Catálogo editable del plan --------------------
  const openAddCatalogItem = () => {
    setEditingCatalogItem({ id: null });
    setCatalogName('');
    setCatalogKcal('');
    setCatalogP('');
    setCatalogC('');
    setCatalogF('');
  };

  const openEditCatalogItem = (item) => {
    setEditingCatalogItem({ id: item.id });
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
    const { id } = editingCatalogItem;
    const values = {
      name: catalogName.trim(),
      kcal: kcalNum,
      p: parseFloat(catalogP) || 0,
      c: parseFloat(catalogC) || 0,
      f: parseFloat(catalogF) || 0,
    };
    setPlanCatalog((prev) => {
      if (id) {
        return prev.map((it) => (it.id === id ? { ...it, ...values } : it));
      }
      const newItem = { id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, ...values };
      return [...prev, newItem];
    });
    setEditingCatalogItem(null);
    flashConfirm(id ? 'Opción del plan actualizada ✓' : 'Opción agregada a tu plan ✓');
  };

  const deleteCatalogItem = () => {
    if (!editingCatalogItem || !editingCatalogItem.id) return;
    const { id } = editingCatalogItem;
    setPlanCatalog((prev) => prev.filter((it) => it.id !== id));
    setEditingCatalogItem(null);
    flashConfirm('Opción eliminada de tu plan');
  };

  const resetCatalog = () => {
    setPlanCatalog(JSON.parse(JSON.stringify(DEFAULT_CATALOG)));
    flashConfirm('Se restauraron las opciones originales del plan');
  };

  // ------------------------- Escáner de tabla nutricional ------------------
  const openScanModal = () => {
    setScanImage(null);
    setScanName('');
    setScanGBase('');
    setScanGReal('');
    setScanKcalBase('');
    setScanPBase('');
    setScanCBase('');
    setScanFBase('');
    setScanLoading(false);
    setScanOcrError('');
    setShowScanModal(true);
  };

  const closeScanModal = () => setShowScanModal(false);

  // Corre OCR sobre la foto de la etiqueta y precarga los campos detectados;
  // el usuario los revisa y corrige antes de guardar.
  const runLabelOcr = async (file) => {
    setScanLoading(true);
    setScanOcrError('');
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('spa');
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();
      const parsed = parseNutritionLabelText(text);

      if (parsed.name) setScanName(parsed.name);
      if (parsed.gBase != null) {
        const gBaseStr = String(parsed.gBase);
        setScanGBase(gBaseStr);
        setScanGReal((prev) => prev || gBaseStr);
      }
      if (parsed.kcal != null) setScanKcalBase(String(parsed.kcal));
      if (parsed.p != null) setScanPBase(String(parsed.p));
      if (parsed.c != null) setScanCBase(String(parsed.c));
      if (parsed.f != null) setScanFBase(String(parsed.f));

      if (parsed.gBase == null && parsed.kcal == null && parsed.p == null && parsed.c == null && parsed.f == null) {
        setScanOcrError('No pudimos detectar los valores automáticamente. Completalos a mano.');
      }
    } catch (e) {
      setScanOcrError('No pudimos leer la imagen. Completá los datos manualmente.');
    } finally {
      setScanLoading(false);
    }
  };

  const handleScanImageFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setScanImage(reader.result);
    reader.readAsDataURL(file);
    runLabelOcr(file);
  };

  const scanGBaseNum = parseFloat(scanGBase) || 0;
  const scanGRealNum = parseFloat(scanGReal) || 0;
  const scanFactor = scanGBaseNum > 0 && scanGRealNum > 0 ? scanGRealNum / scanGBaseNum : 0;
  const scanKcalBaseNum = parseFloat(scanKcalBase) || 0;
  const scanPBaseNum = parseFloat(scanPBase) || 0;
  const scanCBaseNum = parseFloat(scanCBase) || 0;
  const scanFBaseNum = parseFloat(scanFBase) || 0;

  // Valor Final = Valor Base × (Greal / Gbase), recalculado en tiempo real
  const scanFinal = {
    kcal: scanKcalBaseNum * scanFactor,
    p: scanPBaseNum * scanFactor,
    c: scanCBaseNum * scanFactor,
    f: scanFBaseNum * scanFactor,
  };

  const confirmScan = () => {
    if (!scanName.trim() || scanGBaseNum <= 0 || scanGRealNum <= 0) return;
    const finalValues = {
      kcal: Math.round(scanFinal.kcal),
      p: round1(scanFinal.p),
      c: round1(scanFinal.c),
      f: round1(scanFinal.f),
    };
    // Se guarda en el día seleccionado
    const entry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: `${scanName.trim()} (${scanGRealNum} g)`,
      ...finalValues,
      time: nowHM(),
    };
    setLog((prev) => ({ ...prev, planMeals: [...prev.planMeals, entry] }));

    // Se guarda también en el catálogo global de alimentos
    const catalogItem = {
      id: `scan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: scanName.trim(),
      ...finalValues,
    };
    setPlanCatalog((prev) => [...prev, catalogItem]);

    setShowScanModal(false);
    flashConfirm('Alimento escaneado y guardado ✓');
  };

  const openSettings = () => {
    setTempGoals(goals);
    setShowSettings(true);
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
      msgs.push({
        type: 'positive',
        text: '¡Excelente adherencia! Vas por muy buen camino para tus metas de composición corporal.',
      });
    }

    if (log.freeMeals.length > 0) {
      msgs.push({
        type: 'free',
        text: '¡Disfrutalo! Recordá que el balance y el control de la porción son la clave de la sostenibilidad a largo plazo.',
      });
    }

    if (totals.p < goals.protein - TOLERANCE.protein) {
      msgs.push({
        type: 'reminder',
        text: 'Estás un poco abajo en tus proteínas, ¿sumamos un huevo o yogur en la próxima comida?',
      });
    }

    if (log.water < goals.water - GLASS_ML * 2) {
      msgs.push({
        type: 'water',
        text: 'Todavía faltan varios vasos de agua para llegar a la meta diaria.',
      });
    }

    if (!hasAny) {
      msgs.push({
        type: 'neutral',
        text: 'Registrá comidas en este día para ver el progreso y recibir feedback personalizado.',
      });
    }
    return msgs;
  }, [totals, goals, log]);

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

    const pKcal = totals.p * 4;
    const cKcal = totals.c * 4;
    const fKcal = totals.f * 9;
    const macroTotal = pKcal + cKcal + fKcal;

    const segments =
      macroTotal > 0
        ? [
            { color: '#10b981', pct: pKcal / macroTotal }, // proteína - emerald-500
            { color: '#2dd4bf', pct: cKcal / macroTotal }, // carbohidratos - teal-400
            { color: '#94a3b8', pct: fKcal / macroTotal }, // grasas - slate-400
          ]
        : [];

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
  const streak = useMemo(() => {
    let count = 0;
    for (let i = weekStats.length - 1; i >= 0; i--) {
      const d = weekStats[i];
      if (d.hasData && Math.abs(d.kcal - goals.calories) <= TOLERANCE.calories) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }, [weekStats, goals]);

  const weeklyFreeCount = useMemo(
    () => weekStats.reduce((sum, d) => sum + d.freeCount, 0),
    [weekStats]
  );

  // ---------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------

  const macroRows = [
    { label: 'Proteínas', value: totals.p, goal: goals.protein, unit: 'g', tol: TOLERANCE.protein, color: 'bg-emerald-500' },
    { label: 'Carbohidratos', value: totals.c, goal: goals.carbs, unit: 'g', tol: TOLERANCE.carbs, color: 'bg-teal-400' },
    { label: 'Grasas', value: totals.f, goal: goals.fat, unit: 'g', tol: TOLERANCE.fat, color: 'bg-slate-400' },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-900 text-slate-100 flex justify-center">
      <div className="w-full max-w-md flex flex-col min-h-screen relative">
        {/* HEADER */}
        <header className="px-5 pt-6 pb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">{formatDisplayDate(selectedDate)}</p>
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              Mi Plan Nutricional
            </h1>
          </div>
          <button
            onClick={openSettings}
            aria-label="Ajustes del plan"
            className="p-2.5 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-emerald-400 transition-colors"
          >
            <Settings className="w-5 h-5 text-slate-300" />
          </button>
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
              macroRows={macroRows}
              feedback={feedback}
              waterGlasses={waterGlasses}
              waterGoalGlasses={waterGoalGlasses}
              addWater={addWater}
              log={log}
              removeEntry={removeEntry}
              onEdit={openEditEntry}
            />
          )}

          {activeTab === 'registrar' && (
            <TabRegistrar
              registerMode={registerMode}
              setRegisterMode={setRegisterMode}
              catalog={planCatalog}
              onAddCatalogItem={openAddCatalogItem}
              onEditCatalogItem={openEditCatalogItem}
              onResetCatalog={resetCatalog}
              onOpenScan={openScanModal}
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
            />
          )}
        </main>

        {/* NAV INFERIOR */}
        <nav className="fixed bottom-0 inset-x-0 flex justify-center pointer-events-none">
          <div className="w-full max-w-md bg-slate-800/95 backdrop-blur border-t border-slate-700 px-4 pt-2 pb-5 flex justify-around pointer-events-auto">
            <NavButton icon={Home} label="Mi Día" active={activeTab === 'dia'} onClick={() => setActiveTab('dia')} />
            <NavButton icon={PlusCircle} label="Registrar" active={activeTab === 'registrar'} onClick={() => setActiveTab('registrar')} />
            <NavButton icon={TrendingUp} label="Progreso" active={activeTab === 'progreso'} onClick={() => setActiveTab('progreso')} />
          </div>
        </nav>

        {/* MODAL DE AJUSTES */}
        {showSettings && (
          <SettingsModal
            tempGoals={tempGoals}
            setTempGoals={setTempGoals}
            onSave={saveSettings}
            onCancel={() => setShowSettings(false)}
            onReset={resetSettings}
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

        {/* MODAL DE ESCÁNER DE TABLA NUTRICIONAL */}
        {showScanModal && (
          <ScannerModal
            image={scanImage}
            onImageFile={handleScanImageFile}
            onRemoveImage={() => setScanImage(null)}
            name={scanName}
            setName={setScanName}
            gBase={scanGBase}
            setGBase={setScanGBase}
            gReal={scanGReal}
            setGReal={setScanGReal}
            kcalBase={scanKcalBase}
            setKcalBase={setScanKcalBase}
            pBase={scanPBase}
            setPBase={setScanPBase}
            cBase={scanCBase}
            setCBase={setScanCBase}
            fBase={scanFBase}
            setFBase={setScanFBase}
            final={scanFinal}
            loading={scanLoading}
            ocrError={scanOcrError}
            onSave={confirmScan}
            onCancel={closeScanModal}
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

function NavButton({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-4 py-1 rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-400 transition-colors ${
        active ? 'text-emerald-400' : 'text-slate-500'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  );
}

function ProgressBar({ pct, colorClass }) {
  const width = Math.min(100, Math.max(0, pct * 100));
  return (
    <div className="h-2 w-full rounded-full bg-slate-700 overflow-hidden">
      <div className={`h-full rounded-full ${colorClass} transition-all duration-500`} style={{ width: `${width}%` }} />
    </div>
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

function TabMiDia({
  ring,
  totals,
  goals,
  macroRows,
  feedback,
  waterGlasses,
  waterGoalGlasses,
  addWater,
  log,
  removeEntry,
  onEdit,
}) {
  const kcalColor = ring.overshoot ? '#f59e0b' : '#10b981';
  const statusText = ring.overshoot
    ? 'Por encima de la meta'
    : Math.abs(totals.kcal - goals.calories) <= TOLERANCE_CAL
    ? 'Dentro de tu rango objetivo'
    : 'Por debajo de la meta';

  // Listado general único: todas las comidas del día juntas, sin clasificación por momento
  const allEntries = [
    ...log.planMeals.map((m) => ({ ...m, kind: 'plan' })),
    ...log.freeMeals.map((m) => ({ ...m, kind: 'free' })),
  ].sort((a, b) => (a.time > b.time ? 1 : -1));

  return (
    <div className="space-y-5">
      {/* ANILLO DE COMPOSICIÓN */}
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
            strokeDasharray={`${ring.cOuter * ring.pctCalories} ${ring.cOuter}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${ring.center} ${ring.center})`}
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
          {/* track interior */}
          <circle cx={ring.center} cy={ring.center} r={ring.rInner} fill="none" stroke="#1e293b" strokeWidth={ring.swInner} />
          {/* segmentos de composición (donut) */}
          {ring.arcs.map((seg, i) => (
            <circle
              key={i}
              cx={ring.center}
              cy={ring.center}
              r={ring.rInner}
              fill="none"
              stroke={seg.color}
              strokeWidth={ring.swInner}
              strokeDasharray={seg.dasharray}
              strokeDashoffset={seg.dashoffset}
              transform={`rotate(-90 ${ring.center} ${ring.center})`}
            />
          ))}
          <text x={ring.center} y={ring.center - 6} textAnchor="middle" className="fill-slate-100" style={{ fontSize: 30, fontWeight: 800, fontFamily: 'ui-monospace, monospace' }}>
            {Math.round(totals.kcal)}
          </text>
          <text x={ring.center} y={ring.center + 18} textAnchor="middle" className="fill-slate-400" style={{ fontSize: 12, fontWeight: 600 }}>
            de {Math.round(goals.calories)} kcal
          </text>
        </svg>
        <p className={`mt-1 text-xs font-semibold ${ring.overshoot ? 'text-amber-400' : 'text-emerald-400'}`}>{statusText}</p>

        <div className="w-full mt-4 space-y-3">
          {macroRows.map((m) => (
            <div key={m.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400 font-medium">{m.label}</span>
                <span className="font-mono text-slate-300">
                  {round1(m.value)} / {round1(m.goal)} {m.unit}
                </span>
              </div>
              <ProgressBar pct={m.value / (m.goal || 1)} colorClass={m.color} />
            </div>
          ))}
        </div>
      </div>

      {/* AGUA */}
      <div className="rounded-3xl bg-slate-800/60 border border-slate-700 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Droplets className="w-5 h-5 text-cyan-300" />
            <span className="font-semibold text-slate-200">Agua registrada</span>
          </div>
          <span className="font-mono text-sm text-cyan-200">
            {waterGlasses}/{waterGoalGlasses} vasos
          </span>
        </div>
        <ProgressBar pct={log.water / (goals.water || 1)} colorClass="bg-cyan-400" />
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={() => addWater(-1)}
            aria-label="Quitar un vaso de agua"
            className="p-3 rounded-full bg-slate-700 hover:bg-slate-600 focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <Minus className="w-5 h-5 text-slate-200" />
          </button>
          <div className="flex items-center gap-1 text-cyan-300">
            <Droplet className="w-6 h-6" />
            <span className="font-mono text-lg font-bold">{log.water} ml</span>
          </div>
          <button
            onClick={() => addWater(1)}
            aria-label="Agregar un vaso de agua"
            className="p-3 rounded-full bg-cyan-500/20 border border-cyan-400/40 hover:bg-cyan-500/30 focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <Plus className="w-5 h-5 text-cyan-300" />
          </button>
        </div>
      </div>

      {/* FEEDBACK */}
      <FeedbackBanner feedback={feedback} />

      {/* HISTORIAL DEL DÍA — listado general único, sin momentos del día */}
      <div>
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-2">Registro del día</h2>
        {allEntries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-center text-slate-500 text-sm">
            Todavía no hay comidas registradas para este día. Andá a la pestaña "Registrar" para cargarlas.
          </div>
        ) : (
          <ul className="space-y-2">
            {allEntries.map((entry) => (
              <li
                key={entry.id}
                className={`rounded-2xl border p-3 flex items-center justify-between gap-3 ${
                  entry.kind === 'plan' ? 'bg-emerald-500/5 border-emerald-500/25' : 'bg-amber-500/5 border-amber-500/25'
                }`}
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
                    onClick={() => removeEntry(entry.id, entry.kind === 'plan')}
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
  onAddCatalogItem,
  onEditCatalogItem,
  onResetCatalog,
  onOpenScan,
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
  return (
    <div className="space-y-5">
      {/* ESCÁNER DE TABLA NUTRICIONAL */}
      <button
        onClick={onOpenScan}
        className="w-full rounded-2xl border border-sky-500/40 bg-sky-500/10 text-sky-300 py-3.5 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-sky-500/20 focus-visible:ring-2 focus-visible:ring-sky-400"
      >
        <Camera className="w-4 h-4" /> Escanear tabla nutricional (gramaje dinámico)
      </button>

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
                No hay opciones cargadas todavía. Agregá la primera con el botón de abajo.
              </div>
            )}

            <button
              onClick={onAddCatalogItem}
              className="w-full rounded-2xl border border-dashed border-emerald-500/40 text-emerald-300 py-3 text-sm font-semibold hover:bg-emerald-500/5 focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              + Agregar opción al listado
            </button>
          </div>

          <button
            onClick={onResetCatalog}
            className="w-full text-center text-[11px] text-slate-500 hover:text-slate-300 py-1"
          >
            Restaurar las opciones originales del plan
          </button>
        </div>
      )}

      {registerMode === 'libre' && (
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Gustos frecuentes</p>
          <div className="space-y-2">
            {FREE_PRESETS.map((item) => (
              <button
                key={item.id}
                onClick={() => addFreeMeal(item)}
                className="w-full text-left rounded-2xl bg-slate-800/60 border border-slate-700 p-4 flex items-center justify-between gap-3 hover:border-amber-500/50 hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-amber-400 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200">{item.name}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {item.kcal} kcal · P {item.p}g · C {item.c}g · G {item.f}g
                  </p>
                </div>
                <PlusCircle className="w-5 h-5 text-amber-400 shrink-0" />
              </button>
            ))}
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

function TabProgreso({ weekStats, goals, tipIndex, setTipIndex, streak, weeklyFreeCount }) {
  const maxKcal = Math.max(goals.calories, ...weekStats.map((d) => d.kcal), 1);

  const nextTip = () => setTipIndex((i) => (i + 1) % TIPS.length);
  const prevTip = () => setTipIndex((i) => (i - 1 + TIPS.length) % TIPS.length);

  return (
    <div className="space-y-5">
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
                      d.kcal === 0 ? 'bg-slate-700' : withinTol ? 'bg-emerald-500' : 'bg-teal-600'
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
          <span className="w-2.5 h-2.5 rounded-sm bg-teal-600 inline-block ml-3" /> Fuera de rango
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

function CatalogItemModal({ isNew, name, setName, kcal, setKcal, p, setP, c, setC, f, setF, onSave, onCancel, onDelete }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4">
      <div className="w-full max-w-md bg-slate-800 border border-emerald-500/30 rounded-t-3xl sm:rounded-3xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-slate-100">{isNew ? 'Nueva opción del plan' : 'Editar opción del plan'}</h2>
          <button onClick={onCancel} aria-label="Cerrar" className="p-2 rounded-full hover:bg-slate-700">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <p className="text-xs font-semibold mb-5 text-emerald-300">
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
            <Trash2 className="w-3.5 h-3.5" /> Eliminar esta opción del plan
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

function ScannerModal({
  image,
  onImageFile,
  onRemoveImage,
  name,
  setName,
  gBase,
  setGBase,
  gReal,
  setGReal,
  kcalBase,
  setKcalBase,
  pBase,
  setPBase,
  cBase,
  setCBase,
  fBase,
  setFBase,
  final,
  loading,
  ocrError,
  onSave,
  onCancel,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4">
      <div className="w-full max-w-md bg-slate-800 border border-sky-500/30 rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-slate-100">Escanear tabla nutricional</h2>
          <button onClick={onCancel} aria-label="Cerrar escáner" className="p-2 rounded-full hover:bg-slate-700">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <p className="text-xs font-semibold mb-5 text-sky-300">
          Subí la foto de la etiqueta: leemos el texto automáticamente y completamos los campos. Revisalos y corregilos antes de guardar.
        </p>

        <div className="space-y-4">
          {/* IMAGEN DE LA ETIQUETA */}
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1 block">Foto de la tabla nutricional</label>
            {image ? (
              <div className="relative">
                <img
                  src={image}
                  alt="Tabla nutricional escaneada"
                  className="w-full max-h-48 object-cover rounded-xl border border-slate-700"
                />
                <button
                  onClick={onRemoveImage}
                  aria-label="Quitar imagen"
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 hover:bg-slate-900"
                >
                  <X className="w-4 h-4 text-slate-200" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-sky-500/40 py-6 text-sky-300 text-sm font-semibold cursor-pointer hover:bg-sky-500/5">
                <Camera className="w-6 h-6" />
                Tomar o subir foto
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => onImageFile(e.target.files && e.target.files[0])}
                />
              </label>
            )}
            {loading && (
              <p className="text-xs text-sky-300 flex items-center gap-2 mt-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Leyendo la etiqueta...
              </p>
            )}
            {!loading && ocrError && (
              <p className="text-xs text-amber-400 mt-2">{ocrError}</p>
            )}
            {!loading && !ocrError && image && (
              <p className="text-xs text-slate-500 mt-2">
                Revisá los valores detectados y corregilos si hace falta antes de guardar.
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1 block">Nombre del alimento</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Yogur natural"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Porción base (g/ml)</label>
              <input
                type="number"
                inputMode="decimal"
                value={gBase}
                onChange={(e) => setGBase(e.target.value)}
                placeholder="Ej: 100"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-sky-300 mb-1 block">Gramos reales a consumir</label>
              <input
                type="number"
                inputMode="decimal"
                value={gReal}
                onChange={(e) => setGReal(e.target.value)}
                placeholder="Ej: 150"
                className="w-full bg-slate-900 border border-sky-500/50 rounded-xl px-3 py-2.5 text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
          </div>

          <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold pt-1">Nutrientes por porción base</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Calorías (kcal)</label>
              <input
                type="number"
                inputMode="decimal"
                value={kcalBase}
                onChange={(e) => setKcalBase(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Proteínas (g)</label>
              <input
                type="number"
                inputMode="decimal"
                value={pBase}
                onChange={(e) => setPBase(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Carbohidratos (g)</label>
              <input
                type="number"
                inputMode="decimal"
                value={cBase}
                onChange={(e) => setCBase(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 block">Grasas (g)</label>
              <input
                type="number"
                inputMode="decimal"
                value={fBase}
                onChange={(e) => setFBase(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
          </div>

          <div className="rounded-2xl bg-sky-500/10 border border-sky-500/30 p-4">
            <p className="text-xs font-semibold text-sky-300 mb-2">Valores finales para {gReal || 0} g/ml</p>
            <p className="text-sm text-slate-100 font-mono">
              {Math.round(final.kcal)} kcal · P {round1(final.p)}g · C {round1(final.c)}g · G {round1(final.f)}g
            </p>
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
            disabled={loading}
            className={`flex-1 rounded-xl bg-sky-500 text-slate-900 py-2.5 text-sm font-bold flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-sky-300 ${
              loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-sky-400'
            }`}
          >
            <Save className="w-4 h-4" /> Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsModal({ tempGoals, setTempGoals, onSave, onCancel, onReset }) {
  const fields = [
    { key: 'calories', label: 'Calorías (kcal)', step: '10' },
    { key: 'protein', label: 'Proteínas (g)', step: '0.5' },
    { key: 'carbs', label: 'Carbohidratos (g)', step: '0.5' },
    { key: 'fat', label: 'Grasas (g)', step: '0.5' },
    { key: 'water', label: 'Agua (ml)', step: '50' },
  ];

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
      </div>
    </div>
  );
}
