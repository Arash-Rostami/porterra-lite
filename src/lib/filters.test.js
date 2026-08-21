import { describe, it, expect, beforeEach } from 'vitest';
import { effectiveResult, isQuoteOpen, getFiltered, smartSearch, setAgentDirectory } from './filters.js';

describe('effectiveResult', () => {
  it('returns the explicit result when set', () => {
    expect(effectiveResult({ result: 'در حال پیگیری', notes: '' })).toBe('در حال پیگیری');
  });

  it('infers no-answer from notes when result is unset', () => {
    expect(effectiveResult({ result: null, notes: 'جواب نداد' })).toBe('بی‌پاسخ');
  });

  it('returns null when nothing indicates a status', () => {
    expect(effectiveResult({ result: null, notes: 'یادداشت عادی' })).toBeNull();
  });
});

describe('isQuoteOpen', () => {
  it('is open when inquiring and unresolved', () => {
    expect(isQuoteOpen({ result: 'در حال استعلام', quoteResult: null })).toBe(true);
  });

  it('is not open once resolved', () => {
    expect(isQuoteOpen({ result: 'در حال استعلام', quoteResult: 'موفق' })).toBe(false);
  });

  it('is not open for other statuses', () => {
    expect(isQuoteOpen({ result: 'در حال پیگیری', quoteResult: null })).toBe(false);
  });
});

describe('smartSearch', () => {
  const records = [
    { company: 'Acme Chemicals', name: 'Ali', phone: '', notes: '', product: '', category: '', source: '', coordinator: '' },
    { company: 'Other Co', name: 'Reza', phone: '', notes: '', product: '', category: '', source: '', coordinator: '' },
  ];

  it('returns all records with score 1 for an empty query', () => {
    const out = smartSearch(records, '');
    expect(out).toHaveLength(2);
    expect(out.every((o) => o.score === 1)).toBe(true);
  });

  it('matches on partial company name, case-insensitively', () => {
    const out = smartSearch(records, 'acme');
    expect(out).toHaveLength(1);
    expect(out[0].r.company).toBe('Acme Chemicals');
  });

  it('excludes records with no matching field', () => {
    const out = smartSearch(records, 'nonexistent-token');
    expect(out).toHaveLength(0);
  });
});

describe('getFiltered', () => {
  beforeEach(() => setAgentDirectory([]));

  const records = [
    { id: '1', company: 'Alpha', date: '01.01.2026', result: 'در حال پیگیری', coordinator: 'FARNAZ', category: '', source: '', product: '' },
    { id: '2', company: 'Beta', date: '15.01.2026', result: 'غیرفعال', coordinator: 'PARDIS', category: '', source: '', product: '' },
    { id: '3', company: 'Gamma', date: '10.01.2026', result: 'بی‌پاسخ', coordinator: 'FARNAZ', category: '', source: '', product: '' },
  ];

  it('filters by coordinator', () => {
    const out = getFiltered(records, { coordinator: 'FARNAZ' }, null, null);
    expect(out.map((r) => r.id).sort()).toEqual(['1', '3']);
  });

  it('does not hide deactivated leads under "all statuses"', () => {
    const out = getFiltered(records, {}, null, null);
    expect(out.map((r) => r.id).sort()).toEqual(['1', '2', '3']);
  });

  it('filters by status through effectiveResult', () => {
    const out = getFiltered(records, { status: 'غیرفعال' }, null, null);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('2');
  });

  it('sorts newest-first by date when requested', () => {
    const out = getFiltered(records, {}, null, { key: 'date', dir: -1 });
    expect(out.map((r) => r.id)).toEqual(['2', '3', '1']);
  });

  it('applies a KPI chart drill-down as an independent filter dimension', () => {
    const out = getFiltered(records, {}, { type: 'kpi', key: 'deactivated' }, null);
    expect(out.map((r) => r.id)).toEqual(['2']);
  });
});
