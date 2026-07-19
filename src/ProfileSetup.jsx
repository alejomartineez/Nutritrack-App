import React, { useState, useMemo } from 'react';
import { Calculator, Check, ChevronRight, Flame, Info } from 'lucide-react';
import { computePlanFromProfile } from './lib/nutritionCalcs';

// ---------------------------------------------------------------------------
// PASO DE PERFIL (cálculo del plan calórico)
//
// Aparece una vez, justo después de los slides de bienvenida, solo para
// usuarios nuevos. Recoge sexo, edad, peso, altura, nivel de actividad y
// objetivo, y calcula un plan personalizado con la ecuación de Mifflin-St Jeor
// (ver lib/nutritionCalcs). No pide cuenta ni sube nada: todo queda local.
//
// `onComplete(plan, profile)` recibe el plan calculado (mismo shape que goals)
// y el perfil crudo para poder recalcular más adelante. `onSkip` cierra sin
// tocar las metas por defecto.
//
// Se reutiliza en dos contextos: durante el onboarding (formulario vacío) y
// desde Ajustes (con `initialProfile` para precargar los datos guardados). Las
// etiquetas del CTA y del descarte se pasan por props para adaptar el copy.
// ---------------------------------------------------------------------------

const ACTIVITY_OPTIONS = [
  { value: 'sedentario', label: 'Sedentario', hint: 'Poco o nada de ejercicio' },
  { value: 'ligero', label: 'Ligero', hint: 'Ejercicio suave 1-3 días/sem' },
  { value: 'moderado', label: 'Moderado', hint: 'Ejercicio 3-5 días/sem' },
  { value: 'activo', label: 'Activo', hint: 'Ejercicio intenso 6-7 días/sem' },
  { value: 'muy_activo', label: 'Muy activo', hint: 'Trabajo físico o doble turno' },
];

const OBJECTIVE_OPTIONS = [
  { value: 'perder', label: 'Bajar de peso', emoji: '📉' },
  { value: 'mantener', label: 'Mantenerme', emoji: '⚖️' },
  { value: 'ganar', label: 'Ganar masa', emoji: '📈' },
];

// Rangos plausibles: fuera de esto el cálculo pierde sentido y se pide corregir.
const inRange = (n, min, max) => Number.isFinite(n) && n >= min && n <= max;

