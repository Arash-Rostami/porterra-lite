import { describe, it, expect, beforeEach } from 'vitest';
import { findDuplicateCompany, findDuplicatePhone } from './duplicates.js';
import { setAgentDirectory } from './filters.js';

describe('findDuplicateCompany', () => {
  beforeEach(() => setAgentDirectory([]));

  const records = [
    { company: 'Acme Chemicals', coordinator: 'FARNAZ', name: 'Ali', date: '01.01.2026' },
  ];

  it('matches a company name case-insensitively after whitespace normalization', () => {
    const msg = findDuplicateCompany(records, '  acme   chemicals ');
    expect(msg).toContain('Acme Chemicals');
    expect(msg).toContain('01.01.2026');
  });

  it('returns null when there is no match', () => {
    expect(findDuplicateCompany(records, 'Totally Different Co')).toBeNull();
  });

  it('returns null for input shorter than 2 normalized characters', () => {
    expect(findDuplicateCompany(records, 'a')).toBeNull();
  });
});

describe('findDuplicatePhone', () => {
  const records = [
    { company: 'Acme Chemicals', coordinator: 'FARNAZ', phone: '0912345678' },
  ];

  it('matches by the last 8 digits regardless of prefix format', () => {
    expect(findDuplicatePhone(records, '+98912345678')).toContain('Acme Chemicals');
    expect(findDuplicatePhone(records, '00912345678')).toContain('Acme Chemicals');
  });

  it('normalizes Persian digits before comparing', () => {
    expect(findDuplicatePhone(records, '۰۹۱۲۳۴۵۶۷۸')).toContain('Acme Chemicals');
  });

  it('returns null when there is no match', () => {
    expect(findDuplicatePhone(records, '0999999999')).toBeNull();
  });

  it('returns null for input shorter than 6 normalized digits', () => {
    expect(findDuplicatePhone(records, '123')).toBeNull();
  });
});
