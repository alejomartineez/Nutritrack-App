import { describe, it, expect } from 'vitest';
import { epley1RM } from './workoutData';

describe('epley1RM', () => {
  it('devuelve el peso tal cual con una sola repetición', () => {
    expect(epley1RM(100, 1)).toBe(100);
  });

  it('aplica la fórmula de Epley para varias reps', () => {
    // 100 * (1 + 5/30) = 116.67 -> redondeado a 1 decimal
    expect(epley1RM(100, 5)).toBe(116.7);
    // 80 * (1 + 10/30) = 106.67 -> 106.7
    expect(epley1RM(80, 10)).toBe(106.7);
  });

  it('devuelve 0 con entradas inválidas o no positivas', () => {
    expect(epley1RM(0, 5)).toBe(0);
    expect(epley1RM(100, 0)).toBe(0);
    expect(epley1RM(-10, 5)).toBe(0);
    expect(epley1RM('abc', 5)).toBe(0);
  });

  it('coacciona strings numéricos', () => {
    expect(epley1RM('100', '1')).toBe(100);
  });
});
