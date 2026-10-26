import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Sheet, Button, Switch, NumberField, TextField, Chip, toast } from '../ui';
import { kcalFromMacros } from '../lib/nutritionCalcs';
import { MEALS, toBase, splitName } from './model';
import { saveCatalogItem, deleteCatalogItem } from './store';

const num = (s) => {
  const n = parseFloat(String(s).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

/**
 * Crear / editar un alimento de Mis comidas, o cargar calorías rápidas.
 * @param item  null (nuevo), { name } (nuevo con nombre sugerido) o un ítem existente (con id)
 * @param quick modo "Rápido": solo calorías (y macros opcionales), sin guardar
 */
export default function FoodFormSheet({ item, quick = false, free: initialFree = false, meal: initialMeal, onClose, onLog }) {
  const editing = Boolean(item?.id);
  const parts = splitName(item?.name || '');
  const [name, setName] = useState(editing ? parts.title : item?.name || '');
  const [portion, setPortion] = useState(editing ? item.portion || parts.portion : '');
  const [kcal, setKcal] = useState(item?.kcal != null ? String(item.kcal) : '');
  const [p, setP] = useState(item?.p ? String(item.p) : '');
  const [c, setC] = useState(item?.c ? String(item.c) : '');
  const [f, setF] = useState(item?.f ? String(item.f) : '');
  const [free, setFree] = useState(initialFree);
  const [meal, setMeal] = useState(initialMeal);

  const derived = Math.round(kcalFromMacros({ p: num(p), c: num(c), f: num(f) }));
  const kcalValue = num(kcal) > 0 ? num(kcal) : derived;
  const validQuick = kcalValue > 0;
  const valid = quick ? validQuick : name.trim() && kcalValue > 0;

  const buildBase = () => {
    const fullName = quick
      ? name.trim() || 'Calorías rápidas'
      : portion.trim()
      ? `${name.trim()} (${portion.trim()})`
      : name.trim();
    return toBase({ name: fullName, kcal: Math.round(kcalValue), p: num(p), c: num(c), f: num(f), basis: item?.basis });
  };

  const save = () => saveCatalogItem({ ...buildBase(), id: item?.id }, free);

  const title = quick ? 'Calorías rápidas' : editing ? 'Editar comida' : 'Nueva comida';
  const mismatch = num(kcal) > 0 && derived > 0 && Math.abs(derived - num(kcal)) > Math.max(25, num(kcal) * 0.15);

  return (
    <Sheet
      title={title}
      subtitle={quick ? 'Cuando no sabés el detalle: solo el total' : 'Queda guardada en Mis comidas'}
      onClose={onClose}
      footer={
        quick ? (
          <Button size="lg" block tone={free ? 'amber' : 'brand'} disabled={!valid} onClick={() => onLog(buildBase(), free, meal)}>
            Agregar {kcalValue > 0 ? `· ${Math.round(kcalValue)} kcal` : ''}
          </Button>
        ) : editing ? (
          <div className="flex gap-3">
            <Button
              variant="soft"
              tone="red"
              size="lg"
              aria-label="Eliminar"
              className="w-[3.25rem] px-0"
              onClick={() => {
                if (!window.confirm(`¿Eliminar “${name}” de Mis comidas?`)) return;
                deleteCatalogItem(item.id);
                toast('Eliminada de Mis comidas', { tone: 'info' });
                onClose();
              }}
            >
              <Trash2 className="w-5 h-5" />
            </Button>
            <Button
              size="lg"
              block
              disabled={!valid}
              onClick={() => {
                save();
                toast('Cambios guardados');
                onClose();
              }}
            >
              Guardar
            </Button>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button
              variant="soft"
              tone="ink"
              size="lg"
              disabled={!valid}
              onClick={() => {
                save();
                toast('Guardada en Mis comidas');
                onClose();
              }}
            >
              Solo guardar
            </Button>
            <Button
              size="lg"
              block
              tone={free ? 'amber' : 'brand'}
              disabled={!valid}
              onClick={() => {
                const saved = save();
                onLog(toBase(saved), free, meal);
              }}
            >
              Guardar y agregar
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-3">
        {quick ? (
          <>
            <NumberField label="Calorías" value={kcal} onChange={setKcal} unit="kcal" inputClassName="text-2xl font-bold" autoFocus />
            <TextField label="Nombre (opcional)" value={name} onChange={setName} placeholder="Ej: Cumpleaños de Juli" />
          </>
        ) : (
          <>
            <TextField label="Nombre" value={name} onChange={setName} placeholder="Ej: Tostadas con palta" />
            <TextField label="Porción (opcional)" value={portion} onChange={setPortion} placeholder="Ej: 2 tostadas, 1 plato, 200 g" />
            <NumberField label="Calorías" value={kcal} onChange={setKcal} unit="kcal" placeholder={derived ? String(derived) : ''} />
          </>
        )}

        <div>
          <p className="text-xs font-medium text-ink-500 mb-1.5 px-1">Macros {quick ? '(opcional)' : ''}</p>
          <div className="grid grid-cols-3 gap-2">
            <NumberField value={p} onChange={setP} unit="P" placeholder="0" />
            <NumberField value={c} onChange={setC} unit="C" placeholder="0" />
            <NumberField value={f} onChange={setF} unit="G" placeholder="0" />
          </div>
          {!num(kcal) && derived > 0 && <p className="text-xs text-ink-500 mt-1.5 px-1">Se calculan {derived} kcal a partir de los macros.</p>}
          {mismatch && <p className="text-xs text-amber-400 mt-1.5 px-1">Ojo: por los macros serían ~{derived} kcal. Se usa lo que cargaste.</p>}
        </div>

        {(quick || !editing) && (
          <div>
            <p className="text-xs font-medium text-ink-500 mb-1.5 px-1">Momento</p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
              {MEALS.map((m) => (
                <Chip key={m.id} active={meal === m.id} onClick={() => setMeal(m.id)}>
                  {m.label}
                </Chip>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-ink-900 px-4 py-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-[15px] font-medium text-ink-100">Fuera de plan</p>
            <p className="text-xs text-ink-500">{editing || !quick ? 'Se agrega como gusto por defecto' : 'Cuenta como gusto'}</p>
          </div>
          <Switch checked={free} onChange={setFree} tone="amber" label="Fuera de plan" />
        </div>
      </div>
    </Sheet>
  );
}