export default function ProfileSetup({
  onComplete,
  onSkip,
  initialProfile = null,
  submitLabel = 'Usar este plan',
  dismissLabel = 'Omitir',
}) {
  const [sex, setSex] = useState(initialProfile?.sex ?? 'hombre');
  const [age, setAge] = useState(initialProfile?.age != null ? String(initialProfile.age) : '');
  const [weight, setWeight] = useState(initialProfile?.weightKg != null ? String(initialProfile.weightKg) : '');
  const [height, setHeight] = useState(initialProfile?.heightCm != null ? String(initialProfile.heightCm) : '');
  const [activityLevel, setActivityLevel] = useState(initialProfile?.activityLevel ?? 'moderado');
  const [objective, setObjective] = useState(initialProfile?.objective ?? 'mantener');

  const ageNum = parseFloat(age);
  const weightNum = parseFloat(weight);
  const heightNum = parseFloat(height);

  const validAge = inRange(ageNum, 12, 100);
  const validWeight = inRange(weightNum, 30, 300);
  const validHeight = inRange(heightNum, 120, 250);
  const isComplete = validAge && validWeight && validHeight;

  // Solo se calcula (y muestra la vista previa) cuando los tres datos son válidos.
  const plan = useMemo(() => {
    if (!isComplete) return null;
    return computePlanFromProfile({
      sex,
      weightKg: weightNum,
      heightCm: heightNum,
      age: ageNum,
      activityLevel,
      objective,
    });
  }, [isComplete, sex, weightNum, heightNum, ageNum, activityLevel, objective]);

  const handleConfirm = () => {
    if (!plan) return;
    onComplete(plan, {
      sex,
      age: ageNum,
      weightKg: weightNum,
      heightCm: heightNum,
      activityLevel,
      objective,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900 text-slate-100 flex justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Calculá tu plan"
    >
      <div
        className="w-full max-w-md flex flex-col"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)',
        }}
      >
        {/* Barra superior: omitir */}
        <div className="h-8 px-5 flex justify-end">
          <button
            onClick={onSkip}
            className="text-sm font-semibold text-slate-400 hover:text-slate-200 focus-visible:ring-2 focus-visible:ring-emerald-400 rounded px-2 py-1"
          >
            {dismissLabel}
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto px-6 pt-2 space-y-6">
          {/* Encabezado */}
          <div className="flex flex-col items-center text-center gap-3">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <Calculator className="w-9 h-9 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300">
              Calculemos tu plan
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              Con estos datos estimamos tus calorías diarias con la fórmula
              Mifflin-St Jeor, la más usada en nutrición clínica. Podés ajustarlo
              después.
            </p>
          </div>

          {/* Sexo */}
          <Field label="Sexo">
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'hombre', label: 'Hombre' },
                { value: 'mujer', label: 'Mujer' },
              ].map((o) => (
                <SegButton key={o.value} active={sex === o.value} onClick={() => setSex(o.value)}>
                  {o.label}
                </SegButton>
              ))}
            </div>
          </Field>

          {/* Edad / Peso / Altura */}
          <div className="grid grid-cols-3 gap-3">
            <NumberField label="Edad" unit="años" value={age} onChange={setAge}
              invalid={age !== '' && !validAge} placeholder="30" />
            <NumberField label="Peso" unit="kg" value={weight} onChange={setWeight}
              invalid={weight !== '' && !validWeight} placeholder="70" />
            <NumberField label="Altura" unit="cm" value={height} onChange={setHeight}
              invalid={height !== '' && !validHeight} placeholder="175" />
          </div>

          {/* Nivel de actividad */}
          <Field label="Nivel de actividad">
            <div className="space-y-2">
              {ACTIVITY_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setActivityLevel(o.value)}
                  className={`w-full flex items-center justify-between rounded-xl border px-4 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                    activityLevel === o.value
                      ? 'bg-emerald-500/10 border-emerald-500/40'
                      : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${activityLevel === o.value ? 'text-emerald-300' : 'text-slate-200'}`}>
                      {o.label}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{o.hint}</p>
                  </div>
                  {activityLevel === o.value && <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />}
                </button>
              ))}
            </div>
          </Field>

          {/* Objetivo */}
          <Field label="Tu objetivo">
            <div className="grid grid-cols-3 gap-2">
              {OBJECTIVE_OPTIONS.map((o) => (
                <SegButton key={o.value} active={objective === o.value} onClick={() => setObjective(o.value)}>
                  <span className="flex flex-col items-center gap-1">
                    <span className="text-lg leading-none">{o.emoji}</span>
                    <span className="text-xs leading-tight text-center">{o.label}</span>
                  </span>
                </SegButton>
              ))}
            </div>
          </Field>

          {/* Vista previa del plan calculado */}
          {plan ? (
            <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/25 p-4 anim-fade-in-up">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-bold text-slate-200">Tu plan estimado</span>
              </div>
              <div className="flex items-baseline gap-1.5 mb-3">
                <span className="font-mono text-4xl font-black text-emerald-300">{plan.calories}</span>
                <span className="text-sm text-slate-400 font-semibold">kcal / día</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <MacroPill label="Proteína" value={`${Math.round(plan.protein)} g`} color="text-emerald-300" />
                <MacroPill label="Carbos" value={`${Math.round(plan.carbs)} g`} color="text-amber-300" />
                <MacroPill label="Grasas" value={`${Math.round(plan.fat)} g`} color="text-slate-300" />
              </div>
              <p className="mt-3 text-[11px] text-slate-500 leading-snug flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
                Es una estimación orientativa, no un consejo médico. Ante dudas,
                consultá a un profesional de la salud.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-700 p-4 text-center">
              <p className="text-xs text-slate-500">
                Completá edad, peso y altura para ver tu plan estimado.
              </p>
            </div>
          )}
        </div>

        {/* CTA fijo */}
        <div className="px-5 pt-4">
          <button
            onClick={handleConfirm}
            disabled={!isComplete}
            className={`w-full flex items-center justify-center gap-2 rounded-2xl font-bold py-3.5 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-300 ${
              isComplete
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-900'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {submitLabel}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SUBCOMPONENTES
// ---------------------------------------------------------------------------

function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      {children}
    </div>
  );
}

function SegButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400 ${
        active
          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
          : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
      }`}
    >
      {children}
    </button>
  );
}

function NumberField({ label, unit, value, onChange, invalid, placeholder }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <div
        className={`rounded-xl border bg-slate-800/60 px-3 py-2.5 flex items-baseline gap-1 ${
          invalid ? 'border-red-500/50' : 'border-slate-700 focus-within:border-emerald-500/50'
        }`}
      >
        <input
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
          className="w-full bg-transparent text-lg font-bold text-slate-100 placeholder:text-slate-600 focus:outline-none min-w-0"
        />
        <span className="text-xs text-slate-500 shrink-0">{unit}</span>
      </div>
    </div>
  );
}

function MacroPill({ label, value, color }) {
  return (
    <div className="rounded-xl bg-slate-800/60 border border-slate-700 px-2 py-2 text-center">
      <p className={`font-mono text-base font-bold ${color}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}
