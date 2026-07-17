import React, { useState } from 'react';

// ---------------------------------------------------------------------------
// INTRO DE MÓDULO (una sola vez)
//
// Tarjeta explicativa breve que aparece la primera vez que entrás a un módulo
// (Sueño / Entreno) para que nadie quede perdido: dice para qué sirve y qué hace
// cada sub-pestaña. Se descarta con "Entendido" y deja un flag en localStorage,
// así no vuelve a molestar. En contexto y no invasiva (no tapa la pantalla).
// ---------------------------------------------------------------------------

export default function ModuleIntro({ storageKey, accent, icon, title, description, points }) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return Boolean(localStorage.getItem(storageKey));
    } catch {
      return false;
    }
  });

  const dismiss = () => {
    try {
      localStorage.setItem(storageKey, '1');
    } catch {
      // storage no disponible: se cierra igual, aceptable
    }
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className={`rounded-2xl border p-4 anim-fade-in-up ${accent.card}`}>
      <div className="flex items-start gap-3">
        <span className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${accent.iconWrap}`}>
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className={`text-base font-bold ${accent.title}`}>{title}</h3>
          <p className="text-sm text-slate-300 leading-snug mt-0.5">{description}</p>
        </div>
      </div>

      <ul className="mt-3 space-y-2">
        {points.map((p) => {
          const PIcon = p.icon;
          return (
            <li key={p.label} className="flex items-start gap-2.5">
              <PIcon className={`w-4 h-4 mt-0.5 shrink-0 ${accent.bullet}`} />
              <p className="text-sm text-slate-300 leading-snug">
                <span className="font-semibold text-slate-100">{p.label}:</span> {p.text}
              </p>
            </li>
          );
        })}
      </ul>

      <button
        onClick={dismiss}
        className={`w-full mt-4 rounded-xl py-2.5 font-bold text-sm focus-visible:ring-2 focus-visible:ring-offset-0 transition-colors ${accent.button}`}
      >
        Entendido
      </button>
    </div>
  );
}
