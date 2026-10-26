import React, { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { Search, ScanLine, Zap, PlusCircle, Scale, X, Loader2, RotateCcw, Pencil, Barcode } from 'lucide-react';
import { Sheet, Segmented, Chip, Button, toast } from '../ui';
import { addDaysToKey } from '../lib/dates';
import { useFreezeWindowScroll } from '../lib/viewport';
import { FOOD_DB } from '../foodDatabase';
import { searchProducts, getProductByBarcode } from '../openFoodFacts';
import { MEALS, toBase, defaultQty, qtyLabel, rankByQuery, splitName, scaleBase } from './model';
import { useCatalogs, addEntry, removeEntry, logsInRange, saveCatalogItem, deleteCatalogItem, findCatalogByName } from './store';
import { foodHistory, frequentFoods, recentFoods } from './insights';
import { FoodRow, fmt } from './parts';
import FoodSheet from './FoodSheet';
import FoodFormSheet from './FoodFormSheet';

const BarcodeScanner = lazy(() => import('../BarcodeScanner'));

/**
 * Agregar comida: buscador único (Mis comidas, historial, base local y Open
 * Food Facts), frecuentes según el momento del día y alta con un toque.
 * Se queda abierta para cargar varias cosas seguidas.
 */
export default function AddFoodSheet({ dateKey, initialMeal, startWith, onClose, onOpenEquivalences }) {
  const [meal, setMeal] = useState(initialMeal);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('frecuentes');
  const [detail, setDetail] = useState(null); // { base, qty, free }
  const [form, setForm] = useState(startWith === 'quick' ? { quick: true } : null); // { item?, free?, quick? }
  const [scanning, setScanning] = useState(startWith === 'scan');
  const [lookingUp, setLookingUp] = useState(false);
  const [added, setAdded] = useState(0);
  const { plan, free } = useCatalogs();
  const searching = query.trim().length >= 2;
  useFreezeWindowScroll(true);

  const history = useMemo(() => foodHistory(logsInRange(addDaysToKey(dateKey, -60), dateKey)), [dateKey, added]);
  const mine = useMemo(() => [...plan.map((x) => ({ ...x, free: false })), ...free.map((x) => ({ ...x, free: true }))], [plan, free]);

  // --- Open Food Facts (asíncrono, con debounce) ---
  const [off, setOff] = useState({ state: 'idle', items: [] });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setOff({ state: 'idle', items: [] });
      return undefined;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setOff((o) => ({ ...o, state: 'loading' }));
      searchProducts(q, { signal: ctrl.signal })
        .then((items) => setOff({ state: 'done', items }))
        .catch((e) => e.name !== 'AbortError' && setOff({ state: navigator.onLine === false ? 'offline' : 'error', items: [] }));
    }, 400);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, retry]);

  const results = useMemo(() => {
    if (!searching) return null;
    const seen = new Set();
    const take = (list) =>
      list.filter((x) => {
        const k = x.name.trim().toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    return {
      mine: take(rankByQuery(mine, query)).slice(0, 8),
      history: take(rankByQuery(history, query)).slice(0, 8),
      local: take(rankByQuery(FOOD_DB, query)).slice(0, 15),
    };
  }, [searching, query, mine, history]);

  // --- Acciones ---
  const add = (food, qty, isFree, mealId = meal) => {
    const base = food.base || toBase(food);
    const q = qty ?? defaultQty(base);
    const entry = addEntry(dateKey, { base, qty: q, meal: mealId, free: isFree });
    setAdded((n) => n + 1);
    toast(`${splitName(base.name).title} · ${fmt(entry.kcal)} kcal`, {
      action: {
        label: 'Deshacer',
        onClick: () => {
          removeEntry(dateKey, entry.id);
          setAdded((n) => Math.max(0, n - 1));
        },
      },
    });
  };

  const open = (food, isFree = false) => {
    const base = food.base || toBase(food);
    setDetail({ base, qty: food.qty ?? defaultQty(base), free: food.free ?? isFree });
  };

  const onBarcode = async (code) => {
    setScanning(false);
    setLookingUp(true);
    try {
      const food = await getProductByBarcode(code);
      if (food) open(food);
      else toast('Ese producto no está en Open Food Facts. Cargalo a mano.', { tone: 'info' });
    } catch {
      toast('No se pudo buscar el producto (¿sin conexión?)', { tone: 'warn' });
    } finally {
      setLookingUp(false);
    }
  };

  const savedFor = (base) => findCatalogByName(base.name);

  const list = useMemo(() => {
    if (tab === 'recientes') return recentFoods(history);
    if (tab === 'frecuentes') return frequentFoods(history, meal);
    return mine;
  }, [tab, history, meal, mine]);

  return (
    <>
      <Sheet
        size="large"
        title="Agregar comida"
        onClose={onClose}
        bodyClassName="pb-4"
        footer={
          added > 0 && (
            <Button size="lg" block onClick={onClose}>
              Listo · {added} {added === 1 ? 'agregado' : 'agregados'}
            </Button>
          )
        }
      >
        {/* Momento + buscador (fijos arriba) */}
        <div className="sticky top-0 z-10 sheet px-5 pb-3 space-y-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
            {MEALS.map((m) => (
              <Chip key={m.id} active={meal === m.id} onClick={() => setMeal(m.id)}>
                {m.label}
              </Chip>
            ))}
          </div>
          <div className="flex gap-2">
            <label className="field flex items-center gap-2 flex-1 py-2.5 focus-within:border-brand-500/60">
              <Search className="w-[18px] h-[18px] text-ink-500 shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar alimento o producto"
                enterKeyHint="search"
                className="flex-1 min-w-0 bg-transparent outline-none text-ink-100 placeholder-ink-500"
              />
              {query && (
                <button onClick={() => setQuery('')} aria-label="Borrar búsqueda" className="text-ink-500">
                  <X className="w-4 h-4" />
                </button>
              )}
            </label>
            <button onClick={() => setScanning(true)} aria-label="Escanear código de barras" className="btn-icon w-12 h-12 rounded-2xl bg-ink-900 text-ink-200">
              <ScanLine className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-5">
          {lookingUp && (
            <p className="text-sm text-ink-500 flex items-center gap-2 py-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Buscando el producto…
            </p>
          )}

          {searching ? (
            <SearchResults
              query={query}
              results={results}
              off={off}
              onRetry={() => setRetry((n) => n + 1)}
              onOpen={open}
              onAdd={add}
              onCreate={() => setForm({ item: { name: query.trim() } })}
            />
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <QuickTile icon={Zap} label="Rápido" onClick={() => setForm({ quick: true })} />
                <QuickTile icon={PlusCircle} label="Crear" onClick={() => setForm({ item: null })} />
                <QuickTile icon={Scale} label="Equivalencias" onClick={() => onOpenEquivalences({ meal })} />
              </div>

              <Segmented
                value={tab}
                onChange={setTab}
                size="sm"
                options={[
                  { value: 'frecuentes', label: 'Frecuentes' },
                  { value: 'recientes', label: 'Recientes' },
                  { value: 'mias', label: 'Mis comidas' },
                ]}
              />

              <div className="surface rounded-2xl overflow-hidden divide-y divide-[var(--hairline)] mt-3">
                {list.map((item) => {
                  const isMine = tab === 'mias';
                  const base = item.base || toBase(item);
                  const q = item.qty ?? defaultQty(base);
                  return (
                    <FoodRow
                      key={`${tab}_${item.id || item.name}`}
                      name={base.name}
                      free={item.free}
                      detail={isMine ? splitName(base.name).portion || (base.basis === '100g' ? '100 g' : '1 porción') : qtyLabel(base, q)}
                      kcal={scaleBase(base, q).kcal}
                      onOpen={() => open(item)}
                      onQuickAdd={() => add(item, q, item.free)}
                      right={
                        isMine ? (
                          <button onClick={() => setForm({ item, free: item.free })} aria-label="Editar" className="btn-icon w-9 h-9 text-ink-500">
                            <Pencil className="w-4 h-4" />
                          </button>
                        ) : null
                      }
                    />
                  );
                })}
                {list.length === 0 && (
                  <p className="px-4 py-6 text-sm text-ink-500 text-center leading-snug">
                    {tab === 'mias'
                      ? 'Guardá tus comidas de siempre con ★ o con "Crear" para agregarlas de un toque.'
                      : 'Acá van a aparecer las comidas que más registrás. Empezá buscando arriba.'}
                  </p>
                )}
              </div>
              {tab !== 'mias' && list.length > 0 && (
                <p className="text-xs text-ink-500 text-center mt-2.5 flex items-center justify-center gap-1">
                  <RotateCcw className="w-3 h-3" /> El + agrega la misma cantidad que la última vez
                </p>
              )}
            </>
          )}
        </div>
      </Sheet>

      {detail && (
        <FoodSheet
          base={detail.base}
          qty={detail.qty}
          meal={meal}
          free={detail.free}
          saved={Boolean(savedFor(detail.base))}
          onToggleSave={() => {
            const existing = savedFor(detail.base);
            if (existing) {
              deleteCatalogItem(existing.id);
              toast('Quitado de Mis comidas', { tone: 'info' });
            } else {
              saveCatalogItem({ ...detail.base }, detail.free);
              toast('Guardado en Mis comidas');
            }
            setDetail({ ...detail });
          }}
          onSubmit={({ qty, meal: m, free: isFree }) => {
            add({ base: detail.base }, qty, isFree, m);
            setDetail(null);
            setQuery('');
          }}
          onClose={() => setDetail(null)}
        />
      )}

      {form && (
        <FoodFormSheet
          item={form.item}
          quick={form.quick}
          free={form.free}
          meal={meal}
          onClose={() => setForm(null)}
          onLog={(base, isFree, m) => {
            add({ base }, defaultQty(base), isFree, m);
            setForm(null);
            setQuery('');
          }}
        />
      )}

      {scanning && (
        <Suspense fallback={null}>
          <BarcodeScanner onDetected={onBarcode} onCancel={() => setScanning(false)} />
        </Suspense>
      )}
    </>
  );
}

function QuickTile({ icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick} className="surface rounded-2xl h-[4.5rem] flex flex-col items-center justify-center gap-1.5 text-ink-200">
      <Icon className="w-5 h-5 text-brand-400" />
      <span className="text-[13px] font-semibold">{label}</span>
    </button>
  );
}

