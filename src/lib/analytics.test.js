import { describe, it, expect } from 'vitest';
import { computeKpis, computeFunnelStages, computeAgentReport, computeDailyAgentData, agentColor } from './analytics.js';

const lead = (overrides = {}) => ({
  coordinator: 'FARNAZ', result: 'در حال پیگیری', quoteResult: null, converted: false, notes: '', ...overrides,
});

describe('computeKpis', () => {
  it('computes all six fixed KPI cards', () => {
    const records = [
      lead({ result: 'در حال پیگیری' }),
      lead({ converted: true, result: 'در حال استعلام', quoteResult: 'موفق' }),
      lead({ result: 'در حال استعلام', quoteResult: null }), // open quote
      lead({ result: 'غیرفعال' }),
      lead({ result: null, notes: 'جواب نداد' }), // effectiveResult -> بی‌پاسخ
    ];
    const kpis = computeKpis(records);
    const byKey = Object.fromEntries(kpis.map((k) => [k.key, k.value]));
    expect(byKey).toEqual({ total: 5, converted: 1, quoteOpen: 1, deactivated: 1, followUp: 1, noAnswer: 1 });
  });
});

describe('computeFunnelStages', () => {
  it('returns exactly 3 stages plus both conversion rates', () => {
    const records = [
      lead({ result: 'در حال پیگیری' }),
      lead({ result: 'در حال استعلام', quoteResult: null }),
      lead({ result: 'در حال استعلام', quoteResult: 'موفق', converted: true }),
      lead({ result: 'در حال استعلام', quoteResult: 'ناموفق' }),
    ];
    const { stages, leadConversionRate, quoteToSaleRate } = computeFunnelStages(records);
    expect(stages).toHaveLength(3);
    expect(stages[0].value).toBe(4); // total leads
    expect(stages[1].value).toBe(3); // quoteOpen + quoteWon + quoteLost
    expect(stages[2].value).toBe(1); // converted
    expect(leadConversionRate).toBe(25); // 1/4
    expect(quoteToSaleRate).toBe(33); // 1 won of 3 quoted, rounded
  });

  it('does not divide by zero when there are no leads', () => {
    const { leadConversionRate, quoteToSaleRate } = computeFunnelStages([]);
    expect(leadConversionRate).toBe(0);
    expect(quoteToSaleRate).toBe(0);
  });
});

describe('computeAgentReport', () => {
  it('sorts agents by total descending', () => {
    const records = [
      lead({ coordinator: 'FARNAZ' }),
      lead({ coordinator: 'FARNAZ' }),
      lead({ coordinator: 'PARDIS' }),
    ];
    const report = computeAgentReport(records);
    expect(report.map((r) => r.agent)).toEqual(['FARNAZ', 'PARDIS']);
    expect(report[0].total).toBe(2);
  });
});

describe('computeDailyAgentData outlier cap', () => {
  it('caps bar height but preserves the true value in rawData', () => {
    const today = new Date();
    const ddmmyyyy = (d) => `${String(d).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
    // 50 records for FARNAZ on day 1 of the current month, 1 record each on days 2-9 for PARDIS
    const records = [
      ...Array.from({ length: 50 }, () => lead({ coordinator: 'FARNAZ', date: ddmmyyyy(1) })),
      ...Array.from({ length: 8 }, (_, i) => lead({ coordinator: 'PARDIS', date: ddmmyyyy(i + 2) })),
    ];
    const { datasets, cap, wasCapped } = computeDailyAgentData(records, 'gregorian');
    const farnaz = datasets.find((d) => d.label === 'FARNAZ' || d.rawData[0] === 50);
    expect(wasCapped).toBe(true);
    expect(farnaz.rawData[0]).toBe(50);
    expect(farnaz.data[0]).toBe(cap);
    expect(farnaz.data[0]).toBeLessThan(50);
  });
});

describe('agentColor', () => {
  it('returns the hardcoded brand colors for the three named agents', () => {
    expect(agentColor('FARNAZ')).toBe('#45556c');
    expect(agentColor('PARDIS')).toBe('#155dfc');
    expect(agentColor('ZOHREH')).toBe('#f54a00');
  });

  it('returns a deterministic HSL color for any other agent', () => {
    const a = agentColor('NEWAGENT');
    const b = agentColor('NEWAGENT');
    expect(a).toBe(b);
    expect(a).toMatch(/^hsl\(\d+,45%,42%\)$/);
  });
});
