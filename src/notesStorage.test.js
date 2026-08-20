import { describe, it, expect, beforeEach } from 'vitest';
import { titleFromBody, loadNotes, saveNotes, blankNote } from './notesStorage';

class MemoryStorage {
  constructor() {
    this.map = new Map();
  }
  getItem(k) {
    return this.map.has(k) ? this.map.get(k) : null;
  }
  setItem(k, v) {
    this.map.set(k, String(v));
  }
}

beforeEach(() => {
  globalThis.localStorage = new MemoryStorage();
});

describe('titleFromBody', () => {
  it('usa la primera línea con texto', () => {
    expect(titleFromBody('\n\n  Machete desayuno\nHuevos ×2')).toBe('Machete desayuno');
  });

  it('recorta títulos largos', () => {
    const long = 'A'.repeat(60);
    expect(titleFromBody(long).endsWith('…')).toBe(true);
    expect(titleFromBody(long).length).toBeLessThanOrEqual(49);
  });

  it('vacío queda como Sin título', () => {
    expect(titleFromBody('')).toBe('Sin título');
    expect(titleFromBody('   \n  ')).toBe('Sin título');
  });
});

describe('load / save', () => {
  it('no persiste borradores vacíos y vuelve a cargar el resto', () => {
    const a = { ...blankNote(), body: 'Idea uno' };
    const b = { ...blankNote(), body: '   ' };
    saveNotes([a, b]);
    const loaded = loadNotes();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].body).toBe('Idea uno');
  });

  it('sobrevive JSON corrupto', () => {
    localStorage.setItem('nutri_notes', '{no');
    expect(loadNotes()).toEqual([]);
  });
});
