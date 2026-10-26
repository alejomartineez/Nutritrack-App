import React, { useRef, useState } from 'react';
import { Target, Calculator, Moon, Droplet, Dumbbell, MoonStar, Share, Upload, History, Smartphone, Sun } from 'lucide-react';
import { Sheet, ListGroup, ListRow, Switch, Segmented, Button, NumberField, toast } from '../ui';
import { useSettings, updateSettings } from '../lib/settings';
import { applyTheme } from '../lib/appearance';
import { downloadFullBackup, readBackupFile, restoreFullBackup, lastBackupAt, preUpgradeBackup } from '../backupStorage';
import { useGoals, setGoals } from './store';
import { DEFAULT_GOALS } from './model';
import { fmt, fmt1 } from './parts';

const daysAgo = (d) => Math.floor((Date.now() - d.getTime()) / 86400000);

export default function SettingsSheet({ onClose, onRecalculate, isStandalone }) {
  const settings = useSettings();
  const goals = useGoals();
  const [editGoals, setEditGoals] = useState(false);
  const [install, setInstall] = useState(false);
  const fileRef = useRef(null);
  const last = lastBackupAt();
  const pre = preUpgradeBackup();

  const setTheme = (theme) => {
    updateSettings({ theme });
    applyTheme(theme);
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!window.confirm('Esto reemplaza todos tus datos actuales por los del archivo. ¿Seguimos?')) return;
    try {
      restoreFullBackup(await readBackupFile(file));
      toast('Datos restaurados. Recargando…');
      setTimeout(() => window.location.reload(), 700);
    } catch (err) {
      toast(err.message || 'No se pudo restaurar', { tone: 'warn' });
    }
  };

  const exportPre = () => {
    const blob = new Blob([JSON.stringify(pre)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'nutritrack_antes_de_actualizar.json';
    a.click();
  };

  return (
    <Sheet title="Ajustes" onClose={onClose} size="large" bodyClassName="px-4 pb-8">
      <div className="space-y-6">
        <ListGroup title="Metas diarias" footer="Tocá para editarlas a mano, o recalculalas con tu peso, altura y objetivo.">
          <ListRow icon={Target} title="Calorías" value={`${fmt(goals.calories)} kcal`} onClick={() => setEditGoals(true)} chevron />
          <ListRow
            icon={Target}
            iconTone="ink"
            title="Macros"
            value={`${fmt(goals.protein)} · ${fmt(goals.carbs)} · ${fmt(goals.fat)} g`}
            subtitle="Proteína · Carbos · Grasa"
            onClick={() => setEditGoals(true)}
            chevron
          />
          <ListRow icon={Droplet} iconTone="ink" title="Agua" value={`${fmt1(goals.water / 1000)} L`} onClick={() => setEditGoals(true)} chevron />
          <ListRow icon={Calculator} title="Recalcular con mis datos" onClick={onRecalculate} chevron />
        </ListGroup>

        <ListGroup title="Apariencia">
          <div className="px-4 py-3">
            <Segmented
              value={settings.theme}
              onChange={setTheme}
              options={[
                { value: 'auto', label: 'Auto' },
                { value: 'dark', label: 'Oscuro', icon: Moon },
                { value: 'light', label: 'Claro', icon: Sun },
              ]}
            />
          </div>
        </ListGroup>

        <ListGroup title="Agua" footer="Cuánto suma cada toque en la tarjeta de agua.">
          <div className="px-4 py-3">
            <Segmented
              value={settings.glassMl}
              onChange={(glassMl) => updateSettings({ glassMl })}
              options={[200, 250, 300, 500].map((v) => ({ value: v, label: `${v} ml` }))}
            />
          </div>
        </ListGroup>

        <ListGroup title="Secciones" footer="Apagá lo que no uses. Los datos no se borran.">
          <ListRow
            icon={Dumbbell}
            iconTone="entreno"
            title="Entreno"
            right={<Switch checked={settings.modules.entreno} onChange={(v) => updateSettings({ modules: { ...settings.modules, entreno: v } })} label="Entreno" />}
          />
          <ListRow
            icon={MoonStar}
            iconTone="sueno"
            title="Sueño"
            right={<Switch checked={settings.modules.sueno} onChange={(v) => updateSettings({ modules: { ...settings.modules, sueno: v } })} label="Sueño" />}
          />
        </ListGroup>

        <ListGroup
          title="Copia de seguridad"
          footer={
            last
              ? `Última copia: ${daysAgo(last) === 0 ? 'hoy' : `hace ${daysAgo(last)} días`}. Guardala en Archivos o mandátela por WhatsApp.`
              : 'Todo vive en este teléfono. Hacé una copia de vez en cuando (en iPhone se guarda en Archivos o la podés mandar por WhatsApp).'
          }
        >
          <ListRow
            icon={Share}
            title="Exportar todo"
            subtitle={last && daysAgo(last) > 14 ? 'Hace rato que no hacés una copia' : undefined}
            onClick={async () => {
              const r = await downloadFullBackup();
              if (r !== 'cancelled') toast('Copia lista');
            }}
            chevron
          />
          <ListRow icon={Upload} iconTone="ink" title="Restaurar una copia" onClick={() => fileRef.current?.click()} chevron />
          {pre && <ListRow icon={History} iconTone="ink" title="Copia previa a la actualización" subtitle="Tus datos tal como estaban antes del rediseño" onClick={exportPre} chevron />}
        </ListGroup>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />

        {!isStandalone && (
          <ListGroup>
            <ListRow icon={Smartphone} title="Instalar en el iPhone" onClick={() => setInstall((v) => !v)} chevron />
            {install && (
              <p className="px-4 py-3 text-sm text-ink-400 leading-relaxed">
                En Safari: tocá <b className="text-ink-200">Compartir</b> → <b className="text-ink-200">Agregar a inicio</b> → <b className="text-ink-200">Agregar</b>. Se abre a
                pantalla completa y funciona sin conexión.
              </p>
            )}
          </ListGroup>
        )}

        <p className="text-center text-xs text-ink-600">NutriTrack · tus datos no salen de este teléfono</p>
      </div>

      {editGoals && <GoalsSheet goals={goals} onClose={() => setEditGoals(false)} />}
    </Sheet>
  );
}

function GoalsSheet({ goals, onClose }) {
  const [draft, setDraft] = useState({
    calories: String(goals.calories),
    protein: String(goals.protein),
    carbs: String(goals.carbs),
    fat: String(goals.fat),
    water: String(goals.water),
  });
  const n = (k) => parseFloat(String(draft[k]).replace(',', '.')) || 0;
  const macroKcal = n('protein') * 4 + n('carbs') * 4 + n('fat') * 9;
  const diff = macroKcal - n('calories');
  const pct = (k, f) => (macroKcal ? Math.round(((n(k) * f) / macroKcal) * 100) : 0);
  const field = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <Sheet
      title="Metas diarias"
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <Button variant="soft" tone="ink" size="lg" onClick={() => setDraft(Object.fromEntries(Object.entries(DEFAULT_GOALS).map(([k, v]) => [k, String(v)])))}>
            Restablecer
          </Button>
          <Button
            size="lg"
            block
            onClick={() => {
              setGoals({
                calories: n('calories') || DEFAULT_GOALS.calories,
                protein: n('protein'),
                carbs: n('carbs'),
                fat: n('fat'),
                water: n('water') || DEFAULT_GOALS.water,
              });
              toast('Metas actualizadas');
              onClose();
            }}
          >
            Guardar
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <NumberField label="Calorías" value={draft.calories} onChange={field('calories')} unit="kcal" inputClassName="text-lg font-semibold" />
        <div className="grid grid-cols-3 gap-2">
          <NumberField label={`Proteína · ${pct('protein', 4)}%`} value={draft.protein} onChange={field('protein')} unit="g" />
          <NumberField label={`Carbos · ${pct('carbs', 4)}%`} value={draft.carbs} onChange={field('carbs')} unit="g" />
          <NumberField label={`Grasa · ${pct('fat', 9)}%`} value={draft.fat} onChange={field('fat')} unit="g" />
        </div>
        <p className={`text-xs px-1 ${Math.abs(diff) > 60 ? 'text-amber-400' : 'text-ink-500'}`}>
          Los macros suman {fmt(macroKcal)} kcal{Math.abs(diff) > 60 ? ` (${diff > 0 ? '+' : ''}${fmt(diff)} respecto de la meta)` : ' ✓'}
        </p>
        <NumberField label="Agua" value={draft.water} onChange={field('water')} unit="ml" />
      </div>
    </Sheet>
  );
}
