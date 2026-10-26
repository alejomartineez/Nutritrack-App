import React from 'react';
import { ChevronRight, Minus, Plus } from 'lucide-react';
import { haptic } from '../lib/haptics';

export { default as Sheet, Overlay, useSheet } from './Sheet';
export { toast, Toaster } from './toast';

// ---------------------------------------------------------------------------
// Primitivas de UI. Todo lo visual nuevo se arma con esto, así el look es uno
// solo en las tres secciones. `tone` elige el acento: brand (nutrición),
// entreno, sueno, amber (fuera de plan), red (destructivo).
// ---------------------------------------------------------------------------

const FILL = {
  brand: 'bg-brand-500 text-onaccent',
  entreno: 'bg-entreno-500 text-onaccent',
  sueno: 'bg-sueno-500 text-onaccent',
  amber: 'bg-amber-500 text-onaccent',
  red: 'bg-red-500 text-white',
  ink: 'bg-ink-100 text-ink-900',
};
const SOFT = {
  brand: 'bg-brand-500/15 text-brand-300',
  entreno: 'bg-entreno-500/15 text-entreno-300',
  sueno: 'bg-sueno-500/15 text-sueno-300',
  amber: 'bg-amber-500/15 text-amber-300',
  red: 'bg-red-500/12 text-red-400',
  ink: 'bg-ink-700/70 text-ink-100',
};
const TEXT = {
  brand: 'text-brand-400',
  entreno: 'text-entreno-400',
  sueno: 'text-sueno-400',
  amber: 'text-amber-400',
  red: 'text-red-400',
  ink: 'text-ink-200',
};
export const toneText = (tone) => TEXT[tone] || TEXT.brand;
export const toneSoft = (tone) => SOFT[tone] || SOFT.brand;
export const toneFill = (tone) => FILL[tone] || FILL.brand;

const SIZES = {
  sm: 'h-9 px-3.5 text-sm rounded-full gap-1.5',
  md: 'h-11 px-4 text-[15px] rounded-2xl gap-2',
  lg: 'h-[3.25rem] px-5 text-base rounded-2xl gap-2',
};

/**
 * @param variant 'primary' | 'soft' | 'ghost' | 'outline'
 */
export function Button({ variant = 'primary', tone = 'brand', size = 'md', block = false, icon: Icon, className = '', children, onClick, ...rest }) {
  const look =
    variant === 'primary'
      ? FILL[tone]
      : variant === 'soft'
      ? SOFT[tone]
      : variant === 'outline'
      ? `border border-ink-600/70 ${TEXT[tone] === TEXT.ink ? 'text-ink-200' : TEXT[tone]}`
      : `${TEXT[tone]} hover:bg-ink-700/40`;
  return (
    <button
      onClick={(e) => {
        if (variant === 'primary') haptic();
        onClick?.(e);
      }}
      className={`inline-flex items-center justify-center font-semibold select-none disabled:opacity-40 disabled:pointer-events-none ${SIZES[size]} ${look} ${
        block ? 'w-full' : ''
      } ${className}`}
      {...rest}
    >
      {Icon && <Icon className={size === 'sm' ? 'w-4 h-4' : 'w-[18px] h-[18px]'} strokeWidth={2.25} />}
      {children}
    </button>
  );
}

export function IconButton({ icon: Icon, label, onClick, variant = 'soft', tone = 'ink', size = 'md', className = '', ...rest }) {
  const dims = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10';
  const look = variant === 'primary' ? FILL[tone] : variant === 'ghost' ? `${TEXT[tone]} hover:bg-ink-700/40` : SOFT[tone];
  return (
    <button onClick={onClick} aria-label={label} title={label} className={`btn-icon ${dims} ${look} ${className}`} {...rest}>
      <Icon className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} strokeWidth={2.1} />
    </button>
  );
}

