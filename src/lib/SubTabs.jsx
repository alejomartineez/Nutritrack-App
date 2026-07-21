import React from 'react';

// ---------------------------------------------------------------------------
// Barra de sub-pestañas de módulo (Entreno y Sueño).
//
// Antes cada módulo repetía su propia grilla de botones con clases distintas
// (Entreno usaba `entreno-*`, Sueño `violet-*`/`indigo-*`), así que las dos
// pantallas se sentían de apps diferentes. Esto es la misma barra con el
// acento como parámetro.
//
// Las clases van en un mapa literal y no interpoladas: Tailwind escanea el
// código fuente y no ve `bg-${accent}-500`.
// ---------------------------------------------------------------------------

const ACCENTS = {
  entreno: {
    active: 'bg-entreno-500 text-ink-900',
    idle: 'text-ink-400 hover:text-ink-200',
  },
  sueno: {
    active: 'bg-sueno-500 text-ink-900',
    idle: 'text-ink-400 hover:text-ink-200',
  },
  brand: {
    active: 'bg-brand-500 text-ink-900',
    idle: 'text-ink-400 hover:text-ink-200',
  },
};

export default function SubTabs({ tabs, value, onChange, accent = 'brand' }) {
  const styles = ACCENTS[accent] || ACCENTS.brand;

  return (
    <div
      role="tablist"
      className="grid gap-1 surface rounded-2xl p-1"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={`py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              active ? styles.active : styles.idle
            }`}
          >
            <tab.icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
