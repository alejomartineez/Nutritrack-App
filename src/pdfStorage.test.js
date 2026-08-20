import { describe, it, expect } from 'vitest';
import { isPdfFile, formatBytes, MAX_PDF_BYTES } from './pdfStorage';

describe('isPdfFile', () => {
  it('acepta type PDF o extensión .pdf', () => {
    expect(isPdfFile({ type: 'application/pdf', name: 'x' })).toBe(true);
    expect(isPdfFile({ type: '', name: 'plan.PDF' })).toBe(true);
    expect(isPdfFile({ type: 'image/jpeg', name: 'foto.jpg' })).toBe(false);
    expect(isPdfFile(null)).toBe(false);
  });
});

describe('formatBytes', () => {
  it('formatea B, KB y MB', () => {
    expect(formatBytes(800)).toBe('800 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(MAX_PDF_BYTES)).toBe('20.0 MB');
  });
});