export function Card({ as: Tag = 'div', className = '', padded = true, children, ...rest }) {
  return (
    <Tag className={`surface rounded-3xl ${padded ? 'p-4' : ''} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

/**
 * Encabezado de pantalla (título grande estilo iOS). Queda pegado arriba con un
 * degradé que tapa el contenido que pasa por detrás.
 */
export function ScreenHeader({ title, eyebrow, eyebrowTone, right, children, sticky = false }) {
  return (
    <header
      className={`${sticky ? 'app-header' : ''} -mx-5 px-5 pb-3`}
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.9rem)' }}
    >
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && (
            <p className={`text-[13px] font-semibold uppercase tracking-wide truncate ${eyebrowTone ? TEXT[eyebrowTone] : 'text-ink-500'}`}>{eyebrow}</p>
          )}
          <h1 className="text-[2rem] leading-[2.4rem] font-bold tracking-tight text-ink-50 truncate">{title}</h1>
        </div>
        {right && <div className="flex items-center gap-2 shrink-0 pb-1">{right}</div>}
      </div>
      {children}
    </header>
  );
}

/** Encabezado de sección: título chico + acción opcional a la derecha. */
export function SectionTitle({ children, action, className = '' }) {
  return (
    <div className={`flex items-end justify-between gap-3 px-1 mb-2 ${className}`}>
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-500">{children}</h2>
      {action}
    </div>
  );
}

/** Control segmentado estilo iOS. options: [{ value, label, icon? }] */
export function Segmented({ value, onChange, options, tone = 'ink', size = 'md', className = '' }) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const thumb = tone === 'ink' ? 'bg-ink-600/80' : FILL[tone];
  return (
    <div className={`relative grid rounded-xl bg-ink-700/60 p-0.5 ${className}`} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }} role="tablist">
      <span
        aria-hidden="true"
        className={`absolute top-0.5 bottom-0.5 left-0.5 rounded-[10px] shadow-raised transition-transform duration-300 ${thumb}`}
        style={{ width: `calc((100% - 4px) / ${options.length})`, transform: `translateX(${idx * 100}%)`, transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}
      />
      {options.map((o) => {
        const active = o.value === value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => {
              if (!active) haptic(5);
              onChange(o.value);
            }}
            className={`relative z-10 flex items-center justify-center gap-1.5 font-semibold ${size === 'sm' ? 'h-8 text-[13px]' : 'h-9 text-sm'} ${
              active ? (tone === 'ink' ? 'text-ink-50' : 'text-onaccent') : 'text-ink-400'
            }`}
            style={{ transform: 'none' }}
          >
            {Icon && <Icon className="w-4 h-4" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Switch({ checked, onChange, label, tone = 'brand' }) {
  const on = { brand: 'bg-brand-500', entreno: 'bg-entreno-500', sueno: 'bg-sueno-500', amber: 'bg-amber-500' }[tone];
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => {
        haptic(5);
        onChange(!checked);
      }}
      className={`shrink-0 w-[51px] h-[31px] rounded-full p-[2px] transition-colors ${checked ? on : 'bg-ink-600'}`}
      style={{ transform: 'none' }}
    >
      <span className={`block w-[27px] h-[27px] rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );
}

/** − valor + */
export function Stepper({ value, onChange, step = 1, min = 0, max = Infinity, format = (v) => v, tone = 'brand', className = '' }) {
  const set = (v) => {
    haptic(5);
    onChange(Math.min(max, Math.max(min, Math.round(v * 100) / 100)));
  };
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button aria-label="Menos" onClick={() => set(value - step)} disabled={value <= min} className="btn-icon w-9 h-9 bg-ink-700/70 text-ink-200 disabled:opacity-30">
        <Minus className="w-4 h-4" strokeWidth={2.5} />
      </button>
      <span className="num text-lg font-semibold text-ink-100 min-w-[3.5rem] text-center">{format(value)}</span>
      <button aria-label="Más" onClick={() => set(value + step)} disabled={value >= max} className={`btn-icon w-9 h-9 ${SOFT[tone]} disabled:opacity-30`}>
        <Plus className="w-4 h-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}

export function Chip({ active, onClick, tone = 'brand', children, className = '', ...rest }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 h-9 px-3.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
        active ? FILL[tone] : 'bg-ink-700/60 text-ink-300 hover:text-ink-100'
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Lista agrupada estilo Ajustes de iOS. */
export function ListGroup({ title, footer, children, className = '' }) {
  return (
    <section className={className}>
      {title && <h3 className="px-4 mb-1.5 text-[13px] font-medium uppercase tracking-wide text-ink-500">{title}</h3>}
      <div className="surface rounded-2xl overflow-hidden divide-y divide-[var(--hairline)]">{children}</div>
      {footer && <p className="px-4 mt-1.5 text-xs text-ink-500 leading-snug">{footer}</p>}
    </section>
  );
}

export function ListRow({ icon: Icon, iconTone = 'brand', title, subtitle, value, right, onClick, chevron, danger, className = '' }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} className={`w-full min-h-[3.25rem] px-4 py-2.5 flex items-center gap-3 text-left ${onClick ? 'active:bg-ink-700/40' : ''} ${className}`} style={onClick ? { transform: 'none' } : undefined}>
      {Icon && (
        <span className={`w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0 ${SOFT[iconTone]}`}>
          <Icon className="w-[18px] h-[18px]" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={`block text-[15px] ${danger ? 'text-red-400' : 'text-ink-100'} truncate`}>{title}</span>
        {subtitle && <span className="block text-xs text-ink-500 mt-0.5 leading-snug">{subtitle}</span>}
      </span>
      {value != null && <span className="num text-[15px] text-ink-400 shrink-0">{value}</span>}
      {right}
      {chevron && <ChevronRight className="w-4 h-4 text-ink-600 shrink-0" />}
    </Tag>
  );
}

/** Barra de progreso. `over` la pinta en ámbar. */
export function ProgressBar({ value, max, color, over = false, height = 6, className = '' }) {
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div className={`w-full rounded-full bg-ink-700 overflow-hidden ${className}`} style={{ height }}>
      <div
        className="h-full rounded-full transition-[width] duration-700"
        style={{ width: `${pct * 100}%`, backgroundColor: over ? 'rgb(var(--amber-400))' : color, transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)' }}
      />
    </div>
  );
}

/** Anillo de progreso. children va centrado adentro. */
export function Ring({ value, max, size = 120, stroke = 12, color = 'rgb(var(--brand-400))', track = 'rgb(var(--ink-700))', children, className = '' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.16,1,0.3,1), stroke 0.3s' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action, className = '' }) {
  return (
    <div className={`rounded-3xl border border-dashed border-ink-600/60 px-6 py-8 text-center ${className}`}>
      {Icon && <Icon className="w-7 h-7 text-ink-500 mx-auto mb-2.5" />}
      {title && <p className="text-[15px] font-semibold text-ink-200">{title}</p>}
      {text && <p className="text-sm text-ink-500 mt-1 leading-snug">{text}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/** Campo numérico con unidad; selecciona todo al enfocar para reemplazar de una. */
export function NumberField({ label, value, onChange, unit, placeholder, className = '', inputClassName = '', autoFocus, ...rest }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="block text-xs font-medium text-ink-500 mb-1.5 px-1">{label}</span>}
      <span className="field flex items-center gap-1.5 focus-within:border-brand-500/60">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onFocus={(e) => e.target.select()}
          onChange={(e) => onChange(e.target.value.replace(',', '.').replace(/[^0-9.]/g, ''))}
          className={`num w-full min-w-0 bg-transparent outline-none text-ink-100 placeholder-ink-600 ${inputClassName}`}
          {...rest}
        />
        {unit && <span className="text-sm text-ink-500 shrink-0">{unit}</span>}
      </span>
    </label>
  );
}

export function TextField({ label, value, onChange, placeholder, className = '', ...rest }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="block text-xs font-medium text-ink-500 mb-1.5 px-1">{label}</span>}
      <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="field" {...rest} />
    </label>
  );
}

/** Número grande + etiqueta, para tarjetas de resumen. */
export function Stat({ label, value, unit, sub, tone, className = '' }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-xs text-ink-500 truncate">{label}</p>
      <p className={`num-display text-2xl mt-0.5 ${tone ? TEXT[tone] : 'text-ink-100'}`}>
        {value}
        {unit && <span className="text-sm font-semibold text-ink-500 ml-1">{unit}</span>}
      </p>
      {sub && <p className="text-xs text-ink-500 mt-0.5 truncate">{sub}</p>}
    </div>
  );
}
