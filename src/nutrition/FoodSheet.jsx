import React, { useMemo, useState } from 'react';
import { Star, Trash2, Pencil, Minus, Plus } from 'lucide-react';
import { haptic } from '../lib/haptics';
import { Sheet, Button, Chip, Switch, NumberField } from '../ui';
import { MEALS, scaleBase, splitName, defaultQty } from './model';
import { MACROS, fmt, fmt1 } from './parts';

const PORTION_CHIPS = [0.5, 1, 1.5, 2];
const GRAM_CHIPS = [50, 100, 150, 200, 250];

/**
 * Detalle de un alimento: cantidad, momento y si es fuera de plan. Sirve para
 * agregar y para editar una comida ya registrada.
 *
 * @param mode 'add' | 'edit'
 * @param saved si el alimento está en Mis comidas (muestra la estrella llena)
 */
export default function FoodSheet({ base: initialBase, qty: initialQty, meal: initialMeal, free: initialFree = false, mode = 'add', saved, onToggleSave, onSubmit, onDelete, onClose }) {
  const [base, setBase] = useState(initialBase);
  const [editValues, setEditValues] = useState(false);
  const isGrams = base.basis === '100g';
  const [qtyText, setQtyText] = useState(String(initialQty ?? defaultQty(base)));
  const [meal, setMeal] = useState(initialMeal);
  const [free, setFree] = useState(initialFree);
  const qty = parseFloat(qtyText);
  const valid = Number.isFinite(qty) && qty > 0;
  const scaled = useMemo(() => scaleBase(base, valid ? qty : 0), [base, qty, valid]);
  const { title, portion } = splitName(base.name);

  const step = (dir) => {
    const inc = isGrams ? 10 : 0.5;
    const next = Math.max(inc, Math.round(((valid ? qty : 0) + dir * inc) * 100) / 100);
    haptic(5);
    setQtyText(String(next));
  };

  const unitHint = isGrams ? 'Valores por 100 g' : portion || base.portion || '1 porción';

  return (
    <Sheet
      title={title}
      subtitle={unitHint}
      onClose={onClose}
      headerRight={
        mode === 'add' && onToggleSave ? (
          <button onClick={onToggleSave} aria-label={saved ? 'Quitar de Mis comidas' : 'Guardar en Mis comidas'} className="btn-icon w-8 h-8 bg-ink-700/70">
            <Star className={`w-4 h-4 ${saved ? 'text-amber-400 fill-current' : 'text-ink-400'}`} />
          </button>
        ) : mode === 'edit' ? (
          <button
            onClick={() => setEditValues((v) => !v)}
            aria-label="Editar valores"
            aria-pressed={editValues}
            className={`btn-icon w-8 h-8 ${editValues ? 'bg-brand-500/20 text-brand-400' : 'bg-ink-700/70 text-ink-400'}`}
          >
            <Pencil className="w-4 h-4" />
          </button>
        ) : null
      }
      footer={
        <div className="flex items-center gap-3">
          {mode === 'edit' && onDelete && (
            <Button variant="soft" tone="red" size="lg" onClick={onDelete} aria-label="Borrar" className="w-[3.25rem] px-0">
              <Trash2 className="w-5 h-5" />
            </Button>
          )}
          <Button size="lg" block tone={free ? 'amber' : 'brand'} disabled={!valid} onClick={() => onSubmit({ qty, meal, free, base })}>
            {mode === 'edit' ? 'Guardar cambios' : `Agregar · ${fmt(scaled.kcal)} kcal`}
          </Button>
        </div>
      }
    >
      {/* Resumen en vivo */}
      <div className="rounded-3xl bg-ink-900 p-4 flex items-center gap-4">
        <div className="min-w-[5.5rem]">
          <p className="num-display text-4xl text-ink-50 leading-none">{valid ? fmt(scaled.kcal) : '—'}</p>
          <p className="text-xs text-ink-500 mt-1">kcal</p>
        </div>
        <div className="flex-1 grid grid-cols-3 gap-2">
          {MACROS.map((m) => (
            <div key={m.key} className="text-center">
              <p className="num text-lg font-semibold text-ink-100">{valid ? fmt1(scaled[m.key]) : '—'}</p>
              <p className="text-[11px] font-medium" style={{ color: m.color }}>
                {m.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {editValues && <ValuesEditor base={base} onChange={setBase} />}

      {/* Cantidad */}
      <div className="mt-5">
        <p className="text-xs font-medium text-ink-500 mb-2 px-1">{isGrams ? 'Cantidad (gramos)' : 'Porciones'}</p>
        <div className="flex items-center gap-3">
          <NumberField value={qtyText} onChange={setQtyText} unit={isGrams ? 'g' : 'porc.'} className="flex-1" inputClassName="text-lg font-semibold" />
          <button onClick={() => step(-1)} aria-label="Menos" className="btn-icon w-11 h-11 bg-ink-700/70 text-ink-200">
            <Minus className="w-5 h-5" strokeWidth={2.5} />
          </button>
          <button onClick={() => step(1)} aria-label="Más" className="btn-icon w-11 h-11 bg-brand-500/15 text-brand-400">
            <Plus className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>
        <div className="flex gap-2 mt-2.5 overflow-x-auto no-scrollbar">
          {(isGrams ? GRAM_CHIPS : PORTION_CHIPS).map((v) => (
            <Chip key={v} active={qty === v} onClick={() => setQtyText(String(v))}>
              {isGrams ? `${v} g` : v === 0.5 ? '½' : v === 1.5 ? '1½' : `${v}`}
            </Chip>
          ))}
        </div>
      </div>

      {/* Momento */}
      <div className="mt-5">
        <p className="text-xs font-medium text-ink-500 mb-2 px-1">Momento</p>
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
          {MEALS.map((m) => (
            <Chip key={m.id} active={meal === m.id} onClick={() => setMeal(m.id)}>
              {m.label}
            </Chip>
          ))}
        </div>
      </div>

      {/* Plan */}
      <div className="mt-5 rounded-2xl bg-ink-900 px-4 py-3 flex items-center gap-3">
        <div className="flex-1">
          <p className="text-[15px] font-medium text-ink-100">Fuera de plan</p>
          <p className="text-xs text-ink-500">Un gusto: cuenta igual, pero lo ves aparte</p>
        </div>
        <Switch checked={free} onChange={setFree} tone="amber" label="Fuera de plan" />
      </div>
    </Sheet>
  );
}

const n = (s) => {
  const v = parseFloat(String(s).replace(',', '.'));
  return Number.isFinite(v) && v >= 0 ? v : 0;
};

/** Corrige los valores por porción (o por 100 g) de una comida ya registrada. */
function ValuesEditor({ base, onChange }) {
  const [draft, setDraft] = useState({ name: base.name, kcal: String(base.kcal || ''), p: String(base.p || ''), c: String(base.c || ''), f: String(base.f || '') });
  const update = (k, v) => {
    const next = { ...draft, [k]: v };
    setDraft(next);
    onChange({ ...base, name: next.name || base.name, kcal: n(next.kcal), p: n(next.p), c: n(next.c), f: n(next.f) });
  };
  return (
    <div className="mt-4 rounded-3xl bg-ink-900 p-3 space-y-2">
      <p className="text-xs text-ink-500 px-1">Valores {base.basis === '100g' ? 'por 100 g' : 'por porción'}</p>
      <input value={draft.name} onChange={(e) => update('name', e.target.value)} className="field bg-ink-800" aria-label="Nombre" />
      <NumberField value={draft.kcal} onChange={(v) => update('kcal', v)} unit="kcal" />
      <div className="grid grid-cols-3 gap-2">
        <NumberField value={draft.p} onChange={(v) => update('p', v)} unit="P" />
        <NumberField value={draft.c} onChange={(v) => update('c', v)} unit="C" />
        <NumberField value={draft.f} onChange={(v) => update('f', v)} unit="G" />
      </div>
    </div>
  );
}
