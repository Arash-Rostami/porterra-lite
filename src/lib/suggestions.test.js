import { describe, it, expect } from 'vitest';
import { computeSuggestions, filterAgentSuggestions } from './suggestions.js';

function daysAgoDdMmYyyy(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

const lead = (overrides = {}) => ({
  company: 'Acme', coordinator: 'FARNAZ', result: 'در حال پیگیری', converted: false,
  priority: null, notes: '', source: null, price: null, ...overrides,
});

describe('computeSuggestions', () => {
  it('reduces multiple records for the same company to the most recent one', () => {
    const records = [
      lead({ company: 'Acme', date: daysAgoDdMmYyyy(10) }),
      lead({ company: 'Acme', date: daysAgoDdMmYyyy(3) }),
    ];
    const byAgent = computeSuggestions(records);
    expect(byAgent.FARNAZ).toHaveLength(1);
    expect(byAgent.FARNAZ[0].days).toBe(3);
  });

  it('excludes converted, غیرفعال, and در حال استعلام leads', () => {
    const records = [
      lead({ company: 'A', converted: true, date: daysAgoDdMmYyyy(5) }),
      lead({ company: 'B', result: 'غیرفعال', date: daysAgoDdMmYyyy(5) }),
      lead({ company: 'C', result: 'در حال استعلام', date: daysAgoDdMmYyyy(5) }),
    ];
    const byAgent = computeSuggestions(records);
    expect(byAgent.FARNAZ || []).toHaveLength(0);
  });

  it('excludes leads contacted today or in the future', () => {
    const records = [lead({ company: 'A', date: daysAgoDdMmYyyy(0) })];
    const byAgent = computeSuggestions(records);
    expect(byAgent.FARNAZ || []).toHaveLength(0);
  });

  it('ranks a lead with no status at priority 3 regardless of days elapsed', () => {
    const records = [lead({ company: 'A', result: null, date: daysAgoDdMmYyyy(1) })];
    const byAgent = computeSuggestions(records);
    expect(byAgent.FARNAZ[0].noStatus).toBe(true);
    expect(byAgent.FARNAZ[0].pr).toBe(3);
  });

  it('surfaces a no-answer lead immediately, before the 3-day threshold', () => {
    const records = [lead({ company: 'A', result: null, notes: 'جواب نداد', date: daysAgoDdMmYyyy(1) })];
    const byAgent = computeSuggestions(records);
    expect(byAgent.FARNAZ[0].isNoAnswer).toBe(true);
  });

  it('holds back a normal-priority, non-no-answer lead until 3 days have elapsed', () => {
    const tooSoon = [lead({ company: 'A', result: 'در حال پیگیری', priority: 'پایین', date: daysAgoDdMmYyyy(1) })];
    expect(computeSuggestions(tooSoon).FARNAZ || []).toHaveLength(0);

    const readyNow = [lead({ company: 'B', result: 'در حال پیگیری', priority: 'پایین', date: daysAgoDdMmYyyy(3) })];
    expect(computeSuggestions(readyNow).FARNAZ).toHaveLength(1);
  });
});

describe('filterAgentSuggestions', () => {
  const pool = [
    { r: { company: 'Acme', category: 'Solar', product: 'Panel', name: 'Ali', phone: '', notes: '' } },
    { r: { company: 'Beta', category: 'Chemical', product: 'Resin', name: 'Reza', phone: '', notes: '' } },
  ];

  it('filters by category', () => {
    const { filtered } = filterAgentSuggestions(pool, { category: 'Solar' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].r.company).toBe('Acme');
  });

  it('filters by free-text search across company/name/phone/product/notes', () => {
    const { filtered } = filterAgentSuggestions(pool, { search: 'beta' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].r.company).toBe('Beta');
  });
});