function Group({ title, icon: Icon, children }) {
  return (
    <section className="mt-4 first:mt-0">
      <h3 className="px-1 mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-ink-500 flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {title}
      </h3>
      <div className="surface rounded-2xl overflow-hidden divide-y divide-[var(--hairline)]">{children}</div>
    </section>
  );
}

function SearchResults({ query, results, off, onRetry, onOpen, onAdd, onCreate }) {
  const row = (item, opts = {}) => {
    const base = item.base || toBase(item);
    const q = item.qty ?? defaultQty(base);
    return (
      <FoodRow
        key={(opts.prefix || '') + (item.id || item.name)}
        name={base.name}
        free={item.free}
        detail={opts.detail ?? (item.base ? qtyLabel(base, q) : undefined)}
        kcal={scaleBase(base, q).kcal}
        onOpen={() => onOpen(item)}
        onQuickAdd={() => onAdd(item, q, item.free)}
      />
    );
  };
  const nothing = !results.mine.length && !results.history.length && !results.local.length && off.state !== 'loading' && !off.items.length;

  return (
    <div>
      {results.mine.length > 0 && <Group title="Mis comidas">{results.mine.map((x) => row(x, { prefix: 'm_' }))}</Group>}
      {results.history.length > 0 && <Group title="Ya registrados">{results.history.map((x) => row(x, { prefix: 'h_' }))}</Group>}
      {results.local.length > 0 && <Group title="Alimentos">{results.local.map((x) => row(x, { prefix: 'l_' }))}</Group>}

      {off.items.length > 0 && (
        <Group title="Productos envasados" icon={Barcode}>
          {off.items.map((x) => row(x, { prefix: 'o_', detail: 'por 100 g' }))}
        </Group>
      )}
      {off.state === 'loading' && (
        <p className="text-sm text-ink-500 flex items-center justify-center gap-2 py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Buscando productos envasados…
        </p>
      )}
      {off.state === 'offline' && <p className="text-sm text-ink-500 text-center py-4">Sin conexión: los productos envasados necesitan internet.</p>}
      {off.state === 'error' && (
        <div className="text-center py-4">
          <p className="text-sm text-ink-500">Open Food Facts no responde ahora.</p>
          <Button variant="ghost" size="sm" icon={RotateCcw} onClick={onRetry} className="mt-1">
            Reintentar
          </Button>
        </div>
      )}

      <button onClick={onCreate} className="w-full mt-4 rounded-2xl border border-dashed border-ink-600 py-3.5 text-sm font-semibold text-brand-400">
        {nothing ? 'No lo encontramos · ' : ''}Crear “{query.trim()}” a mano
      </button>
    </div>
  );
}

