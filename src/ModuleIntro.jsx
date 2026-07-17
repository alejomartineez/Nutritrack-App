import React, { useState } from 'react';
import SlidesIntro from './SlidesIntro';

// ---------------------------------------------------------------------------
// INTRO DE MÓDULO (una sola vez, a pantalla completa)
//
// La primera vez que entrás a un módulo (Sueño / Entreno) muestra unas slides
// a pantalla completa que explican para qué sirve y qué hace cada sub-pestaña,
// para que nadie quede perdido. Se cierra con el CTA final y deja un flag en
// localStorage, así no vuelve. Mismo formato que la intro global.
// ---------------------------------------------------------------------------

export default function ModuleIntro({ storageKey, slides, dotActiveClass, buttonClass, finalLabel = 'Entendido', finalIcon }) {
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
    <SlidesIntro
      slides={slides}
      dotActiveClass={dotActiveClass}
      buttonClass={buttonClass}
      finalLabel={finalLabel}
      finalIcon={finalIcon}
      onDone={dismiss}
    />
  );
}
