import React from 'react';
import { X, Delete, ArrowRight, Check, Disc3 } from 'lucide-react';
import { haptic } from '../lib/haptics';
import { fmtNum } from './format';

// Teclado propio acoplado abajo de la pantalla de entreno: la fila que se edita
// queda a la vista (el teclado del sistema la tapa y no tiene ±2,5).

export default function NumberPad({ label, decimal, step, reference, nextLabel, nextIcon = 'next', onKey, onStep, onNext, onCancel, onPlates }) {
  const key = (k, content, aria) => (
    <button
      key={k}
      type="button"
      aria-label={aria || k}
      onClick={() => onKey(k)}
      disabled={k === ',' && !decimal}
      className="h-[52px] rounded-xl bg-ink-700/60 text-[22px] font-semibold text-ink-100 num flex items-center justify-center active:bg-ink-600 disabled:opacity-30"
    >
      {content ?? k}
    </button>
  );
  const stepBtn = (d) => (
    <button
      type="button"
      onClick={() => {
        haptic(5);
        onStep(d);
      }}
      className="h-[52px] rounded-xl bg-entreno-500/15 text-entreno-300 text-base font-semibold num active:bg-entreno-500/25"
    >
      {`${d > 0 ? '+' : '−'}${fmtNum(Math.abs(d))}`}
    </button>
  );

  return (
    <div
      data-pad
      className="sheet rounded-t-[26px] px-3 pt-1.5 anim-item-in"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.6rem)' }}
    >
      <div className="flex items-center gap-2 h-11">
        <button type="button" onClick={onCancel} aria-label="Cancelar" className="btn-icon w-9 h-9 bg-ink-700/70 text-ink-400">
          <X className="w-4 h-4" strokeWidth={2.5} />
        </button>
        <p className="flex-1 min-w-0 text-center text-sm text-ink-400 truncate">
          <span className="font-semibold text-ink-200">{label}</span>
          {reference && <span>{` · Anterior ${reference}`}</span>}
        </p>
        {onPlates ? (
          <button type="button" onClick={onPlates} aria-label="Calculadora de discos" className="btn-icon w-9 h-9 bg-ink-700/70 text-ink-300">
            <Disc3 className="w-[18px] h-[18px]" />
          </button>
        ) : (
          <span className="w-9" />
        )}
      </div>
      <div className="grid grid-cols-4 gap-1.5 mt-1">
        {key('1')}
        {key('2')}
        {key('3')}
        {key('back', <Delete className="w-5 h-5 text-ink-300" />, 'Borrar')}
        {key('4')}
        {key('5')}
        {key('6')}
        {stepBtn(-step)}
        {key('7')}
        {key('8')}
        {key('9')}
        {stepBtn(step)}
        {key(',', decimal ? ',' : '')}
        {key('0')}
        <button
          type="button"
          onClick={() => {
            haptic();
            onNext();
          }}
          className="col-span-2 h-[52px] rounded-xl bg-entreno-500 text-onaccent text-base font-semibold flex items-center justify-center gap-1.5"
        >
          {nextIcon === 'check' && <Check className="w-5 h-5" strokeWidth={2.75} />}
          {nextLabel}
          {nextIcon === 'next' && <ArrowRight className="w-[18px] h-[18px]" strokeWidth={2.5} />}
        </button>
      </div>
    </div>
  );
}
