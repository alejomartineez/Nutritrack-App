import { describe, it, expect } from 'vitest';
import { applyKey, parseBuffer, toBuffer } from './padLogic';

const press = (state, keys, opts) => keys.split(' ').reduce((s, k) => applyKey(s, k, opts), state);

describe('teclado numérico', () => {
  it('el valor precargado está seleccionado: lo primero que se tipea lo reemplaza', () => {
    expect(press({ buffer: '60', fresh: true }, '7 2 , 5')).toEqual({ buffer: '72,5', fresh: false });
  });

  it('borrar con el valor seleccionado lo vacía', () => {
    expect(press({ buffer: '60', fresh: true }, 'back')).toEqual({ buffer: '', fresh: false });
    expect(press({ buffer: '60', fresh: false }, 'back')).toEqual({ buffer: '6', fresh: false });
  });

  it('reps sin decimales y un solo separador', () => {
    expect(press({ buffer: '', fresh: true }, '1 , 0', { decimal: false }).buffer).toBe('10');
    expect(press({ buffer: '', fresh: true }, ', 5 , 2 5').buffer).toBe('0,52');
  });

  it('parsea y formatea con coma', () => {
    expect(parseBuffer('62,5', true)).toBe(62.5);
    expect(parseBuffer('', true)).toBe('');
    expect(parseBuffer('12', false)).toBe(12);
    expect(toBuffer(62.5)).toBe('62,5');
    expect(toBuffer('')).toBe('');
    expect(toBuffer(1000)).toBe('1000');
  });
});
