import React, { useState, useRef } from 'react';
import { PlusCircle, Utensils, Dumbbell, Moon, Flame, TrendingUp } from 'lucide-react';

// ---------------------------------------------------------------------------
// INTRO DE PRIMERA VEZ
//
// Slides a pantalla completa que aparecen una sola vez (el padre setea el flag
// `nutri_onboarded` al cerrar). No pide cuenta ni datos: solo presenta la
// dinámica de la app en 3 pasos y se puede saltar. Deslizable + botones.
// ---------------------------------------------------------------------------

const SLIDES = [
  {
    key: 'bienvenida',
    accent: 'from-emerald-400 to-teal-300',
    visual: (
      <div className="flex items-center justify-center w-28 h-28 rounded-full bg-emerald-500/10 border border-emerald-500/30">
        <Utensils className="w-12 h-12 text-emerald-400" />
      </div>
    ),
    title: 'Bienvenido a NutriTrack',
    text: 'Registrá tu día y construí el hábito, a tu ritmo. Sin cuentas ni configuraciones: todo se guarda en tu teléfono.',
  },
  {
    key: 'registrar',
    accent: 'from-emerald-400 to-teal-300',
    visual: (
      <div className="flex items-center justify-center w-28 h-28 rounded-full bg-emerald-500/10 border border-emerald-500/30">
        <PlusCircle className="w-12 h-12 text-emerald-400" />
      </div>
    ),
    title: 'Registrá tus comidas',
    text: 'Anotá lo que comés con un toque. El anillo de calorías se va llenando y ves al instante cuánto te queda para tu meta.',
  },
  {
    key: 'habito',
    accent: 'from-orange-400 to-amber-300',
    visual: (
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30">
            <Utensils className="w-5 h-5 text-emerald-400" />
          </span>
          <span className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-500/10 border border-orange-500/30">
            <Dumbbell className="w-5 h-5 text-orange-400" />
          </span>
          <span className="flex items-center justify-center w-12 h-12 rounded-full bg-violet-500/10 border border-violet-500/30">
            <Moon className="w-5 h-5 text-violet-400" />
          </span>
        </div>
        <span className="flex items-center gap-1.5 text-sm text-orange-300 font-semibold">
          <Flame className="w-4 h-4" /> Racha en marcha
        </span>
      </div>
    ),
    title: 'Construí el hábito',
    text: 'Cerrá tus anillos día a día y mantené la racha. Mirá tu progreso cuando quieras en la pestaña Progreso.',
  },
];

export default function Onboarding({ onDone }) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef(null);

  const isLast = index === SLIDES.length - 1;
  const go = (i) => setIndex(Math.max(0, Math.min(SLIDES.length - 1, i)));
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
      aria-label="Introducción a NutriTrack"
    >
      <div
        className="w-full max-w-md flex flex-col"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)',
        }}
      >
        {/* Saltar (oculto en el último paso, donde el CTA ya es "Empezar") */}
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
          {SLIDES.map((s, i) => (
            <div
              key={`${s.key}-${i === index ? index : 'off'}`}
              className={i === index ? 'flex flex-col items-center gap-6 anim-fade-in-up' : 'hidden'}
            >
              {s.visual}
              <h2
                className={`text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r ${s.accent}`}
              >
                {s.title}
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed max-w-xs">{s.text}</p>
            </div>
          ))}
        </div>

        {/* Puntos indicadores */}
        <div className="flex justify-center gap-2 py-6">
          {SLIDES.map((s, i) => (
            <button
              key={s.key}
              onClick={() => go(i)}
              aria-label={`Ir al paso ${i + 1}`}
              aria-current={i === index ? 'true' : undefined}
              className={`h-2 rounded-full transition-all focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                i === index ? 'w-6 bg-emerald-400' : 'w-2 bg-slate-600 hover:bg-slate-500'
              }`}
            />
          ))}
        </div>

        {/* CTA principal */}
        <div className="px-5">
          <button
            onClick={next}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold py-3.5 focus-visible:ring-2 focus-visible:ring-emerald-300 transition-colors"
          >
            {isLast ? (
              <>
                <TrendingUp className="w-5 h-5" />
                Empezar
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
