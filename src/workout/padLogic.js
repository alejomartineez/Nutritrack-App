import { fmtNum } from './format';

// Lógica del teclado numérico (separada para testearla).

/** Aplica una tecla al buffer. `fresh` = el valor está seleccionado y lo próximo lo reemplaza. */
export const applyKey = ({ buffer, fresh }, key, { decimal = true } = {}) => {
  if (key === 'back') return { buffer: fresh ? '' : buffer.slice(0, -1), fresh: false };
  if (key === ',') {
    if (!decimal) return { buffer, fresh };
    if (fresh || buffer === '') return { buffer: '0,', fresh: false };
    return { buffer: buffer.includes(',') ? buffer : `${buffer},`, fresh: false };
  }
  const base = fresh ? '' : buffer;
  if (base.replace(',', '').length >= 6) return { buffer: base, fresh: false };
  if (base.includes(',') && base.split(',')[1].length >= 2) return { buffer: base, fresh: false };
  return { buffer: base === '0' ? key : base + key, fresh: false };
};

export const parseBuffer = (buffer, decimal) => {
  if (!buffer) return '';
  const n = decimal ? parseFloat(buffer.replace(',', '.')) : parseInt(buffer, 10);
  return Number.isFinite(n) ? n : '';
};

export const toBuffer = (v) => (v === '' || v == null ? '' : fmtNum(v).replace(/\./g, ''));
