import { describe, it, expect } from 'vitest';
import { LeadCreate, LeadUpdate, QuoteResolve, CategoryCreate, parseOrThrow } from './models.js';

describe('LeadCreate', () => {
  const base = { id: 'L-1', company: 'Acme' };

  it('accepts a minimal valid lead', () => {
    const parsed = parseOrThrow(LeadCreate, base);
    expect(parsed).toMatchObject({ id: 'L-1', company: 'Acme', converted: false });
  });

  it('requires deactivateReason when result is غیرفعال', () => {
    expect(() => parseOrThrow(LeadCreate, { ...base, result: 'غیرفعال' }))
      .toThrow(/deactivateReason/);
  });

  it('accepts result غیرفعال when deactivateReason is present', () => {
    const parsed = parseOrThrow(LeadCreate, { ...base, result: 'غیرفعال', deactivateReason: 'no longer active' });
    expect(parsed.deactivateReason).toBe('no longer active');
  });

  it('rejects a malformed date', () => {
    expect(() => parseOrThrow(LeadCreate, { ...base, date: '2026-01-01' })).toThrow(/date must be dd\.mm\.yyyy/);
  });

  it('converts an empty string field to null', () => {
    const parsed = parseOrThrow(LeadCreate, { ...base, notes: '' });
    expect(parsed.notes).toBeNull();
  });

  it('sets the VALIDATION error code on failure', () => {
    try {
      parseOrThrow(LeadCreate, { company: 'Acme' }); // missing required id
      expect.unreachable('parseOrThrow should have thrown');
    } catch (err) {
      expect(err.code).toBe('VALIDATION');
    }
  });
});

describe('LeadUpdate', () => {
  it('does not require deactivateReason when result is absent from the patch', () => {
    expect(() => parseOrThrow(LeadUpdate, { company: 'Acme v2' })).not.toThrow();
  });

  it('requires deactivateReason when the patch sets result to غیرفعال', () => {
    expect(() => parseOrThrow(LeadUpdate, { result: 'غیرفعال' })).toThrow(/deactivateReason/);
  });
});

describe('QuoteResolve', () => {
  it('accepts موفق with no failReason', () => {
    expect(() => parseOrThrow(QuoteResolve, { result: 'موفق' })).not.toThrow();
  });

  it('requires failReason when result is ناموفق', () => {
    expect(() => parseOrThrow(QuoteResolve, { result: 'ناموفق' })).toThrow(/failReason/);
  });

  it('accepts ناموفق with a failReason', () => {
    const parsed = parseOrThrow(QuoteResolve, { result: 'ناموفق', failReason: 'too expensive' });
    expect(parsed.failReason).toBe('too expensive');
  });

  it('rejects a result outside the موفق/ناموفق enum', () => {
    expect(() => parseOrThrow(QuoteResolve, { result: 'something-else' })).toThrow();
  });
});

describe('CategoryCreate', () => {
  it('defaults isCustom to true', () => {
    const parsed = parseOrThrow(CategoryCreate, { id: 'CAT-x', name: 'X', createdAt: 1 });
    expect(parsed.isCustom).toBe(true);
  });

  it('accepts isCustom as the numeric 0/1 the DB stores', () => {
    const parsed = parseOrThrow(CategoryCreate, { id: 'CAT-x', name: 'X', createdAt: 1, isCustom: 0 });
    expect(parsed.isCustom).toBe(false);
  });
});
