import React, { useState, useRef } from 'react';

// ---------------------------------------------------------------------------
// SLIDES A PANTALLA COMPLETA (reutilizable)
//
// Motor presentacional de la intro por diapositivas: overlay full-screen,
// deslizable (swipe), con puntos indicadores, "Saltar" y un CTA que dice
// "Siguiente" hasta el último paso, donde muestra `finalLabel`. No maneja
// persistencia: el que lo usa decide cuándo mostrarlo y qué hace `onDone`.
//
// Cada slide: { key, visual, title, text }.
// ---------------------------------------------------------------------------

export default function SlidesIntro({
  slides,
  dotActiveClass = 'bg-emerald-400',
  buttonClass = 'bg-emerald-500 hover:bg-emerald-400 text-slate-900 focus-visible:ring-emerald-300',
  finalLabel = 'Empezar',
  finalIcon = null,
  onDone,
}) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef(null);

  const isLast = index === slides.length - 1;
  const go = (i) => setIndex(Math.max(0, Math.min(slides.length - 1, i)));
  const next = () => (isLast ? onDone() : go(index + 1));

  const onTouchStart = (e) => {
    touchStartX.current = e.changedTouches[0].clientX;
  };
  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
    touchStartX.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900 text-slate-100 flex justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Introducción"
    >
      <div
        className="w-full max-w-md flex flex-col"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)',
        }}
      >
        {/* Saltar (oculto en el último paso, donde el CTA ya cierra) */}
        <div className="h-8 px-5 flex justify-end">
          {!isLast && (
            <button
              onClick={onDone}
              className="text-sm font-semibold text-slate-400 hover:text-slate-200 focus-visible:ring-2 focus-visible:ring-emerald-400 rounded px-2 py-1"
            >
              Saltar
            </button>
          )}
        </div>

        {/* Slide activa */}
        <div
          className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-6 select-none"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {slides.map((s, i) => (
            <div
              key={`${s.key}-${i === index ? index : 'off'}`}
              className={i === index ? 'flex flex-col items-center gap-6 anim-fade-in-up' : 'hidden'}
            >
              {s.visual}
              <h2 className="text-2xl font-semibold tracking-tight text-slate-100">
                {s.title}
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed max-w-xs">{s.text}</p>
            </div>
          ))}
        </div>

        {/* Puntos indicadores */}
        <div className="flex justify-center gap-2 py-6">
          {slides.map((s, i) => (
            <button
              key={s.key}
              onClick={() => go(i)}
              aria-label={`Ir al paso ${i + 1}`}
              aria-current={i === index ? 'true' : undefined}
              className={`h-2 rounded-full transition-all focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                i === index ? `w-6 ${dotActiveClass}` : 'w-2 bg-slate-600 hover:bg-slate-500'
              }`}
            />
          ))}
        </div>

        {/* CTA principal */}
        <div className="px-5">
          <button
            onClick={next}
            className={`w-full flex items-center justify-center gap-2 rounded-2xl font-bold py-3.5 focus-visible:ring-2 transition-colors ${buttonClass}`}
          >
            {isLast ? (
              <>
                {finalIcon}
                {finalLabel}
              </>
            ) : (
              'Siguiente'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
