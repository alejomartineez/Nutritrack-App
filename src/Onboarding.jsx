import React from 'react';
import { PlusCircle, Utensils, Dumbbell, Moon, Flame, TrendingUp } from 'lucide-react';
import SlidesIntro from './SlidesIntro';

// ---------------------------------------------------------------------------
// INTRO DE PRIMERA VEZ (global)
//
// Slides a pantalla completa que aparecen una sola vez (el padre setea el flag
// `nutri_onboarded` al cerrar). No pide cuenta ni datos: solo presenta la
// dinámica de la app en 3 pasos y se puede saltar. Usa el motor SlidesIntro.
// ---------------------------------------------------------------------------

const EMERALD = 'from-emerald-400 to-teal-300';

const SLIDES = [
  {
    key: 'bienvenida',
    titleClass: EMERALD,
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
    titleClass: EMERALD,
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
    titleClass: 'from-orange-400 to-amber-300',
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
  return (
    <SlidesIntro
      slides={SLIDES}
      finalLabel="Empezar"
      finalIcon={<TrendingUp className="w-5 h-5" />}
      onDone={onDone}
    />
  );
}
